<?php
/**
 * LSDS API - support ticket endpoints.
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

final class TicketController
{
    private const SELECT = 'SELECT t.*, d.name AS department, d.code AS department_code,
            req.full_name AS requester_name, asg.full_name AS assignee_name
        FROM support_tickets t
        LEFT JOIN departments d ON d.id = t.department_id
        LEFT JOIN staff_profiles req ON req.user_id = t.user_id
        LEFT JOIN staff_profiles asg ON asg.user_id = t.assigned_to';

    public function index(Request $req): void
    {
        $where  = [];
        $params = [];

        if ($status = Support::trimmed($req->query('status'))) {
            $where[]  = 't.status = ?';
            $params[] = $status;
        }
        if ($priority = Support::trimmed($req->query('priority'))) {
            $where[]  = 't.priority = ?';
            $params[] = $priority;
        }
        if ($category = Support::trimmed($req->query('category'))) {
            $where[]  = 't.issue_category = ?';
            $params[] = $category;
        }
        if ($dept = Support::trimmed($req->query('department'))) {
            $where[]  = 'd.code = ?';
            $params[] = $dept;
        }
        if ($q = Support::trimmed($req->query('q'))) {
            $clause = Support::likeClause($q, ['t.subject', 't.reference_no', 'req.full_name', 'asg.full_name'], $params);
            if ($clause !== null) {
                $where[] = $clause;
            }
        }

        $sql = self::SELECT;
        if ($where) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY t.updated_at DESC';

        $rows = Database::select($sql, $params);
        $data = array_map(static fn (array $r): array => self::map($r), $rows);

        $counts = [];
        foreach (Database::select('SELECT status, COUNT(*) AS c FROM support_tickets GROUP BY status') as $r) {
            $counts[$r['status']] = (int) $r['c'];
        }
        $priorities = [];
        foreach (Database::select('SELECT priority, COUNT(*) AS c FROM support_tickets GROUP BY priority') as $r) {
            $priorities[$r['priority']] = (int) $r['c'];
        }
        $total   = (int) Database::scalar('SELECT COUNT(*) FROM support_tickets');
        $open    = (int) Database::scalar("SELECT COUNT(*) FROM support_tickets WHERE status IN ('open','assigned','in_progress','pending_user_response')");
        $resolved = (int) Database::scalar("SELECT COUNT(*) FROM support_tickets WHERE status IN ('resolved','closed')");

        Response::json([
            'data'       => $data,
            'total'      => count($data),
            'counts'     => $counts,
            'priorities' => $priorities,
            'totals'     => ['count' => $total, 'open' => $open, 'resolved' => $resolved],
        ]);
    }

    public function show(Request $req): void
    {
        $id  = (int) $req->param('id');
        $row = Database::selectOne(self::SELECT . ' WHERE t.id = ?', [$id]);
        if ($row === null) {
            throw ApiException::notFound('Ticket not found.');
        }

        $commentRows = Database::select(
            'SELECT c.*, sp.full_name AS author_name
               FROM ticket_comments c
               LEFT JOIN staff_profiles sp ON sp.user_id = c.user_id
              WHERE c.ticket_id = ?
              ORDER BY c.created_at',
            [$id]
        );
        $comments = array_map(static fn (array $r): array => [
            'id'          => (int) $r['id'],
            'author_name' => $r['author_name'],
            'comment'     => $r['comment'],
            'is_internal' => Support::toBool($r['is_internal']),
            'created_at'  => Support::iso($r['created_at']),
        ], $commentRows);

        $data = self::map($row);
        $data['comments'] = $comments;
        Response::json($data);
    }

    public function store(Request $req): void
    {
        $actor = Auth::requireUser();

        $subject = Support::trimmed($req->input('subject'));
        if ($subject === null) {
            throw ApiException::validation('Ticket subject is required.');
        }

        $category = (string) $req->input('issue_category', 'other');
        $allowed  = ['hardware', 'software', 'network', 'account_access', 'conference_equipment', 'printing', 'email', 'other'];
        if (!in_array($category, $allowed, true)) {
            $category = 'other';
        }
        $priority = (string) $req->input('priority', 'medium');
        if (!in_array($priority, ['low', 'medium', 'high', 'critical'], true)) {
            $priority = 'medium';
        }

        $ref = 'TKT-' . date('ymd') . '-' . bin2hex(random_bytes(3));

        $id = Database::insert(
            'INSERT INTO support_tickets
                (reference_no, user_id, department_id, subject, issue_category, problem_description, priority, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, "open")',
            [
                $ref,
                (int) $actor['id'],
                Support::departmentId($req->input('department_code')) ?? $actor['department_id'],
                $subject,
                $category,
                Support::trimmed($req->input('problem_description')),
                $priority,
            ]
        );

        Activity::log('ticket_created', 'ticket', $id, 'Created support ticket "' . $ref . '".');

        $row = Database::selectOne(self::SELECT . ' WHERE t.id = ?', [$id]);
        $data = self::map($row);
        $data['comments'] = [];
        Response::json($data, 201);
    }

    /**
     * @param array<string,mixed> $r
     * @return array<string,mixed>
     */
    private static function map(array $r): array
    {
        return [
            'id'                  => (int) $r['id'],
            'reference_no'        => $r['reference_no'],
            'subject'             => $r['subject'],
            'issue_category'      => $r['issue_category'],
            'problem_description' => $r['problem_description'],
            'priority'            => $r['priority'],
            'status'              => $r['status'],
            'department'          => $r['department'],
            'department_code'     => $r['department_code'],
            'requester_name'      => $r['requester_name'],
            'assignee_name'       => $r['assignee_name'],
            'resolution_notes'    => $r['resolution_notes'],
            'resolved_at'         => Support::iso($r['resolved_at']),
            'closed_at'           => Support::iso($r['closed_at']),
            'created_at'          => Support::iso($r['created_at']),
            'updated_at'          => Support::iso($r['updated_at']),
        ];
    }
}
