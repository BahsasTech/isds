<?php
/**
 * LSDS API - financial records endpoint.
 */

declare(strict_types=1);

namespace Lsds\Controllers;

use Lsds\Database;
use Lsds\Request;
use Lsds\Response;
use Lsds\Support;

final class FinancialController
{
    public function index(Request $req): void
    {
        $where  = [];
        $params = [];

        if ($status = Support::trimmed($req->query('status'))) {
            $where[]  = 'tfr.financial_status = ?';
            $params[] = $status;
        }
        if ($dept = Support::trimmed($req->query('department'))) {
            $where[]  = 'd.code = ?';
            $params[] = $dept;
        }
        if ($q = Support::trimmed($req->query('q'))) {
            $clause = Support::likeClause($q, ['ta.reference_no', 'sp.full_name', 'ta.programme_title'], $params);
            if ($clause !== null) {
                $where[] = $clause;
            }
        }

        $sql = 'SELECT tfr.*, ta.reference_no, ta.programme_title, ta.updated_at,
                       sp.full_name AS applicant_name,
                       d.name AS department, d.code AS department_code,
                       auth.full_name AS authorized_by_name,
                       (SELECT COALESCE(SUM(td.amount),0) FROM training_disbursements td
                         WHERE td.financial_record_id = tfr.id AND td.status = "completed") AS disbursed_total
                  FROM training_financial_records tfr
                  JOIN training_applications ta ON ta.id = tfr.application_id
                  JOIN users u ON u.id = ta.applicant_user_id
                  LEFT JOIN staff_profiles sp ON sp.user_id = ta.applicant_user_id
                  LEFT JOIN staff_profiles auth ON auth.user_id = tfr.authorized_by
                  LEFT JOIN departments d ON d.id = ta.department_id';
        if ($where) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY tfr.authorized_at DESC, tfr.id DESC';

        $rows = Database::select($sql, $params);

        $data = array_map(static function (array $r): array {
            $approved    = Support::toFloat($r['approved_amount']) ?? 0.0;
            $disbursed   = Support::toFloat($r['disbursed_total']) ?? 0.0;
            return [
                'id'                => (int) $r['id'],
                'application_id'    => (int) $r['application_id'],
                'reference_no'      => $r['reference_no'],
                'applicant_name'    => $r['applicant_name'],
                'department'        => $r['department'],
                'department_code'   => $r['department_code'],
                'programme_title'   => $r['programme_title'],
                'approved_title'    => $r['approved_title'],
                'approved_amount'   => $approved,
                'currency'          => $r['currency'],
                'cost_centre'       => $r['cost_centre'],
                'budget_reference'  => $r['budget_reference'],
                'financial_status'  => $r['financial_status'],
                'authorized_at'     => Support::iso($r['authorized_at']),
                'authorized_by_name' => $r['authorized_by_name'],
                'disbursed_total'   => $disbursed,
                'outstanding'       => round($approved - $disbursed, 2),
                'created_at'        => Support::iso($r['created_at']),
                'updated_at'        => Support::iso($r['updated_at']),
            ];
        }, $rows);

        $all = Database::select('SELECT approved_amount, financial_status,
                (SELECT COALESCE(SUM(td.amount),0) FROM training_disbursements td
                  WHERE td.financial_record_id = tfr.id AND td.status = "completed") AS disbursed_total
            FROM training_financial_records tfr');

        $counts = [];
        $authorized = 0.0;
        $disbursedTotal = 0.0;
        foreach ($all as $r) {
            $counts[$r['financial_status']] = ($counts[$r['financial_status']] ?? 0) + 1;
            $authorized     += (float) $r['approved_amount'];
            $disbursedTotal += (float) $r['disbursed_total'];
        }

        Response::json([
            'data'   => $data,
            'total'  => count($data),
            'counts' => $counts,
            'totals' => [
                'count'      => count($all),
                'authorized' => $authorized,
                'disbursed'  => $disbursedTotal,
                'outstanding' => round($authorized - $disbursedTotal, 2),
            ],
        ]);
    }
}
