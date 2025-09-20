import { test, expect } from '@playwright/test';

test('勤怠管理システム UI 結合テスト', async ({ page }) => {
  // 1. ログイン画面
  await page.goto('/');
  
  // ページが読み込まれるまで待機
  await page.waitForLoadState('networkidle');
  
  // ログインフォームの入力
  await page.fill('#username', 'user1');
  await page.fill('#password', 'pass');
  await page.click('button[type="submit"]');
  
  // ダッシュボードにリダイレクトされるまで待機
  await page.waitForSelector('#mainContainer', { state: 'visible' });

  // 2. 出勤/退勤打刻
  await page.click('#clockInBtn');
  await page.waitForTimeout(1000);
  await page.click('#clockOutBtn');
  await expect(page.locator('#clockStatus')).toContainText('退勤済み');

  // 3. 勤怠履歴画面のテスト
  await page.click('#historyNavLink');
  await page.waitForSelector('#historyScreen', { state: 'visible' });
  
  // カレンダーの表示確認
  await expect(page.locator('#calendarGrid')).toBeVisible();
  
  // 時間表示フォーマットの確認（0:00形式）
  await expect(page.locator('#historyTableBody td:nth-child(5)')).toContainText('0:00');

  // 4. 有給申請
  await page.click('#vacationNavLink');
  await page.waitForSelector('#vacationScreen', { state: 'visible' });
  await page.fill('#vacationStartDate', '2025-09-25');
  await page.fill('#vacationReason', '私用');
  await page.click('button[type="submit"]');
  
  // 5. 月末申請ボタンの位置確認（右端に配置されているか）
  await page.click('#historyNavLink');
  await page.waitForSelector('#historyScreen', { state: 'visible' });
  await expect(page.locator('#monthlySubmitHistoryBtn')).toBeVisible();

  // 6. 管理者ログイン
  await page.click('#logoutBtn');
  await page.waitForTimeout(1000);
  await page.fill('#username', 'admin');
  await page.fill('#password', 'pass');
  await page.click('button[type="submit"]');
  await page.waitForSelector('#mainContainer', { state: 'visible' });

  // 7. 管理者機能のテスト
  await page.click('#adminEmployeesNavLink');
  await page.waitForSelector('#adminEmployeesScreen', { state: 'visible' });
  
  // 社員管理画面のヘッダー確認
  await expect(page.locator('#adminEmployeesScreen .card-header h5')).toContainText('社員管理');
  
  // 編集・退職処理・社員追加ボタンの動作確認
  await page.click('.edit-employee-btn:first-child');
  await page.waitForTimeout(500);
  
  await page.click('.deactivate-employee-btn:first-child');
  await page.waitForTimeout(500);
  
  await page.click('#addEmployeeBtn');
  
  // 8. 勤怠管理画面のテスト
  await page.click('#adminAttendanceNavLink');
  await page.waitForSelector('#adminAttendanceScreen', { state: 'visible' });
  
  // 期間フィルター・検索機能が廃止されていることを確認
  await expect(page.locator('#attendanceEmployeeSelect')).not.toBeVisible();
  await expect(page.locator('#searchAttendanceBtn')).not.toBeVisible();
  
  // 9. 申請承認画面のテスト
  await page.click('#adminApprovalsNavLink');
  await page.waitForSelector('#adminApprovalsScreen', { state: 'visible' });
  
  // 申請承認画面のヘッダー確認
  await expect(page.locator('#adminApprovalsScreen .card-header h5')).toContainText('申請承認');
  await page.waitForTimeout(500);
  
  // 承認・却下ボタンの動作確認
  await page.click('.approve-btn:first-child');
  await page.waitForTimeout(500);

  // 8. PDF出力
  await page.click('a[href="/report"]');
  await page.selectOption('select#employee', { value: '2' });
  await page.fill('input[name="yearMonth"]', '2025-09');
  await page.click('button#pdf-generate');
  await expect(page).toHaveURL(/.*report/);
});