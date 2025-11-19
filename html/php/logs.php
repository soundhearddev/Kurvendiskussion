<?php
// ======================================================
// logs.php - Empfängt JSON-Logs und speichert in MariaDB
// ======================================================

// Zeitzone setzen
date_default_timezone_set('Europe/Berlin');

// Debug-Modus (für Entwicklung)
$DEBUG = true;

// Fehler-Reporting
if ($DEBUG) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

// ==================== CORS HEADERS ====================
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

// OPTIONS-Request (Preflight) behandeln
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ==================== DATENBANK-CONFIG ====================
$dbConfig = [
    'host' => 'localhost',
    'port' => 3306,
    'user' => 'nodeapp',
    'pass' => '1234',
    'name' => 'db'
];

// ==================== FUNKTIONEN ====================

function debugLog($message, $data = null) {
    global $DEBUG;
    if ($DEBUG) {
        error_log("[LOGS.PHP] $message");
        if ($data !== null) {
            error_log(print_r($data, true));
        }
    }
}

function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function sendError($message, $statusCode = 400, $details = null) {
    $response = ['error' => $message];
    if ($details !== null) {
        $response['details'] = $details;
    }
    sendJsonResponse($response, $statusCode);
}

// ==================== REQUEST VALIDIERUNG ====================

// Nur POST erlauben
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Nur POST-Requests erlaubt', 405);
}

// JSON-Input lesen
$rawInput = file_get_contents('php://input');
debugLog('Empfangene Daten', $rawInput);

if (empty($rawInput)) {
    sendError('Leerer Request-Body', 400);
}

// JSON parsen
$input = json_decode($rawInput, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    sendError('Ungültiges JSON', 400, json_last_error_msg());
}

// ==================== INPUT-VALIDIERUNG ====================

// Pflichtfelder prüfen
$level = isset($input['level']) ? trim($input['level']) : 'info';
$message = isset($input['message']) ? trim($input['message']) : '';

// Erlaubte Log-Level
$allowedLevels = ['info', 'warn', 'error', 'debug'];
if (!in_array($level, $allowedLevels)) {
    $level = 'info';
}

// Message darf nicht leer sein
if (empty($message)) {
    sendError('Message darf nicht leer sein', 400);
}

// Context als JSON speichern
$context = null;
if (isset($input['context']) && !empty($input['context'])) {
    if (is_array($input['context'])) {
        $context = json_encode($input['context'], JSON_UNESCAPED_UNICODE);
    } else if (is_string($input['context'])) {
        $context = $input['context'];
    }
}

// Timestamp
$timestamp = isset($input['timestamp']) ? $input['timestamp'] : date('Y-m-d H:i:s');

debugLog('Verarbeitete Daten', [
    'level' => $level,
    'message' => $message,
    'context' => $context,
    'timestamp' => $timestamp
]);

// ==================== DATENBANK ====================

try {
    // PDO-Verbindung aufbauen
    $dsn = sprintf(
        "mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4",
        $dbConfig['host'],
        $dbConfig['port'],
        $dbConfig['name']
    );
    
    debugLog('Verbinde zu DB', $dsn);
    
    $pdo = new PDO($dsn, $dbConfig['user'], $dbConfig['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
    
    debugLog('DB-Verbindung erfolgreich');
    
    // ==================== TABELLE PRÜFEN ====================
    
    // Prüfen ob Tabelle existiert
    $tableCheck = $pdo->query("SHOW TABLES LIKE 'logs'")->rowCount();
    
    if ($tableCheck === 0) {
        debugLog('Tabelle logs existiert nicht, erstelle sie...');
        
        // Tabelle erstellen
        $createTable = "
            CREATE TABLE logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                level VARCHAR(10) NOT NULL,
                message TEXT NOT NULL,
                context JSON,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_level (level),
                INDEX idx_timestamp (timestamp)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ";
        
        $pdo->exec($createTable);
        debugLog('Tabelle logs wurde erstellt');
    }
    
    // ==================== LOG EINFÜGEN ====================
    
    $stmt = $pdo->prepare("
        INSERT INTO logs (level, message, context, timestamp) 
        VALUES (:level, :message, :context, :timestamp)
    ");
    
    $success = $stmt->execute([
        ':level' => $level,
        ':message' => $message,
        ':context' => $context,
        ':timestamp' => $timestamp
    ]);
    
    if (!$success) {
        throw new Exception('Fehler beim Einfügen des Logs');
    }
    
    $insertId = $pdo->lastInsertId();
    
    debugLog('Log erfolgreich gespeichert', ['id' => $insertId]);
    
    // ==================== SUCCESS RESPONSE ====================
    
    sendJsonResponse([
        'ok' => true,
        'id' => (int)$insertId,
        'level' => $level,
        'timestamp' => $timestamp
    ], 200);
    
} catch (PDOException $e) {
    debugLog('DB-Fehler', $e->getMessage());
    sendError('Datenbankfehler', 500, $DEBUG ? $e->getMessage() : null);
    
} catch (Exception $e) {
    debugLog('Allgemeiner Fehler', $e->getMessage());
    sendError('Serverfehler', 500, $DEBUG ? $e->getMessage() : null);
}

?>