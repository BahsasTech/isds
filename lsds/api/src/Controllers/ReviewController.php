<?php
/**
 * LSDS API - content review queue and review decisions.
 *
 * A single place to see every uploaded document/video that is waiting for a
 * decision, record that decision against the item and keep a row in the
 * `reviews` table for the audit trail.
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

final class ReviewController
{
    /** Review statuses that mean "somebody is still waiting for a decision". */
    private const DOCUMENT_PENDING = ['submitted_for_review', 'under_review'];
    private const VIDEO_PENDING    = ['pending_review', 'under_review'];
    private const DECISIONS        = ['approved', 'rejected', 'returned'];

    /** GET /reviews/queue */
    public function queue(Request $req): void
    {
        $docs = Database::select(
            'SELECT doc.id, doc.title, doc.description, doc.file_name, doc.file_path, doc.mime_type,
                    doc.file_size_bytes, doc.access_classification, doc.review_status,
                    doc.submitted_at, doc.created_at, doc.owner_user_id,
                    c.name AS category, d.name AS department, d.code AS department_code,
                    sp.full_name AS author_name
               FROM documents doc
               LEFT JOIN categories c ON c.id = doc.category_id
               LEFT JOIN departments d ON d.id = doc.department_id
               LEFT JOIN staff_profiles sp ON sp.user_id = doc.owner_user_id
              WHERE doc.review_status IN (' . self::placeholders(self::DOCUMENT_PENDING) . ')
              ORDER BY COALESCE(doc.submitted_at, doc.created_at) ASC',
            self::DOCUMENT_PENDING
        );

        $vids = Database::select(
            'SELECT v.id, v.title, v.description, v.file_name, v.file_path, v.mime_type,
                    v.file_size_bytes, v.duration_seconds, v.access_classification, v.review_status,
                    v.created_at AS submitted_at, v.created_at, v.uploaded_by AS owner_user_id,
                    c.name AS category, d.name AS department, d.code AS department_code,
                    sp.full_name AS author_name
               FROM videos v
               LEFT JOIN categories c ON c.id = v.category_id
               LEFT JOIN departments d ON d.id = v.department_id
               LEFT JOIN staff_profiles sp ON sp.user_id = v.uploaded_by
              WHERE v.review_status IN (' . self::placeholders(self::VIDEO_PENDING) . ')
              ORDER BY v.created_at ASC',
            self::VIDEO_PENDING
        );

        $items = [];
        foreach ($docs as $row) {
            $items[] = $this->map('document', $row, $this->tagsFor('document', (int) $row['id']));
        }
        foreach ($vids as $row) {
            $items[] = $this->map('video', $row, $this->tagsFor('video', (int) $row['id']));
        }

        usort($items, static function (array $a, array $b): int {
            return strcmp((string) ($a['submitted_at'] ?? ''), (string) ($b['submitted_at'] ?? ''));
        });

        $counts = [
            'documents' => count($docs),
            'videos'    => count($vids),
            'total'     => count($items),
        ];

        Response::json(['data' => $items, 'total' => count($items), 'totals' => $counts]);
    }

    /** POST /reviews { reviewable_type, reviewable_id, decision, comments } */
    public function store(Request $req): void
    {
        $actor = Auth::requireRole('sysadmin', 'knowledge_manager');

        $type     = Support::trimmed($req->input('reviewable_type'));
        $id       = Support::toInt($req->input('reviewable_id'));
        $decision = Support::trimmed($req->input('decision'));
        $comments = Support::trimmed($req->input('comments'));

        if (!in_array($type, ['document', 'video'], true)) {
            throw ApiException::validation('Unsupported review target.');
        }
        if ($id === null || $id < 1) {
            throw ApiException::validation('A valid item id is required.');
        }
        if (!in_array($decision, self::DECISIONS, true)) {
            throw ApiException::validation('Unsupported decision.');
        }
        if ($decision !== 'approved' && $comments === null) {
            throw ApiException::validation('A comment is required when returning or rejecting content.');
        }

        $now = date('Y-m-d H:i:s');

        if ($type === 'document') {
            $row = Database::selectOne('SELECT id, title, review_status FROM documents WHERE id = ?', [$id]);
            if ($row === null) {
                throw ApiException::notFound('Document not found.');
            }
            if (!in_array((string) $row['review_status'], self::DOCUMENT_PENDING, true)) {
                throw ApiException::conflict('This document is not awaiting a review decision.');
            }
            $newStatus = $decision === 'approved' ? 'published' : 'returned';
            Database::execute(
                'UPDATE documents
                    SET review_status = ?, review_comments = ?, reviewed_by = ?, reviewed_at = ?,
                        published_at = ?, updated_at = ?
                  WHERE id = ?',
                [
                    $newStatus,
                    $comments,
                    (int) $actor['id'],
                    $now,
                    $decision === 'approved' ? $now : null,
                    $now,
                    $id,
                ]
            );
        } else {
            $row = Database::selectOne('SELECT id, title, review_status FROM videos WHERE id = ?', [$id]);
            if ($row === null) {
                throw ApiException::notFound('Video not found.');
            }
            if (!in_array((string) $row['review_status'], self::VIDEO_PENDING, true)) {
                throw ApiException::conflict('This video is not awaiting a review decision.');
            }
            $newStatus = $decision === 'approved'
                ? 'published'
                : ($decision === 'rejected' ? 'rejected' : 'returned');
            Database::execute(
                'UPDATE videos
                    SET review_status = ?, review_comments = ?, reviewed_by = ?, reviewed_at = ?,
                        published_at = ?, updated_at = ?
                  WHERE id = ?',
                [
                    $newStatus,
                    $comments,
                    (int) $actor['id'],
                    $now,
                    $decision === 'approved' ? $now : null,
                    $now,
                    $id,
                ]
            );
        }

        Database::insert(
            'INSERT INTO reviews (reviewable_type, reviewable_id, reviewer_user_id, decision, comments, reviewed_at)
             VALUES (?, ?, ?, ?, ?, ?)',
            [$type, $id, (int) $actor['id'], $decision, $comments, $now]
        );

        Activity::log(
            $type . '_reviewed',
            $type,
            $id,
            ucfirst($decision) . ' ' . $type . ' "' . $row['title'] . '"',
            ['decision' => $decision, 'comments' => $comments]
        );

        Response::json([
            'reviewable_type' => $type,
            'reviewable_id'   => $id,
            'decision'        => $decision,
            'review_status'   => $newStatus,
            'reviewed_by'     => $actor['name'] ?? null,
            'reviewed_at'     => Support::iso($now),
            'comments'        => $comments,
        ]);
    }

    /**
     * @param string[] $statuses
     */
    private static function placeholders(array $statuses): string
    {
        return implode(', ', array_fill(0, count($statuses), '?'));
    }

    /**
     * @param array<string,mixed> $row
     * @param string[]            $tags
     * @return array<string,mixed>
     */
    private function map(string $type, array $row, array $tags): array
    {
        return [
            'type'                  => $type,
            'id'                    => (int) $row['id'],
            'title'                 => $row['title'],
            'description'           => $row['description'],
            'category'              => $row['category'],
            'department'            => $row['department'],
            'department_code'       => $row['department_code'],
            'author_name'           => $row['author_name'],
            'review_status'         => $row['review_status'],
            'access_classification' => $row['access_classification'],
            'file_name'             => $row['file_name'],
            'file_path'             => $row['file_path'] ?? null,
            'mime_type'             => $row['mime_type'],
            'file_size_bytes'       => Support::toInt($row['file_size_bytes'] ?? 0),
            'duration_seconds'      => Support::toInt($row['duration_seconds'] ?? 0),
            'submitted_at'          => Support::iso($row['submitted_at']) ?? Support::iso($row['created_at']),
            'tags'                  => $tags,
        ];
    }

    /**
     * @return string[]
     */
    private function tagsFor(string $type, int $id): array
    {
        $rows = $type === 'document'
            ? Database::select(
                'SELECT t.name FROM document_tags dt JOIN tags t ON t.id = dt.tag_id WHERE dt.document_id = ? ORDER BY t.name',
                [$id]
            )
            : Database::select(
                'SELECT t.name FROM video_tags vt JOIN tags t ON t.id = vt.tag_id WHERE vt.video_id = ? ORDER BY t.name',
                [$id]
            );

        return array_map(static fn (array $r): string => (string) $r['name'], $rows);
    }
}
