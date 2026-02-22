<?php
/**
 * Load projects
 *
 * GET parameters:
 *   (none)         → all public projects
 *   ?mine=1        → projects owned by the logged-in user
 *   ?id=<int>      → single project by id
 *   ?search=<text> → search name/description
 *   ?type=<str>    → filter by type
 *   ?level=<str>   → filter by level
 *   ?tag=<str>     → filter by tag
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/db.php';
ensureSession();

$db = getDB();

// ── Single project by ID ──
if (!empty($_GET['id'])) {
    $stmt = $db->prepare('
        SELECT p.*, u.username AS author
        FROM projects p
        JOIN users u ON u.id = p.user_id
        WHERE p.id = :id
        LIMIT 1
    ');
    $stmt->execute(['id' => (int) $_GET['id']]);
    $project = $stmt->fetch();

    if (!$project) {
        jsonResponse(['error' => 'Projek tidak ditemui.'], 404);
    }

    // Decode JSON/array fields
    $project['workspace_data'] = json_decode($project['workspace_data'], true);
    $project['tags']           = parsePgArray($project['tags']);

    jsonResponse(['project' => $project]);
}

// ── List projects ──
$conditions = [];
$params     = [];

// Mine or public
if (!empty($_GET['mine'])) {
    $uid = currentUserId();
    if (!$uid) { jsonResponse(['error' => 'Unauthorized'], 401); }
    $conditions[] = 'p.user_id = :uid';
    $params['uid'] = $uid;
} else {
    $conditions[] = 'p.is_public = true';
}

// Search
if (!empty($_GET['search'])) {
    $conditions[]      = '(p.name ILIKE :search OR p.description ILIKE :search)';
    $params['search']  = '%' . $_GET['search'] . '%';
}

// Type filter
if (!empty($_GET['type'])) {
    $conditions[]    = 'p.type = :type';
    $params['type']  = $_GET['type'];
}

// Level filter
if (!empty($_GET['level'])) {
    $conditions[]     = 'p.level = :level';
    $params['level']  = $_GET['level'];
}

// Tag filter
if (!empty($_GET['tag'])) {
    $conditions[]   = ':tag = ANY(p.tags)';
    $params['tag']  = $_GET['tag'];
}

$where = $conditions ? ('WHERE ' . implode(' AND ', $conditions)) : '';

$sql = "
    SELECT p.id, p.user_id, p.name, p.description, p.tags, p.level, p.type,
           p.workspace_data, p.code, p.is_featured, p.is_public,
           p.created_at, p.updated_at,
           u.username AS author
    FROM projects p
    JOIN users u ON u.id = p.user_id
    $where
    ORDER BY p.is_featured DESC, p.updated_at DESC
    LIMIT 200
";

$stmt = $db->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll();

// Decode JSON/array fields for each row
foreach ($rows as &$row) {
    $row['workspace_data'] = json_decode($row['workspace_data'], true);
    $row['tags']           = parsePgArray($row['tags']);
}
unset($row);

jsonResponse(['projects' => $rows]);

// ── Helper: parse PostgreSQL text[] to PHP array ──
function parsePgArray(string $s): array {
    $s = trim($s, '{}');
    if ($s === '') return [];
    // Handle quoted elements
    preg_match_all('/"([^"]*)"| ([^,]+)/', $s, $m);
    $result = [];
    foreach ($m[0] as $item) {
        $result[] = trim($item, '" ');
    }
    return array_filter($result, fn($v) => $v !== '');
}