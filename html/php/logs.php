<?php
// log.php - empfängt JSON-Logs und schreibt sie in MariaDB
date_default_timezone_set('Europe/Berlin'); // optional, für deutsche Zeit

// DB-Zugangsdaten
$dbHost = 'localhost';
$dbUser = 'nodeapp';
$dbPass = '1234';
$dbName = 'db';
$dbPort = 3306;

// CORS für Entwicklung (optional)
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

// JSON-Input lesen
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid json']);
    exit;
}

$level = isset($input['level']) ? $input['level'] : 'info';
$message = isset($input['message']) ? $input['message'] : '';
$context = isset($input['context']) ? json_encode($input['context']) : null;

try {
    $pdo = new PDO("mysql:host=$dbHost;port=$dbPort;dbname=$dbName;charset=utf8mb4", $dbUser, $dbPass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt = $pdo->prepare("INSERT INTO logs (level, message, context) VALUES (:level, :message, :context)");
    $stmt->execute([
        ':level' => $level,
        ':message' => $message,
        ':context' => $context
    ]);

    echo json_encode(['ok' => true, 'id' => $pdo->lastInsertId()]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
