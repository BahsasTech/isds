<?php
/**
 * LSDS API - dashboard summary endpoint.
 */

declare(strict_types=1);

namespace Lsds\Controllers;

use Lsds\Auth;
use Lsds\Database;
use Lsds\Repositories\ApplicationRepository;
use Lsds\Repositories\NotificationRepository;
use Lsds\Request;
use Lsds\Response;
use Lsds\Support;
use Lsds\Workflow;

final class DashboardController
{
    private const APPROVED_STATUSES = [
        'financially_approved', 'pending_disbursement', 'partially_disbursed', 'disbursed', 'completed',
    ];

    public function summary(Request $req): void
    {
        $user = Auth::requireUser();

        $pendingCount = (int) Database::scalar(
            'SELECT COUNT(*) FROM training_applications WHERE status IN (' . $this->placeholders(Workflow::PENDING_STATUSES) . ')',
            Workflow::PENDING_STATUSES
        );

        $monthStart = date('Y-m-01 00:00:00');
        $lastMonthStart = date('Y-m-01 00:00:00', strtotime('first day of last month'));
        $lastMonthEnd   = date('Y-m-t 23:59:59', strtotime('first day of last month'));

        $appsThisMonth = (int) Database::scalar('SELECT COUNT(*) FROM training_applications WHERE created_at >= ?', [$monthStart]);
        $appsLastMonth = (int) Database::scalar('SELECT COUNT(*) FROM training_applications WHERE created_at BETWEEN ? AND ?', [$lastMonthStart, $lastMonthEnd]);

        $approvedThisMonth = (int) Database::scalar(
            'SELECT COUNT(*) FROM training_applications WHERE status IN (' . $this->placeholders(self::APPROVED_STATUSES) . ') AND updated_at >= ?',
            array_merge(self::APPROVED_STATUSES, [$monthStart])
        );
        $approvedLastMonth = (int) Database::scalar(
            'SELECT COUNT(*) FROM training_applications WHERE status IN (' . $this->placeholders(self::APPROVED_STATUSES) . ') AND updated_at BETWEEN ? AND ?',
            array_merge(self::APPROVED_STATUSES, [$lastMonthStart, $lastMonthEnd])
        );

        $pendingDepartments = (int) Database::scalar(
            'SELECT COUNT(DISTINCT department_id) FROM training_applications WHERE status IN (' . $this->placeholders(Workflow::PENDING_STATUSES) . ')',
            Workflow::PENDING_STATUSES
        );
        $pendingToday = (int) Database::scalar(
            'SELECT COUNT(*) FROM training_applications WHERE status IN (' . $this->placeholders(Workflow::PENDING_STATUSES) . ') AND updated_at >= ?',
            array_merge(Workflow::PENDING_STATUSES, [date('Y-m-d 00:00:00')])
        );

        $disbursedThisMonth = (float) Database::scalar(
            "SELECT COALESCE(SUM(amount),0) FROM training_disbursements WHERE status = 'completed' AND COALESCE(payment_date, DATE(created_at)) >= ?",
            [date('Y-m-01')]
        );
        $disbursedLastMonth = (float) Database::scalar(
            "SELECT COALESCE(SUM(amount),0) FROM training_disbursements WHERE status = 'completed' AND COALESCE(payment_date, DATE(created_at)) BETWEEN ? AND ?",
            [date('Y-m-01', strtotime('first day of last month')), date('Y-m-t', strtotime('first day of last month'))]
        );
        $authorizedTotal = (float) Database::scalar('SELECT COALESCE(SUM(approved_amount),0) FROM training_financial_records');

        $approvalRate = (int) Database::scalar('SELECT COUNT(*) FROM training_applications WHERE status IN (' . $this->placeholders(self::APPROVED_STATUSES) . ')', self::APPROVED_STATUSES);
        $totalApps = (int) Database::scalar('SELECT COUNT(*) FROM training_applications');

        $stats = [
            [
                'key' => 'pending', 'label' => 'Pending My Approval', 'value' => $pendingCount,
                'icon' => 'checkCircle', 'tone' => 'amber',
                'trend' => ['dir' => 'up', 'text' => '+' . $pendingToday . ' today'],
                'foot' => 'Across ' . $pendingDepartments . ' departments',
            ],
            [
                'key' => 'apps', 'label' => 'Applications (Month)', 'value' => $appsThisMonth,
                'icon' => 'fileText', 'tone' => 'blue',
                'trend' => ['dir' => $this->dir($appsThisMonth, $appsLastMonth), 'text' => $this->percent($appsThisMonth, $appsLastMonth)],
                'foot' => 'vs. ' . $appsLastMonth . ' last month',
            ],
            [
                'key' => 'approved', 'label' => 'Approved (Month)', 'value' => $approvedThisMonth,
                'icon' => 'badgeCheck', 'tone' => 'green',
                'trend' => ['dir' => $this->dir($approvedThisMonth, $approvedLastMonth), 'text' => $this->percent($approvedThisMonth, $approvedLastMonth)],
                'foot' => 'Approval rate ' . ($totalApps ? round(($approvalRate / $totalApps) * 100) : 0) . '%',
            ],
            [
                'key' => 'disbursed', 'label' => 'Disbursed (Month)', 'value' => $disbursedThisMonth, 'format' => 'currency',
                'icon' => 'wallet', 'tone' => 'violet',
                'trend' => ['dir' => $this->dir($disbursedThisMonth, $disbursedLastMonth), 'text' => $this->percent($disbursedThisMonth, $disbursedLastMonth)],
                'foot' => 'of ' . number_format($authorizedTotal) . ' authorized',
            ],
        ];

        Response::json([
            'generatedAt'        => date('c'),
            'stats'              => $stats,
            'pipeline'           => $this->pipeline(),
            'monthly'            => $this->monthly(),
            'recentApplications' => $this->recentApplications(),
            'upcomingSessions'   => $this->upcomingSessions(),
            'activity'           => $this->activity(),
            'announcements'      => $this->announcements(),
            'departments'        => $this->departments(),
            'notifications'      => NotificationRepository::forUser((int) $user['id']),
        ]);
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    private function pipeline(): array
    {
        $counts = [];
        foreach (Database::select('SELECT current_stage_key AS k, COUNT(*) AS c FROM training_applications WHERE current_stage_key IS NOT NULL GROUP BY current_stage_key') as $r) {
            $counts[(string) $r['k']] = (int) $r['c'];
        }

        $stages = [
            ['principal_manager', 'Principal Manager Review'],
            ['agm', 'Assistant General Manager'],
            ['gm', 'General Manager Review'],
            ['learning_development', 'Learning & Development Review'],
            ['finance_review', 'Financial Review'],
            ['disbursement', 'Disbursement'],
        ];

        $out = [];
        foreach ($stages as $i => [$key, $label]) {
            $out[] = ['stage' => $i + 1, 'label' => $label, 'count' => $counts[$key] ?? 0];
        }
        return $out;
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    private function monthly(): array
    {
        $appsByMonth = [];
        foreach (Database::select("SELECT DATE_FORMAT(created_at, '%Y-%m') AS ym, COUNT(*) AS c FROM training_applications GROUP BY ym") as $r) {
            $appsByMonth[(string) $r['ym']] = (int) $r['c'];
        }
        $approvedByMonth = [];
        foreach (Database::select(
            "SELECT DATE_FORMAT(updated_at, '%Y-%m') AS ym, COUNT(*) AS c
               FROM training_applications
              WHERE status IN (" . $this->placeholders(self::APPROVED_STATUSES) . ")
              GROUP BY ym",
            self::APPROVED_STATUSES
        ) as $r) {
            $approvedByMonth[(string) $r['ym']] = (int) $r['c'];
        }

        $out = [];
        for ($i = 7; $i >= 0; $i--) {
            $ts  = strtotime("first day of -$i month");
            $ym  = date('Y-m', $ts);
            $out[] = [
                'month'        => date('M', $ts),
                'applications' => $appsByMonth[$ym] ?? 0,
                'approved'     => $approvedByMonth[$ym] ?? 0,
            ];
        }
        return $out;
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    private function recentApplications(): array
    {
        $rows = ApplicationRepository::list(['sort' => 'updated']);
        $rows = array_slice($rows, 0, 6);

        return array_map(static function (array $a): array {
            return [
                'id'              => $a['id'],
                'reference_no'    => $a['reference_no'],
                'applicant_name'  => $a['applicant_name'],
                'department'      => $a['department'],
                'programme_title' => $a['programme_title'],
                'type'            => $a['application_type'],
                'scope'           => $a['scope'],
                'amount'          => $a['requested_amount'],
                'status'          => $a['status'],
                'updated_at'      => $a['updated_at'],
            ];
        }, $rows);
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    private function upcomingSessions(): array
    {
        $rows = Database::select(
            "SELECT s.id, s.title, s.session_date, s.start_time, s.venue, s.online_meeting_url,
                    s.presenter_name, s.max_attendance, s.status,
                    (SELECT COUNT(*) FROM session_registrations r
                      WHERE r.session_id = s.id AND r.status IN ('registered','attended')) AS registered
               FROM knowledge_sharing_sessions s
              WHERE s.status = 'published' AND s.session_date >= CURDATE()
              ORDER BY s.session_date, s.start_time
              LIMIT 5"
        );

        return array_map(static function (array $r): array {
            $online = !empty($r['online_meeting_url']);
            $physical = !empty($r['venue']);
            $mode = $online && $physical ? 'Hybrid' : ($online ? 'Online' : 'In-person');

            return [
                'id'         => (int) $r['id'],
                'title'      => $r['title'],
                'presenter'  => $r['presenter_name'],
                'date'       => Support::date($r['session_date']),
                'time'       => $r['start_time'] !== null ? substr((string) $r['start_time'], 0, 5) : '',
                'mode'       => $mode,
                'registered' => (int) $r['registered'],
                'capacity'   => $r['max_attendance'] !== null ? (int) $r['max_attendance'] : 0,
                'status'     => $r['status'],
            ];
        }, $rows);
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    private function activity(): array
    {
        $rows = Database::select(
            'SELECT al.action, al.entity_type, al.entity_id, al.description, al.created_at,
                    sp.full_name AS actor
               FROM activity_logs al
               LEFT JOIN staff_profiles sp ON sp.user_id = al.user_id
              ORDER BY al.created_at DESC, al.id DESC
              LIMIT 6'
        );

        return array_map(static function (array $r): array {
            [$icon, $tone] = self::activityVisual((string) $r['action']);
            $action = ucfirst(trim(str_replace('_', ' ', (string) $r['action'])));
            $target = $r['description'] !== null && $r['description'] !== ''
                ? (string) $r['description']
                : ($r['entity_type'] !== null ? $r['entity_type'] . ' #' . $r['entity_id'] : '');

            return [
                'actor'  => $r['actor'] ?? 'System',
                'action' => $action,
                'target' => $target,
                'icon'   => $icon,
                'tone'   => $tone,
                'at'     => Support::iso($r['created_at']),
            ];
        }, $rows);
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    private function announcements(): array
    {
        $rows = Database::select(
            "SELECT a.title, a.body, a.audience_type, a.published_at, d.name AS department
               FROM announcements a
               LEFT JOIN departments d ON d.id = a.department_id
              WHERE a.status = 'published' AND (a.expires_at IS NULL OR a.expires_at >= NOW())
              ORDER BY a.published_at DESC
              LIMIT 3"
        );

        return array_map(static function (array $r): array {
            $audience = match ((string) $r['audience_type']) {
                'department' => $r['department'] ?? 'Department',
                default      => 'All Staff',
            };
            return [
                'title'        => $r['title'],
                'audience'     => $audience,
                'body'         => $r['body'],
                'published_at' => Support::iso($r['published_at']),
                'pinned'       => false,
            ];
        }, $rows);
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    private function departments(): array
    {
        $rows = Database::select(
            'SELECT d.name,
                    COUNT(DISTINCT ta.id) AS applications,
                    COALESCE(SUM(CASE WHEN td.status = "completed" THEN td.amount ELSE 0 END), 0) AS spend
               FROM departments d
               LEFT JOIN training_applications ta ON ta.department_id = d.id
               LEFT JOIN training_disbursements td ON td.application_id = ta.id
              GROUP BY d.id, d.name
              ORDER BY spend DESC
              LIMIT 6'
        );

        return array_map(static fn (array $r): array => [
            'name'         => $r['name'],
            'spend'        => (float) $r['spend'],
            'applications' => (int) $r['applications'],
        ], $rows);
    }

    /**
     * @return array{0:string,1:string}
     */
    private static function activityVisual(string $action): array
    {
        $a = strtolower($action);
        if (str_contains($a, 'approved') || str_contains($a, 'recommend')) {
            return ['checkCircle', 'blue'];
        }
        if (str_contains($a, 'rejected') || str_contains($a, 'cancel')) {
            return ['xCircle', 'red'];
        }
        if (str_contains($a, 'return')) {
            return ['rotateCcw', 'amber'];
        }
        if (str_contains($a, 'authoriz') || str_contains($a, 'fund') || str_contains($a, 'financ')) {
            return ['wallet', 'green'];
        }
        if (str_contains($a, 'disburse') || str_contains($a, 'payment')) {
            return ['banknote', 'green'];
        }
        if (str_contains($a, 'upload')) {
            return ['upload', 'violet'];
        }
        if (str_contains($a, 'session') || str_contains($a, 'publish')) {
            return ['presentation', 'amber'];
        }
        if (str_contains($a, 'submitted') || str_contains($a, 'application')) {
            return ['fileText', 'sky'];
        }
        if (str_contains($a, 'login') || str_contains($a, 'logout')) {
            return ['logIn', 'slate'];
        }
        return ['refresh', 'slate'];
    }

    private function placeholders(array $items): string
    {
        return implode(', ', array_fill(0, count($items), '?'));
    }

    private function dir(float $current, float $previous): string
    {
        return $current >= $previous ? 'up' : 'down';
    }

    private function percent(float $current, float $previous): string
    {
        if ($previous <= 0.0) {
            return $current > 0 ? '100%' : '0%';
        }
        return (string) (int) round(abs(($current - $previous) / $previous) * 100) . '%';
    }
}
