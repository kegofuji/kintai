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
        let workingHours = '-';
        if (record.clockInTime && record.clockOutTime) {
            const clockIn = new Date(record.clockInTime);
            const clockOut = new Date(record.clockOutTime);
            const diffMs = clockOut - clockIn;
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            workingHours = `${diffHours}h ${diffMinutes}m`;
        }
        
        // 遅刻・早退・残業時間表示
        const lateMinutes = record.lateMinutes || 0;
        const earlyLeaveMinutes = record.earlyLeaveMinutes || 0;
        const overtimeMinutes = record.overtimeMinutes || 0;
        
        // ステータス表示
        let statusText = '未出勤';
        let statusClass = 'bg-secondary';
        
        if (record.clockInTime && !record.clockOutTime) {
            statusText = '出勤中';
            statusClass = 'bg-warning';
        } else if (record.clockInTime && record.clockOutTime) {
            statusText = '退勤済み';
            statusClass = 'bg-success';
        }
        
        row.innerHTML = `
            <td>${record.attendanceDate}</td>
            <td>${clockInTime}</td>
            <td>${clockOutTime}</td>
            <td>${workingHours}</td>
            <td>${lateMinutes > 0 ? lateMinutes + '分' : '-'}</td>
            <td>${earlyLeaveMinutes > 0 ? earlyLeaveMinutes + '分' : '-'}</td>
            <td>${overtimeMinutes > 0 ? overtimeMinutes + '分' : '-'}</td>
            <td><span class="badge ${statusClass}">${statusText}</span></td>
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
    
    // 管理者権限チェック
    if (currentUser === 'admin') {
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
    const now = new Date();
    
    // 現在選択されている月を取得（デフォルトは今月）
    let currentMonth = window.currentCalendarMonth || now.getMonth();
    let currentYear = window.currentCalendarYear || now.getFullYear();
    
    const calendarGrid = document.getElementById('calendarGrid');
    if (!calendarGrid) return;
    
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
                
                attendanceInfo = `
                    <div class="attendance-info">
                        ${clockInTime ? `<div class="clock-in-time">出勤: ${clockInTime}</div>` : ''}
                        ${clockOutTime ? `<div class="clock-out-time">退勤: ${clockOutTime}</div>` : ''}
                    </div>
                `;
            }
            
            calendarHtml += `
                <div class="${dayClass}">
                    <div class="day-number">${currentDate.getDate()}</div>
                    ${attendanceInfo}
                </div>
            `;
        }
    }
    
    calendarGrid.innerHTML = calendarHtml;
    
    // 現在月表示を更新
    const monthDisplay = document.getElementById('currentMonthDisplay');
    if (monthDisplay) {
        monthDisplay.textContent = `${currentYear}年${currentMonth + 1}月`;
    }
}

// 指定日の勤怠データを取得
function getAttendanceForDate(date) {
    if (!window.attendanceData) return null;
    
    const dateStr = date.toISOString().split('T')[0];
    return window.attendanceData.find(record => record.attendanceDate === dateStr);
}

// カレンダーナビゲーション設定
function setupCalendarNavigation() {
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');
    
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            changeCalendarMonth(-1);
        });
    }
    
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            changeCalendarMonth(1);
        });
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
    if (workingTime) workingTime.textContent = '0時間0分';
    if (clockStatus) {
        clockStatus.innerHTML = '<span class="badge bg-secondary fs-6">未出勤</span>';
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
            const clockIn = new Date(record.clockInTime);
            const clockOut = new Date(record.clockOutTime);
            const diffMs = clockOut - clockIn;
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            workingTime.textContent = `${diffHours}時間${diffMinutes}分`;
        } else if (record.clockInTime && !record.clockOutTime) {
            // 出勤中の場合、現在時刻までの勤務時間を計算
            const clockIn = new Date(record.clockInTime);
            const now = new Date();
            const diffMs = now - clockIn;
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            workingTime.textContent = `${diffHours}時間${diffMinutes}分`;
        } else {
            workingTime.textContent = '0時間0分';
        }
    }
    
    // ステータス表示
    if (clockStatus) {
        if (!record.clockInTime) {
            clockStatus.innerHTML = '<span class="badge bg-secondary fs-6">未出勤</span>';
        } else if (record.clockInTime && !record.clockOutTime) {
            clockStatus.innerHTML = '<span class="badge bg-warning fs-6">出勤中</span>';
        } else {
            clockStatus.innerHTML = '<span class="badge bg-success fs-6">退勤済み</span>';
        }
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
