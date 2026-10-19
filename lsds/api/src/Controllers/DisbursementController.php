<?php
/**
 * LSDS API - disbursements endpoint.
 */

declare(strict_types=1);

namespace Lsds\Controllers;

use Lsds\Database;
use Lsds\Request;
use Lsds\Response;
use Lsds\Support;

final class DisbursementController
{
    public function index(Request $req): void
    {
        $where  = [];
        $params = [];

        if ($status = Support::trimmed($req->query('status'))) {
            $where[]  = 'td.status = ?';
            $params[] = $status;
        }
        if ($method = Support::trimmed($req->query('method'))) {
            $where[]  = 'td.payment_method = ?';
            $params[] = $method;
        }
        if ($q = Support::trimmed($req->query('q'))) {
            $clause = Support::likeClause($q, ['td.payment_reference', 'ta.reference_no', 'sp.full_name'], $params);
            if ($clause !== null) {
                $where[] = $clause;
            }
        }

        $sql = 'SELECT td.*, ta.reference_no, ta.programme_title,
                       sp.full_name AS applicant_name, d.name AS department,
                       rec.full_name AS recorded_by_name
                  FROM training_disbursements td
                  JOIN training_applications ta ON ta.id = td.application_id
                  LEFT JOIN staff_profiles sp ON sp.user_id = ta.applicant_user_id
                  LEFT JOIN departments d ON d.id = ta.department_id
                  LEFT JOIN staff_profiles rec ON rec.user_id = td.recorded_by';
        if ($where) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY td.payment_date DESC, td.id DESC';

        $rows = Database::select($sql, $params);

        $data = array_map(static function (array $r): array {
            return [
                'id'                => (int) $r['id'],
                'application_id'    => (int) $r['application_id'],
                'reference_no'      => $r['reference_no'],
                'applicant_name'    => $r['applicant_name'],
                'department'        => $r['department'],
                'programme_title'   => $r['programme_title'],
                'payment_reference' => $r['payment_reference'],
                'amount'            => Support::toFloat($r['amount']),
                'payment_date'      => Support::date($r['payment_date']),
                'payment_method'    => $r['payment_method'],
                'status'            => $r['status'],
                'recorded_by_name'  => $r['recorded_by_name'],
            ];
        }, $rows);

        $all = Database::select('SELECT amount, status, payment_method, payment_date FROM training_disbursements');
        $counts = [];
        $methods = [];
        $released = 0.0;
        $thisMonth = 0.0;
        $pending = 0.0;
        $nowMonth = date('Y-m');
        foreach ($all as $r) {
            $counts[$r['status']] = ($counts[$r['status']] ?? 0) + 1;
            $methods[$r['payment_method']] = ($methods[$r['payment_method']] ?? 0) + 1;
            $amount = (float) $r['amount'];
            $released += $amount;
            if ($r['payment_date'] !== null && substr((string) $r['payment_date'], 0, 7) === $nowMonth) {
                $thisMonth += $amount;
            }
            if ($r['status'] === 'pending') {
                $pending += $amount;
            }
        }

        Response::json([
            'data'    => $data,
            'total'   => count($data),
            'counts'  => $counts,
            'methods' => $methods,
            'totals'  => [
                'released'   => $released,
                'this_month' => $thisMonth,
                'pending'    => $pending,
            ],
        ]);
    }
}
