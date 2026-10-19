<?php
/**
 * LSDS API - knowledge document endpoints.
 */

declare(strict_types=1);

namespace Lsds\Controllers;

use Lsds\Activity;
use Lsds\ApiException;
use Lsds\Auth;
use Lsds\Database;
use Lsds\Request;
use Lsds\Response;
use Lsds\Support;

final class DocumentController
{
    private const SELECT = 'SELECT doc.*, c.name AS category, d.name AS department, d.code AS department_code,
            sp.full_name AS owner_name, rev.full_name AS reviewed_by_name
        FROM documents doc
        LEFT JOIN categories c ON c.id = doc.category_id
        LEFT JOIN departments d ON d.id = doc.department_id
        LEFT JOIN staff_profiles sp ON sp.user_id = doc.owner_user_id
        LEFT JOIN staff_profiles rev ON rev.user_id = doc.reviewed_by';

    public function index(Request $req): void
    {
        $where  = [];
        $params = [];

        if ($status = Support::trimmed($req->query('status'))) {
            $where[]  = 'doc.review_status = ?';
            $params[] = $status;
        }
        if ($category = Support::trimmed($req->query('category'))) {
            $where[]  = 'c.name = ?';
            $params[] = $category;
        }
        if ($dept = Support::trimmed($req->query('department'))) {
            $where[]  = 'd.code = ?';
            $params[] = $dept;
        }
        if ($access = Support::trimmed($req->query('access'))) {
            $where[]  = 'doc.access_classification = ?';
            $params[] = $access;
        }
        if ($q = Support::trimmed($req->query('q'))) {
            $clause = Support::likeClause($q, ['doc.title', 'doc.description', 'sp.full_name'], $params);
            if ($clause !== null) {
                $where[] = $clause;
            }
        }

        $sql = self::SELECT;
        if ($where) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY doc.updated_at DESC';

        $rows = Database::select($sql, $params);
        $tags = $this->tagsFor(array_map(static fn ($r) => (int) $r['id'], $rows));

        $data = array_map(static fn (array $r): array => self::map($r, $tags[(int) $r['id']] ?? []), $rows);

        $counts = [];
        foreach (Database::select('SELECT review_status, COUNT(*) AS c FROM documents GROUP BY review_status') as $r) {
            $counts[$r['review_status']] = (int) $r['c'];
        }
        $totalCount = (int) Database::scalar('SELECT COUNT(*) FROM documents');
        $published = (int) Database::scalar("SELECT COUNT(*) FROM documents WHERE review_status = 'published'");
        $pending = (int) Database::scalar("SELECT COUNT(*) FROM documents WHERE review_status NOT IN ('published','archived')");

        Response::json([
            'data'   => $data,
            'total'  => count($data),
            'counts' => $counts,
            'totals' => ['count' => $totalCount, 'published' => $published, 'pending' => $pending],
        ]);
    }

    public function show(Request $req): void
    {
        $id  = (int) $req->param('id');
        $row = Database::selectOne(self::SELECT . ' WHERE doc.id = ?', [$id]);
        if ($row === null) {
            throw ApiException::notFound('Document not found.');
        }
        $tags = $this->tagsFor([$id]);
        Response::json(self::map($row, $tags[$id] ?? []));
    }

    public function store(Request $req): void
    {
        $actor = Auth::requireUser();

        $title = Support::trimmed($req->input('title'));
        if ($title === null) {
            throw ApiException::validation('Document title is required.');
        }

        $classification = (string) $req->input('access_classification', 'internal');
        if (!in_array($classification, ['internal', 'restricted', 'confidential'], true)) {
            $classification = 'internal';
        }

        $base     = Support::slugify($title);
        $fileName = Support::trimmed($req->input('file_name')) ?? ($base . '.pdf');
        $stored   = 'doc-' . bin2hex(random_bytes(6)) . '.pdf';

        $id = Database::insert(
            'INSERT INTO documents
                (title, description, category_id, department_id, owner_user_id, file_name, stored_file_name,
                 file_path, mime_type, file_size_bytes, current_version_no, access_classification,
                 review_status, submitted_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, "submitted_for_review", ?)',
            [
                $title,
                Support::trimmed($req->input('description')),
                Support::categoryId($req->input('category'), 'document'),
                Support::departmentId($req->input('department_code')) ?? $actor['department_id'],
                (int) $actor['id'],
                $fileName,
                $stored,
                'storage/documents/' . $stored,
                'application/pdf',
                Support::toInt($req->input('file_size_bytes', 0)),
                $classification,
                date('Y-m-d H:i:s'),
            ]
        );

        foreach (Support::toList($req->input('tags')) as $tagName) {
            $tagId = Support::firstTagId($tagName);
            if ($tagId > 0) {
                Database::execute(
                    'INSERT INTO document_tags (document_id, tag_id) VALUES (?, ?)',
                    [$id, $tagId]
                );
            }
        }

        Activity::log('document_created', 'document', $id, 'Created document "' . $title . '".');

        $row = Database::selectOne(self::SELECT . ' WHERE doc.id = ?', [$id]);
        Response::json(self::map($row, $this->tagsFor([$id])[$id] ?? []), 201);
    }

    /**
     * @param array<string,mixed> $r
     * @param string[]            $tags
     * @return array<string,mixed>
     */
    private static function map(array $r, array $tags): array
    {
        return [
            'id'                   => (int) $r['id'],
            'title'                => $r['title'],
            'description'          => $r['description'],
            'category'             => $r['category'],
            'category_id'          => Support::toInt($r['category_id']),
            'department'           => $r['department'],
            'department_code'      => $r['department_code'],
            'owner_user_id'        => (int) $r['owner_user_id'],
            'owner_name'           => $r['owner_name'],
            'file_name'            => $r['file_name'],
            'stored_file_name'     => $r['stored_file_name'],
            'file_path'            => $r['file_path'],
            'mime_type'            => $r['mime_type'],
            'file_size_bytes'      => Support::toInt($r['file_size_bytes']),
            'current_version_no'   => (int) $r['current_version_no'],
            'access_classification' => $r['access_classification'],
            'review_status'        => $r['review_status'],
            'tags'                 => $tags,
            'published_at'         => Support::iso($r['published_at']),
            'submitted_at'         => Support::iso($r['submitted_at']),
            'reviewed_by_name'     => $r['reviewed_by_name'],
            'reviewed_at'          => Support::iso($r['reviewed_at']),
            'review_comments'      => $r['review_comments'],
            'review_due_date'      => Support::date($r['review_due_date']),
            'expiry_date'          => Support::date($r['expiry_date']),
            'created_at'           => Support::iso($r['created_at']),
            'updated_at'           => Support::iso($r['updated_at']),
        ];
    }

    /**
     * @param int[] $ids
     * @return array<int,string[]>
     */
    private function tagsFor(array $ids): array
    {
        if ($ids === []) {
            return [];
        }
        $placeholders = implode(', ', array_fill(0, count($ids), '?'));
        $rows = Database::select(
            'SELECT dt.document_id, t.name
               FROM document_tags dt
               JOIN tags t ON t.id = dt.tag_id
              WHERE dt.document_id IN (' . $placeholders . ')
              ORDER BY t.name',
            $ids
        );
        $out = [];
        foreach ($rows as $row) {
            $out[(int) $row['document_id']][] = (string) $row['name'];
        }
        return $out;
    }
}
