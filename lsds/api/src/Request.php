<?php
/**
 * LSDS API - HTTP request value object.
 */

declare(strict_types=1);

namespace Lsds;

final class Request
{
    public string $method;
    public string $path;
    /** @var array<string,string> */
    public array $query;
    /** @var array<string,mixed> */
    public array $body;
    /** @var array<string,string> */
    private array $params = [];

    /**
     * @param array<string,string> $query
     * @param array<string,mixed>  $body
     */
    public function __construct(string $method, string $path, array $query = [], array $body = [])
    {
        $this->method = strtoupper($method);
        $this->path   = $path;
        $this->query  = $query;
        $this->body   = $body;
    }

    public static function capture(): self
    {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

        // Isolate the pathname from the request URI, then remove the API base
        // directory so the router sees paths such as "/applications/12".
        $uri  = $_SERVER['REQUEST_URI'] ?? '/';
        $path = parse_url($uri, PHP_URL_PATH) ?: '/';
        $path = rawurldecode($path);

        $base = self::basePath();
        if ($base !== '' && strpos($path, $base) === 0) {
            $path = substr($path, strlen($base));
        }

        // Some server setups do not report the real base directory in
        // SCRIPT_NAME (e.g. "/" or "/index.php"). If the request URI still
        // carries an "/api" or "/index.php" prefix, strip it so the router
        // sees clean paths such as "/applications/12".
        if (strpos($path, '/index.php/') === 0) {
            $path = substr($path, strlen('/index.php'));
        }
        if (preg_match('#^(.*?)(/api)(/.*)?$#', $path, $m)) {
            $path = ($m[3] ?? '') !== '' ? $m[3] : '/';
        }

        $path = '/' . ltrim($path, '/');
        $path = rtrim($path, '/');
        if ($path === '') {
            $path = '/';
        }

        // PATH_INFO fallback (some servers pass the remainder this way).
        if (isset($_SERVER['PATH_INFO']) && $path === '/') {
            $path = '/' . trim((string) $_SERVER['PATH_INFO'], '/');
        }

        $body = self::readJsonBody();

        return new self($method, $path, $_GET, $body);
    }

    /**
     * Directory in which index.php lives, e.g. "/lsds/api".
     */
    private static function basePath(): string
    {
        $script = $_SERVER['SCRIPT_NAME'] ?? '';
        $dir    = rtrim(str_replace('\\', '/', dirname($script)), '/');
        return $dir === '/' ? '' : $dir;
    }

    /**
     * @return array<string,mixed>
     */
    private static function readJsonBody(): array
    {
        $raw = file_get_contents('php://input');
        if ($raw === false || $raw === '') {
            return [];
        }

        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            return $decoded;
        }

        // Fall back to form-encoded bodies (e.g. multipart or urlencoded).
        return $_POST ?: [];
    }

    /**
     * @param mixed $default
     * @return mixed
     */
    public function input(string $key, $default = null)
    {
        return array_key_exists($key, $this->body) ? $this->body[$key] : $default;
    }

    /**
     * @param array<string,string> $params
     */
    public function setParams(array $params): void
    {
        $this->params = $params;
    }

    /**
     * @param mixed $default
     * @return mixed
     */
    public function param(string $key, $default = null)
    {
        return array_key_exists($key, $this->params) ? $this->params[$key] : $default;
    }

    /**
     * @param mixed $default
     * @return mixed
     */
    public function query(string $key, $default = null)
    {
        return array_key_exists($key, $this->query) ? $this->query[$key] : $default;
    }

    public function queryInt(string $key, int $default = 0): int
    {
        $value = $this->query[$key] ?? null;
        return is_numeric($value) ? (int) $value : $default;
    }

    public function isGet(): bool
    {
        return $this->method === 'GET';
    }

    public static function ip(): string
    {
        $forwarded = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
        if ($forwarded !== '') {
            $parts = explode(',', $forwarded);
            return trim($parts[0]);
        }
        return (string) ($_SERVER['REMOTE_ADDR'] ?? '');
    }

    public static function userAgent(): string
    {
        return substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255);
    }
}
