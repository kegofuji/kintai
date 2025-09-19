-- ユーザーアカウントテーブル作成
CREATE TABLE user_accounts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    employee_id BIGINT,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
);

-- サンプルユーザーデータ挿入
INSERT INTO user_accounts (employee_id, enabled, password, role, username)
SELECT e.employee_id, TRUE, '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVEFDi', 'EMPLOYEE', 'tanaka'
FROM employees e
WHERE e.employee_code = 'EMP001' AND NOT EXISTS (SELECT 1 FROM user_accounts ua WHERE ua.username = 'tanaka');

INSERT INTO user_accounts (employee_id, enabled, password, role, username)
SELECT e.employee_id, TRUE, '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVEFDi', 'EMPLOYEE', 'sato'
FROM employees e
WHERE e.employee_code = 'EMP002' AND NOT EXISTS (SELECT 1 FROM user_accounts ua WHERE ua.username = 'sato');

INSERT INTO user_accounts (employee_id, enabled, password, role, username)
SELECT e.employee_id, TRUE, '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVEFDi', 'EMPLOYEE', 'suzuki'
FROM employees e
WHERE e.employee_code = 'EMP003' AND NOT EXISTS (SELECT 1 FROM user_accounts ua WHERE ua.username = 'suzuki');

INSERT INTO user_accounts (employee_id, enabled, password, role, username)
SELECT e.employee_id, TRUE, '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVEFDi', 'ADMIN', 'admin'
FROM employees e
WHERE e.employee_code = 'EMP001' AND NOT EXISTS (SELECT 1 FROM user_accounts ua WHERE ua.username = 'admin');

-- user1アカウント追加（テスト用）
INSERT INTO user_accounts (employee_id, enabled, password, role, username)
SELECT e.employee_id, TRUE, '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVEFDi', 'EMPLOYEE', 'user1'
FROM employees e
WHERE e.employee_code = 'EMP002' AND NOT EXISTS (SELECT 1 FROM user_accounts ua WHERE ua.username = 'user1');