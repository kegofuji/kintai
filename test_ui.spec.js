import { test, expect } from '@playwright/test';

test('勤怠管理システム UI 結合テスト', async ({ page }) => {
  // 1. ログイン画面
  await page.goto('/login');
  
  // ページが読み込まれるまで待機
  await page.waitForLoadState('networkidle');
  
  // ログインフォームの入力
  await page.fill('input[name="username"]', 'user1');
  await page.fill('input[name="password"]', 'pass');
  await page.click('button[type="submit"]');
  
  // ダッシュボードにリダイレクトされるまで待機
  await page.waitForURL(/.*dashboard/, { timeout: 10000 });

  // 2. 出勤/退勤打刻
  await page.click('button#clock-in');
  await page.click('button#clock-out');
  await expect(page.locator('#attendance-status')).toContainText('退勤済');

  // 3. 勤怠履歴
  await page.click('a[href="/history"]');
  await expect(page.locator('#history-table')).toContainText('09:00');

  // 4. 有給申請
  await page.click('a[href="/vacation"]');
  await page.fill('input[name="date"]', '2025-09-25');
  await page.fill('textarea[name="reason"]', '私用');
  await page.click('button#vacation-submit');
  await expect(page.locator('#vacation-list')).toContainText('申請中');

  // 5. 月末申請
  await page.click('a[href="/history"]');
  await page.click('button#submit-monthly');
  await expect(page.locator('#submission-status')).toContainText('申請済');

  // 6. 管理者ログイン
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'pass');
  await page.click('button[type="submit"]');
  await page.waitForURL(/.*admin/, { timeout: 10000 });

  // 7. 管理者有給承認
  await page.click('a[href="/admin/vacation"]');
  await page.click('button.approve:first-child');
  await expect(page.locator('#vacation-list')).toContainText('承認済');

  // 8. PDF出力
  await page.click('a[href="/report"]');
  await page.selectOption('select#employee', { value: '2' });
  await page.fill('input[name="yearMonth"]', '2025-09');
  await page.click('button#pdf-generate');
  await expect(page).toHaveURL(/.*report/);
});