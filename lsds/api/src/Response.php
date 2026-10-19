<?php
/**
 * LSDS API - JSON response helpers.
 */

declare(strict_types=1);

namespace Lsds;

final class Response
{
    /**
     * @param mixed $data
     */
    public static function json($data, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    /**
     * @param array<string,mixed> $extra
     */
    public static function error(string $message, int $status = 400, array $extra = []): void
    {
        $payload = array_merge(['message' => $message], $extra);
        self::json($payload, $status);
    }

    public static function noContent(): void
    {
        http_response_code(204);
    }
}
