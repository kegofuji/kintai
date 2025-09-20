// グローバル変数
let currentUser = null;
let csrfToken = null;
let currentEmployeeId = null;

// DOM要素の取得
const loginContainer = document.getElementById('loginContainer');
const mainContainer = document.getElementById('mainContainer');
const loginForm = document.getElementById('loginForm');
const currentUserSpan = document.getElementById('currentUserDisplay');
const clockInBtn = document.getElementById('clockInBtn');
const clockOutBtn = document.getElementById('clockOutBtn');
const clockStatus = document.getElementById('clockStatus');
const refreshHistoryBtn = document.getElementById('refreshHistoryBtn');
const attendanceHistory = document.getElementById('historyTableBody');
const monthlySubmitBtn = document.getElementById('monthlySubmitBtn');
const monthSelect = document.getElementById('historyMonthSelect');
// 管理者メニューアイテムの要素を取得
const adminVacationManagementNavItem = document.getElementById('adminVacationManagementNavItem');
const adminEmployeesNavItem = document.getElementById('adminEmployeesNavItem');
const adminAttendanceNavItem = document.getElementById('adminAttendanceNavItem');
const adminApprovalsNavItem = document.getElementById('adminApprovalsNavItem');
const adminReportsNavItem = document.getElementById('adminReportsNavItem');
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
    console.log('アプリケーションを初期化中...');
    
    // セッション確認
    checkSession();
    
    // 現在時刻の更新開始（即座に実行）
    updateCurrentTime();
    // 1秒間隔で時刻を更新
    setInterval(updateCurrentTime, 1000);
    
    // 現在日付の更新
    updateCurrentDate();
    
    console.log('アプリケーション初期化完了');
}

// イベントリスナー設定
function setupEventListeners() {
    // 基本イベントリスナー（要素が存在する場合のみ）
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (clockInBtn) clockInBtn.addEventListener('click', handleClockIn);
    if (clockOutBtn) clockOutBtn.addEventListener('click', handleClockOut);
    if (refreshHistoryBtn) refreshHistoryBtn.addEventListener('click', loadAttendanceHistory);
    if (monthlySubmitBtn) monthlySubmitBtn.addEventListener('click', handleMonthlySubmit);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (submitVacationBtn) submitVacationBtn.addEventListener('click', handleVacationSubmit);
    
    // ナビゲーションメニューのイベントリスナー
    setupNavigationListeners();
    
    // パスワード強度チェック機能は削除
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
                updateTodayAttendance();
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
            updateTodayAttendance();
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
    
    // ボタンを一時的に無効化
    const clockInBtn = document.getElementById('clockInBtn');
    if (clockInBtn) {
        clockInBtn.disabled = true;
        clockInBtn.textContent = '処理中...';
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
            await updateTodayAttendance();
        } else {
            // エラーメッセージを適切に表示
            let errorMessage = data.message || '出勤打刻に失敗しました';
            if (errorMessage.includes('既に出勤打刻済み')) {
                errorMessage = '既に出勤打刻済みです。退勤打刻ボタンをご利用ください。';
            }
            showAlert(errorMessage, 'warning');
            await updateTodayAttendance(); // 状態を再同期
        }
    } catch (error) {
        console.error('出勤打刻エラー:', error);
        showAlert('出勤打刻処理中にエラーが発生しました', 'danger');
    } finally {
        // ボタンの状態を復元
        if (clockInBtn) {
            clockInBtn.textContent = '出勤打刻';
            // updateTodayAttendance()で適切な状態に更新される
        }
    }
}

// 退勤打刻
async function handleClockOut() {
    if (!currentEmployeeId) {
        showAlert('従業員IDが取得できません', 'danger');
        return;
    }
    
    // ボタンを一時的に無効化
    const clockOutBtn = document.getElementById('clockOutBtn');
    if (clockOutBtn) {
        clockOutBtn.disabled = true;
        clockOutBtn.textContent = '処理中...';
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
            await updateTodayAttendance();
        } else {
            // エラーメッセージを適切に表示
            let errorMessage = data.message || '退勤打刻に失敗しました';
            if (errorMessage.includes('出勤打刻がされていません')) {
                errorMessage = 'まず出勤打刻を行ってください。';
            } else if (errorMessage.includes('既に退勤打刻済み')) {
                errorMessage = '既に退勤打刻済みです。';
            }
            showAlert(errorMessage, 'warning');
            await updateTodayAttendance(); // 状態を再同期
        }
    } catch (error) {
        console.error('退勤打刻エラー:', error);
        showAlert('退勤打刻処理中にエラーが発生しました', 'danger');
    } finally {
        // ボタンの状態を復元
        if (clockOutBtn) {
            clockOutBtn.textContent = '退勤打刻';
            // updateTodayAttendance()で適切な状態に更新される
        }
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
        
        const diffMinutes = Math.floor((clockOut - clockIn) / (1000 * 60));
        const workingHours = TimeUtils.formatMinutesToTime(diffMinutes);
        
        // 日本時間での日付文字列を生成
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        data.push({
            attendanceDate: dateStr,
            clockInTime: clockIn.toISOString(),
            clockOutTime: clockOut.toISOString(),
            workingHours: workingHours,
            status: i === 0 ? '出勤中' : '退勤済み'
        });
    }
    
    return data;
}

// 勤怠履歴表示
function displayAttendanceHistory(data) {
    const tbody = document.getElementById('historyTableBody');
    if (!tbody) {
        console.error('historyTableBody要素が見つかりません');
        return;
    }
    
    // カレンダー用にデータを保存
    window.attendanceData = data || [];
    
    tbody.innerHTML = '';
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">データがありません</td></tr>';
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
        let workingHours = '0:00';
        if (record.clockInTime && record.clockOutTime) {
            workingHours = TimeUtils.calculateWorkingTime(record.clockInTime, record.clockOutTime);
        }
        
        // 遅刻・早退・残業時間表示（0:00形式に統一）
        const lateMinutes = record.lateMinutes || 0;
        const earlyLeaveMinutes = record.earlyLeaveMinutes || 0;
        const overtimeMinutes = record.overtimeMinutes || 0;
        const nightShiftMinutes = record.nightShiftMinutes || 0;
        
        // ステータス表示
        let statusText = '未出勤';
        
        if (record.clockInTime && !record.clockOutTime) {
            statusText = '出勤中';
        } else if (record.clockInTime && record.clockOutTime) {
            statusText = '退勤済み';
        }
        
        row.innerHTML = `
            <td>${record.attendanceDate}</td>
            <td>${clockInTime}</td>
            <td>${clockOutTime}</td>
            <td>${workingHours}</td>
            <td>${formatMinutesToTime(lateMinutes)}</td>
            <td>${formatMinutesToTime(earlyLeaveMinutes)}</td>
            <td>${formatMinutesToTime(overtimeMinutes)}</td>
            <td>${formatMinutesToTime(nightShiftMinutes)}</td>
            <td>${statusText}</td>
        `;
        tbody.appendChild(row);
    });
    
    // カレンダーを再生成
    generateCalendar();
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
    console.log('メイン画面を表示中...');
    
    loginContainer.style.display = 'none';
    mainContainer.style.display = 'block';
    
    currentUserSpan.textContent = currentUser;
    
    // 管理者権限チェック（セッション情報からroleを取得）
    checkAdminPermissions();
    
    // 時刻と日付を更新
    updateCurrentTime();
    updateCurrentDate();
    
    // ダッシュボード画面を初期表示
    showScreen('dashboardScreen');
    
    console.log('メイン画面表示完了');
}

// アラート表示
function showAlert(message, type = 'info', clearExisting = true) {
    // 既存のアラートをクリア（オプション）
    if (clearExisting) {
        clearAllAlerts();
    }
    
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

// 全てのアラートをクリア
function clearAllAlerts() {
    if (alertContainer) {
        alertContainer.innerHTML = '';
    }
}

// ナビゲーションリスナー設定
function setupNavigationListeners() {
    console.log('ナビゲーションリスナーを設定中...');
    
    // ブランドリンク
    const brandNavLink = document.getElementById('brandNavLink');
    
    // 一般ユーザーメニュー
    const dashboardNavLink = document.getElementById('dashboardNavLink');
    const historyNavLink = document.getElementById('historyNavLink');
    const vacationNavLink = document.getElementById('vacationNavLink');
    const adjustmentNavLink = document.getElementById('adjustmentNavLink');
    
    // 管理者メニュー
    const adminVacationManagementNavLink = document.getElementById('adminVacationManagementNavLink');
    const adminEmployeesNavLink = document.getElementById('adminEmployeesNavLink');
    const adminAttendanceNavLink = document.getElementById('adminAttendanceNavLink');
    const adminApprovalsNavLink = document.getElementById('adminApprovalsNavLink');
    const adminReportsNavLink = document.getElementById('adminReportsNavLink');
    
    console.log('ナビゲーション要素の取得状況:', {
        brandNavLink: !!brandNavLink,
        dashboardNavLink: !!dashboardNavLink,
        historyNavLink: !!historyNavLink,
        vacationNavLink: !!vacationNavLink,
        adjustmentNavLink: !!adjustmentNavLink
    });
    
    // イベントリスナー追加
    if (brandNavLink) {
        brandNavLink.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('ブランドリンクがクリックされました');
            showScreen('dashboardScreen');
            updateActiveNavLink(dashboardNavLink);
        });
    }
    
    if (dashboardNavLink) {
        dashboardNavLink.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('ダッシュボードリンクがクリックされました');
            showScreen('dashboardScreen');
            updateActiveNavLink(dashboardNavLink);
        });
    }
    
    if (historyNavLink) {
        historyNavLink.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('勤怠履歴リンクがクリックされました');
            showScreen('historyScreen');
            updateActiveNavLink(historyNavLink);
        });
    }
    
    if (vacationNavLink) {
        vacationNavLink.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('有給申請リンクがクリックされました');
            showScreen('vacationScreen');
            updateActiveNavLink(vacationNavLink);
        });
    }
    
    if (adjustmentNavLink) {
        adjustmentNavLink.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('打刻修正リンクがクリックされました');
            showScreen('adjustmentScreen');
            updateActiveNavLink(adjustmentNavLink);
        });
    }
    
    // 管理者メニューのイベントリスナー
    if (adminVacationManagementNavLink) {
        adminVacationManagementNavLink.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('有給承認リンクがクリックされました');
            showScreen('adminVacationManagementScreen');
            updateActiveNavLink(adminVacationManagementNavLink);
        });
    }
    
    if (adminEmployeesNavLink) {
        adminEmployeesNavLink.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('社員管理リンクがクリックされました');
            showScreen('adminEmployeesScreen');
            updateActiveNavLink(adminEmployeesNavLink);
        });
    }
    
    if (adminAttendanceNavLink) {
        adminAttendanceNavLink.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('勤怠管理リンクがクリックされました');
            showScreen('adminAttendanceScreen');
            updateActiveNavLink(adminAttendanceNavLink);
        });
    }
    
    if (adminApprovalsNavLink) {
        adminApprovalsNavLink.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('申請承認リンクがクリックされました');
            showScreen('adminApprovalsScreen');
            updateActiveNavLink(adminApprovalsNavLink);
        });
    }
    
    if (adminReportsNavLink) {
        adminReportsNavLink.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('レポート出力リンクがクリックされました');
            showScreen('adminReportsScreen');
            updateActiveNavLink(adminReportsNavLink);
        });
    }
    
    console.log('ナビゲーションリスナーの設定完了');
}

// アクティブなナビゲーションリンクを更新
function updateActiveNavLink(activeLink) {
    // 全てのナビゲーションリンクからactiveクラスを削除
    const allNavLinks = document.querySelectorAll('.nav-link');
    allNavLinks.forEach(link => {
        link.classList.remove('active');
    });
    
    // 選択されたリンクにactiveクラスを追加
    if (activeLink) {
        activeLink.classList.add('active');
    }
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

// パスワード強度チェック機能は削除されました

// 画面表示制御
function showScreen(screenId) {
    console.log('画面切り替え:', screenId);
    
    // 全ての画面を非表示
    const screens = document.querySelectorAll('.screen-container');
    console.log('検出された画面数:', screens.length);
    screens.forEach(screen => {
        screen.classList.remove('active');
    });
    
    // 指定された画面を表示
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
        console.log('画面を表示しました:', screenId);
    } else {
        console.error('画面が見つかりません:', screenId);
    }
    
    // 画面固有の初期化処理
    if (screenId === 'historyScreen') {
        generateCalendar();
        setupCalendarNavigation();
        setupHistoryMonthSelect();
    }
}

// 現在時刻の更新
function updateCurrentTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('ja-JP', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    const timeElement = document.getElementById('currentTime');
    if (timeElement) {
        timeElement.textContent = timeString;
        console.log('現在時刻を更新:', timeString);
    } else {
        console.error('currentTime要素が見つかりません');
    }
}

// 現在日付の更新
function updateCurrentDate() {
    const now = new Date();
    const dateString = now.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    });
    
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        dateElement.textContent = dateString;
        console.log('現在日付を更新:', dateString);
    } else {
        console.error('currentDate要素が見つかりません');
    }
}

// カレンダー生成（改善版）
function generateCalendar() {
    console.log('generateCalendar関数が呼び出されました');
    const now = new Date();
    
    // 現在選択されている月を取得（デフォルトは今月）
    let currentMonth = window.currentCalendarMonth || now.getMonth();
    let currentYear = window.currentCalendarYear || now.getFullYear();
    
    console.log('カレンダー生成:', currentYear, '年', currentMonth + 1, '月');
    
    const calendarGrid = document.getElementById('calendarGrid');
    if (!calendarGrid) {
        console.error('calendarGrid要素が見つかりません');
        return;
    }
    
    // カレンダーヘッダー（月曜始まり）
    const weekdays = ['月', '火', '水', '木', '金', '土', '日'];
    const headerHtml = weekdays.map(day => 
        `<div class="calendar-header">${day}</div>`
    ).join('');
    
    // 月の最初の日と最後の日
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    
    // 月曜始まりのカレンダー計算
    const startDate = new Date(firstDay);
    const dayOfWeek = firstDay.getDay(); // 0=日曜, 1=月曜, ...
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 月曜始まりのオフセット
    startDate.setDate(startDate.getDate() - mondayOffset);
    
    let calendarHtml = headerHtml;
    
    // 6週間分のカレンダーを生成
    for (let week = 0; week < 6; week++) {
        for (let day = 0; day < 7; day++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + (week * 7) + day);
            
            const isCurrentMonth = currentDate.getMonth() === currentMonth;
            const isToday = currentDate.toDateString() === now.toDateString();
            const dayOfWeek = currentDate.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // 日曜日または土曜日
            
            let dayClass = 'calendar-day';
            if (!isCurrentMonth) dayClass += ' other-month';
            if (isToday) dayClass += ' today';
            if (isWeekend) dayClass += ' weekend';
            
            // 実際の勤怠データを取得
            const attendanceRecord = getAttendanceForDate(currentDate);
            let attendanceInfo = '';
            
            if (attendanceRecord && isCurrentMonth) {
                dayClass += ' has-attendance';
                if (attendanceRecord.clockOutTime) {
                    dayClass += ' clocked-out';
                } else if (attendanceRecord.clockInTime) {
                    dayClass += ' clocked-in';
                }
                
                const clockInTime = attendanceRecord.clockInTime ? 
                    new Date(attendanceRecord.clockInTime).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'}) : '';
                const clockOutTime = attendanceRecord.clockOutTime ? 
                    new Date(attendanceRecord.clockOutTime).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'}) : '';
                
                // 申請ステータス情報を取得
                const requestStatus = getRequestStatusForDate(currentDate);
                let statusInfo = '';
                if (requestStatus) {
                    statusInfo = `<div class="request-status badge ${requestStatus.class}">${requestStatus.text}</div>`;
                }

                attendanceInfo = `
                    <div class="attendance-info">
                        ${clockInTime ? `<div class="clock-in-time">出勤: ${clockInTime}</div>` : ''}
                        ${clockOutTime ? `<div class="clock-out-time">退勤: ${clockOutTime}</div>` : ''}
                        ${statusInfo}
                    </div>
                `;
            }
            
            const dateString = currentDate.getFullYear() + '-' + 
                String(currentDate.getMonth() + 1).padStart(2, '0') + '-' + 
                String(currentDate.getDate()).padStart(2, '0');
            
            calendarHtml += `
                <div class="${dayClass}" data-date="${dateString}" style="cursor: pointer;" title="クリックして詳細を表示">
                    <div class="day-number">${currentDate.getDate()}</div>
                    ${attendanceInfo}
                </div>
            `;
        }
    }
    
    calendarGrid.innerHTML = calendarHtml;
    console.log('カレンダーHTMLを設定しました:', calendarHtml.length, '文字');
    
    // カレンダーの日付クリックイベントを設定
    setupCalendarClickEvents();
    
    // 現在月表示を更新
    const monthDisplay = document.getElementById('currentMonthDisplay');
    if (monthDisplay) {
        monthDisplay.textContent = `${currentYear}年${currentMonth + 1}月`;
        console.log('月表示を更新しました:', monthDisplay.textContent);
    } else {
        console.error('currentMonthDisplay要素が見つかりません');
    }
}

// 指定日の勤怠データを取得
function getAttendanceForDate(date) {
    if (!window.attendanceData) return null;
    
    // 日本時間での日付文字列を生成（UTC変換を避ける）
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    return window.attendanceData.find(record => record.attendanceDate === dateStr);
}

// 指定日の申請ステータスを取得
function getRequestStatusForDate(date) {
    if (!window.requestData) return null;
    
    // 日本時間での日付文字列を生成
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const request = window.requestData.find(req => req.requestDate === dateStr);
    if (!request) return null;
    
    return {
        text: request.status === 'APPROVED' ? '承認済' : '申請中',
        class: request.status === 'APPROVED' ? 'bg-success' : 'bg-warning'
    };
}

// カレンダーの日付クリックイベント設定
function setupCalendarClickEvents() {
    const calendarGrid = document.getElementById('calendarGrid');
    if (!calendarGrid) return;
    
    const calendarDays = calendarGrid.querySelectorAll('.calendar-day');
    calendarDays.forEach(day => {
        day.addEventListener('click', () => {
            const dateString = day.getAttribute('data-date');
            console.log('カレンダーの日付がクリックされました:', dateString);
            
            // 選択状態の視覚的フィードバック
            updateSelectedDate(day);
            
            // 勤怠詳細テーブルを選択日付でフィルタリング
            filterAttendanceTableByDate(dateString);
        });
    });
}

// 選択日付の視覚的フィードバック更新
function updateSelectedDate(selectedDay) {
    const calendarGrid = document.getElementById('calendarGrid');
    if (!calendarGrid) return;
    
    // 既存の選択状態をクリア
    const calendarDays = calendarGrid.querySelectorAll('.calendar-day');
    calendarDays.forEach(day => {
        day.classList.remove('selected');
    });
    
    // 選択された日付にクラスを追加
    selectedDay.classList.add('selected');
}

// 勤怠詳細テーブルを指定日付でフィルタリング
function filterAttendanceTableByDate(dateString) {
    const historyTableBody = document.getElementById('historyTableBody');
    if (!historyTableBody) return;

    // 選択された日付の勤怠データを取得
    const attendance = getAttendanceForDate(new Date(dateString));
    
    // 日付の詳細情報を取得
    const selectedDate = new Date(dateString);
    const isWeekend = selectedDate.getDay() === 0 || selectedDate.getDay() === 6;
    const isHoliday = isHolidayDate(selectedDate);
    
    // テーブルをクリア
    historyTableBody.innerHTML = '';

    if (attendance) {
        // 勤怠データがある場合
        const row = document.createElement('tr');
        row.style.cursor = 'pointer';
        row.classList.add('attendance-row');

        // 時刻表示
        const clockInTime = attendance.clockInTime ? 
            new Date(attendance.clockInTime).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'}) : '-';
        const clockOutTime = attendance.clockOutTime ? 
            new Date(attendance.clockOutTime).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'}) : '-';

        // 勤務時間の計算（0:00形式に統一）
        let workingTime = '0:00';
        if (attendance.clockInTime && attendance.clockOutTime) {
            try {
                const clockIn = new Date(attendance.clockInTime);
                const clockOut = new Date(attendance.clockOutTime);
                const diffMs = clockOut - clockIn;
                const totalMinutes = Math.floor(diffMs / (1000 * 60));
                workingTime = TimeUtils.formatMinutesToTime(totalMinutes);
            } catch (error) {
                console.error('Error calculating working time:', error);
                workingTime = '0:00';
            }
        }

        // 遅刻・早退・残業・深夜の表示（0:00形式に統一）
        const lateDisplay = attendance.lateMinutes > 0 ? TimeUtils.formatMinutesToTime(attendance.lateMinutes) : '0:00';
        const earlyLeaveDisplay = attendance.earlyLeaveMinutes > 0 ? TimeUtils.formatMinutesToTime(attendance.earlyLeaveMinutes) : '0:00';
        const overtimeDisplay = attendance.overtimeMinutes > 0 ? TimeUtils.formatMinutesToTime(attendance.overtimeMinutes) : '0:00';
        const nightWorkDisplay = attendance.nightWorkMinutes > 0 ? TimeUtils.formatMinutesToTime(attendance.nightWorkMinutes) : '0:00';

        // ステータス表示
        let status = '未出勤';
        if (attendance.clockInTime && !attendance.clockOutTime) {
            status = '出勤中';
        } else if (attendance.clockInTime && attendance.clockOutTime) {
            status = '退勤済み';
        }

        row.innerHTML = `
            <td>${attendance.attendanceDate}</td>
            <td>${clockInTime}</td>
            <td>${clockOutTime}</td>
            <td>${workingTime}</td>
            <td>${lateDisplay}</td>
            <td>${earlyLeaveDisplay}</td>
            <td>${overtimeDisplay}</td>
            <td>${nightWorkDisplay}</td>
            <td>${status}</td>
        `;

        historyTableBody.appendChild(row);
    } else {
        // 勤怠データがない場合
        const row = document.createElement('tr');
        
        // ステータスを日付の種類に応じて設定
        let status = '打刻なし';
        if (isHoliday) {
            status = '祝日';
        } else if (isWeekend) {
            status = '休日';
        }

        row.innerHTML = `
            <td>${dateString}</td>
            <td>-</td>
            <td>-</td>
            <td>0:00</td>
            <td>0:00</td>
            <td>0:00</td>
            <td>0:00</td>
            <td>0:00</td>
            <td>${status}</td>
        `;
        historyTableBody.appendChild(row);
    }
}

// 祝日判定（簡易版）
function isHolidayDate(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // 日本の祝日判定（簡易版）
    const holidays = [
        `${year}-01-01`, // 元日
        `${year}-02-11`, // 建国記念の日
        `${year}-04-29`, // 昭和の日
        `${year}-05-03`, // 憲法記念日
        `${year}-05-04`, // みどりの日
        `${year}-05-05`, // こどもの日
        `${year}-08-11`, // 山の日
        `${year}-11-03`, // 文化の日
        `${year}-11-23`, // 勤労感謝の日
        `${year}-12-23`  // 天皇誕生日
    ];
    
    const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return holidays.includes(dateString);
}

// カレンダーナビゲーション設定
function setupCalendarNavigation() {
    console.log('setupCalendarNavigation関数が呼び出されました');
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const currentMonthBtn = document.getElementById('currentMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');
    
    console.log('ボタン要素の取得状況:', {
        prevMonthBtn: !!prevMonthBtn,
        currentMonthBtn: !!currentMonthBtn,
        nextMonthBtn: !!nextMonthBtn
    });
    
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            console.log('前月ボタンがクリックされました');
            changeCalendarMonth(-1);
        });
        console.log('前月ボタンにイベントリスナーを設定しました');
    }
    
    if (currentMonthBtn) {
        currentMonthBtn.addEventListener('click', () => {
            console.log('今月ボタンがクリックされました');
            goToCurrentMonth();
        });
        console.log('今月ボタンにイベントリスナーを設定しました');
    }
    
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            console.log('次月ボタンがクリックされました');
            changeCalendarMonth(1);
        });
        console.log('次月ボタンにイベントリスナーを設定しました');
    }
}

// カレンダー月変更
function changeCalendarMonth(direction) {
    const now = new Date();
    let currentMonth = window.currentCalendarMonth || now.getMonth();
    let currentYear = window.currentCalendarYear || now.getFullYear();
    
    currentMonth += direction;
    
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    } else if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    
    window.currentCalendarMonth = currentMonth;
    window.currentCalendarYear = currentYear;
    
    // カレンダーを再生成
    generateCalendar();
    
    // 選択された月の勤怠データを再読み込み
    loadAttendanceHistoryForMonth(currentYear, currentMonth + 1);
}

// 今月に移動
function goToCurrentMonth() {
    console.log('goToCurrentMonth関数が呼び出されました');
    const now = new Date();
    window.currentCalendarMonth = now.getMonth();
    window.currentCalendarYear = now.getFullYear();
    
    console.log('今月に移動:', now.getFullYear(), '年', now.getMonth() + 1, '月');
    
    // カレンダーを再生成
    generateCalendar();
    
    // 今月の勤怠データを再読み込み
    loadAttendanceHistoryForMonth(now.getFullYear(), now.getMonth() + 1);
}

// 指定月の勤怠データを読み込み
async function loadAttendanceHistoryForMonth(year, month) {
    if (!currentEmployeeId) return;
    
    try {
        const response = await fetch(`/api/attendance/history/${currentEmployeeId}?year=${year}&month=${month}`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                window.attendanceData = data.data || [];
                generateCalendar();
            }
        }
    } catch (error) {
        console.error('月別勤怠データ読み込みエラー:', error);
    }
}

// 今日の勤怠状況を更新
async function updateTodayAttendance() {
    if (!currentEmployeeId) return;
    
    const clockInTime = document.getElementById('clockInTime');
    const clockOutTime = document.getElementById('clockOutTime');
    const workingTime = document.getElementById('workingTime');
    const clockStatus = document.getElementById('clockStatus');
    const clockInBtn = document.getElementById('clockInBtn');
    const clockOutBtn = document.getElementById('clockOutBtn');
    
    try {
        // 今日の勤怠記録を取得
        const response = await fetch(`/api/attendance/today/${currentEmployeeId}`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
                const record = data.data;
                updateAttendanceDisplay(record, clockInTime, clockOutTime, workingTime, clockStatus);
                updateButtonStates(record, clockInBtn, clockOutBtn);
                return;
            }
        }
    } catch (error) {
        console.error('今日の勤怠状況取得エラー:', error);
    }
    
    // APIが失敗した場合は初期状態を表示
    if (clockInTime) clockInTime.textContent = '--:--';
    if (clockOutTime) clockOutTime.textContent = '--:--';
    if (workingTime) workingTime.textContent = '0:00';
    if (clockStatus) {
        clockStatus.innerHTML = '未出勤';
    }
    updateButtonStates(null, clockInBtn, clockOutBtn);
}

// 勤怠状況表示を更新
function updateAttendanceDisplay(record, clockInTime, clockOutTime, workingTime, clockStatus) {
    if (!record) return;
    
    // 出勤時刻表示
    if (clockInTime) {
        clockInTime.textContent = record.clockInTime ? 
            new Date(record.clockInTime).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'}) : 
            '--:--';
    }
    
    // 退勤時刻表示
    if (clockOutTime) {
        clockOutTime.textContent = record.clockOutTime ? 
            new Date(record.clockOutTime).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'}) : 
            '--:--';
    }
    
    // 勤務時間計算
    if (workingTime) {
        if (record.clockInTime && record.clockOutTime) {
            workingTime.textContent = TimeUtils.calculateWorkingTime(record.clockInTime, record.clockOutTime);
        } else if (record.clockInTime && !record.clockOutTime) {
            // 出勤中の場合、現在時刻までの勤務時間を計算
            workingTime.textContent = TimeUtils.calculateElapsedTime(record.clockInTime);
        } else {
            workingTime.textContent = '0:00';
        }
    }
    
    // ステータス表示
    if (clockStatus) {
        if (!record.clockInTime) {
            clockStatus.innerHTML = '未出勤';
        } else if (record.clockInTime && !record.clockOutTime) {
            clockStatus.innerHTML = '出勤中';
        } else {
            clockStatus.innerHTML = '退勤済み';
        }
    }
}

// formatMinutesToTime関数はtimeUtils.jsに移動しました

// 管理者権限チェック
async function checkAdminPermissions() {
    try {
        const response = await fetch('/api/auth/session', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.authenticated && data.role === 'ADMIN') {
                // 管理者メニューアイテムを表示
                if (adminVacationManagementNavItem) adminVacationManagementNavItem.style.display = 'block';
                if (adminEmployeesNavItem) adminEmployeesNavItem.style.display = 'block';
                if (adminAttendanceNavItem) adminAttendanceNavItem.style.display = 'block';
                if (adminApprovalsNavItem) adminApprovalsNavItem.style.display = 'block';
                if (adminReportsNavItem) adminReportsNavItem.style.display = 'block';
            } else {
                // 管理者メニューアイテムを非表示
                if (adminVacationManagementNavItem) adminVacationManagementNavItem.style.display = 'none';
                if (adminEmployeesNavItem) adminEmployeesNavItem.style.display = 'none';
                if (adminAttendanceNavItem) adminAttendanceNavItem.style.display = 'none';
                if (adminApprovalsNavItem) adminApprovalsNavItem.style.display = 'none';
                if (adminReportsNavItem) adminReportsNavItem.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('管理者権限チェックエラー:', error);
        // エラーの場合は管理者メニューを非表示
        if (adminVacationManagementNavItem) adminVacationManagementNavItem.style.display = 'none';
        if (adminEmployeesNavItem) adminEmployeesNavItem.style.display = 'none';
        if (adminAttendanceNavItem) adminAttendanceNavItem.style.display = 'none';
        if (adminApprovalsNavItem) adminApprovalsNavItem.style.display = 'none';
        if (adminReportsNavItem) adminReportsNavItem.style.display = 'none';
    }
}

// ボタンの状態を更新
function updateButtonStates(record, clockInBtn, clockOutBtn) {
    if (!clockInBtn || !clockOutBtn) return;
    
    // 出勤打刻ボタン
    if (!record || !record.clockInTime) {
        // 未出勤の場合
        clockInBtn.disabled = false;
        clockInBtn.classList.remove('btn-secondary');
        clockInBtn.classList.add('btn-success');
    } else {
        // 既に出勤済みの場合
        clockInBtn.disabled = true;
        clockInBtn.classList.remove('btn-success');
        clockInBtn.classList.add('btn-secondary');
    }
    
    // 退勤打刻ボタン
    if (!record || !record.clockInTime || record.clockOutTime) {
        // 未出勤または既に退勤済みの場合
        clockOutBtn.disabled = true;
        clockOutBtn.classList.remove('btn-danger');
        clockOutBtn.classList.add('btn-secondary');
    } else {
        // 出勤中の場合
        clockOutBtn.disabled = false;
        clockOutBtn.classList.remove('btn-secondary');
        clockOutBtn.classList.add('btn-danger');
    }
}

// 勤怠履歴画面の月選択設定
function setupHistoryMonthSelect() {
    const historyMonthSelect = document.getElementById('historyMonthSelect');
    const searchHistoryBtn = document.getElementById('searchHistoryBtn');
    
    if (historyMonthSelect) {
        // 月選択オプションを生成
        generateHistoryMonthOptions();
        
        // 月選択イベントリスナー
        historyMonthSelect.addEventListener('change', function() {
            const selectedValue = this.value;
            if (selectedValue) {
                const [year, month] = selectedValue.split('-');
                window.currentCalendarYear = parseInt(year);
                window.currentCalendarMonth = parseInt(month) - 1;
                generateCalendar();
            }
        });
    }
    
    if (searchHistoryBtn) {
        searchHistoryBtn.addEventListener('click', function() {
            const selectedValue = historyMonthSelect.value;
            if (selectedValue) {
                const [year, month] = selectedValue.split('-');
                window.currentCalendarYear = parseInt(year);
                window.currentCalendarMonth = parseInt(month) - 1;
                generateCalendar();
            } else {
                showAlert('月を選択してください', 'warning');
            }
        });
    }
}

// 勤怠履歴用月選択オプション生成
function generateHistoryMonthOptions() {
    const historyMonthSelect = document.getElementById('historyMonthSelect');
    if (!historyMonthSelect) return;

    // 既存のオプションをクリア（最初のオプション以外）
    while (historyMonthSelect.children.length > 1) {
        historyMonthSelect.removeChild(historyMonthSelect.lastChild);
    }

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();

    // 現在年から過去3年分の1-12月を生成
    for (let year = currentYear; year >= currentYear - 2; year--) {
        for (let month = 12; month >= 1; month--) {
            const monthStr = String(month).padStart(2, '0');
            const value = `${year}-${monthStr}`;
            const label = `${year}年${monthStr}月`;

            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            historyMonthSelect.appendChild(option);
        }
    }
}
