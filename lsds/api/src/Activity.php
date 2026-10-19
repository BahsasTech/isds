<?php
/**
 * LSDS API - activity/audit trail writer.
 */

declare(strict_types=1);

namespace Lsds;

final class Activity
{
    /**
     * @param array<string,mixed> $context
     */
    public static function log(
        string $action,
        ?string $entityType = null,
        ?int $entityId = null,
        ?string $description = null,
        array $context = []
    ): void {
        $user = Auth::user();
        $userId = $user ? (int) $user['id'] : null;

        Database::execute(
            'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description, metadata, ip_address, user_agent)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $userId,
                $action,
                $entityType,
                $entityId,
                $description,
                $context ? json_encode($context, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) : null,
                Request::ip(),
                Request::userAgent(),
            ]
        );
    }
}
