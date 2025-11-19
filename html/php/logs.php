<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// OPTIONS-Request für CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Nur POST erlauben
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Nur POST erlaubt']);
    exit;
}

// Datenbank-Konfiguration
$dbHost = 'localhost';
$dbName = 'nodeapp_db';
$dbUser = 'nodeapp';
$dbPass = 'Banana45!';

try {
    // Verbindung zur Datenbank
    $pdo = new PDO(
        "mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4",
        $dbUser,
        $dbPass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]
    );

    // Tabelle erstellen, falls nicht vorhanden
    $createTable = "CREATE TABLE IF NOT EXISTS logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        level VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        function_name VARCHAR(100) DEFAULT NULL,
        mode VARCHAR(50) DEFAULT NULL,
        timestamp DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_level (level),
        INDEX idx_timestamp (timestamp)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    $pdo->exec($createTable);

    // Input lesen (JSON oder POST)
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    // Fallback auf $_POST wenn JSON fehlschlägt
    if (json_last_error() !== JSON_ERROR_NONE) {
        $data = $_POST;
    }

    // Pflichtfelder validieren
    if (empty($data['level']) || empty($data['message'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Pflichtfelder fehlen: level und message erforderlich'
        ]);
        exit;
    }

    // Daten bereinigen und defaults setzen
    $level = trim($data['level']);
    $message = trim($data['message']);
    $functionName = isset($data['function']) ? trim($data['function']) : null;
    $mode = isset($data['mode']) ? trim($data['mode']) : null;
    
    // Timestamp verarbeiten
    if (!empty($data['timestamp'])) {
        $timestamp = date('Y-m-d H:i:s', strtotime($data['timestamp']));
    } else {
        $timestamp = date('Y-m-d H:i:s');
    }

    // Level validieren
    $validLevels = ['debug', 'info', 'warning', 'error', 'critical'];
    if (!in_array(strtolower($level), $validLevels)) {
        $level = 'info';
    }

    // Insert Query vorbereiten
    $stmt = $pdo->prepare(
        "INSERT INTO logs (level, message, function_name, mode, timestamp) 
         VALUES (:level, :message, :function_name, :mode, :timestamp)"
    );

    // Query ausführen
    $success = $stmt->execute([
        ':level' => $level,
        ':message' => $message,
        ':function_name' => $functionName,
        ':mode' => $mode,
        ':timestamp' => $timestamp
    ]);

    if ($success) {
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'id' => $pdo->lastInsertId(),
            'message' => 'Log erfolgreich gespeichert'
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Log konnte nicht gespeichert werden'
        ]);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Datenbankfehler',
        'details' => $e->getMessage()
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Serverfehler',
        'details' => $e->getMessage()
    ]);
}
?>