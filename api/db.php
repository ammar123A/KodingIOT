<?php
/**
 * Database configuration for KodingIoT
 * PostgreSQL — database: coding_iot
 */

define('DB_HOST', 'localhost');
define('DB_PORT', '5432');
define('DB_NAME', 'coding_iot');
define('DB_USER', 'postgres');       // change to your PG user
define('DB_PASS', 'Pa55word.123');               // change to your PG password

/**
 * Get a PDO connection (singleton per request).
 */
function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = sprintf('pgsql:host=%s;port=%s;dbname=%s', DB_HOST, DB_PORT, DB_NAME);
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }
    return $pdo;
}

/**
 * Standard JSON response helper.
 */
function jsonResponse(array $data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Session timeout in seconds (10 minutes).
 */
define('SESSION_TIMEOUT', 600);

/**
 * Start or resume a PHP session (used for auth).
 * Automatically destroys the session after SESSION_TIMEOUT seconds of inactivity.
 */
function ensureSession(): void {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    // Check for session timeout
    if (isset($_SESSION['last_activity'])) {
        $elapsed = time() - $_SESSION['last_activity'];
        if ($elapsed > SESSION_TIMEOUT) {
            // Session expired — destroy it
            session_unset();
            session_destroy();
            session_start(); // start a fresh empty session
            return;
        }
    }

    // Update last activity timestamp on every request
    if (isset($_SESSION['user_id'])) {
        $_SESSION['last_activity'] = time();
    }
}

/**
 * Return the currently logged-in user id, or null.
 */
function currentUserId(): ?int {
    ensureSession();
    return $_SESSION['user_id'] ?? null;
}

/**
 * Require a logged-in user; send 401 and exit if not.
 */
function requireAuth(): int {
    $uid = currentUserId();
    if ($uid === null) {
        jsonResponse(['error' => 'Unauthorized — please log in.'], 401);
    }
    return $uid;
}
