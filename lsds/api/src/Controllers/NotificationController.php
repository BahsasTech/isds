<?php
/**
 * LSDS API - notifications endpoint.
 */

declare(strict_types=1);

namespace Lsds\Controllers;

use Lsds\Auth;
use Lsds\Repositories\NotificationRepository;
use Lsds\Request;
use Lsds\Response;

final class NotificationController
{
    public function index(Request $req): void
    {
        $user = Auth::requireUser();
        Response::json([
            'notifications' => NotificationRepository::forUser((int) $user['id']),
        ]);
    }
}
