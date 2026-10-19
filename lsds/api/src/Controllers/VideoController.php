<?php
/**
 * LSDS API - video library endpoints.
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

final class VideoController
{
    private const SELECT = 'SELECT v.*, c.name AS category, d.name AS department, d.code AS department_code,
            sp.full_name AS uploader_name
        FROM videos v
        LEFT JOIN categories c ON c.id = v.category_id
        LEFT JOIN departments d ON d.id = v.department_id
        LEFT JOIN staff_profiles sp ON sp.user_id = v.uploaded_by';

    public function index(Request $req): void
    {
        $where  = [];
        $params = [];

        if ($status = Support::trimmed($req->query('status'))) {
            $where[]  = 'v.review_status = ?';
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
            $where[]  = 'v.access_classification = ?';
            $params[] = $access;
        }
        if ($q = Support::trimmed($req->query('q'))) {
            $clause = Support::likeClause($q, ['v.title', 'v.description', 'sp.full_name'], $params);
            if ($clause !== null) {
                $where[] = $clause;
            }
        }

        $sql = self::SELECT;
        if ($where) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY v.updated_at DESC';

        $rows = Database::select($sql, $params);
        $tags = $this->tagsFor(array_map(static fn ($r) => (int) $r['id'], $rows));

        $data = array_map(static fn (array $r): array => self::map($r, $tags[(int) $r['id']] ?? []), $rows);

        $counts = [];
        foreach (Database::select('SELECT review_status, COUNT(*) AS c FROM videos GROUP BY review_status') as $r) {
            $counts[$r['review_status']] = (int) $r['c'];
        }
        $totalCount = (int) Database::scalar('SELECT COUNT(*) FROM videos');
        $published = (int) Database::scalar("SELECT COUNT(*) FROM videos WHERE review_status = 'published'");
        $views = (int) Database::scalar('SELECT COALESCE(SUM(views_count),0) FROM videos');

        Response::json([
            'data'   => $data,
            'total'  => count($data),
            'counts' => $counts,
            'totals' => ['count' => $totalCount, 'published' => $published, 'views' => $views],
        ]);
    }

    public function show(Request $req): void
    {
        $id  = (int) $req->param('id');
        $row = Database::selectOne(self::SELECT . ' WHERE v.id = ?', [$id]);
        if ($row === null) {
            throw ApiException::notFound('Video not found.');
        }
        $tags = $this->tagsFor([$id]);
        Response::json(self::map($row, $tags[$id] ?? []));
    }

    public function store(Request $req): void
    {
        $actor = Auth::requireUser();

        $title = Support::trimmed($req->input('title'));
        if ($title === null) {
            throw ApiException::validation('Video title is required.');
        }

        $classification = (string) $req->input('access_classification', 'internal');
        if (!in_array($classification, ['internal', 'restricted', 'confidential'], true)) {
            $classification = 'internal';
        }

        $fileName = Support::trimmed($req->input('file_name')) ?? (Support::slugify($title) . '.mp4');
        $stored   = 'vid-' . bin2hex(random_bytes(6)) . '.mp4';

        $id = Database::insert(
            'INSERT INTO videos
                (title, description, category_id, department_id, uploaded_by, language,
                 thumbnail_path, file_name, stored_file_name, file_path, mime_type,
                 duration_seconds, file_size_bytes, upload_status, review_status, access_classification)
             VALUES (?, ?, ?, ?, ?, "English", ?, ?, ?, ?, ?, ?, ?, "processing", "pending_review", ?)',
            [
                $title,
                Support::trimmed($req->input('description')),
                Support::categoryId($req->input('category'), 'video'),
                Support::departmentId($req->input('department_code')) ?? $actor['department_id'],
                (int) $actor['id'],
                Support::trimmed($req->input('thumbnail_path')),
                $fileName,
                $stored,
                'storage/videos/' . $stored,
                'video/mp4',
                (int) $req->input('duration_seconds', 0),
                Support::toInt($req->input('file_size_bytes', 0)),
                $classification,
            ]
        );

        foreach (Support::toList($req->input('tags')) as $tagName) {
            $tagId = Support::firstTagId($tagName);
            if ($tagId > 0) {
                Database::execute(
                    'INSERT INTO video_tags (video_id, tag_id) VALUES (?, ?)',
                    [$id, $tagId]
                );
            }
        }

        Activity::log('video_created', 'video', $id, 'Created video "' . $title . '".');

        $row = Database::selectOne(self::SELECT . ' WHERE v.id = ?', [$id]);
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
            'uploaded_by'          => (int) $r['uploaded_by'],
            'uploader_name'        => $r['uploader_name'],
            'language'             => $r['language'],
            'thumbnail_path'       => $r['thumbnail_path'],
            'file_name'            => $r['file_name'],
            'stored_file_name'     => $r['stored_file_name'],
            'file_path'            => $r['file_path'],
            'mime_type'            => $r['mime_type'],
            'duration_seconds'     => Support::toInt($r['duration_seconds']),
            'file_size_bytes'      => Support::toInt($r['file_size_bytes']),
            'upload_status'        => $r['upload_status'],
            'review_status'        => $r['review_status'],
            'access_classification' => $r['access_classification'],
            'views_count'          => (int) $r['views_count'],
            'tags'                 => $tags,
            'published_at'         => Support::iso($r['published_at']),
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
            'SELECT vt.video_id, t.name
               FROM video_tags vt
               JOIN tags t ON t.id = vt.tag_id
              WHERE vt.video_id IN (' . $placeholders . ')
              ORDER BY t.name',
            $ids
        );
        $out = [];
        foreach ($rows as $row) {
            $out[(int) $row['video_id']][] = (string) $row['name'];
        }
        return $out;
    }
}
