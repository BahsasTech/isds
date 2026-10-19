<?php
/**
 * LSDS API - discussion forum endpoints.
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

final class DiscussionController
{
    private const SELECT = 'SELECT disc.*, c.name AS category, d.name AS department, d.code AS department_code,
            sp.full_name AS author_name
        FROM discussions disc
        LEFT JOIN categories c ON c.id = disc.category_id
        LEFT JOIN departments d ON d.id = disc.department_id
        LEFT JOIN staff_profiles sp ON sp.user_id = disc.author_user_id';

    public function index(Request $req): void
    {
        $where  = [];
        $params = [];

        if ($status = Support::trimmed($req->query('status'))) {
            $where[]  = 'disc.status = ?';
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
        if ($q = Support::trimmed($req->query('q'))) {
            $clause = Support::likeClause($q, ['disc.title', 'disc.body', 'sp.full_name'], $params);
            if ($clause !== null) {
                $where[] = $clause;
            }
        }

        $sql = self::SELECT;
        if ($where) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY disc.is_pinned DESC, disc.last_activity_at DESC, disc.created_at DESC';

        $rows = Database::select($sql, $params);

        $tagsAll = $this->tagsFor(array_map(static fn ($r) => (int) $r['id'], $rows));
        $data = array_map(function (array $r) use ($tagsAll): array {
            $tags = $tagsAll[(int) $r['id']] ?? [];
            return [
                'id'               => (int) $r['id'],
                'title'            => $r['title'],
                'body'             => $r['body'],
                'category'         => $r['category'],
                'category_id'      => Support::toInt($r['category_id']),
                'department'       => $r['department'],
                'department_code'  => $r['department_code'],
                'author_user_id'   => (int) $r['author_user_id'],
                'author_name'      => $r['author_name'],
                'is_pinned'        => Support::toBool($r['is_pinned']),
                'is_sticky'        => Support::toBool($r['is_pinned']),
                'status'           => $r['status'],
                'reply_count'      => (int) $r['reply_count'],
                'view_count'       => (int) $r['view_count'],
                'tags'             => $tags,
                'last_activity_at' => Support::iso($r['last_activity_at'] ?: $r['created_at']),
                'created_at'       => Support::iso($r['created_at']),
                'updated_at'       => Support::iso($r['updated_at']),
            ];
        }, $rows);

        $threads = (int) Database::scalar('SELECT COUNT(*) FROM discussions');
        $replies = (int) Database::scalar('SELECT COUNT(*) FROM discussion_replies');
        $pinned  = (int) Database::scalar('SELECT COUNT(*) FROM discussions WHERE is_pinned = 1');

        Response::json([
            'data'   => $data,
            'total'  => count($data),
            'totals' => ['threads' => $threads, 'replies' => $replies, 'pinned' => $pinned],
        ]);
    }

    public function show(Request $req): void
    {
        $id  = (int) $req->param('id');
        $row = Database::selectOne(self::SELECT . ' WHERE disc.id = ?', [$id]);
        if ($row === null) {
            throw ApiException::notFound('Discussion not found.');
        }

        Database::execute('UPDATE discussions SET view_count = view_count + 1 WHERE id = ?', [$id]);

        $replyRows = Database::select(
            'SELECT r.*, sp.full_name AS author_name
               FROM discussion_replies r
               LEFT JOIN staff_profiles sp ON sp.user_id = r.user_id
              WHERE r.discussion_id = ? AND r.status = "visible"
              ORDER BY r.is_accepted_answer DESC, r.created_at',
            [$id]
        );
        $replies = array_map(static fn (array $r): array => [
            'id'                 => (int) $r['id'],
            'author_name'        => $r['author_name'],
            'body'               => $r['body'],
            'is_accepted_answer' => Support::toBool($r['is_accepted_answer']),
            'created_at'         => Support::iso($r['created_at']),
        ], $replyRows);

        $tags = $this->tagsFor([$id])[$id] ?? [];
        Response::json([
            'id'               => (int) $row['id'],
            'title'            => $row['title'],
            'body'             => $row['body'],
            'category'         => $row['category'],
            'category_id'      => Support::toInt($row['category_id']),
            'department'       => $row['department'],
            'department_code'  => $row['department_code'],
            'author_user_id'   => (int) $row['author_user_id'],
            'author_name'      => $row['author_name'],
            'is_pinned'        => Support::toBool($row['is_pinned']),
            'is_sticky'        => Support::toBool($row['is_pinned']),
            'status'           => $row['status'],
            'reply_count'      => (int) $row['reply_count'],
            'view_count'       => (int) $row['view_count'] + 1,
            'tags'             => $tags,
            'last_activity_at' => Support::iso($row['last_activity_at'] ?: $row['created_at']),
            'created_at'       => Support::iso($row['created_at']),
            'updated_at'       => Support::iso($row['updated_at']),
            'replies'          => $replies,
        ]);
    }

    public function store(Request $req): void
    {
        $actor = Auth::requireUser();

        $title = Support::trimmed($req->input('title'));
        if ($title === null) {
            throw ApiException::validation('Discussion title is required.');
        }

        $status = (string) $req->input('status', 'open');
        if ($status === 'closed') {
            $status = 'locked';
        }
        if (!in_array($status, ['open', 'locked', 'archived'], true)) {
            $status = 'open';
        }
        $isPinned = Support::toBool($req->input('is_sticky') ?? $req->input('is_pinned'));

        $id = Database::insert(
            'INSERT INTO discussions
                (title, body, author_user_id, department_id, category_id, status, is_pinned, last_activity_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
            [
                $title,
                Support::trimmed($req->input('body')) ?? $title,
                (int) $actor['id'],
                Support::departmentId($req->input('department_code')) ?? $actor['department_id'],
                Support::categoryId($req->input('category'), 'discussion'),
                $status,
                $isPinned ? 1 : 0,
            ]
        );

        foreach (Support::toList($req->input('tags')) as $tagName) {
            $tagId = Support::firstTagId($tagName);
            if ($tagId > 0) {
                Database::execute(
                    'INSERT INTO discussion_tags (discussion_id, tag_id) VALUES (?, ?)',
                    [$id, $tagId]
                );
            }
        }

        Activity::log('discussion_created', 'discussion', $id, 'Created discussion "' . $title . '".');

        $row = Database::selectOne(self::SELECT . ' WHERE disc.id = ?', [$id]);
        $tags = $this->tagsFor([$id])[$id] ?? [];
        Response::json([
            'id'               => (int) $row['id'],
            'title'            => $row['title'],
            'body'             => $row['body'],
            'category'         => $row['category'],
            'category_id'      => Support::toInt($row['category_id']),
            'department'       => $row['department'],
            'department_code'  => $row['department_code'],
            'author_user_id'   => (int) $row['author_user_id'],
            'author_name'      => $row['author_name'],
            'is_pinned'        => Support::toBool($row['is_pinned']),
            'is_sticky'        => Support::toBool($row['is_pinned']),
            'status'           => $row['status'],
            'reply_count'      => 0,
            'view_count'       => (int) $row['view_count'],
            'tags'             => $tags,
            'last_activity_at' => Support::iso($row['created_at']),
            'created_at'       => Support::iso($row['created_at']),
            'updated_at'       => Support::iso($row['updated_at']),
        ], 201);
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
            'SELECT dt.discussion_id, t.name
                FROM discussion_tags dt
                JOIN tags t ON t.id = dt.tag_id
                WHERE dt.discussion_id IN (' . $placeholders . ')
                ORDER BY t.name',
            $ids
        );
        $out = [];
        foreach ($rows as $row) {
            $out[(int) $row['discussion_id']][] = (string) $row['name'];
        }
        return $out;
    }
}
