<?php
/**
 * LSDS API - course and e-learning endpoints.
 */

declare(strict_types=1);

namespace Lsds\Controllers;

use Lsds\Activity;
use Lsds\ApiException;
use Lsds\Auth;
use Lsds\Database;
use Lsds\Request;
use Lsds\Response;
use Lsds\Support;

final class CourseController
{
    private const SELECT = 'SELECT co.*, c.name AS category, d.name AS department, d.code AS department_code,
            sp.full_name AS instructor_name
        FROM courses co
        LEFT JOIN categories c ON c.id = co.category_id
        LEFT JOIN departments d ON d.id = co.department_id
        LEFT JOIN staff_profiles sp ON sp.user_id = co.instructor_user_id';

    public function index(Request $req): void
    {
        $where  = [];
        $params = [];

        if ($status = Support::trimmed($req->query('status'))) {
            $where[]  = 'co.status = ?';
            $params[] = $status;
        }
        if ($category = Support::trimmed($req->query('category'))) {
            $where[]  = 'c.name = ?';
            $params[] = $category;
        }
        if ($dept = Support::trimmed($req->query('department'))) {
            $where[]  = 'd.code = ?';
            $params[] = $dept;
        }
        if ($difficulty = Support::trimmed($req->query('difficulty'))) {
            $where[]  = 'co.difficulty_level = ?';
            $params[] = $difficulty;
        }
        if ($q = Support::trimmed($req->query('q'))) {
            $clause = Support::likeClause($q, ['co.title', 'co.code', 'sp.full_name'], $params);
            if ($clause !== null) {
                $where[] = $clause;
            }
        }

        $sql = self::SELECT;
        if ($where) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY co.updated_at DESC, co.title';

        $rows = Database::select($sql, $params);

        $modules = $this->modulesFor(array_map(static fn ($r) => (int) $r['id'], $rows));
        $enroll  = $this->enrollmentSummary(array_map(static fn ($r) => (int) $r['id'], $rows));

        $data = array_map(static function (array $r) use ($modules, $enroll): array {
            $id = (int) $r['id'];
            return [
                'id'                => $id,
                'title'             => $r['title'],
                'code'              => $r['code'],
                'description'       => $r['description'],
                'category'          => $r['category'],
                'category_id'       => Support::toInt($r['category_id']),
                'department'        => $r['department'],
                'department_code'   => $r['department_code'],
                'instructor_name'   => $r['instructor_name'],
                'difficulty_level'  => $r['difficulty_level'],
                'estimated_hours'   => Support::toFloat($r['estimated_hours']),
                'status'            => $r['status'],
                'modules'           => $modules[$id] ?? [],
                'enrollment_summary' => $enroll[$id] ?? ['total' => 0, 'completed' => 0, 'in_progress' => 0, 'completion_rate' => 0],
                'created_at'        => Support::iso($r['created_at']),
                'updated_at'        => Support::iso($r['updated_at']),
            ];
        }, $rows);

        $summary = $this->enrollmentSummary(null, true);
        $published = (int) Database::scalar("SELECT COUNT(*) FROM courses WHERE status = 'published'");

        Response::json([
            'data'   => $data,
            'total'  => count($data),
            'totals' => [
                'count'           => (int) Database::scalar('SELECT COUNT(*) FROM courses'),
                'published'       => $published,
                'enrolled'        => $summary['total'],
                'completion_rate' => $summary['completion_rate'],
            ],
        ]);
    }

    public function show(Request $req): void
    {
        $id  = (int) $req->param('id');
        $row = Database::selectOne(self::SELECT . ' WHERE co.id = ?', [$id]);
        if ($row === null) {
            throw ApiException::notFound('Course not found.');
        }
        $modules = $this->modulesFor([$id]);
        $enroll  = $this->enrollmentSummary([$id]);

        Response::json([
            'id'                => (int) $row['id'],
            'title'             => $row['title'],
            'code'              => $row['code'],
            'description'       => $row['description'],
            'category'          => $row['category'],
            'category_id'       => Support::toInt($row['category_id']),
            'department'        => $row['department'],
            'department_code'   => $row['department_code'],
            'instructor_name'   => $row['instructor_name'],
            'difficulty_level'  => $row['difficulty_level'],
            'estimated_hours'   => Support::toFloat($row['estimated_hours']),
            'status'            => $row['status'],
            'modules'           => $modules[$id] ?? [],
            'enrollment_summary' => $enroll[$id] ?? ['total' => 0, 'completed' => 0, 'in_progress' => 0, 'completion_rate' => 0],
            'created_at'        => Support::iso($row['created_at']),
            'updated_at'        => Support::iso($row['updated_at']),
        ]);
    }

    public function store(Request $req): void
    {
        $actor = Auth::requireUser();

        $title = Support::trimmed($req->input('title'));
        if ($title === null) {
            throw ApiException::validation('Course title is required.');
        }

        $difficulty = (string) $req->input('difficulty_level', 'intermediate');
        if (!in_array($difficulty, ['beginner', 'intermediate', 'advanced'], true)) {
            $difficulty = 'intermediate';
        }
        $status = (string) $req->input('status', 'published');
        if (!in_array($status, ['draft', 'published', 'archived'], true)) {
            $status = 'published';
        }

        $id = Database::insert(
            'INSERT INTO courses
                (code, title, description, category_id, department_id, instructor_user_id,
                 difficulty_level, estimated_hours, status, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                Support::trimmed($req->input('code')),
                $title,
                Support::trimmed($req->input('description')),
                Support::categoryId($req->input('category'), 'course'),
                Support::departmentId($req->input('department_code')) ?? $actor['department_id'],
                null,
                $difficulty,
                Support::toFloat($req->input('estimated_hours')),
                $status,
                (int) $actor['id'],
            ]
        );

        Activity::log('course_created', 'course', $id, 'Created course "' . $title . '".');

        $row = Database::selectOne(self::SELECT . ' WHERE co.id = ?', [$id]);
        Response::json([
            'id'                => (int) $row['id'],
            'title'             => $row['title'],
            'code'              => $row['code'],
            'description'       => $row['description'],
            'category'          => $row['category'],
            'category_id'       => Support::toInt($row['category_id']),
            'department'        => $row['department'],
            'department_code'   => $row['department_code'],
            'instructor_name'   => $row['instructor_name'],
            'difficulty_level'  => $row['difficulty_level'],
            'estimated_hours'   => Support::toFloat($row['estimated_hours']),
            'status'            => $row['status'],
            'modules'           => [],
            'enrollment_summary' => ['total' => 0, 'completed' => 0, 'in_progress' => 0, 'completion_rate' => 0],
            'created_at'        => Support::iso($row['created_at']),
            'updated_at'        => Support::iso($row['updated_at']),
        ], 201);
    }

    /**
     * @param int[] $ids
     * @return array<int,array<int,array<string,mixed>>>
     */
    private function modulesFor(array $ids): array
    {
        if ($ids === []) {
            return [];
        }
        $placeholders = implode(', ', array_fill(0, count($ids), '?'));
        $rows = Database::select(
            'SELECT * FROM course_modules WHERE course_id IN (' . $placeholders . ') ORDER BY course_id, position',
            $ids
        );
        $out = [];
        foreach ($rows as $r) {
            $out[(int) $r['course_id']][] = [
                'id'                => (int) $r['id'],
                'title'             => $r['title'],
                'description'       => $r['description'],
                'position'          => (int) $r['position'],
                'estimated_minutes' => Support::toInt($r['estimated_minutes']),
                'is_mandatory'      => Support::toBool($r['is_mandatory']),
            ];
        }
        return $out;
    }

    /**
     * @param int[]|null $ids  null = all courses
     * @return array<int|string,array<string,mixed>>
     */
    private function enrollmentSummary(?array $ids, bool $overall = false): array
    {
        $sql = 'SELECT course_id, status, COUNT(*) AS c FROM enrollments';
        $params = [];
        if ($ids !== null) {
            if ($ids === []) {
                return [];
            }
            $sql .= ' WHERE course_id IN (' . implode(', ', array_fill(0, count($ids), '?')) . ')';
            $params = $ids;
        }
        $sql .= ' GROUP BY course_id, status';

        $out = [];
        $grand = ['total' => 0, 'completed' => 0, 'in_progress' => 0, 'completion_rate' => 0];
        foreach (Database::select($sql, $params) as $r) {
            $course = (int) $r['course_id'];
            if (!isset($out[$course])) {
                $out[$course] = ['total' => 0, 'completed' => 0, 'in_progress' => 0, 'completion_rate' => 0];
            }
            $count = (int) $r['c'];
            $out[$course]['total'] += $count;
            $grand['total'] += $count;
            if ($r['status'] === 'completed') {
                $out[$course]['completed'] += $count;
                $grand['completed'] += $count;
            }
            if ($r['status'] === 'in_progress') {
                $out[$course]['in_progress'] += $count;
                $grand['in_progress'] += $count;
            }
        }
        foreach ($out as &$row) {
            $row['completion_rate'] = $row['total'] ? (int) round(($row['completed'] / $row['total']) * 100) : 0;
        }
        unset($row);
        $grand['completion_rate'] = $grand['total'] ? (int) round(($grand['completed'] / $grand['total']) * 100) : 0;

        return $overall ? $grand : $out;
    }
}
