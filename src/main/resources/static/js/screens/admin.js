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
        this.addEmployeeBtn = document.getElementById('addEmployeeBtn');
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
        // 社員追加ボタン
        const addEmployeeBtn = document.getElementById('addEmployeeBtn');
        if (addEmployeeBtn) {
            addEmployeeBtn.addEventListener('click', () => this.showAddEmployeeModal());
        }

        // 編集・退職処理ボタン（イベント委譲）
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-employee-btn')) {
                const employeeId = e.target.getAttribute('data-employee-id');
                this.editEmployee(parseInt(employeeId));
            } else if (e.target.classList.contains('deactivate-employee-btn')) {
                const employeeId = e.target.getAttribute('data-employee-id');
                this.deactivateEmployee(parseInt(employeeId));
            }
        });
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
        // 承認・却下ボタン（イベント委譲）
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('approve-btn')) {
                const requestId = e.target.getAttribute('data-request-id');
                const requestType = e.target.getAttribute('data-type');
                this.approveRequest(parseInt(requestId), requestType);
            } else if (e.target.classList.contains('reject-btn')) {
                const requestId = e.target.getAttribute('data-request-id');
                const requestType = e.target.getAttribute('data-type');
                this.rejectRequest(parseInt(requestId), requestType);
            }
        });
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
            const statusClass = employee.isActive ? 'bg-success' : 'bg-secondary';
            const statusText = employee.isActive ? '在籍' : '退職';
            const deactivateText = employee.isActive ? '退職処理' : '復職処理';
            const deactivateClass = employee.isActive ? 'btn-outline-danger' : 'btn-outline-success';
            
            row.innerHTML = `
                <td>${employee.employeeCode}</td>
                <td>${employee.lastName} ${employee.firstName}</td>
                <td>${employee.email}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1 edit-employee-btn" data-employee-id="${employee.employeeId}">
                        <i class="fas fa-edit"></i> 編集
                    </button>
                    <button class="btn btn-sm ${deactivateClass} deactivate-employee-btn" data-employee-id="${employee.employeeId}">
                        <i class="fas fa-user-times"></i> ${deactivateText}
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

            // 遅刻・早退・残業・深夜の表示（0:00形式に統一）
            const lateDisplay = record.lateMinutes > 0 ? formatMinutesToTime(record.lateMinutes) : '0:00';
            const earlyLeaveDisplay = record.earlyLeaveMinutes > 0 ? formatMinutesToTime(record.earlyLeaveMinutes) : '0:00';
            const overtimeDisplay = record.overtimeMinutes > 0 ? formatMinutesToTime(record.overtimeMinutes) : '0:00';
            const nightWorkDisplay = record.nightWorkMinutes > 0 ? formatMinutesToTime(record.nightWorkMinutes) : '0:00';

            row.innerHTML = `
                <td>${record.attendanceDate}</td>
                <td>${clockInTime}</td>
                <td>${clockOutTime}</td>
                <td>${lateDisplay}</td>
                <td>${earlyLeaveDisplay}</td>
                <td>${overtimeDisplay}</td>
                <td>${nightWorkDisplay}</td>
                <td>${record.status}</td>
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
                <td>${approval.status}</td>
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
                <td>${item.status}</td>
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

        // 現在年から過去3年分の1-12月を生成
        for (let year = currentYear; year >= currentYear - 2; year--) {
            for (let month = 12; month >= 1; month--) {
                const monthStr = String(month).padStart(2, '0');
                const value = `${year}-${monthStr}`;
                const label = `${year}年${monthStr}月`;

                const option = document.createElement('option');
                option.value = value;
                option.textContent = label;
                this.attendanceMonthSelect.appendChild(option);
            }
        }
    }

    /**
     * レポート用月選択オプション生成
     */
    generateReportMonthOptions() {
        if (!this.reportMonthSelect) return;

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
                this.reportMonthSelect.appendChild(option);
            }
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

    /**
     * 社員編集
     * @param {number} employeeId - 従業員ID
     */
    editEmployee(employeeId) {
        // 社員編集モーダルを表示
        this.showEditEmployeeModal(employeeId);
    }

    /**
     * 社員編集モーダル表示
     * @param {number} employeeId - 従業員ID
     */
    showEditEmployeeModal(employeeId) {
        // 簡易的な編集フォームを表示
        const employee = this.getEmployeeById(employeeId);
        if (!employee) {
            this.showAlert('社員情報が見つかりません', 'danger');
            return;
        }

        const newFirstName = prompt('名を入力してください:', employee.firstName);
        if (newFirstName === null) return;

        const newLastName = prompt('姓を入力してください:', employee.lastName);
        if (newLastName === null) return;

        const newEmail = prompt('メールアドレスを入力してください:', employee.email);
        if (newEmail === null) return;

        // 社員情報を更新
        this.updateEmployee(employeeId, {
            firstName: newFirstName,
            lastName: newLastName,
            email: newEmail
        });
    }

    /**
     * 社員情報更新
     * @param {number} employeeId - 従業員ID
     * @param {Object} updateData - 更新データ
     */
    async updateEmployee(employeeId, updateData) {
        try {
            const response = await fetch(`/api/admin/employees/${employeeId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': window.csrfToken
                },
                credentials: 'include',
                body: JSON.stringify(updateData)
            });

            if (response.ok) {
                this.showAlert('社員情報を更新しました', 'success');
                this.loadEmployees();
            } else {
                const errorData = await response.json();
                this.showAlert(errorData.message || '社員情報の更新に失敗しました', 'danger');
            }
        } catch (error) {
            console.error('社員情報更新エラー:', error);
            this.showAlert('社員情報の更新中にエラーが発生しました', 'danger');
        }
    }

    /**
     * 社員IDで社員情報を取得
     * @param {number} employeeId - 従業員ID
     * @returns {Object|null} - 社員情報
     */
    getEmployeeById(employeeId) {
        // モックデータから検索
        const mockData = this.generateMockEmployeeData();
        return mockData.find(emp => emp.employeeId === employeeId);
    }

    /**
     * 社員退職処理
     * @param {number} employeeId - 従業員ID
     */
    deactivateEmployee(employeeId) {
        const employee = this.getEmployeeById(employeeId);
        if (!employee) {
            this.showAlert('社員情報が見つかりません', 'danger');
            return;
        }

        const action = employee.isActive ? '退職処理' : '復職処理';
        const confirmMessage = `${employee.lastName} ${employee.firstName} を${action}しますか？`;
        
        if (confirm(confirmMessage)) {
            this.toggleEmployeeStatus(employeeId, !employee.isActive);
        }
    }

    /**
     * 社員の在籍状態を切り替え
     * @param {number} employeeId - 従業員ID
     * @param {boolean} isActive - 在籍状態
     */
    async toggleEmployeeStatus(employeeId, isActive) {
        try {
            const response = await fetch(`/api/admin/employees/${employeeId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': window.csrfToken
                },
                credentials: 'include',
                body: JSON.stringify({ isActive: isActive })
            });

            if (response.ok) {
                const action = isActive ? '復職処理' : '退職処理';
                this.showAlert(`${action}が完了しました`, 'success');
                this.loadEmployees();
            } else {
                const errorData = await response.json();
                this.showAlert(errorData.message || '処理に失敗しました', 'danger');
            }
        } catch (error) {
            console.error('社員状態変更エラー:', error);
            this.showAlert('処理中にエラーが発生しました', 'danger');
        }
    }

    /**
     * 社員追加モーダル表示
     */
    showAddEmployeeModal() {
        // 簡易的な追加フォームを表示
        const employeeCode = prompt('社員コードを入力してください:');
        if (employeeCode === null) return;

        const firstName = prompt('名を入力してください:');
        if (firstName === null) return;

        const lastName = prompt('姓を入力してください:');
        if (lastName === null) return;

        const email = prompt('メールアドレスを入力してください:');
        if (email === null) return;

        const hireDate = prompt('入社日を入力してください (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
        if (hireDate === null) return;

        // 社員を追加
        this.addEmployee({
            employeeCode: employeeCode,
            firstName: firstName,
            lastName: lastName,
            email: email,
            hireDate: hireDate
        });
    }

    /**
     * 社員追加
     * @param {Object} employeeData - 社員データ
     */
    async addEmployee(employeeData) {
        try {
            const response = await fetch('/api/admin/employees', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': window.csrfToken
                },
                credentials: 'include',
                body: JSON.stringify(employeeData)
            });

            if (response.ok) {
                this.showAlert('社員を追加しました', 'success');
                this.loadEmployees();
            } else {
                const errorData = await response.json();
                this.showAlert(errorData.message || '社員の追加に失敗しました', 'danger');
            }
        } catch (error) {
            console.error('社員追加エラー:', error);
            this.showAlert('社員の追加中にエラーが発生しました', 'danger');
        }
    }

    /**
     * 申請承認
     * @param {number} requestId - 申請ID
     * @param {string} requestType - 申請種別
     */
    async approveRequest(requestId, requestType) {
        try {
            let apiEndpoint = '';
            let requestData = {};

            switch (requestType) {
                case 'vacation':
                    apiEndpoint = '/api/admin/vacation/approve';
                    requestData = { vacationId: requestId, approved: true };
                    break;
                case 'adjustment':
                    apiEndpoint = '/api/admin/adjustment/approve';
                    requestData = { adjustmentId: requestId, approved: true };
                    break;
                case 'monthly':
                    apiEndpoint = '/api/admin/monthly/approve';
                    requestData = { monthlyId: requestId, approved: true };
                    break;
                default:
                    throw new Error('不明な申請種別です');
            }

            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.post(apiEndpoint, requestData),
                '申請の承認に失敗しました'
            );

            this.showAlert('申請を承認しました', 'success');
            this.updateRequestStatus(requestId, '承認済');
        } catch (error) {
            this.showAlert(error.message, 'danger');
        }
    }

    /**
     * 申請却下
     * @param {number} requestId - 申請ID
     * @param {string} requestType - 申請種別
     */
    async rejectRequest(requestId, requestType) {
        if (!confirm('この申請を却下しますか？')) {
            return;
        }

        try {
            let apiEndpoint = '';
            let requestData = {};

            switch (requestType) {
                case 'vacation':
                    apiEndpoint = '/api/admin/vacation/approve';
                    requestData = { vacationId: requestId, approved: false };
                    break;
                case 'adjustment':
                    apiEndpoint = '/api/admin/adjustment/approve';
                    requestData = { adjustmentId: requestId, approved: false };
                    break;
                case 'monthly':
                    apiEndpoint = '/api/admin/monthly/approve';
                    requestData = { monthlyId: requestId, approved: false };
                    break;
                default:
                    throw new Error('不明な申請種別です');
            }

            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.post(apiEndpoint, requestData),
                '申請の却下に失敗しました'
            );

            this.showAlert('申請を却下しました', 'warning');
            this.updateRequestStatus(requestId, '却下');
        } catch (error) {
            this.showAlert(error.message, 'danger');
        }
    }

    /**
     * 申請ステータス更新
     * @param {number} requestId - 申請ID
     * @param {string} status - 新しいステータス
     */
    updateRequestStatus(requestId, status) {
        const approveBtn = document.querySelector(`[data-request-id="${requestId}"].approve-btn`);
        const rejectBtn = document.querySelector(`[data-request-id="${requestId}"].reject-btn`);
        const statusBadge = approveBtn?.closest('tr')?.querySelector('.badge');

        if (statusBadge) {
            statusBadge.textContent = status;
        }

        if (approveBtn && rejectBtn) {
            approveBtn.disabled = true;
            rejectBtn.disabled = true;
            approveBtn.textContent = '処理済';
            rejectBtn.textContent = '処理済';
        }
    }
}

// グローバルインスタンスを作成
window.adminScreen = new AdminScreen();
