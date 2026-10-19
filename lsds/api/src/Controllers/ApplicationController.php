<?php
/**
 * LSDS API - training application endpoints.
 */

declare(strict_types=1);

namespace Lsds\Controllers;

use Lsds\Activity;
use Lsds\ApiException;
use Lsds\Auth;
use Lsds\Database;
use Lsds\Repositories\ApplicationRepository;
use Lsds\Request;
use Lsds\Response;
use Lsds\Support;
use Lsds\Workflow;

final class ApplicationController
{
    public function index(Request $req): void
    {
        $rows = ApplicationRepository::list([
            'status'     => $req->query('status'),
            'scope'      => $req->query('scope'),
            'department' => $req->query('department'),
            'type'       => $req->query('type'),
            'q'          => $req->query('q'),
            'sort'       => $req->query('sort'),
        ]);

        $page    = max(1, (int) $req->query('page', 1));
        $perPage = max(1, (int) $req->query('per_page', 10));

        Response::json(Support::paginate($rows, $page, $perPage));
    }

    public function show(Request $req): void
    {
        $app = ApplicationRepository::find((int) $req->param('id'));
        if ($app === null) {
            throw ApiException::notFound('Application not found.');
        }
        Response::json($app);
    }

    public function decide(Request $req): void
    {
        $id       = (int) $req->param('id');
        $decision = (string) $req->input('decision', '');
        $comments = Support::trimmed($req->input('comments'));

        $app = ApplicationRepository::find($id);
        if ($app === null) {
            throw ApiException::notFound('Application not found.');
        }

        if (!in_array($decision, ['approve', 'reject', 'return'], true)) {
            throw ApiException::validation('Unsupported decision.');
        }

        $actor   = Auth::requireUser();
        $roles   = $actor['roles'] ?? [];
        $roleKey = (string) ($roles[0] ?? 'staff');

        $oldStageKey = $app['current_stage_key'];

        if ($decision === 'approve') {
            $next = Workflow::nextStatus($app['status']);
            if ($next === null) {
                throw new ApiException('This application is not awaiting a decision.', 409);
            }
            $newStage   = Workflow::stageKeyForStatus($next);
            $reviewer   = Workflow::firstReviewerForStage($newStage);
            $newStatus  = $next;
            $actionName = 'approved';
            $comment    = $comments ?? 'Approved.';
        } elseif ($decision === 'reject') {
            $newStatus  = 'rejected';
            $newStage   = Workflow::stageKeyForStatus($newStatus);
            $reviewer   = null;
            $actionName = 'rejected';
            $comment    = $comments ?? 'No comment provided.';
        } else {
            $newStatus  = 'returned_for_correction';
            $newStage   = Workflow::stageKeyForStatus($newStatus);
            $reviewer   = null;
            $actionName = 'returned';
            $comment    = $comments ?? 'No comment provided.';
        }

        Database::transaction(function () use ($id, $app, $oldStageKey, $actionName, $comment, $newStatus, $newStage, $reviewer, $actor, $roleKey, $decision): void {
            $stageOrder = (int) $app['current_stage_order'] + ($decision === 'approve' ? 1 : 0);
            $decidedAt  = in_array($newStatus, ['rejected', 'returned_for_correction'], true) ? date('Y-m-d H:i:s') : null;

            Database::execute(
                'UPDATE training_applications
                    SET status = ?, current_stage_order = ?, current_stage_key = ?,
                        pending_reviewer_user_id = ?, decided_at = COALESCE(?, decided_at)
                  WHERE id = ?',
                [
                    $newStatus,
                    $stageOrder,
                    $newStage,
                    $reviewer !== null ? (int) $reviewer['id'] : null,
                    $decidedAt,
                    $id,
                ]
            );

            $step = $oldStageKey !== null ? Workflow::stepByKey((string) $oldStageKey) : null;

            Database::execute(
                'INSERT INTO training_approval_actions
                    (application_id, step_id, stage_key, reviewer_user_id, reviewer_role_key,
                     decision, comments, is_visible_to_applicant, ip_address, acted_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)',
                [
                    $id,
                    $step !== null ? (int) $step['id'] : null,
                    $oldStageKey ?? 'submitted',
                    (int) $actor['id'],
                    $roleKey,
                    $actionName,
                    $comment,
                    Request::ip(),
                    date('Y-m-d H:i:s'),
                ]
            );

            if ($decision === 'approve' && $newStatus === 'financially_approved') {
                $exists = Database::scalar('SELECT id FROM training_financial_records WHERE application_id = ? LIMIT 1', [$id]);
                if ($exists === false || $exists === null) {
                    $approvedAmount = (int) round(((float) $app['requested_amount'] * 0.98) / 500) * 500;
                    Database::insert(
                        'INSERT INTO training_financial_records
                            (application_id, approved_title, approved_amount, currency, financial_status, authorized_at, authorized_by)
                         VALUES (?, ?, ?, ?, "authorized", ?, ?)',
                        [
                            $id,
                            $app['programme_title'],
                            $approvedAmount,
                            $app['currency'],
                            date('Y-m-d H:i:s'),
                            (int) $actor['id'],
                        ]
                    );
                }
            }
        });

        Activity::log(
            'application_' . $actionName,
            'application',
            $id,
            sprintf('%s "%s" at the %s stage.', ucfirst($actionName), $app['programme_title'], $oldStageKey ?? 'submission'),
            ['decision' => $actionName, 'comments' => $comment]
        );

        $updated = ApplicationRepository::find($id);
        Response::json($updated);
    }

    public function store(Request $req): void
    {
        $actor = Auth::requireUser();

        $title = Support::trimmed($req->input('programme_title'));
        if ($title === null) {
            throw ApiException::validation('Programme title is required.');
        }

        $types = [
            'national_training', 'international_training', 'national_conference',
            'international_conference', 'professional_workshop', 'technical_seminar',
            'professional_certification', 'academic_conference', 'other',
        ];
        $type = (string) $req->input('application_type', 'professional_workshop');
        if (!in_array($type, $types, true)) {
            throw ApiException::validation('Unsupported application type.');
        }

        $scope = (string) $req->input('scope', 'national');
        if (!in_array($scope, ['national', 'international'], true)) {
            throw ApiException::validation('Scope must be national or international.');
        }

        $departmentId = Support::departmentId($req->input('department_code')) ?? $actor['department_id'];
        if ($departmentId === null) {
            throw ApiException::validation('A department is required for the application.');
        }

        $startDate = Support::dateOrNull($req->input('start_date'));
        $endDate   = Support::dateOrNull($req->input('end_date'));
        if ($startDate !== null && $endDate !== null && $endDate < $startDate) {
            throw ApiException::validation('End date cannot be before the start date.');
        }

        $requested = Support::toFloat($req->input('requested_amount'));
        if ($requested !== null && $requested < 0) {
            throw ApiException::validation('Requested amount cannot be negative.');
        }
        $estimated = Support::toFloat($req->input('estimated_total_cost'));
        if ($estimated === null && $requested !== null) {
            $estimated = round($requested * 1.05, 2);
        }

        $isDraft  = (string) $req->input('status', 'submitted') === 'draft';
        $status   = $isDraft ? 'draft' : 'pending_principal_manager';
        $stageKey = $isDraft ? null : 'principal_manager';
        $reviewer = $isDraft ? null : Workflow::firstReviewerForStage($stageKey);

        $skills = Support::toList($req->input('skills_to_acquire'));
        $costItems = $req->input('cost_items');
        $costItems = is_array($costItems) ? $costItems : [];

        $id = Database::transaction(static function () use (
            $req, $actor, $title, $type, $scope, $departmentId, $startDate, $endDate,
            $requested, $estimated, $status, $stageKey, $reviewer, $skills, $costItems, $isDraft
        ): int {
            $id = Database::insert(
                'INSERT INTO training_applications
                    (applicant_user_id, department_id, supervisor_user_id, application_type, scope,
                     programme_title, training_provider, country, venue, programme_website,
                     start_date, end_date, registration_deadline, programme_objectives,
                     skills_to_acquire, relevance_to_duties, departmental_benefits,
                     estimated_total_cost, requested_amount, currency, funding_justification,
                     post_training_knowledge_sharing, post_training_report_plan,
                     expected_organizational_benefits, status, current_stage_order, current_stage_key,
                     pending_reviewer_user_id, submission_count, submitted_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    (int) $actor['id'],
                    $departmentId,
                    Support::toInt($req->input('supervisor_user_id')),
                    $type,
                    $scope,
                    $title,
                    Support::trimmed($req->input('training_provider')),
                    Support::trimmed($req->input('country')) ?? ($scope === 'international' ? null : 'Nigeria'),
                    Support::trimmed($req->input('venue')),
                    Support::trimmed($req->input('programme_website')),
                    $startDate,
                    $endDate,
                    Support::dateOrNull($req->input('registration_deadline')),
                    Support::trimmed($req->input('programme_objectives')),
                    $skills !== [] ? implode("\n", $skills) : null,
                    Support::trimmed($req->input('relevance_to_duties')),
                    Support::trimmed($req->input('departmental_benefits')),
                    $estimated,
                    $requested,
                    Support::trimmed($req->input('currency')) ?? 'NGN',
                    Support::trimmed($req->input('funding_justification')),
                    Support::trimmed($req->input('post_training_knowledge_sharing')),
                    Support::trimmed($req->input('post_training_report_plan')),
                    Support::trimmed($req->input('expected_organizational_benefits')),
                    $status,
                    $isDraft ? 0 : 1,
                    $stageKey,
                    $reviewer !== null ? (int) $reviewer['id'] : null,
                    $isDraft ? 0 : 1,
                    $isDraft ? null : date('Y-m-d H:i:s'),
                ]
            );

            Database::execute(
                'UPDATE training_applications SET reference_no = ? WHERE id = ?',
                ['LSDS/TR/' . date('Y') . '/' . $id, $id]
            );

            foreach ($costItems as $item) {
                $amount = Support::toFloat($item['amount'] ?? null);
                if ($amount === null || $amount < 0) {
                    continue;
                }
                $itemType = (string) ($item['item_type'] ?? 'other');
                if (!in_array($itemType, ['registration_tuition', 'transportation', 'accommodation', 'daily_allowance', 'other'], true)) {
                    $itemType = 'other';
                }
                Database::insert(
                    'INSERT INTO training_cost_items (application_id, item_type, description, amount, currency)
                     VALUES (?, ?, ?, ?, ?)',
                    [
                        $id,
                        $itemType,
                        Support::trimmed($item['description'] ?? null),
                        $amount,
                        Support::trimmed($item['currency'] ?? null) ?? 'NGN',
                    ]
                );
            }

            if (!$isDraft) {
                $step = Workflow::stepByKey('principal_manager');
                Database::insert(
                    'INSERT INTO training_approval_actions
                        (application_id, step_id, stage_key, reviewer_user_id, reviewer_role_key,
                         decision, comments, is_visible_to_applicant, ip_address, acted_at)
                     VALUES (?, ?, ?, ?, ?, "submitted", ?, 1, ?, ?)',
                    [
                        $id,
                        $step !== null ? (int) $step['id'] : null,
                        'submitted',
                        (int) $actor['id'],
                        (string) ($actor['roles'][0] ?? 'staff'),
                        Support::trimmed($req->input('submission_comments')) ?? 'Application submitted.',
                        Request::ip(),
                        date('Y-m-d H:i:s'),
                    ]
                );
            }

            return $id;
        });

        Activity::log(
            $isDraft ? 'application_created' : 'application_submitted',
            'application',
            $id,
            sprintf('%s "%s".', $isDraft ? 'Created draft application' : 'Submitted application', $title)
        );

        $app = ApplicationRepository::find($id);
        Response::json($app, 201);
    }
}
