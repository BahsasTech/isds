<?php
/**
 * LSDS API - knowledge sharing session endpoints.
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

final class SessionController
{
    private const SELECT = 'SELECT s.*,
            d.name AS organizing_department, d.code AS department_code,
            (SELECT COUNT(*) FROM session_registrations r
              WHERE r.session_id = s.id AND r.status IN ("registered","attended")) AS registered,
            (SELECT COUNT(*) FROM session_attendance a
              WHERE a.session_id = s.id AND a.attendance_status IN ("present","late")) AS attended,
            (SELECT COUNT(*) FROM session_feedback f
              WHERE f.session_id = s.id AND f.rating IS NOT NULL) AS feedback_count,
            (SELECT ROUND(AVG(f.rating), 1) FROM session_feedback f
              WHERE f.session_id = s.id AND f.rating IS NOT NULL) AS avg_rating
        FROM knowledge_sharing_sessions s
        LEFT JOIN departments d ON d.id = s.organizing_department_id';

    public function index(Request $req): void
    {
        $where  = [];
        $params = [];

        if ($status = Support::trimmed($req->query('status'))) {
            $where[]  = 's.status = ?';
            $params[] = $status;
        }
        if ($dept = Support::trimmed($req->query('department'))) {
            $where[]  = 'd.code = ?';
            $params[] = $dept;
        }
        $scope = Support::trimmed($req->query('scope'));
        if ($scope === 'upcoming') {
            $where[] = 's.session_date >= CURDATE()';
        } elseif ($scope === 'past') {
            $where[] = 's.session_date < CURDATE()';
        }
        if ($q = Support::trimmed($req->query('q'))) {
            $clause = Support::likeClause($q, ['s.title', 's.presenter_name', 's.topic', 'd.name'], $params);
            if ($clause !== null) {
                $where[] = $clause;
            }
        }

        $sql = self::SELECT;
        if ($where) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY s.session_date ASC, s.start_time ASC';

        $rows = Database::select($sql, $params);

        $counts = [];
        foreach (Database::select('SELECT status, COUNT(*) AS c FROM knowledge_sharing_sessions GROUP BY status') as $r) {
            $counts[$r['status']] = (int) $r['c'];
        }

        Response::json([
            'data'   => array_map([self::class, 'map'], $rows),
            'total'  => count($rows),
            'counts' => $counts,
        ]);
    }

    public function show(Request $req): void
    {
        $row = Database::selectOne(self::SELECT . ' WHERE s.id = ?', [(int) $req->param('id')]);
        if ($row === null) {
            throw ApiException::notFound('Session not found.');
        }
        Response::json(self::map($row));
    }

    public function store(Request $req): void
    {
        $actor = Auth::requireUser();

        $title = Support::trimmed($req->input('title'));
        if ($title === null) {
            throw ApiException::validation('Session title is required.');
        }

        $mode      = (string) $req->input('mode', 'Online');
        $hasOnline = in_array($mode, ['Online', 'Hybrid'], true);
        $hasVenue  = in_array($mode, ['In-person', 'Hybrid'], true);
        $status    = (string) $req->input('status', 'published');
        if (!in_array($status, ['draft', 'published'], true)) {
            $status = 'published';
        }

        $id = Database::insert(
            'INSERT INTO knowledge_sharing_sessions
                (title, topic, description, session_date, start_time, end_time, venue, online_meeting_url,
                 presenter_name, organizing_department_id, target_audience, registration_deadline,
                 max_attendance, status, created_by, published_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $title,
                Support::trimmed($req->input('topic')),
                Support::trimmed($req->input('description')),
                Support::dateOrNull($req->input('session_date')) ?? date('Y-m-d'),
                Support::timeOr('10:00:00', $req->input('start_time')),
                Support::timeOr('12:00:00', $req->input('end_time')),
                $hasVenue ? (Support::trimmed($req->input('venue')) ?? 'Auditorium, Block C') : null,
                null,
                Support::trimmed($req->input('presenter_name')) ?? $actor['full_name'],
                Support::departmentId($req->input('department_code')) ?? $actor['department_id'],
                Support::trimmed($req->input('target_audience')) ?? 'All Staff',
                Support::dateOrNull($req->input('registration_deadline')),
                (int) $req->input('max_attendance', 0),
                $status,
                (int) $actor['id'],
                $status === 'published' ? date('Y-m-d H:i:s') : null,
            ]
        );

        if ($hasOnline) {
            Database::execute(
                'UPDATE knowledge_sharing_sessions SET online_meeting_url = ? WHERE id = ?',
                ['https://meet.example.org/lsds/session-' . $id, $id]
            );
        }

        Activity::log('session_created', 'session', $id, 'Created knowledge session "' . $title . '".');

        $row = Database::selectOne(self::SELECT . ' WHERE s.id = ?', [$id]);
        Response::json(self::map($row), 201);
    }

    /**
     * @param array<string,mixed> $r
     * @return array<string,mixed>
     */
    public static function map(array $r): array
    {
        $online   = !empty($r['online_meeting_url']);
        $physical = !empty($r['venue']);
        $mode     = $online && $physical ? 'Hybrid' : ($online ? 'Online' : 'In-person');
        $max      = (int) $r['max_attendance'];
        $registered = (int) $r['registered'];

        return [
            'id'                    => (int) $r['id'],
            'title'                 => $r['title'],
            'topic'                 => $r['topic'],
            'description'           => $r['description'],
            'session_date'          => Support::date($r['session_date']),
            'start_time'            => $r['start_time'] !== null ? substr((string) $r['start_time'], 0, 5) : null,
            'end_time'              => $r['end_time'] !== null ? substr((string) $r['end_time'], 0, 5) : null,
            'mode'                  => $mode,
            'venue'                 => $r['venue'],
            'online_meeting_url'    => $r['online_meeting_url'],
            'presenter_name'        => $r['presenter_name'],
            'presenter_user_id'     => Support::toInt($r['presenter_user_id']),
            'organizing_department' => $r['organizing_department'],
            'department_code'       => $r['department_code'],
            'target_audience'       => $r['target_audience'],
            'registration_deadline' => Support::date($r['registration_deadline']),
            'max_attendance'        => $max,
            'registered'            => $registered,
            'attended'              => (int) $r['attended'],
            'avg_rating'            => $r['avg_rating'] !== null ? (float) $r['avg_rating'] : 0,
            'feedback_count'        => (int) $r['feedback_count'],
            'fill_pct'              => $max > 0 ? (int) round(($registered / $max) * 100) : 0,
            'status'                => $r['status'],
            'published_at'          => Support::iso($r['published_at']),
            'created_at'            => Support::iso($r['created_at']),
            'updated_at'            => Support::iso($r['updated_at']),
        ];
    }
}
