<?php
/**
 * LSDS API - approval workflow definitions and transition helpers.
 */

declare(strict_types=1);

namespace Lsds;

final class Workflow
{
    /** Statuses that mean "sitting in somebody's queue". */
    public const PENDING_STATUSES = [
        'submitted',
        'pending_principal_manager',
        'pending_agm',
        'pending_gm',
        'pending_learning_development',
        'pending_financial_review',
    ];

    /** status -> next status when a reviewer approves. */
    public const FLOW = [
        'submitted'                   => 'pending_principal_manager',
        'pending_principal_manager'   => 'pending_agm',
        'pending_agm'                 => 'pending_gm',
        'pending_gm'                  => 'pending_learning_development',
        'pending_learning_development' => 'pending_financial_review',
        'pending_financial_review'    => 'financially_approved',
        'financially_approved'        => 'disbursed',
    ];

    /** Current workflow status -> configured stage key. */
    public const STATUS_STAGE = [
        'submitted'                   => 'principal_manager',
        'pending_principal_manager'   => 'principal_manager',
        'pending_agm'                 => 'agm',
        'pending_gm'                  => 'gm',
        'pending_learning_development' => 'learning_development',
        'pending_financial_review'    => 'finance_review',
        'financially_approved'        => 'disbursement',
        'pending_disbursement'        => 'disbursement',
        'partially_disbursed'         => 'disbursement',
        'disbursed'                   => 'disbursement',
        'completed'                   => 'disbursement',
    ];

    /** Stage key -> role that owns it, used to name the next reviewer. */
    public const STAGE_ROLE = [
        'principal_manager'   => 'principal_manager',
        'agm'                 => 'agm',
        'gm'                  => 'gm',
        'learning_development' => 'ld_officer',
        'finance_review'      => 'finance_officer',
        'disbursement'        => 'finance_officer',
    ];

    public static function isPending(?string $status): bool
    {
        return in_array($status, self::PENDING_STATUSES, true);
    }

    public static function nextStatus(?string $status): ?string
    {
        return $status !== null && isset(self::FLOW[$status]) ? self::FLOW[$status] : null;
    }

    public static function stageKeyForStatus(?string $status): ?string
    {
        return $status !== null && isset(self::STATUS_STAGE[$status]) ? self::STATUS_STAGE[$status] : null;
    }

    /**
     * Ordered active steps.
     *
     * @return array<int,array<string,mixed>>
     */
    public static function steps(): array
    {
        return Database::select(
            'SELECT id, stage_order, stage_key, stage_label, required_role_key, scope,
                    is_mandatory, allow_delegate, is_active, description
               FROM training_approval_steps
              WHERE is_active = 1
              ORDER BY stage_order'
        );
    }

    /**
     * @return array<string,mixed>|null
     */
    public static function stepByKey(string $stageKey): ?array
    {
        return Database::selectOne(
            'SELECT * FROM training_approval_steps WHERE stage_key = ? LIMIT 1',
            [$stageKey]
        );
    }

    /**
     * Users who may act at the given stage (role holders), optionally scoped to
     * an application's department.
     *
     * @return array<int,array<string,mixed>>
     */
    public static function reviewersFor(string $stageKey, ?int $departmentId = null): array
    {
        $step = self::stepByKey($stageKey);
        if ($step === null) {
            return [];
        }
        $roleKey = (string) $step['required_role_key'];

        return Database::select(
            'SELECT u.id, u.username, u.email, sp.full_name AS name, sp.designation, sp.department_id
               FROM users u
               JOIN user_roles ur ON ur.user_id = u.id
               JOIN roles r ON r.id = ur.role_id AND r.role_key = ?
               LEFT JOIN staff_profiles sp ON sp.user_id = u.id
              WHERE u.account_status = "active"
                AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
              ORDER BY u.id',
            [$roleKey]
        );
    }

    /**
     * First active user holding the role that owns a stage, used to name the
     * person an application is now waiting on.
     *
     * @return array<string,mixed>|null
     */
    public static function firstReviewerForStage(?string $stageKey): ?array
    {
        if ($stageKey === null || !isset(self::STAGE_ROLE[$stageKey])) {
            return null;
        }
        return Database::selectOne(
            'SELECT u.id, sp.full_name AS name
               FROM users u
               JOIN user_roles ur ON ur.user_id = u.id
               JOIN roles r ON r.id = ur.role_id AND r.role_key = ?
               LEFT JOIN staff_profiles sp ON sp.user_id = u.id
              WHERE u.account_status = "active"
              ORDER BY u.id
              LIMIT 1',
            [self::STAGE_ROLE[$stageKey]]
        );
    }

    /**
     * Stage keys the given user is entitled to act upon.
     *
     * @param string[] $roles
     * @return string[]
     */
    public static function stagesForRoles(array $roles): array
    {
        if (in_array('sysadmin', $roles, true)) {
            return array_map(static fn ($s) => (string) $s['stage_key'], self::steps());
        }
        $stages = [];
        foreach (self::steps() as $step) {
            if (in_array((string) $step['required_role_key'], $roles, true)) {
                $stages[] = (string) $step['stage_key'];
            }
        }
        return $stages;
    }
}
