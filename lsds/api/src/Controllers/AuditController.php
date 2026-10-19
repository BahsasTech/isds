<?php
/**
 * LSDS API - audit log endpoint.
 */

declare(strict_types=1);

namespace Lsds\Controllers;

use Lsds\Database;
use Lsds\Request;
use Lsds\Response;
use Lsds\Support;

final class AuditController
{
    public function index(Request $req): void
    {
        $where  = [];
        $params = [];

        if ($action = Support::trimmed($req->query('action'))) {
            $where[]  = 'a.action = ?';
            $params[] = $action;
        }
        if ($entity = Support::trimmed($req->query('entity'))) {
            $where[]  = 'a.entity_type = ?';
            $params[] = $entity;
        }
        if ($user = Support::trimmed($req->query('user'))) {
            $clause = Support::likeClause($user, ['sp.full_name', 'u.email'], $params);
            if ($clause !== null) {
                $where[] = $clause;
            }
        }
        if ($q = Support::trimmed($req->query('q'))) {
            $clause = Support::likeClause($q, ['a.description', 'sp.full_name', 'u.email', 'a.ip_address'], $params);
            if ($clause !== null) {
                $where[] = $clause;
            }
        }

        $perPage = Support::toInt($req->query('per_page')) ?? 15;
        $perPage = max(1, min(100, $perPage));
        $page    = max(1, Support::toInt($req->query('page')) ?? 1);

        $base = ' FROM activity_logs a
                  LEFT JOIN users u ON u.id = a.user_id
                  LEFT JOIN staff_profiles sp ON sp.user_id = a.user_id';
        $whereSql = $where ? ' WHERE ' . implode(' AND ', $where) : '';

        $total = (int) Database::scalar('SELECT COUNT(*)' . $base . $whereSql, $params);
        $offset = ($page - 1) * $perPage;

        $rows = Database::select(
            'SELECT a.id, a.action, a.entity_type, a.entity_id, a.description, a.ip_address, a.created_at,
                    COALESCE(sp.full_name, u.username, "System") AS user_name, u.email AS user_email' .
            $base . $whereSql .
            ' ORDER BY a.created_at DESC, a.id DESC LIMIT ' . $perPage . ' OFFSET ' . $offset,
            $params
        );

        $data = array_map(static fn (array $r): array => [
            'id'          => (int) $r['id'],
            'user_name'   => $r['user_name'],
            'user_email'  => $r['user_email'],
            'action'      => $r['action'],
            'entity_type' => $r['entity_type'],
            'entity_id'   => Support::toInt($r['entity_id']),
            'description' => $r['description'],
            'ip_address'  => $r['ip_address'],
            'created_at'  => Support::iso($r['created_at']),
        ], $rows);

        $counts = [];
        foreach (Database::select('SELECT action, COUNT(*) AS c FROM activity_logs GROUP BY action') as $r) {
            $counts[$r['action']] = (int) $r['c'];
        }
        $entities = [];
        foreach (Database::select('SELECT entity_type, COUNT(*) AS c FROM activity_logs WHERE entity_type IS NOT NULL GROUP BY entity_type') as $r) {
            $entities[$r['entity_type']] = (int) $r['c'];
        }

        Response::json([
            'data'     => $data,
            'total'    => $total,
            'page'     => $page,
            'per_page' => $perPage,
            'pages'    => (int) max(1, (int) ceil($total / $perPage)),
            'counts'   => $counts,
            'entities' => $entities,
        ]);
    }
}
