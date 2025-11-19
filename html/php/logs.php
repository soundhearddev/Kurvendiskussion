<?php
// --- DB CONFIG ---
$host = "localhost";
$user = "nodeapp";          // anpassen
$pass = "1234";              // anpassen
$dbname = "db"; // anpassen

$conn = new mysqli($host, $user, $pass, $dbname);

if ($conn->connect_error) {
    http_response_code(500);
    die("DB connection failed");
}

$level    = $_POST['level']    ?? '';
$message  = $_POST['message']  ?? '';
$func     = $_POST['function'] ?? '';
$input    = $_POST['input']    ?? '';

$stmt = $conn->prepare(
    "INSERT INTO logs (level, message, function_name, input_value)
     VALUES (?, ?, ?, ?)"
);

$stmt->bind_param("ssss", $level, $message, $func, $input);

if ($stmt->execute()) {
    echo "OK";
} else {
    http_response_code(500);
    echo "DB error";
}

$stmt->close();
$conn->close();
?>
