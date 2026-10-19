<?php
/**
 * LSDS - router for PHP's built-in development server.
 *
 * Lets the static admin pages and the PHP/PDO API run together on one origin:
 *
 *   php -S localhost:8000 lsds/router.php      (run from the project root, i.e.
 *                                               the folder that contains "lsds")
 *   open http://localhost:8000/lsds/
 *
 * Requests under /lsds/api are handed to the API front controller; everything
 * else is served as a normal static file (the .html admin pages and assets).
 * Apache ignores this file and uses lsds/api/.htaccess instead.
 */

declare(strict_types=1);

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$apiBase = '/lsds/api';

if ($path === $apiBase || strpos($path, $apiBase . '/') === 0) {
    $_SERVER['SCRIPT_NAME']     = $apiBase . '/index.php';
    $_SERVER['SCRIPT_FILENAME'] = __DIR__ . '/api/index.php';
    require __DIR__ . '/api/index.php';
    return true;
}

// Anything else: let the built-in server deliver the static admin files
// (or its own 404 page for unknown paths).
return false;
