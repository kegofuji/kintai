-- 勤怠記録テーブル作成
CREATE TABLE attendance_records (
    attendance_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT NOT NULL,
    attendance_date DATE NOT NULL,
    clock_in_time DATETIME NULL,
    clock_out_time DATETIME NULL,
    late_minutes INT NOT NULL DEFAULT 0,
    early_leave_minutes INT NOT NULL DEFAULT 0,
    overtime_minutes INT NOT NULL DEFAULT 0,
    night_shift_minutes INT NOT NULL DEFAULT 0,
    attendance_status VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    attendance_fixed_flag TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
);

-- インデックス作成
CREATE INDEX idx_attendance_records_employee_date ON attendance_records(employee_id, attendance_date);
CREATE INDEX idx_attendance_records_attendance_date ON attendance_records(attendance_date);
CREATE INDEX idx_attendance_records_attendance_status ON attendance_records(attendance_status);
CREATE INDEX idx_attendance_records_fixed_flag ON attendance_records(attendance_fixed_flag);
