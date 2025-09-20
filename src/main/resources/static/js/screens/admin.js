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
        this.monthlySubmissionsTableBody = null;
        this.monthlySubmissionStatusFilter = null;
    }

    /**
     * 表示用の社員名を取得（右上メニューと連動）
     * @param {Object} item
     * @returns {string}
     */
    getDisplayEmployeeName(item) {
        const nameFromTopRight = window.currentUser; // 右上の表示名
        if (nameFromTopRight && typeof nameFromTopRight === 'string') {
            return nameFromTopRight;
        }
        if (item && typeof item.employeeName === 'string' && item.employeeName.trim()) {
            return item.employeeName;
        }
        // デモ環境では user1 表記でOK
        return 'user1';
    }

    /**
     * 汎用重複排除
     * @param {Array} items
     * @param {(item:any)=>string} keyFn ユニークキー生成関数
     * @returns {Array}
     */
    dedupeBy(items, keyFn) {
        const seen = new Set();
        const result = [];
        (items || []).forEach((item) => {
            try {
                const key = keyFn(item);
                if (!seen.has(key)) {
                    seen.add(key);
                    result.push(item);
                }
            } catch (_) {}
        });
        return result;
    }

    /**
     * 管理者ダッシュボード初期化
     */
    initDashboard() {
        // 管理者ダッシュボードの初期化処理
        console.log('管理者ダッシュボードを初期化しました');
    }

    /**
     * 月末申請：対象社員の当月勤怠カレンダーを表示
     * @param {number} employeeId
     * @param {string} employeeName
     * @param {string} yearMonth yyyy-MM
     */
    async showMonthlyHistory(employeeId, employeeName, yearMonth) {
        try {
            // 常に最新の申請月を表示するため、一覧から当該社員の最新年月を取得
            let targetYearMonth = yearMonth;
            try {
                const submissions = await fetchWithAuth.handleApiCall(
                    () => fetchWithAuth.get('/api/admin/monthly-submissions'),
                    '月末申請一覧の取得に失敗しました'
                );

                if (submissions?.success && Array.isArray(submissions.data)) {
                    const employeeSubs = submissions.data.filter(s => s.employeeId === employeeId);
                    if (employeeSubs.length > 0) {
                        // updatedAt の新しい順、なければ yearMonth の新しい順
                        employeeSubs.sort((a, b) => {
                            const aUpdated = a.updatedAt ? new Date(a.updatedAt) : new Date(`${a.yearMonth}-01T00:00:00`);
                            const bUpdated = b.updatedAt ? new Date(b.updatedAt) : new Date(`${b.yearMonth}-01T00:00:00`);
                            return bUpdated - aUpdated;
                        });
                        targetYearMonth = employeeSubs[0].yearMonth;
                    }
                }
            } catch (e) {
                // 取得失敗時は引数の yearMonth を使用
            }

            // フォールバック（引数も未指定の場合は当月）
            if (!targetYearMonth) {
                const now = new Date();
                targetYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            }

            const [year, monthStr] = targetYearMonth.split('-');
            const month = parseInt(monthStr, 10);

            // 履歴取得
            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.get(`/api/attendance/history/${employeeId}?year=${year}&month=${month}`),
                '勤怠履歴の取得に失敗しました'
            );

            const calendarTbody = document.getElementById('adminMonthlyCalendarTbody');
            const meta = document.getElementById('adminMonthlyHistoryMeta');
            if (!calendarTbody || !meta) return;

            meta.textContent = `社員: ${employeeName} ／ 対象月: ${targetYearMonth}`;
            calendarTbody.innerHTML = '';

            const records = data?.data ?? [];
            // カレンダーを7列で生成
            const date = new Date(Number(year), month - 1, 1);
            const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
            const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            const dayToRecord = new Map();
            records.forEach(r => { dayToRecord.set(r.attendanceDate, r); });

            // 当該社員の有給・打刻修正を取得（履歴カレンダー用のバッジ表示）
            let vacationByDate = new Map();
            let adjustmentByDate = new Map();
            try {
                const [vacationsResp, adjustmentsResp] = await Promise.all([
                    // ユーザーAPIだが管理者でも参照用に呼び出し（認可はサーバ側ポリシーに従う）
                    fetchWithAuth
                        .handleApiCall(
                            () => fetchWithAuth.get(`/api/vacation/${employeeId}`),
                            '有給申請の取得に失敗しました'
                        )
                        .catch(() => null),
                    fetchWithAuth
                        .handleApiCall(
                            () => fetchWithAuth.get(`/api/attendance/adjustment/${employeeId}`),
                            '打刻修正申請の取得に失敗しました'
                        )
                        .catch(() => null)
                ]);

                // 有給を対象年月に整形（日付ごとに展開）
                if (Array.isArray(vacationsResp)) {
                    const y = Number(year);
                    const m = Number(month) - 1; // 0-based
                    vacationsResp.forEach(v => {
                        if (!v.startDate || !v.endDate) return;
                        const start = new Date(v.startDate);
                        const end = new Date(v.endDate);
                        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                            if (d.getFullYear() === y && d.getMonth() === m) {
                                const status = v.status || 'PENDING';
                                if (status !== 'CANCELLED' && status !== 'REJECTED') {
                                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                                    const dd = String(d.getDate()).padStart(2, '0');
                                    vacationByDate.set(`${d.getFullYear()}-${mm}-${dd}`, status);
                                }
                            }
                        }
                    });
                }

                // 打刻修正（当月のみ抽出）
                if (adjustmentsResp && adjustmentsResp.success && Array.isArray(adjustmentsResp.data)) {
                    const y = Number(year);
                    const m = Number(month) - 1; // 0-based
                    adjustmentsResp.data.forEach(a => {
                        if (!a.targetDate) return;
                        const d = new Date(a.targetDate);
                        if (d.getFullYear() === y && d.getMonth() === m) {
                            const mm = String(d.getMonth() + 1).padStart(2, '0');
                            const dd = String(d.getDate()).padStart(2, '0');
                            adjustmentByDate.set(`${d.getFullYear()}-${mm}-${dd}`, a.status || 'PENDING');
                        }
                    });
                }
            } catch (_ignored) {
                // 取得失敗時はバッジなし
            }

            let row = document.createElement('tr');
            // 先頭空白（日曜=0）
            for (let i = 0; i < firstDay.getDay(); i++) {
                row.appendChild(document.createElement('td'));
            }
            for (let d = 1; d <= lastDay.getDate(); d++) {
                const current = new Date(date.getFullYear(), date.getMonth(), d);
                const yyyy = current.getFullYear();
                const mm = String(current.getMonth() + 1).padStart(2, '0');
                const dd = String(d).padStart(2, '0');
                const key = `${yyyy}-${mm}-${dd}`;
                const rec = dayToRecord.get(key);

                const td = document.createElement('td');
                const dayNum = `<div class="fw-bold ${current.getDay()===0?'text-danger':''} ${current.getDay()===6?'text-primary':''}">${d}</div>`;

                let badgesHtml = '';
                const vacationStatus = vacationByDate.get(key);
                if (vacationStatus) {
                    const isApproved = vacationStatus === 'APPROVED';
                    const badgeClass = isApproved ? 'bg-success' : 'bg-warning';
                    const label = isApproved ? '有給承認済' : '有給申請中';
                    badgesHtml += `<div><span class="badge ${badgeClass} badge-sm">${label}</span></div>`;
                }
                const adjStatus = adjustmentByDate.get(key);
                if (adjStatus) {
                    const isApproved = adjStatus === 'APPROVED';
                    const badgeClass = isApproved ? 'bg-success' : 'bg-warning';
                    const label = isApproved ? '打刻修正承認済' : '打刻修正申請中';
                    badgesHtml += `<div><span class="badge ${badgeClass} badge-sm">${label}</span></div>`;
                }

                let detail = '<div class="text-muted">-</div>';
                if (rec) {
                    const ci = rec.clockInTime ? new Date(rec.clockInTime).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}) : '-';
                    const co = rec.clockOutTime ? new Date(rec.clockOutTime).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}) : '-';
                    detail = `<div class="clock-times"><span class="clock-in-time">${ci}</span> - <span class="clock-out-time">${co}</span></div>`;
                }
                td.innerHTML = `${dayNum}${badgesHtml}${detail}`;
                row.appendChild(td);

                if (current.getDay() === 6) {
                    calendarTbody.appendChild(row);
                    row = document.createElement('tr');
                }
            }
            // 末尾の埋め
            if (row.children.length > 0) {
                while (row.children.length < 7) row.appendChild(document.createElement('td'));
                calendarTbody.appendChild(row);
            }

            // モーダル表示
            const modalEl = document.getElementById('adminMonthlyHistoryModal');
            if (modalEl) {
                const modal = new bootstrap.Modal(modalEl);
                modal.show();
            }
        } catch (error) {
            this.showAlert(error.message, 'danger');
        }
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
    // 勤怠管理画面は廃止
    initAttendance() {}

    /**
     * 申請承認画面初期化
     */
    initApprovals() {
        this.initializeApprovalElements();
        this.setupApprovalEventListeners();
        this.loadPendingApprovals();
    }

    /**
     * 月末申請管理画面初期化
     */
    initMonthlySubmissions() {
        this.initializeMonthlySubmissionElements();
        this.setupMonthlySubmissionEventListeners();
        this.loadMonthlySubmissions();
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
    initializeAttendanceElements() {}

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
     * 月末申請管理要素の初期化
     */
    initializeMonthlySubmissionElements() {
        this.monthlySubmissionsTableBody = document.getElementById('monthlySubmissionsTableBody');
        this.monthlySubmissionStatusFilter = document.getElementById('monthlySubmissionStatusFilter');
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
    setupAttendanceEventListeners() {}

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
     * 月末申請管理イベントリスナー設定
     */
    setupMonthlySubmissionEventListeners() {
        // 状態フィルター変更イベント
        if (this.monthlySubmissionStatusFilter) {
            this.monthlySubmissionStatusFilter.addEventListener('change', () => {
                this.loadMonthlySubmissions();
            });
        }
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
    async searchAttendance() {}

    /**
     * モック勤怠データ生成
     * @returns {Array} - モックデータ
     */
    generateMockAttendanceData() { return []; }

    /**
     * 勤怠データ表示
     * @param {Array} data - 勤怠データ
     */
    displayAttendanceData(data) {}

    /**
     * 未承認申請読み込み
     */
    async loadPendingApprovals() {
        try {
            // 打刻修正（PENDING/APPROVED/REJECTED）のみ取得（この画面は「打刻修正」専用）
            const [pending, approved, rejected] = await Promise.all([
                fetchWithAuth
                    .handleApiCall(
                        () => fetchWithAuth.get('/api/admin/attendance/adjustment/status/PENDING'),
                        '打刻修正申請（申請中）の取得に失敗しました'
                    )
                    .catch(() => ({ success: false })),
                fetchWithAuth
                    .handleApiCall(
                        () => fetchWithAuth.get('/api/admin/attendance/adjustment/status/APPROVED'),
                        '打刻修正申請（承認済）の取得に失敗しました'
                    )
                    .catch(() => ({ success: false })),
                fetchWithAuth
                    .handleApiCall(
                        () => fetchWithAuth.get('/api/admin/attendance/adjustment/status/REJECTED'),
                        '打刻修正申請（却下）の取得に失敗しました'
                    )
                    .catch(() => ({ success: false }))
            ]);

            const list = [];

            // 打刻修正: 申請中
            if (pending?.success) {
                (pending.data || []).forEach(item => {
                    list.push({
                        id: item.adjustmentRequestId,
                        employeeName: this.getDisplayEmployeeName(item),
                        type: '打刻修正',
                        date: item.targetDate,
                        reason: item.reason || '',
                        status: '申請中',
                        requestType: 'adjustment'
                    });
                });
            }
            // 打刻修正: 承認済
            if (approved?.success) {
                (approved.data || []).forEach(item => {
                    list.push({
                        id: item.adjustmentRequestId,
                        employeeName: this.getDisplayEmployeeName(item),
                        type: '打刻修正',
                        date: item.targetDate,
                        reason: item.reason || '',
                        status: '承認済',
                        requestType: 'adjustment'
                    });
                });
            }
            // 打刻修正: 却下
            if (rejected?.success) {
                (rejected.data || []).forEach(item => {
                    list.push({
                        id: item.adjustmentRequestId,
                        employeeName: this.getDisplayEmployeeName(item),
                        type: '打刻修正',
                        date: item.targetDate,
                        reason: item.reason || '',
                        status: '却下',
                        requestType: 'adjustment'
                    });
                });
            }

            // この画面では有給は表示しない（有給は「有給承認・付与調整」で扱う）

            if (list.length === 0) {
                // データなしは空表示
                this.displayPendingApprovals([]);
                return;
            }

            // 重複排除（employeeId + date + type + status）
            const deduped = this.dedupeBy(list, (it) => `${it.employeeName}|${it.date}|${it.type}|${it.status}`);
            this.displayPendingApprovals(deduped);
        } catch (error) {
            console.error('未承認申請読み込みエラー:', error);
            this.displayPendingApprovals([]);
        }
    }

    /**
     * モック申請データ生成
     * @returns {Array} - モックデータ
     */
    generateMockApprovalData() {
        // モックは使用しない（空配列を返す）
        return [];
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
            // 状態が承認済/却下ならグレーアウト
            if (approval.status === '承認済' || approval.status === '却下' || approval.status === 'APPROVED' || approval.status === 'REJECTED') {
                row.classList.add('table-secondary');
            }
            const isPending = approval.status === '申請中' || approval.status === 'PENDING';
            const actionHtml = isPending
                ? `
                    <button class="btn btn-sm btn-success me-1 approve-btn" data-request-id="${approval.id}" data-type="${approval.requestType || 'adjustment'}">承認</button>
                    <button class="btn btn-sm btn-danger reject-btn" data-request-id="${approval.id}" data-type="${approval.requestType || 'adjustment'}">却下</button>
                  `
                : '<span class="text-muted">処理済</span>';

            row.innerHTML = `
                <td>${approval.employeeName}</td>
                <td>${approval.type}</td>
                <td>${approval.date}</td>
                <td>${approval.reason}</td>
                <td><span class="badge ${approval.status==='承認済' || approval.status==='APPROVED' ? 'bg-secondary' : (approval.status==='却下' || approval.status==='REJECTED' ? 'bg-danger' : 'bg-warning')}">${approval.status}</span></td>
                <td>${actionHtml}</td>
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
            // 月末申請が承認済みか確認
            const statusResp = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.get(`/api/attendance/monthly-status?employeeId=${employeeId}&yearMonth=${month}`),
                '申請状態の確認に失敗しました'
            );
            const submissionStatus = statusResp?.data?.submissionStatus || statusResp?.submissionStatus;
            if (submissionStatus !== 'APPROVED') {
                this.showAlert('PDF出力は月末申請が承認済の場合のみ可能です', 'warning');
                return;
            }

            // レポート生成APIを呼び出し
            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.post('/api/reports/generate', {
                    employeeId: parseInt(employeeId),
                    yearMonth: month
                }),
                'レポート生成に失敗しました'
            );

            if (data.success && data.pdfUrl) {
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
            // ステータス別に取得して結合（申請中/承認済/却下）
            const [vPending, vApproved, vRejected] = await Promise.all([
                fetchWithAuth
                    .handleApiCall(
                        () => fetchWithAuth.get('/api/admin/vacation/status/PENDING'),
                        '有給申請（申請中）の取得に失敗しました'
                    )
                    .catch(() => ({ success: false })),
                fetchWithAuth
                    .handleApiCall(
                        () => fetchWithAuth.get('/api/admin/vacation/status/APPROVED'),
                        '有給申請（承認済）の取得に失敗しました'
                    )
                    .catch(() => ({ success: false })),
                fetchWithAuth
                    .handleApiCall(
                        () => fetchWithAuth.get('/api/admin/vacation/status/REJECTED'),
                        '有給申請（却下）の取得に失敗しました'
                    )
                    .catch(() => ({ success: false }))
            ]);

            const list = [];
            const pushItems = (src, statusText) => {
                (src?.data || []).forEach(item => {
                    list.push({
                        employeeId: item.employeeId,
                        vacationId: item.vacationId,
                        startDate: item.startDate,
                        endDate: item.endDate,
                        reason: item.reason || '',
                        status: statusText
                    });
                });
            };
            if (vPending?.success) pushItems(vPending, 'PENDING');
            if (vApproved?.success) pushItems(vApproved, 'APPROVED');
            if (vRejected?.success) pushItems(vRejected, 'REJECTED');

            if (list.length === 0) {
                // フォールバック: 社員ごとの申請一覧を集約
                try {
                    const employeesResp = await fetchWithAuth.handleApiCall(
                        () => fetchWithAuth.get('/api/admin/employees'),
                        '社員一覧の取得に失敗しました'
                    );
                    const employees = employeesResp?.data || [];
                    const aggregated = [];
                    await Promise.all(
                        employees.map(async (emp) => {
                            try {
                                const vr = await fetchWithAuth.handleApiCall(
                                    () => fetchWithAuth.get(`/api/vacation/${emp.employeeId}`),
                                    '有給申請の取得に失敗しました'
                                );
                                const requests = Array.isArray(vr) ? vr : [];
                                requests.forEach(item => {
                                    aggregated.push({
                                        employeeId: item.employeeId,
                                        vacationId: item.vacationId,
                                        startDate: item.startDate,
                                        endDate: item.endDate,
                                        reason: item.reason || '',
                                        status: item.status || 'PENDING'
                                    });
                                });
                            } catch (_) {}
                        })
                    );
                    this.displayVacationManagementData(aggregated);
                } catch (e) {
                    this.displayVacationManagementData([]);
                }
                return;
            }

            // 重複排除（employeeId + startDate + endDate + status）
            const deduped = this.dedupeBy(list, (it) => `${it.employeeId}|${it.startDate}|${it.endDate || ''}|${it.status}`);
            this.displayVacationManagementData(deduped);
        } catch (error) {
            console.error('有給管理データ読み込みエラー:', error);
            this.displayVacationManagementData([]);
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
            const dateDisplay = item.startDate === item.endDate || !item.endDate
                ? item.startDate
                : `${item.startDate} 〜 ${item.endDate}`;
            const status = (item.status || 'PENDING').toUpperCase();
            const badgeClass = status === 'APPROVED' ? 'bg-secondary' : status === 'REJECTED' ? 'bg-danger' : 'bg-warning';
            const isPending = status === 'PENDING';
            if (!isPending) row.classList.add('table-secondary');

            const vacationId = item.vacationId ?? item.id;

            const actionHtml = isPending
                ? `
                    <button class="btn btn-sm btn-success me-1" onclick="adminScreen.approveVacationRequest(${vacationId})">承認</button>
                    <button class="btn btn-sm btn-danger" onclick="adminScreen.rejectVacationRequest(${vacationId})">却下</button>
                  `
                : '<span class="text-muted">処理済</span>';

            row.innerHTML = `
                <td>${this.getDisplayEmployeeName(item)}</td>
                <td>有給申請</td>
                <td>${dateDisplay}</td>
                <td>${item.reason ?? ''}</td>
                <td><span class="badge ${badgeClass}">${status === 'APPROVED' ? '承認済' : status === 'REJECTED' ? '却下' : '申請中'}</span></td>
                <td>${actionHtml}</td>
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
    async approveRequest(requestId, requestType) {
        try {
            // 承認前の確認
            let confirmMessage = '承認しますか？';
            if (requestType === 'vacation') confirmMessage = 'この有給申請を承認しますか？';
            if (requestType === 'adjustment') confirmMessage = 'この打刻修正申請を承認しますか？';
            if (requestType === 'monthly') confirmMessage = 'この月末申請を承認しますか？';
            if (!confirm(confirmMessage)) return;
            let apiEndpoint = '';
            let requestData = {};

            switch (requestType) {
                case 'adjustment':
                    apiEndpoint = `/api/admin/attendance/adjustment/approve/${requestId}`;
                    requestData = null;
                    break;
                case 'vacation':
                    apiEndpoint = '/api/admin/vacation/approve';
                    requestData = { vacationId: requestId, approved: true };
                    break;
                case 'monthly':
                    // monthlyはemployeeIdとyearMonthが必要。idに埋め込んだ形式を分解
                    if (typeof requestId === 'string' && requestId.includes('-')) {
                        const [empIdStr, yearMonth] = requestId.split('-');
                        apiEndpoint = '/api/admin/monthly-submissions/approve';
                        requestData = { employeeId: Number(empIdStr), yearMonth, approved: true };
                    } else {
                        throw new Error('月末申請の識別子が不正です');
                    }
                    break;
                default:
                    throw new Error('不明な申請種別です');
            }

            const data = await fetchWithAuth.handleApiCall(
                () => (requestData ? fetchWithAuth.post(apiEndpoint, requestData) : fetchWithAuth.post(apiEndpoint)),
                '承認に失敗しました'
            );

            this.showAlert(data.message || '承認しました', 'success');
            await this.loadPendingApprovals();
        } catch (error) {
            this.showAlert(error.message, 'danger');
        }
    }

    /**
     * 月末申請一覧読み込み
     */
    async loadMonthlySubmissions() {
        if (!this.monthlySubmissionsTableBody) return;

        try {
            const status = this.monthlySubmissionStatusFilter?.value || '';
            const url = status ? `/api/admin/monthly-submissions?status=${status}` : '/api/admin/monthly-submissions';
            
            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.get(url),
                '月末申請一覧の取得に失敗しました'
            );

            if (data.success) {
                this.displayMonthlySubmissions(data.data);
            } else {
                this.showAlert(data.message, 'danger');
            }
        } catch (error) {
            this.showAlert(error.message, 'danger');
        }
    }

    /**
     * 月末申請一覧表示
     * @param {Array} submissions - 月末申請一覧
     */
    displayMonthlySubmissions(submissions) {
        if (!this.monthlySubmissionsTableBody) return;

        this.monthlySubmissionsTableBody.innerHTML = '';

        if (submissions.length === 0) {
            this.monthlySubmissionsTableBody.innerHTML = 
                '<tr><td colspan="6" class="text-center text-muted">月末申請がありません</td></tr>';
            return;
        }

        submissions.forEach(submission => {
            const row = document.createElement('tr');
            
            // 状態に応じたスタイル設定
            let statusClass = '';
            let statusText = submission.submissionStatusDisplay;
            
            switch (submission.submissionStatus) {
                case 'SUBMITTED':
                    statusClass = 'text-warning';
                    break;
                case 'APPROVED':
                    statusClass = 'text-success';
                    break;
                case 'REJECTED':
                    statusClass = 'text-danger';
                    break;
                default:
                    statusClass = 'text-secondary';
            }

            // 操作ボタンの生成 + PDFダウンロード（承認済のみ）
            const canApprove = submission.submissionStatus === 'SUBMITTED';
            const canDownload = submission.submissionStatus === 'APPROVED';
            const actionButtons = `
                <div class="d-flex align-items-center gap-2">
                    <button class="btn btn-success btn-sm" ${canApprove ? '' : 'disabled'}
                            onclick="adminScreen.approveMonthlySubmission(${submission.employeeId}, '${submission.yearMonth}', true)">承認</button>
                    <button class="btn btn-danger btn-sm" ${canApprove ? '' : 'disabled'}
                            onclick="adminScreen.approveMonthlySubmission(${submission.employeeId}, '${submission.yearMonth}', false)">却下</button>
                    <button class="btn btn-outline-primary btn-sm" ${canDownload ? '' : 'disabled'}
                            onclick="adminScreen.downloadApprovedMonthlyPdf(${submission.employeeId}, '${submission.yearMonth}')">PDF</button>
                </div>
            `;

            row.innerHTML = `
                <td>${submission.employeeName}</td>
                <td>${submission.yearMonth}</td>
                <td><span class="${statusClass}">${statusText}</span></td>
                <td>${new Date(submission.submittedAt ?? submission.updatedAt).toLocaleDateString('ja-JP')}</td>
                <td>${actionButtons}</td>
                <td>
                    <button class="btn btn-outline-secondary btn-sm" 
                            onclick="adminScreen.showMonthlyHistory(${submission.employeeId}, '${submission.employeeName}', '${submission.yearMonth}')">
                        履歴
                    </button>
                </td>
            `;

            this.monthlySubmissionsTableBody.appendChild(row);
        });
    }

    /**
     * 承認済み月末申請のPDFダウンロード
     */
    async downloadApprovedMonthlyPdf(employeeId, yearMonth) {
        try {
            const statusResp = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.get(`/api/attendance/monthly-status?employeeId=${employeeId}&yearMonth=${yearMonth}`),
                '申請状態の確認に失敗しました'
            );
            const submissionStatus = statusResp?.data?.submissionStatus || statusResp?.submissionStatus;
            if (submissionStatus !== 'APPROVED') {
                this.showAlert('承認済みでないためPDFを出力できません', 'warning');
                return;
            }

            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.post('/api/reports/generate', { employeeId, yearMonth }),
                'レポート生成に失敗しました'
            );
            if (data.success && data.pdfUrl) {
                const filename = `attendance_${employeeId}_${yearMonth}.pdf`;
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
     * 月末申請承認/却下
     * @param {number} employeeId - 従業員ID
     * @param {string} yearMonth - 年月
     * @param {boolean} approved - 承認する場合true
     */
    async approveMonthlySubmission(employeeId, yearMonth, approved) {
        try {
            // 承認/却下の確認
            if (approved) {
                if (!confirm('この月末申請を承認しますか？')) return;
            } else {
                if (!confirm('この月末申請を却下しますか？')) return;
            }
            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.post('/api/admin/monthly-submissions/approve', {
                    employeeId: employeeId,
                    yearMonth: yearMonth,
                    approved: approved
                }),
                `${approved ? '承認' : '却下'}に失敗しました`
            );

            this.showAlert(data.message, 'success');
            await this.loadMonthlySubmissions();
        } catch (error) {
            this.showAlert(error.message, 'danger');
        }
    }

    /**
     * 申請却下
     * @param {number} requestId - 申請ID
     */
    async rejectRequest(requestId, requestType) {
        try {
            let apiEndpoint = '';
            let requestData = {};

            switch (requestType) {
                case 'adjustment': {
                    const comment = prompt('却下理由を入力してください（必須）');
                    if (!comment || !comment.trim()) {
                        this.showAlert('却下理由は必須です', 'warning');
                        return;
                    }
                    apiEndpoint = `/api/admin/attendance/adjustment/reject/${requestId}?comment=${encodeURIComponent(comment.trim())}`;
                    requestData = null;
                    break;
                }
                case 'vacation':
                    apiEndpoint = '/api/admin/vacation/approve';
                    requestData = { vacationId: requestId, approved: false };
                    break;
                case 'monthly':
                    if (typeof requestId === 'string' && requestId.includes('-')) {
                        const [empIdStr, yearMonth] = requestId.split('-');
                        apiEndpoint = '/api/admin/monthly-submissions/approve';
                        requestData = { employeeId: Number(empIdStr), yearMonth, approved: false };
                    } else {
                        throw new Error('月末申請の識別子が不正です');
                    }
                    break;
                default:
                    throw new Error('不明な申請種別です');
            }

            const data = await fetchWithAuth.handleApiCall(
                () => (requestData ? fetchWithAuth.post(apiEndpoint, requestData) : fetchWithAuth.post(apiEndpoint)),
                '却下に失敗しました'
            );

            this.showAlert(data.message || '却下しました', 'warning');
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
            if (!confirm('この有給申請を承認しますか？')) return;
            const data = await fetchWithAuth.handleApiCall(
                // コントローラのリクエスト型に合わせてvacationIdを送る
                () => fetchWithAuth.post('/api/admin/vacation/approve', { vacationId: requestId, approved: true }),
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
            if (!confirm('この有給申請を却下しますか？')) return;
            const data = await fetchWithAuth.handleApiCall(
                // コントローラのリクエスト型に合わせてvacationIdを送る
                () => fetchWithAuth.post('/api/admin/vacation/approve', { vacationId: requestId, approved: false }),
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
                    // 管理者承認（パスパラメータ）
                    apiEndpoint = `/api/admin/attendance/adjustment/approve/${requestId}`;
                    requestData = null;
                    break;
                case 'monthly':
                    apiEndpoint = '/api/admin/monthly/approve';
                    requestData = { monthlyId: requestId, approved: true };
                    break;
                default:
                    throw new Error('不明な申請種別です');
            }

            const data = await fetchWithAuth.handleApiCall(
                () => requestData ? fetchWithAuth.post(apiEndpoint, requestData) : fetchWithAuth.post(apiEndpoint),
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
        // 共通確認
        if (!confirm('この申請を却下しますか？')) return;

        try {
            let apiEndpoint = '';
            let requestData = {};

            switch (requestType) {
                case 'vacation':
                    if (!confirm('この有給申請を却下しますか？')) return;
                    apiEndpoint = '/api/admin/vacation/approve';
                    requestData = { vacationId: requestId, approved: false };
                    break;
                case 'adjustment':
                    // 却下コメントの入力
                    if (!confirm('この打刻修正申請を却下しますか？')) return;
                    const comment = prompt('却下理由を入力してください（必須）');
                    if (!comment || !comment.trim()) {
                        throw new Error('却下理由は必須です');
                    }
                    apiEndpoint = `/api/admin/attendance/adjustment/reject/${requestId}?comment=` + encodeURIComponent(comment.trim());
                    requestData = null;
                    break;
                case 'monthly':
                    if (!confirm('この月末申請を却下しますか？')) return;
                    apiEndpoint = '/api/admin/monthly/approve';
                    requestData = { monthlyId: requestId, approved: false };
                    break;
                default:
                    throw new Error('不明な申請種別です');
            }

            const data = await fetchWithAuth.handleApiCall(
                () => requestData ? fetchWithAuth.post(apiEndpoint, requestData) : fetchWithAuth.post(apiEndpoint),
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
