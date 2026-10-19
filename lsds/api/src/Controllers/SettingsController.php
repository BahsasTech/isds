<?php
/**
 * LSDS API - system settings endpoint.
 *
 * The system_settings table has no setting_group column, so groups are
 * derived from a static map (falling back to "General").
 */

declare(strict_types=1);

namespace Lsds\Controllers;

use Lsds\Database;
use Lsds\Request;
use Lsds\Response;
use Lsds\Support;

final class SettingsController
{
    private const GROUP_ORDER = [
        'General', 'Security', 'Notifications', 'Integrations', 'Features', 'Storage', 'Backup',
    ];

    private const GROUPS = [
        'app_name'                       => 'General',
        'app_short_name'                 => 'General',
        'timezone'                       => 'General',
        'currency'                       => 'General',
        'maintenance_mode'               => 'General',
        'password_min_length'            => 'Security',
        'password_require_mixed_case'    => 'Security',
        'password_require_number'        => 'Security',
        'session_timeout_minutes'        => 'Security',
        'login_max_attempts'             => 'Security',
        'login_lockout_minutes'          => 'Security',
        'email_notifications_enabled'    => 'Notifications',
        'sms_notifications_enabled'      => 'Notifications',
        'jitsi_base_url'                 => 'Integrations',
        'ai_features_enabled'            => 'Features',
        'training_overlap_check_enabled' => 'Features',
        'reapproval_on_material_change'  => 'Features',
        'max_upload_mb'                  => 'Storage',
        'allowed_document_types'         => 'Storage',
        'allowed_video_types'            => 'Storage',
        'backup_retention_days'          => 'Backup',
    ];

    public function index(Request $req): void
    {
        $rows = Database::select('SELECT * FROM system_settings ORDER BY setting_key');

        $data = array_map(static function (array $r): array {
            $type  = $r['setting_type'];
            $value = $r['setting_value'];
            if ($type === 'boolean') {
                $value = Support::toBool($value) ? 'true' : 'false';
            }
            return [
                'id'            => (int) $r['id'],
                'setting_key'   => $r['setting_key'],
                'setting_value' => $value,
                'setting_type'  => $type,
                'setting_group' => self::GROUPS[$r['setting_key']] ?? 'General',
                'description'   => $r['description'] ?: self::humanise($r['setting_key']),
                'updated_at'    => Support::iso($r['updated_at']),
            ];
        }, $rows);

        $present = [];
        foreach ($data as $s) {
            $present[$s['setting_group']] = true;
        }
        $groups = [];
        foreach (self::GROUP_ORDER as $g) {
            if (isset($present[$g])) {
                $groups[] = $g;
                unset($present[$g]);
            }
        }
        foreach (array_keys($present) as $g) {
            $groups[] = $g;
        }

        Response::json(['data' => $data, 'groups' => $groups, 'total' => count($data)]);
    }

    private static function humanise(string $key): string
    {
        return ucfirst(str_replace('_', ' ', $key));
    }
}
