-- 打刻修正申請に承認/却下の監査項目と却下コメントを追加
ALTER TABLE adjustment_requests
  ADD COLUMN approved_by_employee_id BIGINT NULL,
  ADD COLUMN approved_at TIMESTAMP NULL,
  ADD COLUMN rejected_by_employee_id BIGINT NULL,
  ADD COLUMN rejected_at TIMESTAMP NULL,
  ADD COLUMN rejection_comment VARCHAR(500) NULL;

-- インデックス（検索最適化）
CREATE INDEX idx_adjustment_requests_status ON adjustment_requests(status);
CREATE INDEX idx_adjustment_requests_employee_date ON adjustment_requests(employee_id, target_date);


