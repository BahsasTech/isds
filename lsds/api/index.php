<?php
/**
 * LSDS API - front controller.
 *
 * All requests are routed through this file. Apache should rewrite unknown
 * paths here (see .htaccess); the PHP built-in server is pointed here by
 * lsds/router.php.
 */

declare(strict_types=1);

use Lsds\Auth;
use Lsds\Config;
use Lsds\Request;
use Lsds\Response;
use Lsds\Router;

use Lsds\Controllers\ApplicationController;
use Lsds\Controllers\ApprovalController;
use Lsds\Controllers\AuditController;
use Lsds\Controllers\AuthController;
use Lsds\Controllers\BackupController;
use Lsds\Controllers\CourseController;
use Lsds\Controllers\DashboardController;
use Lsds\Controllers\DepartmentController;
use Lsds\Controllers\DisbursementController;
use Lsds\Controllers\DiscussionController;
use Lsds\Controllers\DocumentController;
use Lsds\Controllers\FinancialController;
use Lsds\Controllers\MeetingController;
use Lsds\Controllers\NotificationController;
use Lsds\Controllers\ReportController;
use Lsds\Controllers\ReviewController;
use Lsds\Controllers\RoleController;
use Lsds\Controllers\SessionController;
use Lsds\Controllers\SettingsController;
use Lsds\Controllers\TicketController;
use Lsds\Controllers\UserController;
use Lsds\Controllers\VideoController;
use Lsds\Controllers\WorkflowController;

require __DIR__ . '/bootstrap.php';

$router = new Router();

/**
 * Wrap a handler so an authenticated user is required before it runs.
 */
$guard = static function (callable $handler): callable {
    return static function (Request $req) use ($handler): void {
        Auth::requireUser();
        $handler($req);
    };
};

/* --- Authentication (public) --------------------------------------------- */
$router->post('/auth/login', [new AuthController(), 'login']);
$router->post('/auth/logout', [new AuthController(), 'logout']);
$router->get('/auth/session', [new AuthController(), 'session']);
$router->post('/auth/forgot-password', [new AuthController(), 'forgotPassword']);

/* --- Dashboard and notifications ----------------------------------------- */
$router->get('/dashboard/summary', $guard([new DashboardController(), 'summary']));
$router->get('/notifications', $guard([new NotificationController(), 'index']));

/* --- Applications and approvals ------------------------------------------ */
$router->get('/applications', $guard([new ApplicationController(), 'index']));
$router->post('/applications', $guard([new ApplicationController(), 'store']));
$router->get('/applications/{id}', $guard([new ApplicationController(), 'show']));
$router->post('/applications/{id}/decision', $guard([new ApplicationController(), 'decide']));
$router->get('/approvals/queue', $guard([new ApprovalController(), 'queue']));

/* --- Directory ------------------------------------------------------------ */
$router->get('/users', $guard([new UserController(), 'index']));
$router->post('/users', $guard([new UserController(), 'store']));
$router->get('/roles', $guard([new RoleController(), 'index']));
$router->get('/departments', $guard([new DepartmentController(), 'index']));
$router->post('/departments', $guard([new DepartmentController(), 'store']));

/* --- Knowledge sharing sessions ------------------------------------------ */
$router->get('/sessions', $guard([new SessionController(), 'index']));
$router->post('/sessions', $guard([new SessionController(), 'store']));
$router->get('/sessions/{id}', $guard([new SessionController(), 'show']));

/* --- Finance -------------------------------------------------------------- */
$router->get('/financial', $guard([new FinancialController(), 'index']));
$router->get('/disbursements', $guard([new DisbursementController(), 'index']));
$router->get('/reports/summary', $guard([new ReportController(), 'summary']));

/* --- Knowledge repository ------------------------------------------------- */
$router->get('/documents', $guard([new DocumentController(), 'index']));
$router->post('/documents', $guard([new DocumentController(), 'store']));
$router->get('/documents/{id}', $guard([new DocumentController(), 'show']));
$router->get('/videos', $guard([new VideoController(), 'index']));
$router->post('/videos', $guard([new VideoController(), 'store']));
$router->get('/videos/{id}', $guard([new VideoController(), 'show']));
$router->get('/discussions', $guard([new DiscussionController(), 'index']));
$router->post('/discussions', $guard([new DiscussionController(), 'store']));
$router->get('/discussions/{id}', $guard([new DiscussionController(), 'show']));
$router->get('/tickets', $guard([new TicketController(), 'index']));
$router->post('/tickets', $guard([new TicketController(), 'store']));
$router->get('/tickets/{id}', $guard([new TicketController(), 'show']));
$router->get('/courses', $guard([new CourseController(), 'index']));
$router->post('/courses', $guard([new CourseController(), 'store']));
$router->get('/courses/{id}', $guard([new CourseController(), 'show']));
$router->get('/meetings', $guard([new MeetingController(), 'index']));
$router->post('/meetings', $guard([new MeetingController(), 'store']));
$router->get('/meetings/{id}', $guard([new MeetingController(), 'show']));

/* --- Content review -------------------------------------------------------- */
$router->get('/reviews/queue', $guard([new ReviewController(), 'queue']));
$router->post('/reviews', $guard([new ReviewController(), 'store']));

/* --- Configuration -------------------------------------------------------- */
$router->get('/workflow', $guard([new WorkflowController(), 'index']));
$router->put('/workflow', $guard([new WorkflowController(), 'save']));
$router->get('/settings', $guard([new SettingsController(), 'index']));
$router->get('/audit-logs', $guard([new AuditController(), 'index']));
$router->get('/backups', $guard([new BackupController(), 'index']));

/* --- Health check --------------------------------------------------------- */
$router->get('/health', static function (Request $req): void {
    Response::json(['status' => 'ok', 'time' => date('c')]);
});

/* --- API root ------------------------------------------------------------- */
$router->get('/', static function (Request $req): void {
    Response::json([
        'name'    => Config::get('app.name', 'Learning and Staff Development System'),
        'short'   => Config::get('app.short', 'LSDS'),
        'version' => Config::get('app.version', '1.0.0'),
        'docs'    => 'All endpoints return JSON. Authenticate via POST /auth/login.',
    ]);
});

$router->dispatch(Request::capture());
