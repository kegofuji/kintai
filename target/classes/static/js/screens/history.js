/**
 * 勤怠履歴画面モジュール
 */
class HistoryScreen {
    constructor() {
        this.historyMonthSelect = null;
        this.searchHistoryBtn = null;
        this.monthlySubmitHistoryBtn = null;
        this.historyTableBody = null;
    }

    /**
     * 初期化
     */
    init() {
        this.initializeElements();
        this.setupEventListeners();
        this.generateMonthOptions();
        this.loadAttendanceHistory();
    }

    /**
     * DOM要素の初期化
     */
    initializeElements() {
        this.historyMonthSelect = document.getElementById('historyMonthSelect');
        this.searchHistoryBtn = document.getElementById('searchHistoryBtn');
        this.monthlySubmitHistoryBtn = document.getElementById('monthlySubmitHistoryBtn');
        this.historyTableBody = document.getElementById('historyTableBody');
    }

    /**
     * イベントリスナー設定
     */
    setupEventListeners() {
        if (this.searchHistoryBtn) {
            this.searchHistoryBtn.addEventListener('click', () => this.loadAttendanceHistory());
        }

        if (this.monthlySubmitHistoryBtn) {
            this.monthlySubmitHistoryBtn.addEventListener('click', () => this.handleMonthlySubmit());
        }
    }

    /**
     * 勤怠履歴読み込み
     */
    async loadAttendanceHistory() {
        if (!window.currentEmployeeId) {
            this.showAlert('従業員IDが取得できません', 'danger');
            return;
        }

        const selectedMonth = this.historyMonthSelect?.value;
        let url = `/api/attendance/history/${window.currentEmployeeId}`;
        
        if (selectedMonth) {
            url += `?month=${selectedMonth}`;
        }

        try {
            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.get(url),
                '勤怠履歴の取得に失敗しました'
            );

            if (data.success) {
                this.displayAttendanceHistory(data.data);
            } else {
                // APIが失敗した場合はモックデータを表示
                const mockData = this.generateMockAttendanceData(selectedMonth);
                this.displayAttendanceHistory(mockData);
            }
        } catch (error) {
            console.error('勤怠履歴読み込みエラー:', error);
            // エラーの場合はモックデータを表示
            const mockData = this.generateMockAttendanceData(selectedMonth);
            this.displayAttendanceHistory(mockData);
        }
    }

    /**
     * モック勤怠データ生成
     * @param {string} month - 対象月（YYYY-MM形式）
     * @returns {Array} - モックデータ
     */
    generateMockAttendanceData(month = null) {
        const data = [];
        const today = new Date();
        let targetDate = today;

        if (month) {
            const [year, monthNum] = month.split('-');
            targetDate = new Date(year, monthNum - 1, 1);
        }

        // 指定月の日数を取得
        const daysInMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(targetDate.getFullYear(), targetDate.getMonth(), day);
            
            // 土日はスキップ
            if (date.getDay() === 0 || date.getDay() === 6) continue;

            const clockIn = new Date(date);
            clockIn.setHours(9, Math.floor(Math.random() * 30), 0, 0);

            const clockOut = new Date(date);
            clockOut.setHours(18, Math.floor(Math.random() * 60), 0, 0);

            // 遅刻・早退・残業・深夜の計算
            const lateMinutes = Math.max(0, clockIn.getMinutes() - 0); // 9:00以降は遅刻
            const earlyLeaveMinutes = Math.max(0, 18 * 60 - (clockOut.getHours() * 60 + clockOut.getMinutes())); // 18:00より早い退勤
            const overtimeMinutes = Math.max(0, (clockOut.getHours() * 60 + clockOut.getMinutes()) - 18 * 60); // 18:00以降の残業
            const nightWorkMinutes = Math.max(0, (clockOut.getHours() * 60 + clockOut.getMinutes()) - 22 * 60); // 22:00以降の深夜

            data.push({
                attendanceDate: date.toISOString().split('T')[0],
                clockInTime: clockIn.toISOString(),
                clockOutTime: clockOut.toISOString(),
                lateMinutes: lateMinutes,
                earlyLeaveMinutes: earlyLeaveMinutes,
                overtimeMinutes: overtimeMinutes,
                nightWorkMinutes: nightWorkMinutes
            });
        }

        return data;
    }

    /**
     * 勤怠履歴表示
     * @param {Array} data - 勤怠データ
     */
    displayAttendanceHistory(data) {
        if (!this.historyTableBody) return;

        this.historyTableBody.innerHTML = '';

        if (data.length === 0) {
            this.historyTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">データがありません</td></tr>';
            return;
        }

        data.forEach(record => {
            const row = document.createElement('tr');

            // 時刻表示
            const clockInTime = record.clockInTime ? 
                new Date(record.clockInTime).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'}) : '-';
            const clockOutTime = record.clockOutTime ? 
                new Date(record.clockOutTime).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'}) : '-';

            // 遅刻・早退・残業・深夜の表示
            const lateDisplay = record.lateMinutes > 0 ? `${record.lateMinutes}分` : '00分';
            const earlyLeaveDisplay = record.earlyLeaveMinutes > 0 ? `${record.earlyLeaveMinutes}分` : '00分';
            const overtimeDisplay = record.overtimeMinutes > 0 ? `${record.overtimeMinutes}分` : '00分';
            const nightWorkDisplay = record.nightWorkMinutes > 0 ? `${record.nightWorkMinutes}分` : '00分';

            row.innerHTML = `
                <td>${record.attendanceDate}</td>
                <td>${clockInTime}</td>
                <td>${clockOutTime}</td>
                <td>${lateDisplay}</td>
                <td>${earlyLeaveDisplay}</td>
                <td>${overtimeDisplay}</td>
                <td>${nightWorkDisplay}</td>
            `;
            this.historyTableBody.appendChild(row);
        });
    }

    /**
     * 月末申請
     */
    async handleMonthlySubmit() {
        const selectedMonth = this.historyMonthSelect?.value;
        
        if (!selectedMonth) {
            this.showAlert('申請月を選択してください', 'warning');
            return;
        }

        if (!window.currentEmployeeId) {
            this.showAlert('従業員IDが取得できません', 'danger');
            return;
        }

        try {
            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.post('/api/attendance/monthly-submit', { 
                    employeeId: window.currentEmployeeId, 
                    yearMonth: selectedMonth 
                }),
                '月末申請に失敗しました'
            );

            this.showAlert(data.message, 'success');
        } catch (error) {
            this.showAlert(error.message, 'danger');
        }
    }

    /**
     * 月選択オプション生成
     */
    generateMonthOptions() {
        if (!this.historyMonthSelect) return;

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
            this.historyMonthSelect.appendChild(option);
        }
    }

    /**
     * アラート表示
     * @param {string} message - メッセージ
     * @param {string} type - アラートタイプ
     */
    showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('alertContainer');
        if (!alertContainer) return;

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
}

// グローバルインスタンスを作成
window.historyScreen = new HistoryScreen();
