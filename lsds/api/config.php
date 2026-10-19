<?php
/**
 * LSDS API configuration.
 *
 * Values here are safe defaults for local development. For any real
 * deployment create a sibling `config.local.php` (not committed) that returns
 * an array which is merged over this one, and/or set the LSDS_DB_* environment
 * variables. The database password should never be committed to source control.
 */

declare(strict_types=1);

return [
    'app' => [
        'name'     => 'Learning and Staff Development System',
        'short'    => 'LSDS',
        'version'  => '1.0.0',
        'timezone' => 'Africa/Lagos',
        'debug'    => (bool) (getenv('LSDS_DEBUG') ?: false),
    ],

    'db' => [
        'host'    => getenv('LSDS_DB_HOST') ?: '127.0.0.1',
        'port'    => getenv('LSDS_DB_PORT') ?: '3306',
        'name'    => getenv('LSDS_DB_NAME') ?: 'lsds_db',
        'user'    => getenv('LSDS_DB_USER') ?: 'root',
        'pass'    => getenv('LSDS_DB_PASS') ?: '',
        'charset' => 'utf8mb4',
    ],

    'session' => [
        'name'     => 'lsds_sid',
        'lifetime' => 60 * 60 * 12,
        'path'     => '/',
        'samesite' => 'Lax',
        'secure'   => false,
    ],

    'security' => [
        'login_max_attempts'   => 5,
        'login_lockout_minutes' => 15,
    ],

    /* Allowed browser origins for CORS. The admin UI is normally served from
     * the same origin as the API (so CORS is not needed), but during local
     * development the UI may be opened from a different host/port. */
    'cors' => [
        'allow_credentials' => true,
        'origins'           => [
            'http://localhost',
            'http://127.0.0.1',
            'http://localhost:8080',
            'http://127.0.0.1:8080',
            'https://localhost',
        ],
    ],
];
