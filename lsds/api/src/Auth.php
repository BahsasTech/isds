<?php
/**
 * LSDS API - authentication and session handling.
 *
 * Uses PHP's native session for state, with the application identity (roles,
 * profile, department) resolved from the database on first access.
 */

declare(strict_types=1);

namespace Lsds;

final class Auth
{
    /** @var array<string,mixed>|null */
    private static ?array $cached = null;
    private static bool $resolved = false;

    /**
     * Currently authenticated user (or null).
     *
     * @return array<string,mixed>|null
     */
    public static function user(): ?array
    {
        if (self::$resolved) {
            return self::$cached;
        }
        self::$resolved = true;

        $uid = $_SESSION['user_id'] ?? null;
        if ($uid === null) {
            self::$cached = null;
            return null;
        }

        $user = self::loadUser((int) $uid);
        if ($user === null || $user['account_status'] !== 'active') {
            self::forget();
            self::$cached = null;
            return null;
        }

        self::$cached = $user;
        return $user;
    }

    /**
     * @return array<string,mixed>
     */
    public static function requireUser(): array
    {
        $user = self::user();
        if ($user === null) {
            throw ApiException::unauthorized('Your session has expired. Please sign in again.');
        }
        return $user;
    }

    public static function requireRole(string ...$roles): array
    {
        $user = self::requireUser();
        foreach ($roles as $role) {
            if (in_array($role, $user['roles'], true)) {
                return $user;
            }
        }
        throw ApiException::forbidden();
    }

    /**
     * @return array<string,mixed>|null
     */
    public static function loadUser(int $id): ?array
    {
        $row = Database::selectOne(
            'SELECT u.id, u.username, u.email, u.account_status, u.must_change_password,
                    u.last_login_at,
                    sp.full_name, sp.designation, sp.department_id, sp.pn, sp.oracle_number,
                    d.name AS department_name, d.code AS department_code
               FROM users u
               LEFT JOIN staff_profiles sp ON sp.user_id = u.id
               LEFT JOIN departments d ON d.id = sp.department_id
              WHERE u.id = ?',
            [$id]
        );

        if ($row === null) {
            return null;
        }

        $roles = array_map(
            static fn ($r) => $r['role_key'],
            Database::select(
                'SELECT r.role_key
                   FROM user_roles ur
                   JOIN roles r ON r.id = ur.role_id
                  WHERE ur.user_id = ?
                    AND r.is_active = 1
                    AND (ur.expires_at IS NULL OR ur.expires_at > NOW())',
                [$id]
            )
        );

        return [
            'id'                   => (int) $row['id'],
            'username'             => (string) $row['username'],
            'email'                => (string) $row['email'],
            'name'                 => (string) ($row['full_name'] ?: $row['username']),
            'roles'                => $roles,
            'designation'          => $row['designation'],
            'department'           => $row['department_name'],
            'department_id'        => $row['department_id'] !== null ? (int) $row['department_id'] : null,
            'department_code'      => $row['department_code'],
            'account_status'       => (string) $row['account_status'],
            'must_change_password' => (bool) $row['must_change_password'],
            'pn'                   => $row['pn'],
            'oracle_number'        => $row['oracle_number'],
        ];
    }

    /**
     * @return array<string,mixed> the session payload
     */
    public static function login(string $identifier, string $password, bool $remember): array
    {
        $identifier = strtolower(trim($identifier));
        if ($identifier === '' || $password === '') {
            throw ApiException::validation('Email and password are required.');
        }

        $maxAttempts = (int) Config::get('security.login_max_attempts', 5);
        $lockMinutes = (int) Config::get('security.login_lockout_minutes', 15);

        $row = Database::selectOne(
            'SELECT id, password_hash, account_status, failed_login_attempts, locked_until, must_change_password
               FROM users
              WHERE email = ? OR username = ?
              LIMIT 1',
            [$identifier, $identifier]
        );

        if ($row === null) {
            self::recordAttempt($identifier, false);
            throw new ApiException('No account is registered with that email address.', 401);
        }

        if ($row['locked_until'] !== null && strtotime((string) $row['locked_until']) > time()) {
            throw new ApiException('Account temporarily locked after too many failed attempts. Try again later.', 429);
        }

        if ($row['account_status'] !== 'active') {
            throw new ApiException('This account is not active. Contact your administrator.', 403);
        }

        if (!password_verify($password, (string) $row['password_hash'])) {
            $attempts = (int) $row['failed_login_attempts'] + 1;
            $lockedUntil = null;
            if ($attempts >= $maxAttempts) {
                $lockedUntil = date('Y-m-d H:i:s', time() + $lockMinutes * 60);
                $attempts = 0;
            }
            Database::execute(
                'UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?',
                [$attempts, $lockedUntil, $row['id']]
            );
            self::recordAttempt($identifier, false);
            throw new ApiException('Invalid credentials. Please try again.', 401);
        }

        $userId = (int) $row['id'];

        Database::execute(
            'UPDATE users
                SET failed_login_attempts = 0, locked_until = NULL,
                    last_login_at = NOW(), last_login_ip = ?
              WHERE id = ?',
            [Request::ip(), $userId]
        );

        self::recordAttempt($identifier, true);

        // Rehash if the stored hash needs updating.
        if (password_needs_rehash((string) $row['password_hash'], PASSWORD_DEFAULT)) {
            Database::execute(
                'UPDATE users SET password_hash = ? WHERE id = ?',
                [password_hash($password, PASSWORD_DEFAULT), $userId]
            );
        }

        session_regenerate_id(true);
        $_SESSION['user_id'] = $userId;
        $_SESSION['token']   = bin2hex(random_bytes(16));
        self::$resolved      = false;

        $user = self::loadUser($userId);
        if ($user === null) {
            throw new ApiException('Unable to load the account after sign-in.', 500);
        }

        return self::payload($user, $remember);
    }

    public static function logout(): void
    {
        self::forget();
    }

    public static function forget(): void
    {
        $_SESSION = [];
        if (session_status() === PHP_SESSION_ACTIVE) {
            if (ini_get('session.use_cookies')) {
                $params = session_get_cookie_params();
                setcookie(
                    session_name(),
                    '',
                    [
                        'expires'  => time() - 42000,
                        'path'     => $params['path'],
                        'domain'   => $params['domain'],
                        'secure'   => $params['secure'],
                        'httponly' => $params['httponly'],
                        'samesite' => $params['samesite'] ?? 'Lax',
                    ]
                );
            }
            session_destroy();
        }
        self::$resolved = true;
        self::$cached   = null;
    }

    /**
     * @param array<string,mixed> $user
     * @return array<string,mixed>
     */
    public static function payload(array $user, bool $remember): array
    {
        return [
            'token'    => (string) ($_SESSION['token'] ?? ''),
            'remember' => $remember,
            'issuedAt' => date('c'),
            'user'     => [
                'id'                 => $user['id'],
                'name'               => $user['name'],
                'email'              => $user['email'],
                'username'           => $user['username'],
                'roles'              => $user['roles'],
                'designation'        => $user['designation'],
                'department'         => $user['department'],
                'mustChangePassword' => (bool) $user['must_change_password'],
            ],
        ];
    }

    private static function recordAttempt(string $identifier, bool $success): void
    {
        Database::execute(
            'INSERT INTO login_attempts (identifier, ip_address, was_successful, user_agent)
             VALUES (?, ?, ?, ?)',
            [$identifier, Request::ip(), $success ? 1 : 0, Request::userAgent()]
        );
    }
}
