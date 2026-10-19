<?php
/**
 * LSDS API - authentication endpoints.
 */

declare(strict_types=1);

namespace Lsds\Controllers;

use Lsds\Activity;
use Lsds\Auth;
use Lsds\Database;
use Lsds\Request;
use Lsds\Response;
use Lsds\Support;

final class AuthController
{
    public function session(Request $req): void
    {
        $user = Auth::user();
        Response::json($user === null ? null : Auth::payload($user, false));
    }

    public function login(Request $req): void
    {
        $email    = (string) $req->input('email', '');
        $password = (string) $req->input('password', '');
        $remember = Support::toBool($req->input('remember', false));

        $session = Auth::login($email, $password, $remember);

        Activity::log(
            'user_login',
            'user',
            (int) $session['user']['id'],
            $session['user']['name'] . ' signed in.',
            ['email' => $session['user']['email']]
        );

        Response::json($session);
    }

    public function logout(Request $req): void
    {
        $user = Auth::user();
        if ($user !== null) {
            Activity::log('user_logout', 'user', (int) $user['id'], $user['name'] . ' signed out.');
        }
        Auth::logout();
        Response::json(['ok' => true]);
    }

    public function forgotPassword(Request $req): void
    {
        $email = strtolower(trim((string) $req->input('email', '')));

        // Always answer with the same message so registered addresses cannot be
        // distinguished from unknown ones.
        $message = 'If the address is registered, a reset link has been sent.';

        if ($email !== '') {
            $user = Database::selectOne('SELECT id FROM users WHERE email = ? LIMIT 1', [$email]);
            if ($user !== null) {
                $token = bin2hex(random_bytes(32));
                Database::execute(
                    'INSERT INTO password_resets (user_id, token_hash, expires_at, requested_ip)
                     VALUES (?, ?, ?, ?)',
                    [
                        (int) $user['id'],
                        hash('sha256', $token),
                        date('Y-m-d H:i:s', time() + 3600),
                        Request::ip(),
                    ]
                );
                Activity::log('password_reset_requested', 'user', (int) $user['id'], 'Password reset requested.');
                // A mailer would deliver the reset link built from $token here.
            }
        }

        Response::json(['ok' => true, 'message' => $message]);
    }
}
