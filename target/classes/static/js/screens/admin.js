/**
 * 管理者画面モジュール
 */
class AdminScreen {
    constructor() {
        this.employeesTableBody = null;
        this.attendanceEmployeeSelect = null;
        this.attendanceMonthSelect = null;
        this.searchAttendanceBtn = null;
        this.adminAttendanceTableBody = null;
        this.approvalsTableBody = null;
        this.reportEmployeeSelect = null;
        this.reportMonthSelect = null;
        this.generateReportBtn = null;
        this.vacationManagementTableBody = null;
    }

    /**
     * 管理者ダッシュボード初期化
     */
    initDashboard() {
        // 管理者ダッシュボードの初期化処理
        console.log('管理者ダッシュボードを初期化しました');
    }

    /**
     * 社員管理画面初期化
     */
    initEmployees() {
        this.initializeEmployeeElements();
        this.setupEmployeeEventListeners();
        this.loadEmployees();
    }

    /**
     * 勤怠管理画面初期化
     */
    initAttendance() {
        this.initializeAttendanceElements();
        this.setupAttendanceEventListeners();
        this.generateAttendanceMonthOptions();
        this.loadEmployeesForAttendance();
    }

    /**
     * 申請承認画面初期化
     */
    initApprovals() {
        this.initializeApprovalElements();
        this.setupApprovalEventListeners();
        this.loadPendingApprovals();
    }

    /**
     * レポート出力画面初期化
     */
    initReports() {
        this.initializeReportElements();
        this.setupReportEventListeners();
        this.generateReportMonthOptions();
        this.loadEmployeesForReports();
    }

    /**
     * 有給承認・付与調整画面初期化
     */
    initVacationManagement() {
        this.initializeVacationManagementElements();
        this.setupVacationManagementEventListeners();
        this.loadVacationManagementData();
    }

    /**
     * 社員管理関連要素の初期化
     */
    initializeEmployeeElements() {
        this.employeesTableBody = document.getElementById('employeesTableBody');
    }

    /**
     * 勤怠管理関連要素の初期化
     */
    initializeAttendanceElements() {
        this.attendanceEmployeeSelect = document.getElementById('attendanceEmployeeSelect');
        this.attendanceMonthSelect = document.getElementById('attendanceMonthSelect');
        this.searchAttendanceBtn = document.getElementById('searchAttendanceBtn');
        this.adminAttendanceTableBody = document.getElementById('adminAttendanceTableBody');
    }

    /**
     * 申請承認関連要素の初期化
     */
    initializeApprovalElements() {
        this.approvalsTableBody = document.getElementById('approvalsTableBody');
    }

    /**
     * レポート関連要素の初期化
     */
    initializeReportElements() {
        this.reportEmployeeSelect = document.getElementById('reportEmployeeSelect');
        this.reportMonthSelect = document.getElementById('reportMonthSelect');
        this.generateReportBtn = document.getElementById('generateReportBtn');
    }

    /**
     * 有給管理関連要素の初期化
     */
    initializeVacationManagementElements() {
        this.vacationManagementTableBody = document.getElementById('vacationManagementTableBody');
    }

    /**
     * 社員管理イベントリスナー設定
     */
    setupEmployeeEventListeners() {
        // 社員管理のイベントリスナーは必要に応じて追加
    }

    /**
     * 勤怠管理イベントリスナー設定
     */
    setupAttendanceEventListeners() {
        if (this.searchAttendanceBtn) {
            this.searchAttendanceBtn.addEventListener('click', () => this.searchAttendance());
        }
    }

    /**
     * 申請承認イベントリスナー設定
     */
    setupApprovalEventListeners() {
        // 申請承認のイベントリスナーは必要に応じて追加
    }

    /**
     * レポートイベントリスナー設定
     */
    setupReportEventListeners() {
        if (this.generateReportBtn) {
            this.generateReportBtn.addEventListener('click', () => this.generateReport());
        }
    }

    /**
     * 有給管理イベントリスナー設定
     */
    setupVacationManagementEventListeners() {
        // 有給管理のイベントリスナーは必要に応じて追加
    }

    /**
     * 社員一覧読み込み
     */
    async loadEmployees() {
        try {
            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.get('/api/admin/employees'),
                '社員一覧の取得に失敗しました'
            );

            if (data.success) {
                this.displayEmployees(data.data);
            } else {
                // APIが失敗した場合はモックデータを表示
                const mockData = this.generateMockEmployeeData();
                this.displayEmployees(mockData);
            }
        } catch (error) {
            console.error('社員一覧読み込みエラー:', error);
            // エラーの場合はモックデータを表示
            const mockData = this.generateMockEmployeeData();
            this.displayEmployees(mockData);
        }
    }

    /**
     * モック社員データ生成
     * @returns {Array} - モックデータ
     */
    generateMockEmployeeData() {
        return [
            {
                employeeId: 1,
                employeeCode: 'E001',
                firstName: '太郎',
                lastName: '山田',
                email: 'yamada@example.com',
                hireDate: '2020-04-01',
                isActive: true
            },
            {
                employeeId: 2,
                employeeCode: 'E002',
                firstName: '花子',
                lastName: '鈴木',
                email: 'suzuki@example.com',
                hireDate: '2021-06-01',
                isActive: true
            },
            {
                employeeId: 3,
                employeeCode: 'E003',
                firstName: '次郎',
                lastName: '田中',
                email: 'tanaka@example.com',
                hireDate: '2019-03-01',
                isActive: false
            }
        ];
    }

    /**
     * 社員一覧表示
     * @param {Array} employees - 社員データ
     */
    displayEmployees(employees) {
        if (!this.employeesTableBody) return;

        this.employeesTableBody.innerHTML = '';

        if (employees.length === 0) {
            this.employeesTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">データがありません</td></tr>';
            return;
        }

        employees.forEach(employee => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${employee.employeeCode}</td>
                <td>${employee.lastName} ${employee.firstName}</td>
                <td>${employee.email}</td>
                <td><span class="badge ${employee.isActive ? 'bg-success' : 'bg-secondary'}">${employee.isActive ? '在職' : '退職'}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="adminScreen.editEmployee(${employee.employeeId})">
                        <i class="fas fa-edit"></i> 編集
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="adminScreen.deactivateEmployee(${employee.employeeId})">
                        <i class="fas fa-user-times"></i> 退職処理
                    </button>
                </td>
            `;
            this.employeesTableBody.appendChild(row);
        });
    }

    /**
     * 勤怠検索
     */
    async searchAttendance() {
        const employeeCode = this.attendanceEmployeeSelect?.value;
        const month = this.attendanceMonthSelect?.value;

        try {
            let url = '/api/admin/attendance';
            const params = new URLSearchParams();
            
            if (employeeCode) params.append('employeeCode', employeeCode);
            if (month) params.append('month', month);
            
            if (params.toString()) {
                url += '?' + params.toString();
            }

            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.get(url),
                '勤怠データの取得に失敗しました'
            );

            if (data.success) {
                this.displayAttendanceData(data.data);
            } else {
                // APIが失敗した場合はモックデータを表示
                const mockData = this.generateMockAttendanceData();
                this.displayAttendanceData(mockData);
            }
        } catch (error) {
            console.error('勤怠検索エラー:', error);
            // エラーの場合はモックデータを表示
            const mockData = this.generateMockAttendanceData();
            this.displayAttendanceData(mockData);
        }
    }

    /**
     * モック勤怠データ生成
     * @returns {Array} - モックデータ
     */
    generateMockAttendanceData() {
        const data = [];
        const today = new Date();

        for (let i = 0; i < 10; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);

            const clockIn = new Date(date);
            clockIn.setHours(9, Math.floor(Math.random() * 30), 0, 0);

            const clockOut = new Date(date);
            clockOut.setHours(18, Math.floor(Math.random() * 60), 0, 0);

            data.push({
                attendanceId: i + 1,
                employeeCode: 'E001',
                employeeName: '山田太郎',
                attendanceDate: date.toISOString().split('T')[0],
                clockInTime: clockIn.toISOString(),
                clockOutTime: clockOut.toISOString(),
                lateMinutes: Math.floor(Math.random() * 30),
                earlyLeaveMinutes: Math.floor(Math.random() * 30),
                overtimeMinutes: Math.floor(Math.random() * 60),
                nightWorkMinutes: Math.floor(Math.random() * 30),
                status: '承認済'
            });
        }

        return data;
    }

    /**
     * 勤怠データ表示
     * @param {Array} data - 勤怠データ
     */
    displayAttendanceData(data) {
        if (!this.adminAttendanceTableBody) return;

        this.adminAttendanceTableBody.innerHTML = '';

        if (data.length === 0) {
            this.adminAttendanceTableBody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">データがありません</td></tr>';
            return;
        }

        data.forEach(record => {
            const row = document.createElement('tr');
            
            const clockInTime = record.clockInTime ? 
                new Date(record.clockInTime).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'}) : '-';
            const clockOutTime = record.clockOutTime ? 
                new Date(record.clockOutTime).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'}) : '-';

            row.innerHTML = `
                <td>${record.attendanceDate}</td>
                <td>${clockInTime}</td>
                <td>${clockOutTime}</td>
                <td>${record.lateMinutes}分</td>
                <td>${record.earlyLeaveMinutes}分</td>
                <td>${record.overtimeMinutes}分</td>
                <td>${record.nightWorkMinutes}分</td>
                <td><span class="badge bg-success">${record.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="adminScreen.editAttendance(${record.attendanceId})">
                        <i class="fas fa-edit"></i> 編集
                    </button>
                </td>
            `;
            this.adminAttendanceTableBody.appendChild(row);
        });
    }

    /**
     * 未承認申請読み込み
     */
    async loadPendingApprovals() {
        try {
            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.get('/api/admin/approvals/pending'),
                '未承認申請の取得に失敗しました'
            );

            if (data.success) {
                this.displayPendingApprovals(data.data);
            } else {
                // APIが失敗した場合はモックデータを表示
                const mockData = this.generateMockApprovalData();
                this.displayPendingApprovals(mockData);
            }
        } catch (error) {
            console.error('未承認申請読み込みエラー:', error);
            // エラーの場合はモックデータを表示
            const mockData = this.generateMockApprovalData();
            this.displayPendingApprovals(mockData);
        }
    }

    /**
     * モック申請データ生成
     * @returns {Array} - モックデータ
     */
    generateMockApprovalData() {
        return [
            {
                id: 1,
                employeeName: '山田太郎',
                type: '有給',
                date: '2024-01-15',
                reason: '私用',
                status: '未処理'
            },
            {
                id: 2,
                employeeName: '鈴木花子',
                type: '打刻修正',
                date: '2024-01-14',
                reason: '打刻ミス',
                status: '未処理'
            }
        ];
    }

    /**
     * 未承認申請表示
     * @param {Array} data - 申請データ
     */
    displayPendingApprovals(data) {
        if (!this.approvalsTableBody) return;

        this.approvalsTableBody.innerHTML = '';

        if (data.length === 0) {
            this.approvalsTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">データがありません</td></tr>';
            return;
        }

        data.forEach(approval => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${approval.employeeName}</td>
                <td>${approval.type}</td>
                <td>${approval.date}</td>
                <td>${approval.reason}</td>
                <td><span class="badge bg-warning">${approval.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-success me-1" onclick="adminScreen.approveRequest(${approval.id})">
                        <i class="fas fa-check"></i> 承認
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="adminScreen.rejectRequest(${approval.id})">
                        <i class="fas fa-times"></i> 却下
                    </button>
                </td>
            `;
            this.approvalsTableBody.appendChild(row);
        });
    }

    /**
     * レポート生成
     */
    async generateReport() {
        const employeeId = this.reportEmployeeSelect?.value;
        const month = this.reportMonthSelect?.value;

        if (!employeeId || !month) {
            this.showAlert('社員と期間を選択してください', 'warning');
            return;
        }

        try {
            // レポート生成APIを呼び出し
            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.post('/api/reports/generate', {
                    employeeId: parseInt(employeeId),
                    yearMonth: month
                }),
                'レポート生成に失敗しました'
            );

            if (data.success && data.pdfUrl) {
                // PDFのURLから直接ダウンロード
                const filename = `attendance_${employeeId}_${month}.pdf`;
                await fetchWithAuth.downloadFile(data.pdfUrl, filename);
                this.showAlert('レポートをダウンロードしました', 'success');
            } else {
                this.showAlert(data.message || 'レポート生成に失敗しました', 'danger');
            }
        } catch (error) {
            this.showAlert(error.message, 'danger');
        }
    }

    /**
     * 有給管理データ読み込み
     */
    async loadVacationManagementData() {
        try {
            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.get('/api/admin/vacation-management'),
                '有給管理データの取得に失敗しました'
            );

            if (data.success) {
                this.displayVacationManagementData(data.data);
            } else {
                // APIが失敗した場合はモックデータを表示
                const mockData = this.generateMockVacationManagementData();
                this.displayVacationManagementData(mockData);
            }
        } catch (error) {
            console.error('有給管理データ読み込みエラー:', error);
            // エラーの場合はモックデータを表示
            const mockData = this.generateMockVacationManagementData();
            this.displayVacationManagementData(mockData);
        }
    }

    /**
     * モック有給管理データ生成
     * @returns {Array} - モックデータ
     */
    generateMockVacationManagementData() {
        return [
            {
                id: 1,
                employeeName: '山田太郎',
                type: '有給申請',
                date: '2024-01-15',
                reason: '私用',
                status: '未処理'
            }
        ];
    }

    /**
     * 有給管理データ表示
     * @param {Array} data - 有給管理データ
     */
    displayVacationManagementData(data) {
        if (!this.vacationManagementTableBody) return;

        this.vacationManagementTableBody.innerHTML = '';

        if (data.length === 0) {
            this.vacationManagementTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">データがありません</td></tr>';
            return;
        }

        data.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.employeeName}</td>
                <td>${item.type}</td>
                <td>${item.date}</td>
                <td>${item.reason}</td>
                <td><span class="badge bg-warning">${item.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-success me-1" onclick="adminScreen.approveVacationRequest(${item.id})">
                        <i class="fas fa-check"></i> 承認
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="adminScreen.rejectVacationRequest(${item.id})">
                        <i class="fas fa-times"></i> 却下
                    </button>
                </td>
            `;
            this.vacationManagementTableBody.appendChild(row);
        });
    }

    /**
     * 社員編集
     * @param {number} employeeId - 社員ID
     */
    editEmployee(employeeId) {
        this.showAlert(`社員ID ${employeeId} の編集機能は実装中です`, 'info');
    }

    /**
     * 社員退職処理
     * @param {number} employeeId - 社員ID
     */
    async deactivateEmployee(employeeId) {
        if (confirm('この社員を退職処理しますか？')) {
            try {
                const data = await fetchWithAuth.handleApiCall(
                    () => fetchWithAuth.put(`/api/admin/employees/${employeeId}/deactivate`),
                    '退職処理に失敗しました'
                );

                this.showAlert(data.message, 'success');
                await this.loadEmployees();
            } catch (error) {
                this.showAlert(error.message, 'danger');
            }
        }
    }

    /**
     * 勤怠編集
     * @param {number} attendanceId - 勤怠ID
     */
    editAttendance(attendanceId) {
        this.showAlert(`勤怠ID ${attendanceId} の編集機能は実装中です`, 'info');
    }

    /**
     * 申請承認
     * @param {number} requestId - 申請ID
     */
    async approveRequest(requestId) {
        try {
            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.post('/api/admin/approvals/approve', { requestId, approved: true }),
                '承認に失敗しました'
            );

            this.showAlert(data.message, 'success');
            await this.loadPendingApprovals();
        } catch (error) {
            this.showAlert(error.message, 'danger');
        }
    }

    /**
     * 申請却下
     * @param {number} requestId - 申請ID
     */
    async rejectRequest(requestId) {
        try {
            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.post('/api/admin/approvals/approve', { requestId, approved: false }),
                '却下に失敗しました'
            );

            this.showAlert(data.message, 'success');
            await this.loadPendingApprovals();
        } catch (error) {
            this.showAlert(error.message, 'danger');
        }
    }

    /**
     * 有給申請承認
     * @param {number} requestId - 申請ID
     */
    async approveVacationRequest(requestId) {
        try {
            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.post('/api/admin/vacation/approve', { requestId, approved: true }),
                '有給申請の承認に失敗しました'
            );

            this.showAlert(data.message, 'success');
            await this.loadVacationManagementData();
        } catch (error) {
            this.showAlert(error.message, 'danger');
        }
    }

    /**
     * 有給申請却下
     * @param {number} requestId - 申請ID
     */
    async rejectVacationRequest(requestId) {
        try {
            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.post('/api/admin/vacation/approve', { requestId, approved: false }),
                '有給申請の却下に失敗しました'
            );

            this.showAlert(data.message, 'success');
            await this.loadVacationManagementData();
        } catch (error) {
            this.showAlert(error.message, 'danger');
        }
    }

    /**
     * 勤怠管理用月選択オプション生成
     */
    generateAttendanceMonthOptions() {
        if (!this.attendanceMonthSelect) return;

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
            this.attendanceMonthSelect.appendChild(option);
        }
    }

    /**
     * レポート用月選択オプション生成
     */
    generateReportMonthOptions() {
        if (!this.reportMonthSelect) return;

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
            this.reportMonthSelect.appendChild(option);
        }
    }

    /**
     * 勤怠管理用社員リスト読み込み
     */
    async loadEmployeesForAttendance() {
        // 社員一覧を取得してセレクトボックスに設定
        // 実装は必要に応じて追加
    }

    /**
     * レポート用社員リスト読み込み
     */
    async loadEmployeesForReports() {
        // 社員一覧を取得してセレクトボックスに設定
        // 実装は必要に応じて追加
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
window.adminScreen = new AdminScreen();
