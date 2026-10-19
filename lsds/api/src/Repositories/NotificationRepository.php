<?php
/**
 * LSDS API - per-user notification queries.
 */

declare(strict_types=1);

namespace Lsds\Repositories;

use Lsds\Database;
use Lsds\Support;

final class NotificationRepository
{
    /**
     * @return array<int,array<string,mixed>>
     */
    public static function forUser(int $userId, int $limit = 20): array
    {
        $rows = Database::select(
            'SELECT id, notification_type, title, message, link, priority, is_read, created_at
               FROM notifications
              WHERE user_id = ?
              ORDER BY created_at DESC
              LIMIT ' . max(1, $limit),
            [$userId]
        );

        return array_map(static function (array $r): array {
            [$type, $tone, $icon] = self::present((string) $r['notification_type'], (string) $r['priority']);
            return [
                'id'     => (string) $r['id'],
                'type'   => $type,
                'title'  => $r['title'],
                'body'   => $r['message'],
                'link'   => $r['link'],
                'at'     => Support::iso($r['created_at']),
                'unread' => !Support::toBool($r['is_read']),
                'tone'   => $tone,
                'icon'   => $icon,
            ];
        }, $rows);
    }

    public static function unreadCount(int $userId): int
    {
        return (int) Database::scalar('SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0', [$userId]);
    }

    /**
     * Map a notification_type to the short type/category, visual tone and icon.
     *
     * @return array{0:string,1:string,2:string}
     */
    private static function present(string $type, string $priority): array
    {
        $t = strtolower($type);
        if (str_contains($t, 'approv') || str_contains($t, 'decision')) {
            return ['approval', 'amber', 'checkCircle'];
        }
        if (str_contains($t, 'financ') || str_contains($t, 'fund') || str_contains($t, 'disburse') || str_contains($t, 'payment')) {
            return ['finance', 'green', 'wallet'];
        }
        if (str_contains($t, 'session') || str_contains($t, 'remind') || str_contains($t, 'training')) {
            return ['session', 'blue', 'presentation'];
        }
        if (str_contains($t, 'ticket') || str_contains($t, 'support')) {
            return ['ticket', 'red', 'lifeBuoy'];
        }
        if (str_contains($t, 'application') || str_contains($t, 'submitted')) {
            return ['application', 'sky', 'fileText'];
        }
        return ['system', 'slate', 'bell'];
    }
}
