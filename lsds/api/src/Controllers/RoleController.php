<?php
/**
 * LSDS API - role catalogue endpoint.
 */

declare(strict_types=1);

namespace Lsds\Controllers;

use Lsds\Database;
use Lsds\Request;
use Lsds\Response;
use Lsds\Support;

final class RoleController
{
    public function index(Request $req): void
    {
        $rows = Database::select(
            'SELECT r.id, r.role_key, r.role_name, r.description, r.is_active,
                    (SELECT COUNT(DISTINCT ur.user_id)
                       FROM user_roles ur
                       JOIN users u ON u.id = ur.user_id
                      WHERE ur.role_id = r.id
                        AND u.account_status = "active"
                        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())) AS users_count
               FROM roles r
              ORDER BY r.id'
        );

        $data = array_map(static fn (array $r): array => [
            'id'          => (int) $r['id'],
            'role_key'    => $r['role_key'],
            'role_name'   => $r['role_name'],
            'description' => $r['description'],
            'is_active'   => Support::toBool($r['is_active']),
            'users_count' => (int) $r['users_count'],
        ], $rows);

        Response::json(['data' => $data, 'total' => count($data)]);
    }
}
