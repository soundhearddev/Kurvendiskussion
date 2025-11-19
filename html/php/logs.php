<?php
// ======================================================
// logs.php - Logs in MariaDB speichern (kein JSON)
// ======================================================

error_reporting(E_ALL);
ini_set('display_errors', 1);
date_default_timezone_set('Europe/Berlin');

// ==================== CONFIG ====================
$dbConfig = [
    'host' => 'localhost',
    'port' => 3306,
    'user' => 'nodeapp',
    'pass' => '1234',
    'name' => 'db'
];

$DEBUG = true;

// ==================== CORS ====================
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ==================== INPUT ====================
$raw = file_get_contents("php://input");
$input = json_decode($raw, true);
if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'Ungültiges JSON']);
    exit;
}

$level = isset($input['level']) ? trim($input['level']) : 'info';
$message = isset($input['message']) ? trim($input['message']) : '';
$function = isset($input['function']) ? trim($input['function']) : '';
$mode = isset($input['mode']) ? trim($input['mode']) : '';
$timestamp = isset($input['timestamp']) ? trim($input['timestamp']) : date('Y-m-d H:i:s');

// ==================== DB ====================
try {
    $dsn = "mysql:host={$dbConfig['host']};port={$dbConfig['port']};dbname={$dbConfig['name']};charset=utf8mb4";
    $pdo = new PDO($dsn, $dbConfig['user'], $dbConfig['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);

    // Tabelle erstellen, falls nicht vorhanden
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            timestamp DATETIME NOT NULL,
            level VARCHAR(10) NOT NULL,
            message TEXT NOT NULL,
            function_input TEXT,
            mode VARCHAR(20),
            INDEX idx_timestamp (timestamp),
            INDEX idx_level (level)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    // Optional: Tabelle zurücksetzen
    // $pdo->exec("TRUNCATE TABLE logs");

    // Log einfügen
    $stmt = $pdo->prepare("
        INSERT INTO logs (timestamp, level, message, function_input, mode) 
        VALUES (:timestamp, :level, :message, :function_input, :mode)
    ");
    $stmt->execute([
        ':timestamp' => $timestamp,
        ':level' => $level,
        ':message' => $message,
        ':function_input' => $function,
        ':mode' => $mode
    ]);

    echo json_encode(['ok' => true, 'id' => $pdo->lastInsertId()]);
} catch (PDOException $e) {
    if ($DEBUG) {
        echo json_encode(['error' => 'Datenbankfehler', 'details' => $e->getMessage()]);
    } else {
        echo json_encode(['error' => 'Serverfehler']);
    }
    http_response_code(500);
    exit;
}
