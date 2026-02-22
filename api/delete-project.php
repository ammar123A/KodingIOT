<?php
/**
 * Delete a project
 *
 * POST JSON body:  { "id": <int> }
 * Only the owner (or admin) can delete.
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

$projectId = (int) ($input['id'] ?? 0);
if ($projectId <= 0) {
    jsonResponse(['error' => 'ID projek tidak sah.'], 400);
}

$db = getDB();

// Check ownership (or admin role)
ensureSession();
$role = $_SESSION['role'] ?? 'student';

$stmt = $db->prepare('SELECT user_id FROM projects WHERE id = :id');
$stmt->execute(['id' => $projectId]);
$project = $stmt->fetch();

if (!$project) {
    jsonResponse(['error' => 'Projek tidak ditemui.'], 404);
}

if ((int) $project['user_id'] !== $userId && $role !== 'admin') {
    jsonResponse(['error' => 'Anda tidak mempunyai kebenaran untuk memadam projek ini.'], 403);
}

$stmt = $db->prepare('DELETE FROM projects WHERE id = :id');
$stmt->execute(['id' => $projectId]);

jsonResponse(['success' => true, 'message' => 'Projek berjaya dipadam.']);
