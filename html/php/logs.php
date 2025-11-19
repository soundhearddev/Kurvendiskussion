<?php
// =============================================
// logs.php – JSON Logs sicher in MariaDB speichern
// =============================================

// Fehler anzeigen (nur Entwicklung)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

// JSON vom Request-Body einlesen
$input = file_get_contents("php://input");
$data = json_decode($input, true);

// Fehler prüfen
if ($data === null) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid JSON"]);
    exit;
}

// Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Nur POST erlauben
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Nur POST erlaubt"]);
    exit;
}

// ================== RAW JSON EINLESEN ==================
$raw = file_get_contents("php://input");

if (!$raw) {
    http_response_code(400);
    echo json_encode(["error" => "Leerer Request"]);
    exit;
}

$data = json_decode($raw, true);

if ($data === null) {
    http_response_code(400);
    echo json_encode([
        "error" => "Ungültiges JSON",
        "raw"   => $raw
    ]);
    exit;
}

// ================== FELDER AUS JSON ==================
$level = $data["level"] ?? "info";
$message = $data["message"] ?? "";
$context = isset($data["context"]) ? json_encode($data["context"], JSON_UNESCAPED_UNICODE) : null;
$timestamp = $data["timestamp"] ?? date("Y-m-d H:i:s");

// Message darf nicht leer sein
if (trim($message) === "") {
    http_response_code(400);
    echo json_encode(["error" => "message darf nicht leer sein"]);
    exit;
}

// ================== DB CONFIG ==================
$db = [
    "host" => "localhost",
    "port" => 3306,
    "user" => "nodeapp",
    "pass" => "1234",
    "name" => "db"
];

try {
    // ================== DB VERBINDUNG ==================
    $pdo = new PDO(
        "mysql:host={$db['host']};port={$db['port']};dbname={$db['name']};charset=utf8mb4",
        $db["user"],
        $db["pass"],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]
    );

    // ================== TABELLE ERSTELLEN WENN FEHLT ==================
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            level VARCHAR(10) NOT NULL,
            message TEXT NOT NULL,
            context JSON NULL,
            timestamp TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX(level),
            INDEX(timestamp)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    // ================== LOG SCHREIBEN ==================
    $stmt = $pdo->prepare("
        INSERT INTO logs (level, message, context, timestamp)
        VALUES (:level, :message, :context, :timestamp)
    ");

    $stmt->execute([
        ":level" => $level,
        ":message" => $message,
        ":context" => $context,
        ":timestamp" => $timestamp
    ]);

    // Erfolg zurückgeben
    echo json_encode([
        "ok" => true,
        "id" => (int)$pdo->lastInsertId(),
        "level" => $level
    ]);
    exit;

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "error" => "Serverfehler",
        "details" => $e->getMessage()
    ]);
    exit;
}
