<?php
/**
 * LSDS API - bootstrap.
 *
 * Registers the autoloader, loads configuration, applies CORS/session setup,
 * and installs a top-level exception handler that renders JSON errors.
 */

declare(strict_types=1);

use Lsds\ApiException;
use Lsds\Config;
use Lsds\Response;

if (defined('LSDS_BOOTSTRAPPED')) {
    return;
}
define('LSDS_BOOTSTRAPPED', true);

define('LSDS_ROOT', __DIR__);

require LSDS_ROOT . '/src/Config.php';

spl_autoload_register(static function (string $class): void {
    $prefix = 'Lsds\\';
    if (strncmp($class, $prefix, strlen($prefix)) !== 0) {
        return;
    }
    $relative = substr($class, strlen($prefix));
    $file     = LSDS_ROOT . '/src/' . str_replace('\\', '/', $relative) . '.php';
    if (is_file($file)) {
        require $file;
    }
});

Config::load(LSDS_ROOT);

date_default_timezone_set((string) Config::get('app.timezone', 'Africa/Lagos'));

$debug = (bool) Config::get('app.debug', false);
ini_set('display_errors', $debug ? '1' : '0');
error_reporting(E_ALL);

/* --- CORS ---------------------------------------------------------------- */
$origin  = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = Config::get('cors.origins', []);
if ($origin !== '' && in_array($origin, $allowed, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    if (Config::get('cors.allow_credentials', true)) {
        header('Access-Control-Allow-Credentials: true');
    }
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Requested-With, Accept');
    header('Access-Control-Max-Age: 600');
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

/* --- Session ------------------------------------------------------------- */
if (PHP_SAPI !== 'cli' && session_status() === PHP_SESSION_NONE) {
    $secure = (bool) Config::get('session.secure', false);
    $isTls  = (($_SERVER['HTTPS'] ?? '') !== '' && ($_SERVER['HTTPS'] ?? '') !== 'off');
    session_set_cookie_params([
        'lifetime' => (int) Config::get('session.lifetime', 43200),
        'path'     => (string) Config::get('session.path', '/'),
        'secure'   => $secure || $isTls,
        'httponly' => true,
        'samesite' => (string) Config::get('session.samesite', 'Lax'),
    ]);
    session_name((string) Config::get('session.name', 'lsds_sid'));
    session_start();
}

/* --- Error handling ------------------------------------------------------ */
set_exception_handler(static function (\Throwable $e): void {
    if ($e instanceof ApiException) {
        Response::error($e->getMessage(), $e->status, $e->details);
        return;
    }

    error_log('[LSDS] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    $details = (bool) Config::get('app.debug', false)
        ? ['reason' => $e->getMessage(), 'file' => $e->getFile(), 'line' => $e->getLine()]
        : [];
    Response::error('An unexpected server error occurred.', 500, $details);
});

set_error_handler(static function (int $severity, string $message, string $file, int $line): bool {
    if (!(error_reporting() & $severity)) {
        return false;
    }
    throw new \ErrorException($message, 0, $severity, $file, $line);
});
