-- 勤怠管理システム テスト用データクリーンアップ
-- 用途: 結合テスト実行後のデータベースクリーンアップ

-- テスト用データの削除（外部キー制約を考慮した順序で削除）

-- 1. 勤怠記録の削除
DELETE FROM attendance_records WHERE employee_id IN (1, 2, 3, 4);

-- 2. 有給申請の削除
DELETE FROM vacation_requests WHERE employee_id IN (1, 2, 3, 4);

-- 3. 打刻修正申請の削除
DELETE FROM adjustment_requests WHERE employee_id IN (1, 2, 3, 4);

-- 4. ユーザーアカウントの削除
DELETE FROM user_accounts WHERE username IN ('tanaka', 'sato', 'suzuki', 'admin', 'takahashi');

-- 5. 従業員データの削除
DELETE FROM employees WHERE employee_id IN (1, 2, 3, 4);

-- 6. 自動採番のリセット（H2データベース用）
-- H2では ALTER SEQUENCE を使用
-- ALTER SEQUENCE employees_seq RESTART WITH 1;
-- ALTER SEQUENCE user_accounts_seq RESTART WITH 1;
-- ALTER SEQUENCE attendance_records_seq RESTART WITH 1;
-- ALTER SEQUENCE vacation_requests_seq RESTART WITH 1;
-- ALTER SEQUENCE adjustment_requests_seq RESTART WITH 1;

-- MySQLの場合は AUTO_INCREMENT をリセット
-- ALTER TABLE employees AUTO_INCREMENT = 1;
-- ALTER TABLE user_accounts AUTO_INCREMENT = 1;
-- ALTER TABLE attendance_records AUTO_INCREMENT = 1;
-- ALTER TABLE vacation_requests AUTO_INCREMENT = 1;
-- ALTER TABLE adjustment_requests AUTO_INCREMENT = 1;

-- クリーンアップ完了の確認
SELECT 
    'employees' as table_name, COUNT(*) as record_count FROM employees WHERE employee_id IN (1, 2, 3, 4)
UNION ALL
SELECT 
    'user_accounts' as table_name, COUNT(*) as record_count FROM user_accounts WHERE username IN ('tanaka', 'sato', 'suzuki', 'admin', 'takahashi')
UNION ALL
SELECT 
    'attendance_records' as table_name, COUNT(*) as record_count FROM attendance_records WHERE employee_id IN (1, 2, 3, 4)
UNION ALL
SELECT 
    'vacation_requests' as table_name, COUNT(*) as record_count FROM vacation_requests WHERE employee_id IN (1, 2, 3, 4)
UNION ALL
SELECT 
    'adjustment_requests' as table_name, COUNT(*) as record_count FROM adjustment_requests WHERE employee_id IN (1, 2, 3, 4);

-- すべてのレコード数が0であることを確認
SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM employees WHERE employee_id IN (1, 2, 3, 4)) = 0
         AND (SELECT COUNT(*) FROM user_accounts WHERE username IN ('tanaka', 'sato', 'suzuki', 'admin', 'takahashi')) = 0
         AND (SELECT COUNT(*) FROM attendance_records WHERE employee_id IN (1, 2, 3, 4)) = 0
         AND (SELECT COUNT(*) FROM vacation_requests WHERE employee_id IN (1, 2, 3, 4)) = 0
         AND (SELECT COUNT(*) FROM adjustment_requests WHERE employee_id IN (1, 2, 3, 4)) = 0
        THEN 'クリーンアップ完了: すべてのテストデータが削除されました'
        ELSE 'クリーンアップ未完了: 一部のテストデータが残っています'
    END as cleanup_status;
