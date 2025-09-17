-- サンプル従業員データ挿入
INSERT INTO employees (employee_code, last_name, first_name, email, hire_date, is_active, created_at, updated_at) VALUES
('EMP001', '田中', '太郎', 'tanaka@example.com', '2020-04-01', 1, NOW(), NOW()),
('EMP002', '佐藤', '花子', 'sato@example.com', '2021-06-15', 1, NOW(), NOW()),
('EMP003', '鈴木', '一郎', 'suzuki@example.com', '2019-03-01', 1, NOW(), NOW()),
('EMP004', '高橋', '美咲', 'takahashi@example.com', '2022-09-01', 0, NOW(), NOW());
