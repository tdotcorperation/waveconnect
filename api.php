<?php
/**
 * WaveConnect Unified API
 * Handles Auth, Friends, and User Search
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

// Database Configuration
const DB_HOST = '61.79.50.45'; // DB 주소 입력
const DB_NAME = 'waveconnect';
const DB_USER = 'wavenetwork';
const DB_PASS = 'wave!0021';

function getDB() {
    try {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        return new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Connection failed: " . $e->getMessage()]);
        exit;
    }
}

$pdo = getDB();
$action = $_GET['action'] ?? '';

// Handle POST data
$input = json_decode(file_get_contents("php://input"), true);

switch ($action) {
    case 'register':
        $username = $input['username'] ?? '';
        $password = password_hash($input['password'] ?? '', PASSWORD_DEFAULT);
        $email = $input['email'] ?? '';
        $nickname = $input['nickname'] ?? '';

        try {
            $stmt = $pdo->prepare("INSERT INTO users (username, password, email, nickname) VALUES (?, ?, ?, ?)");
            $stmt->execute([$username, $password, $email, $nickname]);
            echo json_encode(["success" => true, "userId" => $pdo->lastInsertId()]);
        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "이미 존재하는 아이디이거나 오류가 발생했습니다."]);
        }
        break;

    case 'login':
        $username = $input['username'] ?? '';
        $password = $input['password'] ?? '';

        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password'])) {
            unset($user['password']); // 보안상 비밀번호 제외
            echo json_encode(["success" => true, "user" => $user]);
        } else {
            echo json_encode(["success" => false, "message" => "아이디 또는 비밀번호가 일치하지 않습니다."]);
        }
        break;

    case 'search_user':
        $username = $_GET['username'] ?? '';
        $stmt = $pdo->prepare("SELECT id, username, nickname FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();
        echo json_encode($user ?: ["error" => "사용자를 찾을 수 없습니다."]);
        break;

    case 'add_friend':
        $userId = $input['userId'] ?? 0;
        $friendId = $input['friendId'] ?? 0;
        try {
            $stmt = $pdo->prepare("INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, 'active')");
            $stmt->execute([$userId, $friendId]);
            echo json_encode(["success" => true]);
        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "이미 친구이거나 오류가 발생했습니다."]);
        }
        break;

    case 'get_friends':
        $userId = $_GET['userId'] ?? 0;
        $stmt = $pdo->prepare("
            SELECT u.id, u.username, u.nickname 
            FROM friends f 
            JOIN users u ON f.friend_id = u.id 
            WHERE f.user_id = ? AND f.status = 'active'
        ");
        $stmt->execute([$userId]);
        echo json_encode($stmt->fetchAll());
        break;

    default:
        echo json_encode(["message" => "WaveConnect API v1.0 Running"]);
        break;
}
?>
