<?php
/**
 * User Authentication API
 * 
 * Endpoints (action via POST JSON body):
 *   { "action": "register", "username": "...", "email": "...", "password": "..." }
 *   { "action": "login",    "username": "...", "password": "..." }
 *   { "action": "logout" }
 *   { "action": "me" }          ← returns current session user
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/db.php';
ensureSession();

// ── Only POST allowed ──
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$input  = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $input['action'] ?? '';

switch ($action) {

    // ═══════════════════════════════════════
    // REGISTER
    // ═══════════════════════════════════════
    case 'register': {
        $username = trim($input['username'] ?? '');
        $email    = trim($input['email']    ?? '');
        $password = $input['password']      ?? '';

        // Validation
        if ($username === '' || $email === '' || $password === '') {
            jsonResponse(['error' => 'Nama pengguna, e-mel, dan kata laluan wajib diisi.'], 400);
        }
        if (strlen($username) < 3 || strlen($username) > 50) {
            jsonResponse(['error' => 'Nama pengguna mestilah 3–50 aksara.'], 400);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            jsonResponse(['error' => 'Format e-mel tidak sah.'], 400);
        }
        if (strlen($password) < 6) {
            jsonResponse(['error' => 'Kata laluan mestilah sekurang-kurangnya 6 aksara.'], 400);
        }

        $db = getDB();

        // Check duplicates
        $stmt = $db->prepare('SELECT id FROM users WHERE username = :u OR email = :e LIMIT 1');
        $stmt->execute(['u' => $username, 'e' => $email]);
        if ($stmt->fetch()) {
            jsonResponse(['error' => 'Nama pengguna atau e-mel telah digunakan.'], 409);
        }

        // Hash password with bcrypt
        $hash = password_hash($password, PASSWORD_BCRYPT);

        $stmt = $db->prepare(
            'INSERT INTO users (username, email, password) VALUES (:u, :e, :p) RETURNING id'
        );
        $stmt->execute(['u' => $username, 'e' => $email, 'p' => $hash]);
        $newId = $stmt->fetchColumn();

        jsonResponse([
            'success' => true,
            'message' => 'Pendaftaran berjaya! Sila log masuk.',
            'user'    => ['id' => (int) $newId, 'username' => $username, 'email' => $email]
        ], 201);
        break;
    }

    // ═══════════════════════════════════════
    // LOGIN
    // ═══════════════════════════════════════
    case 'login': {
        $username = trim($input['username'] ?? '');
        $password = $input['password']      ?? '';

        if ($username === '' || $password === '') {
            jsonResponse(['error' => 'Nama pengguna dan kata laluan wajib diisi.'], 400);
        }

        $db   = getDB();
        $stmt = $db->prepare('SELECT id, username, email, password, role FROM users WHERE username = :u LIMIT 1');
        $stmt->execute(['u' => $username]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password'])) {
            jsonResponse(['error' => 'Nama pengguna atau kata laluan salah.'], 401);
        }

        // Store session
        $_SESSION['user_id']       = (int) $user['id'];
        $_SESSION['username']      = $user['username'];
        $_SESSION['role']          = $user['role'];
        $_SESSION['last_activity'] = time();

        jsonResponse([
            'success' => true,
            'user'    => [
                'id'       => (int) $user['id'],
                'username' => $user['username'],
                'email'    => $user['email'],
                'role'     => $user['role']
            ]
        ]);
        break;
    }

    // ═══════════════════════════════════════
    // LOGOUT
    // ═══════════════════════════════════════
    case 'logout': {
        session_unset();
        session_destroy();
        jsonResponse(['success' => true, 'message' => 'Logged out.']);
        break;
    }

    // ═══════════════════════════════════════
    // ME — get current session user
    // ═══════════════════════════════════════
    case 'me': {
        $uid = currentUserId();
        if (!$uid) {
            jsonResponse(['user' => null]);
        }

        $db   = getDB();
        $stmt = $db->prepare('SELECT id, username, email, role FROM users WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $uid]);
        $user = $stmt->fetch();

        if (!$user) {
            // stale session
            session_unset();
            session_destroy();
            jsonResponse(['user' => null]);
        }

        jsonResponse([
            'user' => [
                'id'       => (int) $user['id'],
                'username' => $user['username'],
                'email'    => $user['email'],
                'role'     => $user['role']
            ]
        ]);
        break;
    }

    // ═══════════════════════════════════════
    // LIST USERS — admin only
    // ═══════════════════════════════════════
    case 'list_users': {
        $uid = requireAuth();
        ensureSession();
        if (($_SESSION['role'] ?? '') !== 'admin') {
            jsonResponse(['error' => 'Akses ditolak.'], 403);
        }

        $db   = getDB();
        $stmt = $db->query('SELECT id, username, email, role, created_at FROM users ORDER BY id');
        $users = $stmt->fetchAll();

        jsonResponse(['users' => $users]);
        break;
    }

    default:
        jsonResponse(['error' => "Unknown action: $action"], 400);
}
