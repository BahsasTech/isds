<?php
/**
 * LSDS API - approval workflow configuration endpoint.
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

final class WorkflowController
{
    public function index(Request $req): void
    {
        $stepRows = Database::select(
            'SELECT s.*, r.role_name AS role_label
               FROM training_approval_steps s
               LEFT JOIN roles r ON r.role_key = s.required_role_key
              WHERE s.is_active = 1
              ORDER BY s.stage_order'
        );
        $steps = array_map(static fn (array $s): array => [
            'id'                => (int) $s['id'],
            'stage_order'       => (int) $s['stage_order'],
            'stage_key'         => $s['stage_key'],
            'stage_label'       => $s['stage_label'],
            'required_role_key' => $s['required_role_key'],
            'role_label'        => $s['role_label'],
            'scope'             => $s['scope'],
            'is_mandatory'      => Support::toBool($s['is_mandatory']),
            'allow_delegate'    => Support::toBool($s['allow_delegate']),
            'description'       => $s['description'],
        ], $stepRows);

        $approverRows = Database::select(
            'SELECT da.*, d.name AS department, d.code AS department_code, sp.full_name AS approver_name
               FROM department_approvers da
               JOIN departments d ON d.id = da.department_id
               LEFT JOIN staff_profiles sp ON sp.user_id = da.user_id
              ORDER BY d.name, FIELD(da.position, "principal_manager", "agm", "gm")'
        );
        $approvers = array_map(static fn (array $a): array => [
            'id'              => (int) $a['id'],
            'department'      => $a['department'],
            'department_code' => $a['department_code'],
            'position'        => $a['position'],
            'position_label'  => self::positionLabel($a['position']),
            'approver_name'   => $a['approver_name'],
            'start_date'      => Support::date($a['start_date']),
            'end_date'        => Support::date($a['end_date']),
            'is_active'       => Support::toBool($a['is_active']),
        ], $approverRows);

        $delegationRows = Database::select(
            'SELECT dr.*, del.full_name AS delegator_name, dg.full_name AS delegate_name
               FROM delegation_records dr
               LEFT JOIN staff_profiles del ON del.user_id = dr.delegator_user_id
               LEFT JOIN staff_profiles dg ON dg.user_id = dr.delegate_user_id
              ORDER BY dr.start_at DESC
              LIMIT 50'
        );
        $delegations = array_map(static fn (array $d): array => [
            'id'             => (int) $d['id'],
            'delegator_name' => $d['delegator_name'],
            'delegate_name'  => $d['delegate_name'],
            'position'       => self::positionLabel($d['position']),
            'start_at'       => Support::iso($d['start_at']),
            'end_at'         => Support::iso($d['end_at']),
            'reason'         => $d['reason'],
            'status'         => $d['status'],
        ], $delegationRows);

        $activeApprovers = (int) Database::scalar('SELECT COUNT(*) FROM department_approvers WHERE is_active = 1');
        $activeDelegations = (int) Database::scalar("SELECT COUNT(*) FROM delegation_records WHERE status = 'active'");

        Response::json([
            'steps'       => $steps,
            'approvers'   => $approvers,
            'delegations' => $delegations,
            'totals'      => [
                'steps'            => count($steps),
                'approvers'        => count($approvers),
                'active_approvers' => $activeApprovers,
                'delegations'      => $activeDelegations,
            ],
        ]);
    }

    public function save(Request $req): void
    {
        Auth::requireUser();

        $steps = $req->input('steps');
        if (!is_array($steps)) {
            throw ApiException::validation('Workflow steps are required.');
        }

        foreach ($steps as $step) {
            if (!is_array($step)) {
                continue;
            }
            $id = isset($step['id']) ? (int) $step['id'] : 0;

            if ($id > 0) {
                /* Partial update: only overwrite the fields that were sent. */
                $set   = [];
                $args  = [];
                $map   = [
                    'stage_order'       => 'i',
                    'stage_key'         => 's',
                    'stage_label'       => 's',
                    'required_role_key' => 's',
                    'scope'             => 's',
                    'is_mandatory'      => 'b',
                    'allow_delegate'    => 'b',
                    'description'       => 's',
                ];
                foreach ($map as $field => $kind) {
                    if (!array_key_exists($field, $step)) {
                        continue;
                    }
                    $value = $step[$field];
                    $set[] = $field . ' = ?';
                    $args[] = match ($kind) {
                        'i' => (int) $value,
                        'b' => Support::toBool($value) ? 1 : 0,
                        default => Support::trimmed($value),
                    };
                }
                if ($set === []) {
                    continue;
                }
                Database::execute(
                    'UPDATE training_approval_steps SET ' . implode(', ', $set) . ' WHERE id = ?',
                    [...$args, $id]
                );
                continue;
            }

            $key     = Support::trimmed($step['stage_key'] ?? null);
            $label   = Support::trimmed($step['stage_label'] ?? null) ?? $key;
            $role    = Support::trimmed($step['required_role_key'] ?? null);
            if ($key === null || $label === null || $role === null) {
                throw ApiException::validation('Each new workflow step needs stage_key, stage_label and required_role_key.');
            }

            $order     = isset($step['stage_order']) ? (int) $step['stage_order'] : 1 + (int) Database::scalar('SELECT MAX(stage_order) FROM training_approval_steps');
            $scope     = Support::trimmed($step['scope'] ?? null);
            if (!in_array($scope, ['department', 'organization'], true)) {
                $scope = 'department';
            }
            $mandatory   = Support::toBool($step['is_mandatory'] ?? true) ? 1 : 0;
            $delegate    = Support::toBool($step['allow_delegate'] ?? true) ? 1 : 0;
            $description = Support::trimmed($step['description'] ?? null);

            Database::insert(
                'INSERT INTO training_approval_steps
                    (stage_order, stage_key, stage_label, required_role_key, scope,
                     is_mandatory, allow_delegate, description, is_active)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)',
                [$order, $key, $label, $role, $scope, $mandatory, $delegate, $description]
            );
        }

        Activity::log('workflow_updated', 'workflow', null, 'Updated approval workflow configuration.');
        $this->index(new Request('GET', '/workflow'));
    }

    private static function positionLabel(?string $position): string
    {
        $map = [
            'principal_manager'  => 'Principal Manager',
            'agm'                => 'Assistant General Manager',
            'gm'                 => 'General Manager',
            'learning_development' => 'Learning & Development',
            'finance'            => 'Finance',
        ];
        return $map[$position] ?? (string) $position;
    }
}
