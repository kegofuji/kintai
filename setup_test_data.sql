-- テストデータセットアップスクリプト

-- 従業員テーブルのテストデータ
INSERT INTO employees (employee_id, employee_code, first_name, last_name, email, hire_date, is_active, created_at, updated_at) VALUES
(1, 'E001', '太郎', '山田', 'yamada@example.com', '2024-01-01', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'E002', '花子', '鈴木', 'suzuki@example.com', '2024-01-01', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 'E003', '次郎', '田中', 'tanaka@example.com', '2024-01-01', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE 
    employee_code = VALUES(employee_code),
    first_name = VALUES(first_name),
    last_name = VALUES(last_name),
    email = VALUES(email),
    hire_date = VALUES(hire_date),
    is_active = VALUES(is_active),
    updated_at = CURRENT_TIMESTAMP;

-- ユーザーアカウントテーブルのテストデータ
INSERT INTO user_accounts (user_id, username, password, role, employee_id, is_active, created_at, updated_at) VALUES
(1, 'user1', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iYqiSfFOSlJxJx5P8G5XQZx5P8G5', 'USER', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'admin', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iYqiSfFOSlJxJx5P8G5XQZx5P8G5', 'ADMIN', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 'retired_user', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iYqiSfFOSlJxJx5P8G5XQZx5P8G5', 'USER', 3, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE 
    username = VALUES(username),
    password = VALUES(password),
    role = VALUES(role),
    employee_id = VALUES(employee_id),
    is_active = VALUES(is_active),
    updated_at = CURRENT_TIMESTAMP;

-- 勤怠データのテストデータ（今日の分）
INSERT INTO attendance_records (attendance_id, employee_id, attendance_date, clock_in_time, clock_out_time, working_hours, overtime_hours, late_minutes, early_leave_minutes, status, created_at, updated_at) VALUES
(1, 1, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 9 HOUR), DATE_ADD(CURDATE(), INTERVAL 18 HOUR), 8.0, 0.0, 0, 0, 'COMPLETED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 2, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 9 HOUR), NULL, 0.0, 0.0, 0, 0, 'WORKING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE 
    clock_in_time = VALUES(clock_in_time),
    clock_out_time = VALUES(clock_out_time),
    working_hours = VALUES(working_hours),
    overtime_hours = VALUES(overtime_hours),
    late_minutes = VALUES(late_minutes),
    early_leave_minutes = VALUES(early_leave_minutes),
    status = VALUES(status),
    updated_at = CURRENT_TIMESTAMP;

-- 有給申請のテストデータ
INSERT INTO vacation_requests (vacation_id, employee_id, start_date, end_date, reason, status, created_at, updated_at) VALUES
(1, 1, DATE_ADD(CURDATE(), INTERVAL 1 DAY), DATE_ADD(CURDATE(), INTERVAL 1 DAY), '私用のため', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 2, DATE_ADD(CURDATE(), INTERVAL 2 DAY), DATE_ADD(CURDATE(), INTERVAL 3 DAY), '家族旅行', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE 
    start_date = VALUES(start_date),
    end_date = VALUES(end_date),
    reason = VALUES(reason),
    status = VALUES(status),
    updated_at = CURRENT_TIMESTAMP;

-- 月末申請のテストデータ
INSERT INTO monthly_submissions (submission_id, employee_id, year_month, status, created_at, updated_at) VALUES
(1, 1, DATE_FORMAT(CURDATE(), '%Y-%m'), 'SUBMITTED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 2, DATE_FORMAT(CURDATE(), '%Y-%m'), 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE 
    year_month = VALUES(year_month),
    status = VALUES(status),
    updated_at = CURRENT_TIMESTAMP;