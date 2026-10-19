<?php
/**
 * LSDS API - training application queries and presentation.
 */

declare(strict_types=1);

namespace Lsds\Repositories;

use Lsds\Database;
use Lsds\Support;
use Lsds\Workflow;

final class ApplicationRepository
{
    private const BASE_SELECT = "SELECT ta.*,
            u.email AS applicant_email,
            sp.full_name AS applicant_name,
            sp.designation AS applicant_designation,
            sup.full_name AS supervisor_name,
            rev.full_name AS pending_reviewer_name,
            d.name AS department,
            d.code AS department_code
        FROM training_applications ta
        JOIN users u ON u.id = ta.applicant_user_id
        JOIN departments d ON d.id = ta.department_id
        LEFT JOIN staff_profiles sp ON sp.user_id = ta.applicant_user_id
        LEFT JOIN staff_profiles sup ON sup.user_id = ta.supervisor_user_id
        LEFT JOIN staff_profiles rev ON rev.user_id = ta.pending_reviewer_user_id";

    /**
     * @param array<string,mixed> $filters
     * @return array<int,array<string,mixed>>
     */
    public static function list(array $filters = []): array
    {
        $where  = [];
        $params = [];

        $status = $filters['status'] ?? null;
        if ($status === 'pending') {
            $where[] = 'ta.status IN (' . self::placeholders(Workflow::PENDING_STATUSES) . ')';
            $params  = array_merge($params, Workflow::PENDING_STATUSES);
        } elseif ($status === 'finance') {
            $financeStatuses = ['pending_financial_review', 'financially_approved', 'disbursed', 'partially_disbursed', 'completed'];
            $where[] = 'ta.status IN (' . self::placeholders($financeStatuses) . ')';
            $params  = array_merge($params, $financeStatuses);
        } elseif (!empty($status)) {
            $where[]  = 'ta.status = ?';
            $params[] = $status;
        }

        if (!empty($filters['scope'])) {
            $where[]  = 'ta.scope = ?';
            $params[] = $filters['scope'];
        }
        if (!empty($filters['department'])) {
            $where[]  = 'd.code = ?';
            $params[] = $filters['department'];
        }
        if (!empty($filters['type'])) {
            $where[]  = 'ta.application_type = ?';
            $params[] = $filters['type'];
        }
        if (!empty($filters['stages']) && is_array($filters['stages'])) {
            $where[] = 'ta.current_stage_key IN (' . self::placeholders($filters['stages']) . ')';
            $params  = array_merge($params, array_values($filters['stages']));
        } elseif (!empty($filters['stage'])) {
            $where[]  = 'ta.current_stage_key = ?';
            $params[] = $filters['stage'];
        }

        if (!empty($filters['q'])) {
            $clause = Support::likeClause(
                (string) $filters['q'],
                ['ta.reference_no', 'sp.full_name', 'ta.programme_title', 'd.name'],
                $params
            );
            if ($clause !== null) {
                $where[] = $clause;
            }
        }

        $sort = $filters['sort'] ?? 'updated';
        $order = match ($sort) {
            'amount'    => 'ta.requested_amount DESC',
            'applicant' => 'sp.full_name ASC',
            default     => 'ta.updated_at DESC',
        };

        $sql = self::BASE_SELECT;
        if ($where) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY ' . $order;

        return array_map([self::class, 'map'], Database::select($sql, $params));
    }

    /**
     * @return array<string,mixed>|null
     */
    public static function find(int $id): ?array
    {
        $row = Database::selectOne(self::BASE_SELECT . ' WHERE ta.id = ?', [$id]);
        if ($row === null) {
            return null;
        }
        return self::hydrate(self::map($row));
    }

    /**
     * @param array<string,mixed> $row
     * @return array<string,mixed>
     */
    public static function map(array $row): array
    {
        $status = (string) $row['status'];

        return [
            'id'                              => (int) $row['id'],
            'reference_no'                    => $row['reference_no'],
            'applicant_user_id'               => (int) $row['applicant_user_id'],
            'applicant_name'                  => $row['applicant_name'],
            'applicant_designation'           => $row['applicant_designation'],
            'applicant_email'                 => $row['applicant_email'],
            'department_id'                   => (int) $row['department_id'],
            'department'                      => $row['department'],
            'department_code'                 => $row['department_code'],
            'supervisor_name'                 => $row['supervisor_name'],
            'application_type'                => $row['application_type'],
            'scope'                           => $row['scope'],
            'programme_title'                 => $row['programme_title'],
            'training_provider'               => $row['training_provider'],
            'country'                         => $row['country'],
            'venue'                           => $row['venue'],
            'programme_website'               => $row['programme_website'],
            'start_date'                      => Support::date($row['start_date']),
            'end_date'                        => Support::date($row['end_date']),
            'registration_deadline'           => Support::date($row['registration_deadline']),
            'programme_objectives'            => $row['programme_objectives'],
            'skills_to_acquire'               => self::splitList($row['skills_to_acquire']),
            'relevance_to_duties'             => $row['relevance_to_duties'],
            'departmental_benefits'           => $row['departmental_benefits'],
            'estimated_total_cost'            => Support::toFloat($row['estimated_total_cost']),
            'requested_amount'                => Support::toFloat($row['requested_amount']),
            'currency'                        => $row['currency'],
            'funding_justification'           => $row['funding_justification'],
            'post_training_knowledge_sharing' => $row['post_training_knowledge_sharing'],
            'post_training_report_plan'       => $row['post_training_report_plan'],
            'expected_organizational_benefits' => $row['expected_organizational_benefits'],
            'status'                          => $status,
            'current_stage_order'             => (int) $row['current_stage_order'],
            'current_stage_key'               => $row['current_stage_key'] ?: Workflow::stageKeyForStatus($status),
            'pending_reviewer_name'           => $row['pending_reviewer_name'],
            'submitted_at'                    => Support::iso($row['submitted_at']),
            'decided_at'                      => Support::iso($row['decided_at']),
            'created_at'                      => Support::iso($row['created_at']),
            'updated_at'                      => Support::iso($row['updated_at']),
        ];
    }

    /**
     * Attach the nested collections the detail view expects.
     *
     * @param array<string,mixed> $app
     * @return array<string,mixed>
     */
    public static function hydrate(array $app): array
    {
        $id = (int) $app['id'];

        $app['cost_items'] = array_map(static function (array $r): array {
            return [
                'item_type'   => $r['item_type'],
                'description' => $r['description'],
                'amount'      => Support::toFloat($r['amount']),
                'currency'    => $r['currency'],
            ];
        }, Database::select('SELECT item_type, description, amount, currency FROM training_cost_items WHERE application_id = ? ORDER BY id', [$id]));

        $app['documents'] = array_map(static function (array $r): array {
            return [
                'doc_type'           => $r['doc_type'],
                'original_file_name' => $r['original_file_name'],
                'mime_type'          => $r['mime_type'],
                'file_size_bytes'    => Support::toInt($r['file_size_bytes']),
                'scan_status'        => $r['scan_status'],
                'uploaded_by'        => Support::toInt($r['uploaded_by']),
                'created_at'         => Support::iso($r['created_at']),
            ];
        }, Database::select('SELECT doc_type, original_file_name, mime_type, file_size_bytes, scan_status, uploaded_by, created_at FROM training_application_documents WHERE application_id = ? ORDER BY id', [$id]));

        $app['approval_actions'] = array_map(static function (array $r): array {
            return [
                'stage_key'              => $r['stage_key'],
                'decision'               => $r['decision'],
                'reviewer_user_id'       => Support::toInt($r['reviewer_user_id']),
                'reviewer_name'          => $r['reviewer_name'],
                'reviewer_role_key'      => $r['reviewer_role_key'],
                'comments'               => $r['comments'],
                'is_visible_to_applicant' => Support::toBool($r['is_visible_to_applicant']),
                'acted_at'               => Support::iso($r['acted_at']),
            ];
        }, Database::select(
            'SELECT taa.stage_key, taa.decision, taa.reviewer_user_id, taa.reviewer_role_key,
                    taa.comments, taa.is_visible_to_applicant, taa.acted_at,
                    sp.full_name AS reviewer_name
               FROM training_approval_actions taa
               LEFT JOIN staff_profiles sp ON sp.user_id = taa.reviewer_user_id
              WHERE taa.application_id = ?
              ORDER BY taa.acted_at, taa.id',
            [$id]
        ));

        $app['financial'] = self::financial($id);
        $app['disbursements'] = self::disbursements($id);

        return $app;
    }

    /**
     * @return array<string,mixed>|null
     */
    public static function financial(int $applicationId): ?array
    {
        $row = Database::selectOne(
            'SELECT tfr.*, sp.full_name AS authorized_by_name
               FROM training_financial_records tfr
               LEFT JOIN staff_profiles sp ON sp.user_id = tfr.authorized_by
              WHERE tfr.application_id = ?
              LIMIT 1',
            [$applicationId]
        );
        if ($row === null) {
            return null;
        }

        $disbursed = (float) Database::scalar(
            "SELECT COALESCE(SUM(amount),0) FROM training_disbursements WHERE financial_record_id = ? AND status = 'completed'",
            [(int) $row['id']]
        );

        return [
            'approved_title'    => $row['approved_title'],
            'approved_amount'   => Support::toFloat($row['approved_amount']),
            'currency'          => $row['currency'],
            'cost_centre'       => $row['cost_centre'],
            'budget_reference'  => $row['budget_reference'],
            'financial_status'  => $row['financial_status'],
            'authorized_at'     => Support::iso($row['authorized_at']),
            'authorized_by_name' => $row['authorized_by_name'],
            'rejected_reason'   => $row['rejected_reason'],
            'notes'             => $row['notes'],
            'disbursed_total'   => $disbursed,
            'outstanding'       => round((float) $row['approved_amount'] - $disbursed, 2),
        ];
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public static function disbursements(int $applicationId): array
    {
        return array_map(static function (array $r): array {
            return [
                'id'                => (int) $r['id'],
                'payment_reference' => $r['payment_reference'],
                'amount'            => Support::toFloat($r['amount']),
                'payment_date'      => Support::date($r['payment_date']),
                'payment_method'    => $r['payment_method'],
                'status'            => $r['status'],
                'recorded_by_name'  => $r['recorded_by_name'],
            ];
        }, Database::select(
            'SELECT td.id, td.payment_reference, td.amount, td.payment_date, td.payment_method, td.status,
                    sp.full_name AS recorded_by_name
               FROM training_disbursements td
               LEFT JOIN staff_profiles sp ON sp.user_id = td.recorded_by
              WHERE td.application_id = ?
              ORDER BY td.payment_date, td.id',
            [$applicationId]
        ));
    }

    /**
     * @param string[] $items
     */
    private static function placeholders(array $items): string
    {
        return implode(', ', array_fill(0, count($items), '?'));
    }

    /**
     * Split a free-text list (newlines or commas) into an array of strings.
     *
     * @return string[]
     */
    private static function splitList(?string $value): array
    {
        if ($value === null || trim($value) === '') {
            return [];
        }
        $parts = preg_split('/\r?\n/', $value) ?: [];
        if (count($parts) === 1) {
            $parts = explode(',', $parts[0]);
        }
        $out = [];
        foreach ($parts as $part) {
            $part = trim($part);
            if ($part !== '') {
                $out[] = $part;
            }
        }
        return $out;
    }
}
