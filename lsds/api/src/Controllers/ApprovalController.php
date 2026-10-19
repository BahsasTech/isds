<?php
/**
 * LSDS API - approval queue endpoint.
 */

declare(strict_types=1);

namespace Lsds\Controllers;

use Lsds\Repositories\ApplicationRepository;
use Lsds\Request;
use Lsds\Response;

final class ApprovalController
{
    public function queue(Request $req): void
    {
        $stage = $req->query('stage');

        $rows = ApplicationRepository::list([
            'status' => 'pending',
            'stage'  => $stage ?: null,
        ]);

        $now = time();
        foreach ($rows as &$row) {
            $updated = $row['updated_at'] !== null ? strtotime((string) $row['updated_at']) : $now;
            $row['days_waiting'] = max(0, (int) round(($now - $updated) / 86400));
        }
        unset($row);

        usort($rows, static fn ($a, $b) => $b['days_waiting'] <=> $a['days_waiting']);

        $counts = [];
        foreach ($rows as $row) {
            $key = (string) ($row['current_stage_key'] ?? '');
            $counts[$key] = ($counts[$key] ?? 0) + 1;
        }

        Response::json([
            'data'   => $rows,
            'total'  => count($rows),
            'counts' => $counts,
        ]);
    }
}
