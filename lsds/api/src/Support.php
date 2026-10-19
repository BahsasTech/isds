<?php
/**
 * LSDS API - small generic helpers shared by controllers.
 */

declare(strict_types=1);

namespace Lsds;

final class Support
{
    /** URL-safe slug from an arbitrary string. */
    public static function slugify(string $value): string
    {
        $value = strtolower(trim($value));
        $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?? '';
        return trim($value, '-');
    }

    /**
     * Convert a MySQL DATETIME/TIMESTAMP into an ISO-8601 string the browser
     * can parse reliably. Returns null when empty.
     */
    public static function iso(?string $dateTime): ?string
    {
        if ($dateTime === null || $dateTime === '' || $dateTime === '0000-00-00 00:00:00') {
            return null;
        }
        $ts = strtotime($dateTime);
        return $ts === false ? null : date('Y-m-d\TH:i:s', $ts);
    }

    /** Convert a MySQL DATE into "YYYY-MM-DD". */
    public static function date(?string $date): ?string
    {
        if ($date === null || $date === '' || $date === '0000-00-00') {
            return null;
        }
        $ts = strtotime($date);
        return $ts === false ? null : date('Y-m-d', $ts);
    }

    public static function toBool($value): bool
    {
        return $value === true || $value === 1 || $value === '1' || $value === 'true';
    }

    public static function toInt($value): ?int
    {
        return is_numeric($value) ? (int) $value : null;
    }

    public static function toFloat($value): ?float
    {
        return is_numeric($value) ? (float) $value : null;
    }

    /**
     * Return the first non-empty trimmed string, or null.
     *
     * @param mixed $value
     */
    public static function trimmed($value): ?string
    {
        if ($value === null) {
            return null;
        }
        $value = trim((string) $value);
        return $value === '' ? null : $value;
    }

    /**
     * Build an OR/AND SQL fragment for a free-text search across columns.
     *
     * @param string[]             $columns
     * @param array<string,mixed>  $params   passed by reference; placeholders are appended
     * @return string|null  null when the search term is empty
     */
    public static function likeClause(string $term, array $columns, array &$params, string $alias = 'lower'): ?string
    {
        $term = trim($term);
        if ($term === '') {
            return null;
        }
        $needle = '%' . strtolower($term) . '%';
        $parts  = [];
        foreach ($columns as $column) {
            $parts[]  = 'LOWER(' . $column . ') LIKE ?';
            $params[] = $needle;
        }
        return '(' . implode(' OR ', $parts) . ')';
    }

    /** Normalise a date/time value into a MySQL DATETIME string, or null. */
    public static function dateTimeOrNull($value): ?string
    {
        $value = self::trimmed($value);
        if ($value === null) {
            return null;
        }
        $ts = strtotime(str_replace('T', ' ', $value));
        return $ts === false ? null : date('Y-m-d H:i:s', $ts);
    }

    /** Normalise a date value into a MySQL DATE string, or null. */
    public static function dateOrNull($value): ?string
    {
        $value = self::trimmed($value);
        if ($value === null) {
            return null;
        }
        $ts = strtotime($value);
        return $ts === false ? null : date('Y-m-d', $ts);
    }

    /** Normalise a time value into a MySQL TIME string, falling back when absent. */
    public static function timeOr(string $default, $value): string
    {
        $value = self::trimmed($value);
        if ($value === null) {
            return $default;
        }
        if (preg_match('/^\d{1,2}:\d{2}(:\d{2})?$/', $value) === 1) {
            return strlen($value) === 5 ? $value . ':00' : $value;
        }
        $ts = strtotime($value);
        return $ts === false ? $default : date('H:i:s', $ts);
    }

    /**
     * Split a comma/newline separated string (or array) into trimmed values.
     *
     * @param mixed $value
     * @return string[]
     */
    public static function toList($value): array
    {
        if (is_array($value)) {
            $items = $value;
        } else {
            $items = preg_split('/[\n,]+/', (string) $value) ?: [];
        }
        $out = [];
        foreach ($items as $item) {
            $trimmed = self::trimmed($item);
            if ($trimmed !== null) {
                $out[] = $trimmed;
            }
        }
        return $out;
    }

    /** Look up a tag by slug, creating it when absent. Returns 0 on failure. */
    public static function firstTagId(string $name): int
    {
        $name = self::trimmed($name) ?? '';
        if ($name === '') {
            return 0;
        }
        $slug = self::slugify($name);
        $id = Database::scalar('SELECT id FROM tags WHERE slug = ? LIMIT 1', [$slug]);
        if ($id === false || $id === null) {
            return Database::insert('INSERT INTO tags (name, slug) VALUES (?, ?)', [$name, $slug]);
        }
        return (int) $id;
    }

    /** Resolve a department code to its id (active departments only). */
    public static function departmentId(?string $code): ?int
    {
        $code = self::trimmed($code);
        if ($code === null) {
            return null;
        }
        $id = Database::scalar('SELECT id FROM departments WHERE code = ? AND is_active = 1 LIMIT 1', [$code]);
        return $id === false || $id === null ? null : (int) $id;
    }

    /** Resolve a category name to its id for a given entity type. */
    public static function categoryId(?string $name, string $entityType): ?int
    {
        $name = self::trimmed($name);
        if ($name === null) {
            return null;
        }
        $id = Database::scalar(
            'SELECT id FROM categories WHERE name = ? AND entity_type IN (?, "any") LIMIT 1',
            [$name, $entityType]
        );
        return $id === false || $id === null ? null : (int) $id;
    }

    /**
     * Generic counter: group rows by a derived key.
     *
     * @param array<int,array<string,mixed>> $rows
     * @return array<string,int>
     */
    public static function groupCount(array $rows, callable $key): array
    {
        $out = [];
        foreach ($rows as $row) {
            $k = (string) $key($row);
            $out[$k] = ($out[$k] ?? 0) + 1;
        }
        return $out;
    }

    /**
     * @param array<int,array<string,mixed>> $rows
     * @param callable(array<string,mixed>):(int|float) $value
     * @return int|float
     */
    public static function sum(array $rows, callable $value)
    {
        $total = 0;
        foreach ($rows as $row) {
            $total += $value($row);
        }
        return $total;
    }

    /**
     * Paginate an in-memory list.
     *
     * @param array<int,mixed> $list
     * @return array{data:array<int,mixed>,total:int,page:int,per_page:int,pages:int}
     */
    public static function paginate(array $list, int $page, int $perPage): array
    {
        $perPage = max(1, $perPage);
        $pages   = max(1, (int) ceil(count($list) / $perPage));
        $page    = max(1, min($page, $pages));
        $start   = ($page - 1) * $perPage;

        return [
            'data'     => array_slice($list, $start, $perPage),
            'total'    => count($list),
            'page'     => $page,
            'per_page' => $perPage,
            'pages'    => $pages,
        ];
    }
}
