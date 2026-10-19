<?php
/**
 * LSDS API - first-run installer.
 *
 * Creates the initial System Administrator (and, with --demo, a set of
 * demonstration accounts) plus a baseline set of departments. Reference data
 * (roles, approval steps, categories, settings) is expected to have been
 * loaded already from seed_reference_data.sql.
 *
 * Usage (from the api directory):
 *   php bin/install.php --email=admin@lsds.gov.ng --password=Secret@123 --name="Jane Doe"
 *   php bin/install.php --demo
 *
 * Options:
 *   --email=<address>     Administrator login email (default admin@lsds.gov.ng)
 *   --username=<name>     Administrator username (default admin)
 *   --password=<secret>   Administrator password (prompted if omitted)
 *   --name="<full name>"  Administrator display name
 *   --department=<code>   Department code for the admin profile (default first)
 *   --demo                Also create one account per role with Demo@1234
 *   --force               Re-run even if an administrator already exists
 */

declare(strict_types=1);

use Lsds\Database;
use Lsds\Config;

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "This installer must be run from the command line.\n");
    exit(1);
}

require dirname(__DIR__) . '/bootstrap.php';

/** @return array<string,string> */
function parse_args(array $argv): array
{
    $out = [];
    foreach (array_slice($argv, 1) as $arg) {
        if (strpos($arg, '--') !== 0) {
            continue;
        }
        $arg = substr($arg, 2);
        if (strpos($arg, '=') !== false) {
            [$k, $v] = explode('=', $arg, 2);
            $out[$k] = $v;
        } else {
            $out[$arg] = '1';
        }
    }
    return $out;
}

function prompt(string $question, bool $hidden = false): string
{
    fwrite(STDOUT, $question);
    if ($hidden && DIRECTORY_SEPARATOR !== '\\') {
        shell_exec('stty -echo 2>/dev/null');
    }
    $line = fgets(STDIN);
    if ($hidden && DIRECTORY_SEPARATOR !== '\\') {
        shell_exec('stty echo 2>/dev/null');
        fwrite(STDOUT, "\n");
    }
    return trim((string) $line);
}

$args = parse_args($argv);

/* --- Verify reference data ------------------------------------------------ */
$roleCount = (int) Database::scalar('SELECT COUNT(*) FROM roles');
if ($roleCount === 0) {
    fwrite(STDERR, "No roles found. Run database/schema.sql then database/seed_reference_data.sql first.\n");
    exit(1);
}

$existingAdmin = (int) Database::scalar(
    "SELECT COUNT(*) FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE r.role_key = 'sysadmin'"
);
if ($existingAdmin > 0 && !isset($args['force'])) {
    fwrite(STDOUT, "A System Administrator already exists. Use --force to create another.\n");
    exit(0);
}

/** @return int role id */
function role_id(string $key): int
{
    $id = Database::scalar('SELECT id FROM roles WHERE role_key = ?', [$key]);
    if ($id === false || $id === null) {
        fwrite(STDERR, "Role not found: {$key}\n");
        exit(1);
    }
    return (int) $id;
}

/* --- Ensure a baseline set of departments --------------------------------- */
$departments = [
    ['ADMIN', 'Administration'],
    ['ICT',   'Information and Communication Technology'],
    ['FIN',   'Finance and Accounts'],
    ['HR',    'Human Resources'],
    ['OPS',   'Operations'],
    ['LD',    'Learning and Development'],
];
foreach ($departments as [$code, $name]) {
    Database::execute(
        'INSERT INTO departments (code, name) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE code = code',
        [$code, $name]
    );
}

function department_id(string $code): ?int
{
    $id = Database::scalar('SELECT id FROM departments WHERE code = ?', [$code]);
    return $id === false || $id === null ? null : (int) $id;
}

function create_user(string $username, string $email, string $password, string $fullName, ?int $deptId,string $designation, array $roleKeys, bool $mustChange = false): int
{
    $existing = Database::scalar('SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1', [$email, $username]);
    if ($existing !== false && $existing !== null) {
        fwrite(STDOUT, "  - skipped (already exists): {$email}\n");
        return 0;
    }

    $userId = Database::insert(
        'INSERT INTO users (username, email, password_hash, account_status, must_change_password, password_changed_at)
         VALUES (?, ?, ?, "active", ?, NOW())',
        [$username, $email, password_hash($password, PASSWORD_DEFAULT), $mustChange ? 1 : 0]
    );

    Database::execute(
        'INSERT INTO staff_profiles (user_id, full_name, department_id, designation, verified_at)
         VALUES (?, ?, ?, ?, NOW())',
        [$userId, $fullName, $deptId, $designation]
    );

    foreach ($roleKeys as $key) {
        Database::execute(
            'INSERT INTO user_roles (user_id, role_id, department_id) VALUES (?, ?, NULL)
             ON DUPLICATE KEY UPDATE role_id = role_id',
            [$userId, role_id($key)]
        );
    }

    fwrite(STDOUT, "  - created: {$email} [" . implode(', ', $roleKeys) . "]\n");
    return $userId;
}

/**
 * @return string
 */
function read_password(array $args): string
{
    if (isset($args['password']) && $args['password'] !== '') {
        return (string) $args['password'];
    }
    if (($env = getenv('LSDS_ADMIN_PASSWORD')) !== false && $env !== '') {
        return (string) $env;
    }
    $pw = prompt('Administrator password (min 8 chars, mixed case, a digit): ', true);
    return $pw;
}

function validate_password(string $pw): void
{
    if (strlen($pw) < 8 || !preg_match('/[A-Z]/', $pw) || !preg_match('/[a-z]/', $pw) || !preg_match('/\d/', $pw)) {
        fwrite(STDERR, "Password must be at least 8 characters and include upper case, lower case and a digit.\n");
        exit(1);
    }
}

echo "\nLSDS installer\n==============\n\n";

/* --- Administrator --------------------------------------------------------- */
$email    = (string) ($args['email'] ?? 'admin@lsds.gov.ng');
$username = (string) ($args['username'] ?? 'admin');
$name     = (string) ($args['name'] ?? 'System Administrator');
$deptCode = (string) ($args['department'] ?? 'ADMIN');

$password = read_password($args);
validate_password($password);

echo "Administrator account:\n";
create_user($username, $email, $password, $name, department_id($deptCode), 'System Administrator', ['sysadmin'], false);

/* --- Demonstration accounts ------------------------------------------------ */
if (isset($args['demo'])) {
    echo "\nDemonstration accounts (password: Demo@1234):\n";
    $demo = [
        ['staff',       'staff@lsds.gov.ng',         'Amina Bello',    'ICT',   'ICT Officer',                    ['staff']],
        ['pm',          'pm@lsds.gov.ng',            'Chidi Okafor',   'OPS',   'Principal Manager',              ['principal_manager']],
        ['agm',         'agm@lsds.gov.ng',           'Ngozi Eze',      'OPS',   'Assistant General Manager',      ['agm']],
        ['gm',          'gm@lsds.gov.ng',            'Tunde Adeyemi',  'OPS',   'General Manager',                ['gm']],
        ['ld.officer',  'ld.officer@lsds.gov.ng',    'Grace Musa',     'LD',    'Learning & Development Officer', ['ld_officer']],
        ['finance',     'finance@lsds.gov.ng',       'Ibrahim Sani',   'FIN',   'Finance Officer',                ['finance_officer']],
        ['auditor',     'auditor@lsds.gov.ng',       'Halima Yusuf',   'FIN',   'Internal Auditor',               ['auditor']],
        ['knowledge',   'knowledge@lsds.gov.ng',     'Peter Nwosu',    'LD',    'Knowledge Manager',              ['knowledge_manager']],
        ['support',     'support@lsds.gov.ng',       'Blessing John',  'ICT',   'Support Technician',             ['support_technician']],
        ['moderator',   'moderator@lsds.gov.ng',     'Sadiq Bello',    'HR',    'Forum Moderator',                ['forum_moderator']],
    ];
    foreach ($demo as [$uname, $mail, $full, $dept, $title, $keys]) {
        create_user($uname, $mail, 'Demo@1234', $full, department_id($dept), $title, $keys, false);
    }
}

echo "\nDone.\n";
echo "Tip: load database/seed_demo_data.sql to populate realistic sample records.\n";
if (!isset($args['demo'])) {
    echo "Tip: pass --demo to also create one account per role for evaluation.\n";
}
