<?php
/**
 * LSDS API - static configuration container.
 */

declare(strict_types=1);

namespace Lsds;

final class Config
{
    /** @var array<string,mixed> */
    private static array $data = [];

    public static function load(string $baseDir): void
    {
        $base = require $baseDir . '/config.php';
        if (!is_array($base)) {
            $base = [];
        }

        $localFile = $baseDir . '/config.local.php';
        if (is_file($localFile)) {
            $local = require $localFile;
            if (is_array($local)) {
                $base = array_replace_recursive($base, $local);
            }
        }

        self::$data = $base;
    }

    /**
     * Dot-notation lookup, e.g. Config::get('db.host').
     *
     * @param mixed $default
     * @return mixed
     */
    public static function get(string $key, $default = null)
    {
        $value = self::$data;
        foreach (explode('.', $key) as $part) {
            if (!is_array($value) || !array_key_exists($part, $value)) {
                return $default;
            }
            $value = $value[$part];
        }
        return $value;
    }
}
