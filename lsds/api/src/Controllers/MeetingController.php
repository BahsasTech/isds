<?php
/**
 * LSDS API - video-conferencing meeting endpoints.
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

final class MeetingController
{
    private const SELECT = 'SELECT m.*, d.name AS department, d.code AS department_code,
            host.full_name AS host_name
        FROM meetings m
        LEFT JOIN departments d ON d.id = m.department_id
        LEFT JOIN staff_profiles host ON host.user_id = m.host_user_id';

    public function index(Request $req): void
    {
        $where  = [];
        $params = [];

        if ($status = Support::trimmed($req->query('status'))) {
            $where[]  = 'm.status = ?';
            $params[] = $status;
        }
        if ($provider = Support::trimmed($req->query('provider'))) {
            $where[]  = 'm.provider = ?';
            $params[] = $provider;
        }
        if ($dept = Support::trimmed($req->query('department'))) {
            $where[]  = 'd.code = ?';
            $params[] = $dept;
        }
        $timing = Support::trimmed($req->query('timing'));
        if ($timing === 'upcoming') {
            $where[] = 'm.start_at >= NOW()';
        } elseif ($timing === 'past') {
            $where[] = 'm.start_at < NOW()';
        }
        if ($q = Support::trimmed($req->query('q'))) {
            $clause = Support::likeClause($q, ['m.title', 'host.full_name', 'd.name'], $params);
            if ($clause !== null) {
                $where[] = $clause;
            }
        }

        $sql = self::SELECT;
        if ($where) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY m.start_at DESC';

        $rows = Database::select($sql, $params);
        $counts = $this->participantCounts(array_map(static fn ($r) => (int) $r['id'], $rows));

        $data = array_map(static function (array $r) use ($counts): array {
            return [
                'id'                => (int) $r['id'],
                'title'             => $r['title'],
                'description'       => $r['description'],
                'agenda'            => $r['agenda'],
                'host_name'         => $r['host_name'],
                'department'        => $r['department'],
                'department_code'   => $r['department_code'],
                'start_at'          => Support::iso($r['start_at']),
                'duration_minutes'  => (int) $r['duration_minutes'],
                'provider'          => $r['provider'],
                'meeting_url'       => $r['meeting_url'],
                'access_code'       => $r['access_code'],
                'access_restriction' => $r['access_restriction'],
                'recording_enabled' => Support::toBool($r['recording_enabled']),
                'status'            => $r['status'],
                'ended_at'          => Support::iso($r['ended_at']),
                'participant_count' => $counts[(int) $r['id']] ?? 0,
                'created_at'        => Support::iso($r['created_at']),
                'updated_at'        => Support::iso($r['updated_at']),
            ];
        }, $rows);

        $total     = (int) Database::scalar('SELECT COUNT(*) FROM meetings');
        $scheduled = (int) Database::scalar("SELECT COUNT(*) FROM meetings WHERE status = 'scheduled'");
        $live      = (int) Database::scalar("SELECT COUNT(*) FROM meetings WHERE status = 'live'");
        $recordings = (int) Database::scalar('SELECT COUNT(*) FROM meeting_recordings');

        Response::json([
            'data'   => $data,
            'total'  => count($data),
            'counts' => [
                'scheduled' => (int) Database::scalar("SELECT COUNT(*) FROM meetings WHERE status = 'scheduled'"),
                'live'      => $live,
                'ended'     => (int) Database::scalar("SELECT COUNT(*) FROM meetings WHERE status = 'ended'"),
                'cancelled' => (int) Database::scalar("SELECT COUNT(*) FROM meetings WHERE status = 'cancelled'"),
            ],
            'totals' => [
                'count'      => $total,
                'scheduled'  => $scheduled,
                'live'       => $live,
                'recordings' => $recordings,
            ],
        ]);
    }

    public function show(Request $req): void
    {
        $id  = (int) $req->param('id');
        $row = Database::selectOne(self::SELECT . ' WHERE m.id = ?', [$id]);
        if ($row === null) {
            throw ApiException::notFound('Meeting not found.');
        }

        $participantRows = Database::select(
            'SELECT p.*, sp.full_name AS name, sp.designation, dep.name AS department
               FROM meeting_participants p
               LEFT JOIN staff_profiles sp ON sp.user_id = p.user_id
               LEFT JOIN departments dep ON dep.id = sp.department_id
              WHERE p.meeting_id = ?
              ORDER BY FIELD(p.participant_role, "host", "moderator", "participant"), sp.full_name',
            [$id]
        );
        $participants = array_map(static fn (array $p): array => [
            'name'             => $p['name'],
            'designation'      => $p['designation'],
            'department'       => $p['department'],
            'participant_role' => $p['participant_role'],
            'invite_status'    => $p['invite_status'],
        ], $participantRows);

        $recordingRows = Database::select('SELECT * FROM meeting_recordings WHERE meeting_id = ? ORDER BY created_at DESC', [$id]);
        $recordings = array_map(static fn (array $r): array => [
            'id'                => (int) $r['id'],
            'title'             => $r['title'],
            'file_path'         => $r['file_path'],
            'duration_seconds'  => Support::toInt($r['duration_seconds']),
            'file_size_bytes'   => Support::toInt($r['file_size_bytes']),
            'recording_status'  => $r['recording_status'],
            'consent_obtained'  => Support::toBool($r['consent_obtained']),
            'created_at'        => Support::iso($r['created_at']),
        ], $recordingRows);

        Response::json([
            'id'                => (int) $row['id'],
            'title'             => $row['title'],
            'description'       => $row['description'],
            'agenda'            => $row['agenda'],
            'host_name'         => $row['host_name'],
            'department'        => $row['department'],
            'department_code'   => $row['department_code'],
            'start_at'          => Support::iso($row['start_at']),
            'duration_minutes'  => (int) $row['duration_minutes'],
            'provider'          => $row['provider'],
            'meeting_url'       => $row['meeting_url'],
            'access_code'       => $row['access_code'],
            'access_restriction' => $row['access_restriction'],
            'recording_enabled' => Support::toBool($row['recording_enabled']),
            'status'            => $row['status'],
            'ended_at'          => Support::iso($row['ended_at']),
            'participants'      => $participants,
            'recordings'        => $recordings,
        ]);
    }

    public function store(Request $req): void
    {
        $actor = Auth::requireUser();

        $title = Support::trimmed($req->input('title'));
        if ($title === null) {
            throw ApiException::validation('Meeting title is required.');
        }

        $provider = (string) $req->input('provider', 'jitsi');
        if (!in_array($provider, ['jitsi', 'zoom', 'teams', 'other'], true)) {
            $provider = 'jitsi';
        }
        $restriction = (string) $req->input('access_restriction', 'invite_only');
        if (!in_array($restriction, ['public', 'department', 'invite_only'], true)) {
            $restriction = 'invite_only';
        }
        $duration = (int) $req->input('duration_minutes', 60);
        if ($duration <= 0) {
            $duration = 60;
        }
        $recording = Support::toBool($req->input('recording_enabled')) ? 1 : 0;

        $meetingUrl = Support::trimmed($req->input('meeting_url'));
        if ($meetingUrl !== null && filter_var($meetingUrl, FILTER_VALIDATE_URL) === false) {
            throw ApiException::validation('Meeting link must be a valid URL (e.g. https://zoom.us/j/123456789).');
        }

        $id = Database::insert(
            'INSERT INTO meetings
                (title, description, agenda, host_user_id, department_id, start_at, duration_minutes,
                 provider, access_restriction, recording_enabled, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $title,
                Support::trimmed($req->input('description')),
                Support::trimmed($req->input('agenda')),
                (int) $actor['id'],
                Support::departmentId($req->input('department_code')) ?? $actor['department_id'],
                Support::dateTimeOrNull($req->input('start_at')) ?? date('Y-m-d H:i:s'),
                $duration,
                $provider,
                $restriction,
                $recording,
                'scheduled',
            ]
        );

        $accessCode = $restriction === 'invite_only' ? (string) random_int(100000, 999999) : null;
        Database::execute(
            'UPDATE meetings SET meeting_url = ?, access_code = ? WHERE id = ?',
            [$meetingUrl ?? ('https://meet.example.org/lsds/meeting-' . $id), $accessCode, $id]
        );

        Activity::log('meeting_created', 'meeting', $id, 'Scheduled meeting "' . $title . '".');

        $row = Database::selectOne(self::SELECT . ' WHERE m.id = ?', [$id]);
        Response::json([
            'id'                 => (int) $row['id'],
            'title'              => $row['title'],
            'description'        => $row['description'],
            'agenda'             => $row['agenda'],
            'host_name'          => $row['host_name'],
            'department'         => $row['department'],
            'department_code'    => $row['department_code'],
            'start_at'           => Support::iso($row['start_at']),
            'duration_minutes'   => (int) $row['duration_minutes'],
            'provider'           => $row['provider'],
            'meeting_url'        => $row['meeting_url'],
            'access_code'        => $row['access_code'],
            'access_restriction' => $row['access_restriction'],
            'recording_enabled'  => Support::toBool($row['recording_enabled']),
            'status'             => $row['status'],
            'ended_at'           => Support::iso($row['ended_at']),
            'participant_count'  => 0,
            'participants'       => [],
            'recordings'         => [],
            'created_at'         => Support::iso($row['created_at']),
            'updated_at'         => Support::iso($row['updated_at']),
        ], 201);
    }

    /**
     * @param int[] $ids
     * @return array<int,int>
     */
    private function participantCounts(array $ids): array
    {
        if ($ids === []) {
            return [];
        }
        $placeholders = implode(', ', array_fill(0, count($ids), '?'));
        $rows = Database::select(
            'SELECT meeting_id, COUNT(*) AS c FROM meeting_participants WHERE meeting_id IN (' . $placeholders . ') GROUP BY meeting_id',
            $ids
        );
        $out = [];
        foreach ($rows as $r) {
            $out[(int) $r['meeting_id']] = (int) $r['c'];
        }
        return $out;
    }
}
