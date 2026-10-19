<?php
/**
 * LSDS API - management reporting summary endpoint.
 */

declare(strict_types=1);

namespace Lsds\Controllers;

use Lsds\Database;
use Lsds\Request;
use Lsds\Response;
use Lsds\Workflow;

final class ReportController
{
    private const APPROVED_STATUSES = [
        'financially_approved', 'pending_disbursement', 'partially_disbursed', 'disbursed', 'completed',
    ];

    public function summary(Request $req): void
    {
        $apps = Database::select('SELECT id, department_id, scope, status, application_type, requested_amount, updated_at FROM training_applications');
        $financial = Database::select(
            'SELECT tfr.approved_amount, ta.department_id,
                    (SELECT COALESCE(SUM(td.amount),0) FROM training_disbursements td
                      WHERE td.financial_record_id = tfr.id AND td.status = "completed") AS disbursed_total
               FROM training_financial_records tfr
               JOIN training_applications ta ON ta.id = tfr.application_id'
        );
        $disb = Database::select('SELECT amount, status, payment_method FROM training_disbursements');
        $sessions = Database::select('SELECT status, session_date FROM knowledge_sharing_sessions');

        $authorized = 0.0;
        foreach ($financial as $r) {
            $authorized += (float) $r['approved_amount'];
        }
        $released = 0.0;
        foreach ($disb as $r) {
            $released += (float) $r['amount'];
        }

        $pendingCount = 0;
        $completedApps = 0;
        foreach ($apps as $a) {
            if (Workflow::isPending((string) $a['status'])) {
                $pendingCount++;
            }
            if (!in_array($a['status'], ['rejected', 'cancelled'], true)) {
                $completedApps++;
            }
        }
        $totalApps = count($apps);

        $delivered = array_filter($sessions, static fn ($s) => $s['status'] === 'completed');
        $published = array_filter($sessions, static fn ($s) => $s['status'] === 'published');
        $upcoming = array_filter($published, static fn ($s) => $s['session_date'] >= date('Y-m-d'));

        $feedbackRows = Database::select(
            "SELECT s.id, ROUND(AVG(f.rating),1) AS avg_rating
               FROM knowledge_sharing_sessions s
               JOIN session_feedback f ON f.session_id = s.id AND f.rating IS NOT NULL
              WHERE s.status = 'completed'
              GROUP BY s.id"
        );
        $avgFeedback = 0.0;
        if ($feedbackRows) {
            $sum = 0.0;
            foreach ($feedbackRows as $r) {
                $sum += (float) $r['avg_rating'];
            }
            $avgFeedback = round($sum / count($feedbackRows), 1);
        }

        $registrations = (int) Database::scalar("SELECT COUNT(*) FROM session_registrations WHERE status IN ('registered','attended')");
        $attendance = (int) Database::scalar("SELECT COUNT(*) FROM session_attendance WHERE attendance_status IN ('present','late')");

        $departments = $this->departments();
        $usersTotal = (int) Database::scalar('SELECT COUNT(*) FROM users');
        $usersActive = (int) Database::scalar("SELECT COUNT(*) FROM users WHERE account_status = 'active'");

        Response::json([
            'generatedAt' => date('c'),
            'monthly'     => $this->monthly(),
            'kpis'        => [
                'applications'      => $totalApps,
                'pending'           => $pendingCount,
                'completion_rate'   => $totalApps ? (int) round(($completedApps / $totalApps) * 100) : 0,
                'authorized'        => $authorized,
                'released'          => $released,
                'outstanding'       => round($authorized - $released, 2),
                'sessions_delivered' => count($delivered),
                'avg_feedback'      => $avgFeedback,
            ],
            'byDepartment' => $departments,
            'byScope'      => $this->byScope($apps),
            'byStatus'     => $this->byKey($apps, 'status'),
            'byType'       => $this->byKey($apps, 'application_type'),
            'disbursements' => [
                'count'     => count($disb),
                'by_method' => $this->tally($disb, 'payment_method'),
                'by_status' => $this->tally($disb, 'status'),
            ],
            'sessions' => [
                'total'         => count($sessions),
                'published'     => count($published),
                'delivered'     => count($delivered),
                'upcoming'      => count($upcoming),
                'registrations' => $registrations,
                'attendance'    => $attendance,
            ],
            'users' => ['total' => $usersTotal, 'active' => $usersActive],
        ]);
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    private function departments(): array
    {
        $rows = Database::select(
            'SELECT d.code, d.name,
                    (SELECT COUNT(*) FROM training_applications ta WHERE ta.department_id = d.id) AS applications,
                    (SELECT COUNT(*) FROM training_applications ta
                      WHERE ta.department_id = d.id
                        AND ta.status IN (' . $this->placeholders(Workflow::PENDING_STATUSES) . ')) AS pending,
                    (SELECT COALESCE(SUM(td.amount),0)
                       FROM training_disbursements td
                       JOIN training_applications ta2 ON ta2.id = td.application_id
                      WHERE ta2.department_id = d.id AND td.status = "completed") AS spend
               FROM departments d',
            Workflow::PENDING_STATUSES
        );

        $out = array_map(static fn (array $r): array => [
            'code'         => $r['code'],
            'name'         => $r['name'],
            'applications' => (int) $r['applications'],
            'spend'        => (float) $r['spend'],
            'pending'      => (int) $r['pending'],
        ], $rows);

        usort($out, static fn ($a, $b) => $b['spend'] <=> $a['spend']);
        return $out;
    }

    /**
     * @param array<int,array<string,mixed>> $apps
     * @return array<int,array<string,mixed>>
     */
    private function byScope(array $apps): array
    {
        $out = [];
        foreach (['national', 'international'] as $key) {
            $count = 0;
            $amount = 0.0;
            foreach ($apps as $a) {
                if ($a['scope'] === $key) {
                    $count++;
                    $amount += (float) $a['requested_amount'];
                }
            }
            $out[] = ['key' => $key, 'count' => $count, 'amount' => $amount];
        }
        return $out;
    }

    /**
     * @param array<int,array<string,mixed>> $rows
     * @return array<int,array<string,mixed>>
     */
    private function byKey(array $rows, string $column): array
    {
        $counts = $this->tally($rows, $column);
        $out = [];
        foreach ($counts as $key => $count) {
            $out[] = ['key' => $key, 'count' => $count];
        }
        usort($out, static fn ($a, $b) => $b['count'] <=> $a['count']);
        return $out;
    }

    /**
     * @param array<int,array<string,mixed>> $rows
     * @return array<string,int>
     */
    private function tally(array $rows, string $column): array
    {
        $out = [];
        foreach ($rows as $r) {
            $key = (string) $r[$column];
            $out[$key] = ($out[$key] ?? 0) + 1;
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
            $ts = strtotime("first day of -$i month");
            $ym = date('Y-m', $ts);
            $out[] = [
                'month'        => date('M', $ts),
                'applications' => $appsByMonth[$ym] ?? 0,
                'approved'     => $approvedByMonth[$ym] ?? 0,
            ];
        }
        return $out;
    }

    private function placeholders(array $items): string
    {
        return implode(', ', array_fill(0, count($items), '?'));
    }
}
