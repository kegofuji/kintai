-- Idempotent sample data insertion for employees and user_accounts
-- This script avoids duplicate key errors by inserting only when the key does not already exist.
-- Works for H2 and MySQL with the SELECT ... WHERE NOT EXISTS pattern.

INSERT INTO employees (created_at, email, employee_code, first_name, hire_date, is_active, last_name, updated_at)
SELECT CURRENT_TIMESTAMP, 'tanaka@example.com', 'EMP001', '太郎', '2020-04-01', TRUE, '田中', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'EMP001');

INSERT INTO employees (created_at, email, employee_code, first_name, hire_date, is_active, last_name, updated_at)
SELECT CURRENT_TIMESTAMP, 'sato@example.com', 'EMP002', '花子', '2021-06-15', TRUE, '佐藤', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'EMP002');

INSERT INTO employees (created_at, email, employee_code, first_name, hire_date, is_active, last_name, updated_at)
SELECT CURRENT_TIMESTAMP, 'suzuki@example.com', 'EMP003', '一郎', '2019-03-01', TRUE, '鈴木', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'EMP003');

INSERT INTO employees (created_at, email, employee_code, first_name, hire_date, is_active, last_name, updated_at)
SELECT CURRENT_TIMESTAMP, 'takahashi@example.com', 'EMP004', '美咲', '2022-09-01', FALSE, '高橋', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'EMP004');

-- user_accountsデータはV5で作成されるテーブルに挿入するため、ここでは省略
