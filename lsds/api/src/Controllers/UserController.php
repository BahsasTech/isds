<?php
/**
 * LSDS API - user directory endpoint.
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

final class UserController
{
    public function index(Request $req): void
    {
        $where  = [];
        $params = [];

        if ($status = Support::trimmed($req->query('status'))) {
            $where[]  = 'u.account_status = ?';
            $params[] = $status;
        }
        if ($dept = Support::trimmed($req->query('department'))) {
            $where[]  = 'd.code = ?';
            $params[] = $dept;
        }
        if ($role = Support::trimmed($req->query('role'))) {
            $where[] = 'u.id IN (SELECT ur.user_id FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE r.role_key = ?)';
            $params[] = $role;
        }
        if ($q = Support::trimmed($req->query('q'))) {
            $clause = Support::likeClause($q, ['sp.full_name', 'u.email', 'sp.designation'], $params);
            if ($clause !== null) {
                $where[] = $clause;
            }
        }

        $sql = 'SELECT u.id, u.username, u.email, u.account_status, u.must_change_password,
                       u.last_login_at, u.last_login_ip, u.created_at,
                       sp.full_name AS name, sp.designation, sp.pn, sp.oracle_number, sp.phone,
                       d.name AS department, d.code AS department_code
                  FROM users u
                  LEFT JOIN staff_profiles sp ON sp.user_id = u.id
                  LEFT JOIN departments d ON d.id = sp.department_id';
        if ($where) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY sp.full_name ASC, u.id ASC';

        $rows = Database::select($sql, $params);
        $roles = $this->rolesByUser(array_column($rows, 'id'));

        $data = array_map(static function (array $r) use ($roles): array {
            $id = (int) $r['id'];
            return [
                'id'                 => $id,
                'name'               => $r['name'] ?? $r['username'],
                'email'              => $r['email'],
                'username'           => $r['username'],
                'roles'              => $roles[$id] ?? [],
                'designation'        => $r['designation'],
                'department'         => $r['department'],
                'department_code'    => $r['department_code'],
                'account_status'     => $r['account_status'],
                'pn'                 => $r['pn'],
                'oracle_number'      => $r['oracle_number'],
                'phone'              => $r['phone'],
                'last_login_at'      => Support::iso($r['last_login_at']),
                'must_change_password' => Support::toBool($r['must_change_password']),
                'created_at'         => Support::iso($r['created_at']),
            ];
        }, $rows);

        Response::json(['data' => $data, 'total' => count($data)]);
    }

    /**
     * @param int[] $userIds
     * @return array<int,string[]>
     */
    private function rolesByUser(array $userIds): array
    {
        if ($userIds === []) {
            return [];
        }
        $placeholders = implode(', ', array_fill(0, count($userIds), '?'));
        $rows = Database::select(
            'SELECT ur.user_id, r.role_key
               FROM user_roles ur
               JOIN roles r ON r.id = ur.role_id
              WHERE ur.user_id IN (' . $placeholders . ')
                AND r.is_active = 1
                AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
              ORDER BY r.role_key',
            $userIds
        );
        $out = [];
        foreach ($rows as $row) {
            $out[(int) $row['user_id']][] = (string) $row['role_key'];
        }
        return $out;
    }

    public function store(Request $req): void
    {
        $actor = Auth::requireUser();

        $email = Support::trimmed($req->input('email'));
        if ($email === null) {
            throw ApiException::validation('User email is required.');
        }
        $exists = Database::scalar('SELECT 1 FROM users WHERE email = ? LIMIT 1', [$email]);
        if ($exists) {
            throw ApiException::validation('Email already exists.');
        }

        $fullName = Support::trimmed($req->input('name')) ?? Support::trimmed($req->input('full_name')) ?? $email;

        $baseUsername = Support::slugify(strstr($email, '@', true) ?: $fullName);
        if ($baseUsername === '') {
            $baseUsername = 'user';
        }
        $username = $baseUsername;
        $n = 1;
        while (Database::scalar('SELECT 1 FROM users WHERE username = ? LIMIT 1', [$username])) {
            $username = $baseUsername . '-' . (++$n);
        }

        $password = Support::trimmed($req->input('password')) ?? self::generatePassword();
        if (strlen($password) < 8 || !preg_match('/[A-Z]/', $password) || !preg_match('/[a-z]/', $password) || !preg_match('/\d/', $password)) {
            throw ApiException::validation('Password must be at least 8 characters and include upper case, lower case and a digit.');
        }

        $userId = Database::transaction(static function () use ($req, $actor, $email, $username, $fullName, $password): int {
            $userId = Database::insert(
                'INSERT INTO users (username, email, password_hash, account_status, must_change_password,
                                    password_changed_at, created_by)
                 VALUES (?, ?, ?, "active", 1, NOW(), ?)',
                [$username, $email, password_hash($password, PASSWORD_DEFAULT), (int) $actor['id']]
            );

            Database::insert(
                'INSERT INTO staff_profiles (user_id, full_name, designation, department_id, phone)
                 VALUES (?, ?, ?, ?, ?)',
                [
                    $userId,
                    $fullName,
                    Support::trimmed($req->input('designation')) ?? 'Staff',
                    Support::departmentId($req->input('department_code')) ?? null,
                    Support::trimmed($req->input('phone')),
                ]
            );

            foreach (Support::toList($req->input('roles')) as $r) {
                $rid = Database::scalar('SELECT id FROM roles WHERE role_key = ? LIMIT 1', [$r]);
                if ($rid) {
                    Database::execute('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [$userId, (int) $rid]);
                }
            }

            return $userId;
        });

        Activity::log('user_created', 'user', $userId, 'Created user "' . $email . '".');

        $row = Database::selectOne(
            'SELECT u.id, u.email, u.account_status, sp.full_name, sp.designation, sp.phone,
                    d.name AS department, d.code AS department_code,
                    GROUP_CONCAT(r.role_name) AS role_names,
                    GROUP_CONCAT(r.role_key) AS role_keys
               FROM users u
               LEFT JOIN staff_profiles sp ON sp.user_id = u.id
               LEFT JOIN departments d ON d.id = sp.department_id
               LEFT JOIN user_roles ur ON ur.user_id = u.id
               LEFT JOIN roles r ON r.id = ur.role_id
              WHERE u.id = ?
              GROUP BY u.id',
            [$userId]
        );
        $rolesOut = Support::toList($row['role_keys']);
        Response::json([
            'id'              => (int) $row['id'],
            'email'           => $row['email'],
            'name'            => $row['full_name'],
            'designation'     => $row['designation'],
            'phone'           => $row['phone'],
            'department'      => $row['department'],
            'department_code' => $row['department_code'],
            'account_status'  => $row['account_status'],
            'roles'           => $rolesOut,
            'temp_password'   => $password,
        ], 201);
    }

    /** Random initial password that satisfies the complexity policy. */
    private static function generatePassword(): string
    {
        $upper  = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        $lower  = 'abcdefghijkmnpqrstuvwxyz';
        $digits = '23456789';
        $all    = $upper . $lower . $digits;

        $pick = static fn (string $set): string => $set[random_int(0, strlen($set) - 1)];
        $pw   = $pick($upper) . $pick($lower) . $pick($digits);
        for ($i = 0; $i < 10; $i++) {
            $pw .= $pick($all);
        }
        return $pw;
    }
}
