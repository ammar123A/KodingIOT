<?php
/**
 * Save / Update a project
 *
 * POST JSON body:
 *   Create → { "name", "description", "tags", "level", "type", "workspaceData", "code" }
 *   Update → { "id": <int>, ...same fields... }
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$userId = requireAuth();
$input  = json_decode(file_get_contents('php://input'), true) ?? [];

// ── TOGGLE FEATURED (admin only) ──
if (($input['action'] ?? '') === 'toggle_featured') {
    ensureSession();
    if (($_SESSION['role'] ?? '') !== 'admin') {
        jsonResponse(['error' => 'Akses ditolak.'], 403);
    }
    $projectId = (int) ($input['id'] ?? 0);
    $featured  = !empty($input['is_featured']);
    $db = getDB();
    $stmt = $db->prepare('UPDATE projects SET is_featured = :f WHERE id = :id');
    $stmt->execute(['f' => $featured ? 'true' : 'false', 'id' => $projectId]);
    jsonResponse(['success' => true]);
}

$name          = trim($input['name'] ?? '');
$description   = trim($input['description'] ?? '');
$tags          = $input['tags'] ?? [];
$level         = $input['level'] ?? 'mudah';
$type          = $input['type'] ?? 'iot';
$workspaceData = $input['workspaceData'] ?? new \stdClass();
$code          = $input['code'] ?? '';
$isPublic      = $input['is_public'] ?? true;

if ($name === '') {
    jsonResponse(['error' => 'Nama projek wajib diisi.'], 400);
}

// Sanitise enum-like fields
$level = in_array($level, ['mudah','menengah','sulit'], true) ? $level : 'mudah';
$type  = in_array($type,  ['iot','game','sensor'],      true) ? $type  : 'iot';

$db = getDB();

// ── UPDATE existing project ──
if (!empty($input['id'])) {
    $projectId = (int) $input['id'];

    // Verify ownership
    $stmt = $db->prepare('SELECT id FROM projects WHERE id = :id AND user_id = :uid');
    $stmt->execute(['id' => $projectId, 'uid' => $userId]);
    if (!$stmt->fetch()) {
        jsonResponse(['error' => 'Projek tidak ditemui atau bukan milik anda.'], 403);
    }

    $stmt = $db->prepare('
        UPDATE projects SET
            name           = :name,
            description    = :desc,
            tags           = :tags,
            level          = :level,
            type           = :type,
            workspace_data = :ws,
            code           = :code,
            is_public      = :pub
        WHERE id = :id
    ');
    $stmt->execute([
        'name'  => $name,
        'desc'  => $description,
        'tags'  => '{' . implode(',', array_map(fn($t) => '"' . str_replace('"', '\\"', $t) . '"', $tags)) . '}',
        'level' => $level,
        'type'  => $type,
        'ws'    => json_encode($workspaceData, JSON_UNESCAPED_UNICODE),
        'code'  => $code,
        'pub'   => $isPublic ? 'true' : 'false',
        'id'    => $projectId,
    ]);

    jsonResponse(['success' => true, 'project_id' => $projectId, 'message' => 'Projek dikemas kini.']);
}

// ── CREATE new project ──
$stmt = $db->prepare('
    INSERT INTO projects (user_id, name, description, tags, level, type, workspace_data, code, is_public)
    VALUES (:uid, :name, :desc, :tags, :level, :type, :ws, :code, :pub)
    RETURNING id
');
$stmt->execute([
    'uid'   => $userId,
    'name'  => $name,
    'desc'  => $description,
    'tags'  => '{' . implode(',', array_map(fn($t) => '"' . str_replace('"', '\\"', $t) . '"', $tags)) . '}',
    'level' => $level,
    'type'  => $type,
    'ws'    => json_encode($workspaceData, JSON_UNESCAPED_UNICODE),
    'code'  => $code,
    'pub'   => $isPublic ? 'true' : 'false',
]);
$newId = (int) $stmt->fetchColumn();

jsonResponse(['success' => true, 'project_id' => $newId, 'message' => 'Projek disimpan.'], 201);