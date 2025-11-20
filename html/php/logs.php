<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    die(json_encode(['success' => false, 'error' => 'Nur POST erlaubt']));
}

$dbHost = 'localhost';
$dbName = 'db';
$dbUser = 'nodeapp';
$dbPass = '1234';

try {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        $data = $_POST;
    }

    if (empty($data['level']) || empty($data['message'])) {
        http_response_code(400);
        die(json_encode([
            'success' => false, 
            'error' => 'level und message erforderlich'
        ]));
    }

    $pdo = new PDO(
        "mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4",
        $dbUser,
        $dbPass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );

    // Tabelle mit context Feld erstellen
    $pdo->exec("CREATE TABLE IF NOT EXISTS logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        level VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        function_name VARCHAR(100),
        mode VARCHAR(50),
        context JSON,
        timestamp DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX(level), 
        INDEX(timestamp),
        INDEX(mode)
    ) ENGINE=InnoDB CHARSET=utf8mb4");

    $level = strtolower(trim($data['level']));
    $message = trim($data['message']);
    $function = isset($data['function']) ? trim($data['function']) : null;
    $mode = isset($data['mode']) ? trim($data['mode']) : null;
    $context = isset($data['context']) ? $data['context'] : null;
    $timestamp = !empty($data['timestamp']) ? date('Y-m-d H:i:s', strtotime($data['timestamp'])) : date('Y-m-d H:i:s');

    if (!in_array($level, ['debug', 'info', 'warning', 'error', 'critical'])) {
        $level = 'info';
    }

    // Context als JSON speichern
    if (is_string($context)) {
        // Bereits JSON-String
        $contextJson = $context;
    } else if (is_array($context) || is_object($context)) {
        // PHP Array/Object -> JSON
        $contextJson = json_encode($context);
    } else {
        $contextJson = null;
    }

    $stmt = $pdo->prepare("INSERT INTO logs (level, message, function_name, mode, context, timestamp) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([$level, $message, $function, $mode, $contextJson, $timestamp]);

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'id' => $pdo->lastInsertId(),
        'message' => 'Log gespeichert'
    ]);

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