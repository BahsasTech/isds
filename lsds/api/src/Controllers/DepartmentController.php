<?php
/**
 * LSDS API - department directory endpoint.
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
use Lsds\Workflow;

final class DepartmentController
{
    public function index(Request $req): void
    {
        $rows = Database::select(
            'SELECT d.id, d.code, d.name, d.description,
                    (SELECT sp.full_name
                       FROM department_approvers da
                       JOIN staff_profiles sp ON sp.user_id = da.user_id
                      WHERE da.department_id = d.id AND da.position = "gm" AND da.is_active = 1
                      LIMIT 1) AS head,
                    (SELECT COUNT(*) FROM staff_profiles sp2 WHERE sp2.department_id = d.id) AS staff_count,
                    (SELECT COUNT(*) FROM training_applications ta WHERE ta.department_id = d.id) AS applications,
                    (SELECT COUNT(*) FROM training_applications ta
                      WHERE ta.department_id = d.id
                        AND ta.status IN (' . $this->placeholders(Workflow::PENDING_STATUSES) . ')) AS pending,
                    (SELECT COALESCE(SUM(td.amount), 0)
                       FROM training_disbursements td
                       JOIN training_applications ta2 ON ta2.id = td.application_id
                      WHERE ta2.department_id = d.id AND td.status = "completed") AS spend
               FROM departments d
              WHERE d.is_active = 1
              ORDER BY applications DESC, d.name',
            Workflow::PENDING_STATUSES
        );

        $data = array_map(static fn (array $r): array => [
            'id'           => (int) $r['id'],
            'code'         => $r['code'],
            'name'         => $r['name'],
            'description'  => $r['description'],
            'head'         => $r['head'],
            'staff_count'  => (int) $r['staff_count'],
            'applications' => (int) $r['applications'],
            'pending'      => (int) $r['pending'],
            'spend'        => (float) $r['spend'],
        ], $rows);

        Response::json(['data' => $data, 'total' => count($data)]);
    }

    public function store(Request $req): void
    {
        $actor = Auth::requireUser();

        $code = Support::trimmed($req->input('code'));
        $name = Support::trimmed($req->input('name'));

        if ($code === null || $name === null) {
            throw ApiException::validation('Department code and name are required.');
        }

        $code = strtoupper($code);
        if (strlen($code) > 20) {
            throw ApiException::validation('Department code must be 20 characters or fewer.');
        }
        if (!preg_match('/^[A-Z0-9_-]+$/', $code)) {
            throw ApiException::validation('Department code may only contain letters, numbers, hyphens and underscores.');
        }
        if (strlen($name) > 150) {
            throw ApiException::validation('Department name must be 150 characters or fewer.');
        }

        $taken = (int) Database::scalar(
            'SELECT COUNT(*) FROM departments WHERE code = ? OR name = ?',
            [$code, $name]
        );
        if ($taken > 0) {
            throw ApiException::conflict('A department with that code or name already exists.');
        }

        $isActive = Support::toBool($req->input('is_active', true)) ? 1 : 0;

        $id = Database::insert(
            'INSERT INTO departments (code, name, description, is_active, created_by) VALUES (?, ?, ?, ?, ?)',
            [$code, $name, Support::trimmed($req->input('description')), $isActive, (int) $actor['id']]
        );

        Activity::log('department_created', 'department', $id, 'Created department "' . $name . '" (' . $code . ').');

        $row = Database::selectOne(
            'SELECT id, code, name, description, is_active FROM departments WHERE id = ?',
            [$id]
        );

        Response::json([
            'id'           => (int) $row['id'],
            'code'         => $row['code'],
            'name'         => $row['name'],
            'description'  => $row['description'],
            'is_active'    => (int) $row['is_active'],
            'head'         => null,
            'staff_count'  => 0,
            'applications' => 0,
            'pending'      => 0,
            'spend'        => 0.0,
        ], 201);
    }

    private function placeholders(array $items): string
    {
        return implode(', ', array_fill(0, count($items), '?'));
    }
}
