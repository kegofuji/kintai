// グローバル変数
let currentUser = null;
let csrfToken = null;
let currentEmployeeId = null;

// DOM要素の取得
const loginContainer = document.getElementById('loginContainer');
const mainContainer = document.getElementById('mainContainer');
const loginForm = document.getElementById('loginForm');
const currentUserSpan = document.getElementById('currentUser');
const clockInBtn = document.getElementById('clockInBtn');
const clockOutBtn = document.getElementById('clockOutBtn');
const clockStatus = document.getElementById('clockStatus');
const refreshHistoryBtn = document.getElementById('refreshHistoryBtn');
const attendanceHistory = document.getElementById('attendanceHistory');
const monthlySubmitBtn = document.getElementById('monthlySubmitBtn');
const monthSelect = document.getElementById('monthSelect');
const adminSection = document.getElementById('adminSection');
const logoutBtn = document.getElementById('logoutBtn');
const vacationForm = document.getElementById('vacationForm');
const submitVacationBtn = document.getElementById('submitVacationBtn');
const alertContainer = document.getElementById('alertContainer');

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    generateMonthOptions();
});

// アプリケーション初期化
function initializeApp() {
    // セッション確認
    checkSession();
}

// イベントリスナー設定
function setupEventListeners() {
    loginForm.addEventListener('submit', handleLogin);
    clockInBtn.addEventListener('click', handleClockIn);
    clockOutBtn.addEventListener('click', handleClockOut);
    refreshHistoryBtn.addEventListener('click', loadAttendanceHistory);
    monthlySubmitBtn.addEventListener('click', handleMonthlySubmit);
    logoutBtn.addEventListener('click', handleLogout);
    submitVacationBtn.addEventListener('click', handleVacationSubmit);
}

// セッション確認
async function checkSession() {
    try {
        const response = await fetch('/api/auth/session', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.authenticated) {
                currentUser = data.username;
                currentEmployeeId = data.employeeId;
                showMainInterface();
                await loadCSRFToken();
                await loadAttendanceHistory();
            } else {
                showLoginInterface();
            }
        } else {
            showLoginInterface();
        }
    } catch (error) {
        console.error('セッション確認エラー:', error);
        showLoginInterface();
    }
}

// ログイン処理
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.username;
            currentEmployeeId = data.employeeId;
            showAlert('ログインに成功しました', 'success');
            showMainInterface();
            await loadCSRFToken();
            await loadAttendanceHistory();
        } else {
            showAlert(data.message || 'ログインに失敗しました', 'danger');
        }
    } catch (error) {
        console.error('ログインエラー:', error);
        showAlert('ログイン処理中にエラーが発生しました', 'danger');
    }
}

// ログアウト処理
async function handleLogout() {
    try {
        await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': csrfToken
            },
            credentials: 'include'
        });
        
        currentUser = null;
        currentEmployeeId = null;
        csrfToken = null;
        showLoginInterface();
        showAlert('ログアウトしました', 'info');
    } catch (error) {
        console.error('ログアウトエラー:', error);
        showAlert('ログアウト処理中にエラーが発生しました', 'danger');
    }
}

// CSRFトークン取得
async function loadCSRFToken() {
    try {
        const response = await fetch('/api/attendance/csrf-token', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            csrfToken = data.token;
        }
    } catch (error) {
        console.error('CSRFトークン取得エラー:', error);
    }
}

// 出勤打刻
async function handleClockIn() {
    if (!currentEmployeeId) {
        showAlert('従業員IDが取得できません', 'danger');
        return;
    }
    
    try {
        const response = await fetch('/api/attendance/clock-in', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken
            },
            credentials: 'include',
            body: JSON.stringify({ employeeId: currentEmployeeId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(data.message, 'success');
            await loadAttendanceHistory();
        } else {
            showAlert(data.message || '出勤打刻に失敗しました', 'danger');
        }
    } catch (error) {
        console.error('出勤打刻エラー:', error);
        showAlert('出勤打刻処理中にエラーが発生しました', 'danger');
    }
}

// 退勤打刻
async function handleClockOut() {
    if (!currentEmployeeId) {
        showAlert('従業員IDが取得できません', 'danger');
        return;
    }
    
    try {
        const response = await fetch('/api/attendance/clock-out', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken
            },
            credentials: 'include',
            body: JSON.stringify({ employeeId: currentEmployeeId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(data.message, 'success');
            await loadAttendanceHistory();
        } else {
            showAlert(data.message || '退勤打刻に失敗しました', 'danger');
        }
    } catch (error) {
        console.error('退勤打刻エラー:', error);
        showAlert('退勤打刻処理中にエラーが発生しました', 'danger');
    }
}

// 勤怠履歴読み込み
async function loadAttendanceHistory() {
    if (!currentEmployeeId) return;
    
    try {
        // 実際のAPIを呼び出し
        const response = await fetch(`/api/attendance/history/${currentEmployeeId}`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                displayAttendanceHistory(data.data);
            } else {
                // APIが失敗した場合はモックデータを表示
                const mockData = generateMockAttendanceData();
                displayAttendanceHistory(mockData);
            }
        } else {
            // APIが利用できない場合はモックデータを表示
            const mockData = generateMockAttendanceData();
            displayAttendanceHistory(mockData);
        }
    } catch (error) {
        console.error('勤怠履歴読み込みエラー:', error);
        // エラーの場合はモックデータを表示
        const mockData = generateMockAttendanceData();
        displayAttendanceHistory(mockData);
    }
}

// モック勤怠データ生成
function generateMockAttendanceData() {
    const data = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        const clockIn = new Date(date);
        clockIn.setHours(9, Math.floor(Math.random() * 30), 0, 0);
        
        const clockOut = new Date(date);
        clockOut.setHours(18, Math.floor(Math.random() * 60), 0, 0);
        
        const workingHours = Math.round((clockOut - clockIn) / (1000 * 60 * 60) * 10) / 10;
        
        data.push({
            date: date.toISOString().split('T')[0],
            clockIn: clockIn.toTimeString().substring(0, 5),
            clockOut: clockOut.toTimeString().substring(0, 5),
            workingHours: workingHours + 'h',
            status: i === 0 ? '出勤中' : '退勤済み'
        });
    }
    
    return data;
}

// 勤怠履歴表示
function displayAttendanceHistory(data) {
    const tbody = attendanceHistory;
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">データがありません</td></tr>';
        return;
    }
    
    data.forEach(record => {
        const row = document.createElement('tr');
        
        // 実際のデータ構造に合わせて表示
        const clockInTime = record.clockInTime ? 
            new Date(record.clockInTime).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'}) : '-';
        const clockOutTime = record.clockOutTime ? 
            new Date(record.clockOutTime).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'}) : '-';
        
        // 勤務時間計算
        let workingHours = '-';
        if (record.clockInTime && record.clockOutTime) {
            const clockIn = new Date(record.clockInTime);
            const clockOut = new Date(record.clockOutTime);
            const diffMs = clockOut - clockIn;
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            workingHours = `${diffHours}h ${diffMinutes}m`;
        }
        
        // ステータス表示
        let statusText = '未出勤';
        let statusClass = 'bg-secondary';
        
        if (record.clockInTime && !record.clockOutTime) {
            statusText = '出勤中';
            statusClass = 'bg-success';
        } else if (record.clockInTime && record.clockOutTime) {
            statusText = '退勤済み';
            statusClass = 'bg-primary';
        }
        
        row.innerHTML = `
            <td>${record.attendanceDate}</td>
            <td>${clockInTime}</td>
            <td>${clockOutTime}</td>
            <td>${workingHours}</td>
            <td><span class="badge ${statusClass}">${statusText}</span></td>
        `;
        tbody.appendChild(row);
    });
}

// 月末申請
async function handleMonthlySubmit() {
    const selectedMonth = monthSelect.value;
    
    if (!selectedMonth) {
        showAlert('申請月を選択してください', 'warning');
        return;
    }
    
    if (!currentEmployeeId) {
        showAlert('従業員IDが取得できません', 'danger');
        return;
    }
    
    try {
        const response = await fetch('/api/attendance/monthly-submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken
            },
            credentials: 'include',
            body: JSON.stringify({ 
                employeeId: currentEmployeeId, 
                yearMonth: selectedMonth 
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(data.message, 'success');
        } else {
            showAlert(data.message || '月末申請に失敗しました', 'danger');
        }
    } catch (error) {
        console.error('月末申請エラー:', error);
        showAlert('月末申請処理中にエラーが発生しました', 'danger');
    }
}

// 有給申請
async function handleVacationSubmit() {
    const startDate = document.getElementById('vacationStartDate').value;
    const endDate = document.getElementById('vacationEndDate').value;
    const reason = document.getElementById('vacationReason').value;
    
    if (!startDate || !endDate || !reason) {
        showAlert('すべての項目を入力してください', 'warning');
        return;
    }
    
    if (!currentEmployeeId) {
        showAlert('従業員IDが取得できません', 'danger');
        return;
    }
    
    try {
        const response = await fetch('/api/vacation/request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken
            },
            credentials: 'include',
            body: JSON.stringify({ 
                employeeId: currentEmployeeId,
                startDate: startDate,
                endDate: endDate,
                reason: reason
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(data.message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('vacationModal')).hide();
            vacationForm.reset();
        } else {
            showAlert(data.message || '有給申請に失敗しました', 'danger');
        }
    } catch (error) {
        console.error('有給申請エラー:', error);
        showAlert('有給申請処理中にエラーが発生しました', 'danger');
    }
}

// 管理者機能: 社員一覧
async function loadEmployees() {
    try {
        const response = await fetch('/api/admin/employees', {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 社員一覧をモーダルで表示
            showEmployeeListModal(data.data);
        } else {
            showAlert(data.message || '社員一覧の取得に失敗しました', 'danger');
        }
    } catch (error) {
        console.error('社員一覧取得エラー:', error);
        showAlert('社員一覧の取得中にエラーが発生しました', 'danger');
    }
}

// 管理者機能: 未承認申請
async function loadPendingVacations() {
    try {
        const response = await fetch('/api/admin/vacation/pending', {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 未承認申請をモーダルで表示
            showPendingVacationsModal(data.data);
        } else {
            showAlert(data.message || '未承認申請の取得に失敗しました', 'danger');
        }
    } catch (error) {
        console.error('未承認申請取得エラー:', error);
        showAlert('未承認申請の取得中にエラーが発生しました', 'danger');
    }
}

// 管理者機能: レポート出力
async function downloadReport() {
    if (!currentEmployeeId) {
        showAlert('従業員IDが取得できません', 'danger');
        return;
    }
    
    const currentMonth = new Date().toISOString().substring(0, 7);
    
    try {
        const response = await fetch(`/api/attendance/report/${currentEmployeeId}/${currentMonth}`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `attendance_${currentEmployeeId}_${currentMonth}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showAlert('レポートをダウンロードしました', 'success');
        } else {
            showAlert('レポートのダウンロードに失敗しました', 'danger');
        }
    } catch (error) {
        console.error('レポートダウンロードエラー:', error);
        showAlert('レポートのダウンロード中にエラーが発生しました', 'danger');
    }
}

// 月選択オプション生成
function generateMonthOptions() {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    for (let i = 0; i < 12; i++) {
        const date = new Date(currentYear, currentMonth - 1 - i, 1);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const value = `${year}-${month}`;
        const label = `${year}年${month}月`;
        
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        monthSelect.appendChild(option);
    }
}

// ログイン画面表示
function showLoginInterface() {
    loginContainer.style.display = 'block';
    mainContainer.style.display = 'none';
}

// メイン画面表示
function showMainInterface() {
    loginContainer.style.display = 'none';
    mainContainer.style.display = 'block';
    
    currentUserSpan.textContent = currentUser;
    
    // 管理者権限チェック
    if (currentUser === 'admin') {
        adminSection.style.display = 'block';
    } else {
        adminSection.style.display = 'none';
    }
}

// アラート表示
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    alertContainer.appendChild(alertDiv);
    
    // 5秒後に自動削除
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, 5000);
}

// 社員一覧モーダル表示
function showEmployeeListModal(employees) {
    const modalHtml = `
        <div class="modal fade" id="employeeListModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">社員一覧</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="table-responsive">
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th>従業員ID</th>
                                        <th>従業員コード</th>
                                        <th>氏名</th>
                                        <th>メール</th>
                                        <th>入社日</th>
                                        <th>ステータス</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${employees.map(emp => `
                                        <tr>
                                            <td>${emp.employeeId}</td>
                                            <td>${emp.employeeCode}</td>
                                            <td>${emp.lastName} ${emp.firstName}</td>
                                            <td>${emp.email}</td>
                                            <td>${emp.hireDate}</td>
                                            <td><span class="badge ${emp.isActive ? 'bg-success' : 'bg-secondary'}">${emp.isActive ? '在職' : '退職'}</span></td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">閉じる</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 既存のモーダルを削除
    const existingModal = document.getElementById('employeeListModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 新しいモーダルを追加
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // モーダルを表示
    const modal = new bootstrap.Modal(document.getElementById('employeeListModal'));
    modal.show();
}

// 未承認申請モーダル表示
function showPendingVacationsModal(vacations) {
    const modalHtml = `
        <div class="modal fade" id="pendingVacationsModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">未承認有給申請</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="table-responsive">
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th>申請ID</th>
                                        <th>従業員ID</th>
                                        <th>開始日</th>
                                        <th>終了日</th>
                                        <th>理由</th>
                                        <th>申請日</th>
                                        <th>操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${vacations.map(vacation => `
                                        <tr>
                                            <td>${vacation.vacationId}</td>
                                            <td>${vacation.employeeId}</td>
                                            <td>${vacation.startDate}</td>
                                            <td>${vacation.endDate}</td>
                                            <td>${vacation.reason}</td>
                                            <td>${vacation.createdAt}</td>
                                            <td>
                                                <button class="btn btn-success btn-sm me-1" onclick="approveVacation(${vacation.vacationId})">承認</button>
                                                <button class="btn btn-danger btn-sm" onclick="rejectVacation(${vacation.vacationId})">却下</button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">閉じる</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 既存のモーダルを削除
    const existingModal = document.getElementById('pendingVacationsModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 新しいモーダルを追加
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // モーダルを表示
    const modal = new bootstrap.Modal(document.getElementById('pendingVacationsModal'));
    modal.show();
}

// 有給申請承認
async function approveVacation(vacationId) {
    try {
        const response = await fetch('/api/admin/vacation/approve', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken
            },
            credentials: 'include',
            body: JSON.stringify({
                vacationId: vacationId,
                approved: true
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(data.message, 'success');
            // モーダルを閉じて再読み込み
            bootstrap.Modal.getInstance(document.getElementById('pendingVacationsModal')).hide();
            await loadPendingVacations();
        } else {
            showAlert(data.message || '承認に失敗しました', 'danger');
        }
    } catch (error) {
        console.error('有給申請承認エラー:', error);
        showAlert('承認処理中にエラーが発生しました', 'danger');
    }
}

// 有給申請却下
async function rejectVacation(vacationId) {
    try {
        const response = await fetch('/api/admin/vacation/approve', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken
            },
            credentials: 'include',
            body: JSON.stringify({
                vacationId: vacationId,
                approved: false
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(data.message, 'success');
            // モーダルを閉じて再読み込み
            bootstrap.Modal.getInstance(document.getElementById('pendingVacationsModal')).hide();
            await loadPendingVacations();
        } else {
            showAlert(data.message || '却下に失敗しました', 'danger');
        }
    } catch (error) {
        console.error('有給申請却下エラー:', error);
        showAlert('却下処理中にエラーが発生しました', 'danger');
    }
}
