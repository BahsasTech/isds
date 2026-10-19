<?php
/**
 * LSDS API - backup log endpoint.
 */

declare(strict_types=1);

namespace Lsds\Controllers;

use Lsds\Database;
use Lsds\Request;
use Lsds\Response;
use Lsds\Support;

final class BackupController
{
    public function index(Request $req): void
    {
        $where  = [];
        $params = [];

        if ($status = Support::trimmed($req->query('status'))) {
            $where[]  = 'b.status = ?';
            $params[] = $status;
        }
        if ($type = Support::trimmed($req->query('type'))) {
            $where[]  = 'b.backup_type = ?';
            $params[] = $type;
        }

        $sql = 'SELECT b.*,
                       COALESCE(sp.full_name, "Scheduled") AS triggered_by_name,
                       CASE WHEN b.finished_at IS NOT NULL
                            THEN TIMESTAMPDIFF(MINUTE, b.started_at, b.finished_at)
                            ELSE NULL END AS duration_minutes
                  FROM backup_logs b
                  LEFT JOIN staff_profiles sp ON sp.user_id = b.triggered_by';
        if ($where) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY b.started_at DESC, b.id DESC';

        $rows = Database::select($sql, $params);

        $data = array_map(static fn (array $r): array => [
            'id'                => (int) $r['id'],
            'backup_type'       => $r['backup_type'],
            'status'            => $r['status'],
            'started_at'        => Support::iso($r['started_at']),
            'finished_at'       => Support::iso($r['finished_at']),
            'duration_minutes'  => Support::toInt($r['duration_minutes']),
            'file_path'         => $r['file_path'],
            'file_size_bytes'   => Support::toInt($r['file_size_bytes']),
            'error_message'     => $r['error_message'],
            'triggered_by'      => Support::toInt($r['triggered_by']),
            'triggered_by_name' => $r['triggered_by_name'] ?: 'Scheduled',
            'created_at'        => Support::iso($r['created_at']),
        ], $rows);

        $counts = [];
        foreach (Database::select('SELECT status, COUNT(*) AS c FROM backup_logs GROUP BY status') as $r) {
            $counts[$r['status']] = (int) $r['c'];
        }
        $types = [];
        foreach (Database::select('SELECT backup_type, COUNT(*) AS c FROM backup_logs GROUP BY backup_type') as $r) {
            $types[$r['backup_type']] = (int) $r['c'];
        }
        $total     = (int) Database::scalar('SELECT COUNT(*) FROM backup_logs');
        $completed = $counts['completed'] ?? 0;
        $failed    = $counts['failed'] ?? 0;
        $lastSize  = (int) Database::scalar(
            "SELECT file_size_bytes FROM backup_logs WHERE status = 'completed' AND file_size_bytes IS NOT NULL ORDER BY finished_at DESC, id DESC LIMIT 1"
        );

        Response::json([
            'data'   => $data,
            'total'  => count($data),
            'counts' => $counts,
            'types'  => $types,
            'totals' => ['count' => $total, 'completed' => $completed, 'failed' => $failed, 'last_size' => $lastSize],
        ]);
    }
}
