/**
 * 勤怠履歴画面モジュール
 */
class HistoryScreen {
    constructor() {
        this.historyMonthSelect = null;
        this.monthlySubmitHistoryBtn = null;
        this.historyTableBody = null;
        this.calendarGrid = null;
        this.currentYear = new Date().getFullYear();
        this.currentMonth = new Date().getMonth();
        this.attendanceData = [];
        this.vacationRequests = [];
        this.adjustmentRequests = [];
        this.eventsBound = false;
    }

    /**
     * 初期化
     */
    async init() {
        this.initializeElements();
        this.setupEventListeners();
        this.generateMonthOptions();
        await this.loadCalendarData();
        this.generateCalendar();
        // 初期の月末申請ボタン状態を反映
        const selectedMonth = this.historyMonthSelect?.value;
        if (selectedMonth) {
            await this.updateMonthlySubmitButton(selectedMonth);
        }
        this.initialized = true;
    }

    /**
     * DOM要素の初期化
     */
    initializeElements() {
        this.historyMonthSelect = document.getElementById('historyMonthSelect');
        this.monthlySubmitHistoryBtn = document.getElementById('monthlySubmitHistoryBtn');
        this.historyTableBody = document.getElementById('historyTableBody');
        this.calendarGrid = document.getElementById('calendarGrid');
    }

    /**
     * イベントリスナー設定
     */
    setupEventListeners() {
        if (this.eventsBound) return;
        if (this.monthlySubmitHistoryBtn) {
            this.monthlySubmitHistoryBtn.addEventListener('click', () => {
                const action = this.monthlySubmitHistoryBtn.dataset.action || 'submit';
                if (action === 'cancel') {
                    this.handleMonthlyCancel();
                } else {
                    this.handleMonthlySubmit();
                }
            });
        }

        // ドロップダウンの変更イベント
        if (this.historyMonthSelect) {
            this.historyMonthSelect.addEventListener('change', () => this.handleMonthSelectChange());
        }
        this.eventsBound = true;
    }

    /**
     * カレンダーデータ読み込み
     */
    async loadCalendarData() {
        if (!window.currentEmployeeId) {
            console.warn('従業員IDが取得できません');
            return;
        }

        const selectedMonth = this.historyMonthSelect?.value;
        let url = `/api/attendance/history/${window.currentEmployeeId}`;
        
        if (selectedMonth) {
            const [year, month] = selectedMonth.split('-');
            url += `?year=${year}&month=${parseInt(month, 10)}`;
        }

        try {
            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.get(url),
                '勤怠履歴の取得に失敗しました'
            );

            if (data.success) {
                this.attendanceData = data.data || [];
            } else {
                // APIが失敗した場合はモックデータを使用せず、実データのみ表示
                this.attendanceData = [];
            }

            // 有給申請データも読み込み（履歴カレンダー用）
            await this.loadVacationRequests();

            // 打刻修正申請データも読み込み（履歴カレンダー用）
            await this.loadAdjustmentRequests();
        } catch (error) {
            console.error('勤怠履歴読み込みエラー:', error);
            // エラーの場合もモックデータは使用しない
            this.attendanceData = [];
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
            const [year, month] = selectedMonth.split('-');
            url += `?year=${year}&month=${parseInt(month, 10)}`;
        }

        try {
            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.get(url),
                '勤怠履歴の取得に失敗しました'
            );

            if (data.success) {
                this.displayAttendanceHistory(data.data);
            } else {
                // APIが失敗した場合もモックデータは表示しない
                this.displayAttendanceHistory([]);
            }
        } catch (error) {
            console.error('勤怠履歴読み込みエラー:', error);
            // エラーの場合もモックデータは表示しない
            this.displayAttendanceHistory([]);
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
            const clockInMinutes = clockIn.getHours() * 60 + clockIn.getMinutes();
            const clockOutMinutes = clockOut.getHours() * 60 + clockOut.getMinutes();
            
            const lateMinutes = Math.max(0, clockInMinutes - (9 * 60)); // 9:00以降は遅刻
            const earlyLeaveMinutes = Math.max(0, (18 * 60) - clockOutMinutes); // 18:00より早い退勤
            const overtimeMinutes = Math.max(0, clockOutMinutes - (18 * 60)); // 18:00以降の残業
            const nightWorkMinutes = Math.max(0, clockOutMinutes - (22 * 60)); // 22:00以降の深夜

            // 日本時間での日付文字列を生成（UTC変換を避ける）
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            
            data.push({
                attendanceDate: dateStr,
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
            this.historyTableBody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">データがありません</td></tr>';
            return;
        }

        data.forEach(record => {
            const row = document.createElement('tr');
            row.style.cursor = 'pointer';
            row.classList.add('attendance-row');

            const isConfirmed = !!(record.clockInTime && record.clockOutTime);

            const clockInTime = isConfirmed ? new Date(record.clockInTime).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'}) : '';
            const clockOutTime = isConfirmed ? new Date(record.clockOutTime).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'}) : '';
            const workingTime = isConfirmed ? TimeUtils.calculateWorkingTime(record.clockInTime, record.clockOutTime) : '';
            const lateDisplay = isConfirmed && record.lateMinutes > 0 ? formatMinutesToTime(record.lateMinutes) : '';
            const earlyLeaveDisplay = isConfirmed && record.earlyLeaveMinutes > 0 ? formatMinutesToTime(record.earlyLeaveMinutes) : '';
            const overtimeDisplay = isConfirmed && record.overtimeMinutes > 0 ? formatMinutesToTime(record.overtimeMinutes) : '';
            const nightWorkDisplay = isConfirmed && record.nightWorkMinutes > 0 ? formatMinutesToTime(record.nightWorkMinutes) : '';
            const status = isConfirmed ? (record.status || '') : '';

            row.innerHTML = `
                <td>${isConfirmed ? record.attendanceDate : ''}</td>
                <td>${clockInTime}</td>
                <td>${clockOutTime}</td>
                <td>${workingTime}</td>
                <td>${lateDisplay}</td>
                <td>${earlyLeaveDisplay}</td>
                <td>${overtimeDisplay}</td>
                <td>${nightWorkDisplay}</td>
                <td>${status}</td>
            `;

            // クリックイベントを追加
            row.addEventListener('click', () => {
                this.showAttendanceDetail(record);
            });

            this.historyTableBody.appendChild(row);
        });
    }

    /**
     * ドロップダウン月選択変更時の処理
     */
    async handleMonthSelectChange() {
        const selectedMonth = this.historyMonthSelect?.value;
        
        if (!selectedMonth) return;
        
        const [year, month] = selectedMonth.split('-');
        this.currentYear = parseInt(year);
        this.currentMonth = parseInt(month) - 1; // JavaScriptの月は0ベース
        
        await this.loadCalendarData();
        this.generateCalendar();
        
        // 月末申請ボタンの状態を更新
        await this.updateMonthlySubmitButton(selectedMonth);
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

        // 事前確認
        const confirmed = window.confirm(`${selectedMonth} の勤怠を申請します。よろしいですか？`);
        if (!confirmed) return;

        try {
            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.post('/api/attendance/monthly-submit', { 
                    employeeId: window.currentEmployeeId, 
                    yearMonth: selectedMonth 
                }),
                '月末申請に失敗しました'
            );

            this.showAlert('月末申請が完了しました', 'success');
            
            // 申請後にデータとUIを即時更新
            await this.loadCalendarData();
            this.generateCalendar();
            // 旧カレンダー画面にも反映（存在する場合）
            try {
                if (window.calendarScreen && typeof window.calendarScreen.loadCalendarData === 'function') {
                    await window.calendarScreen.loadCalendarData();
                    if (typeof window.calendarScreen.generateCalendar === 'function') {
                        window.calendarScreen.generateCalendar();
                    }
                }
            } catch (_) { /* no-op */ }
            await this.updateMonthlySubmitButton(selectedMonth);
            
        } catch (error) {
            this.showAlert(error.message, 'danger');
        }
    }

    /**
     * 月末申請取消
     */
    async handleMonthlyCancel() {
        const selectedMonth = this.historyMonthSelect?.value;
        
        if (!selectedMonth) {
            this.showAlert('対象月を選択してください', 'warning');
            return;
        }

        if (!window.currentEmployeeId) {
            this.showAlert('従業員IDが取得できません', 'danger');
            return;
        }

        // 事前確認
        const confirmed = window.confirm(`${selectedMonth} の申請を取消します。よろしいですか？`);
        if (!confirmed) return;

        try {
            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.post('/api/attendance/monthly-cancel', { 
                    employeeId: window.currentEmployeeId, 
                    yearMonth: selectedMonth 
                }),
                '申請取消に失敗しました'
            );

            this.showAlert('月末申請を取消しました', 'success');
            // 取消後にデータとUIを即時更新
            await this.loadCalendarData();
            this.generateCalendar();
            // 旧カレンダー画面にも反映（存在する場合）
            try {
                if (window.calendarScreen && typeof window.calendarScreen.loadCalendarData === 'function') {
                    await window.calendarScreen.loadCalendarData();
                    if (typeof window.calendarScreen.generateCalendar === 'function') {
                        window.calendarScreen.generateCalendar();
                    }
                }
            } catch (_) { /* no-op */ }
            await this.updateMonthlySubmitButton(selectedMonth);
        } catch (error) {
            this.showAlert(error.message, 'danger');
        }
    }

    /**
     * 月末申請ボタンの状態を更新
     * @param {string} yearMonth - 対象年月
     */
    async updateMonthlySubmitButton(yearMonth) {
        if (!this.monthlySubmitHistoryBtn) return;

        try {
            // 申請状態を取得
            const response = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.get(`/api/attendance/monthly-status?employeeId=${window.currentEmployeeId}&yearMonth=${yearMonth}`),
                '申請状態の取得に失敗しました'
            );

            if (response.success && response.data) {
                const status = response.data.submissionStatus;
                this.setMonthlySubmitButtonState(status);
            }
        } catch (error) {
            console.error('申請状態取得エラー:', error);
            // エラーの場合は申請中状態に設定
            this.setMonthlySubmitButtonState('SUBMITTED');
        }
    }

    /**
     * 月末申請ボタンの表示状態を設定
     * @param {string} status - 申請状態
     */
    setMonthlySubmitButtonState(status) {
        if (!this.monthlySubmitHistoryBtn) return;

        const button = this.monthlySubmitHistoryBtn;
        
        switch (status) {
            case 'NOT_SUBMITTED':
                button.textContent = '月末申請';
                button.className = 'btn btn-primary';
                button.disabled = false;
                button.dataset.action = 'submit';
                break;
            case 'SUBMITTED':
                button.textContent = '申請取消';
                button.className = 'btn btn-outline-danger';
                button.disabled = false; // 申請中でも取消可能
                button.dataset.action = 'cancel';
                break;
            case 'APPROVED':
                button.textContent = '承認済';
                button.className = 'btn btn-success';
                button.disabled = true;
                button.dataset.action = '';
                break;
            case 'REJECTED':
                button.textContent = '却下（再申請可）';
                button.className = 'btn btn-warning';
                button.disabled = false; // 却下された場合は再申請可能
                button.dataset.action = 'submit';
                break;
            default:
                button.textContent = '月末申請';
                button.className = 'btn btn-primary';
                button.disabled = false;
                button.dataset.action = 'submit';
        }
    }

    /**
     * 月選択オプション生成
     */
    generateMonthOptions() {
        if (!this.historyMonthSelect) return;

        // 既存のオプションをクリア（最初のオプション以外）
        while (this.historyMonthSelect.children.length > 1) {
            this.historyMonthSelect.removeChild(this.historyMonthSelect.lastChild);
        }

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;

        // 過去12ヶ月 + 現在月 + 未来12ヶ月 = 合計25ヶ月分を生成
        for (let i = -12; i <= 12; i++) {
            const date = new Date(currentYear, currentMonth - 1 + i, 1);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const value = `${year}-${month}`;
            const label = `${year}年${month}月`;

            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            
            // 現在月の場合は選択状態にする
            if (i === 0) {
                option.selected = true;
            }
            
            this.historyMonthSelect.appendChild(option);
        }
    }

    /**
     * 分数を時間:分形式に変換
     * @param {number} minutes - 分数
     * @returns {string} - 時間:分形式の文字列
     */
    // formatMinutesToTime関数はtimeUtils.jsに移動しました

    /**
     * アラート表示
     * @param {string} message - メッセージ
     * @param {string} type - アラートタイプ
     */
    showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('alertContainer');
        if (!alertContainer) return;

        // 既存のアラートをクリアして重複表示を防止
        while (alertContainer.firstChild) {
            alertContainer.removeChild(alertContainer.firstChild);
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

    /**
     * カレンダー生成
     */
    generateCalendar() {
        if (!this.calendarGrid) return;

        // 既存のカレンダー内容をクリア
        this.calendarGrid.innerHTML = '';

        // 曜日ヘッダー
        const weekdays = ['月', '火', '水', '木', '金', '土', '日'];
        const headerHtml = weekdays.map(day => 
            `<div class="calendar-header">${day}</div>`
        ).join('');

        // 月の最初の日と最後の日
        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);

        // 月曜始まりのカレンダー計算
        const startDate = new Date(firstDay);
        const dayOfWeek = firstDay.getDay();
        const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startDate.setDate(startDate.getDate() - mondayOffset);

        let calendarHtml = headerHtml;

        // 6週間分のカレンダーを生成
        for (let week = 0; week < 6; week++) {
            for (let day = 0; day < 7; day++) {
                const currentDate = new Date(startDate);
                currentDate.setDate(startDate.getDate() + (week * 7) + day);

                const isCurrentMonth = currentDate.getMonth() === this.currentMonth;
                const isToday = this.isToday(currentDate);
                const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
                const isHoliday = this.isHoliday(currentDate);

                const dayNumber = currentDate.getDate();
                const dateString = this.formatDateString(currentDate);

                // 勤怠データの取得
                const attendance = this.getAttendanceForDate(dateString);
                const vacationRequest = this.getVacationRequestForDate(dateString);
                const adjustmentRequest = this.getAdjustmentRequestForDate(dateString);

                // 日付のクラス設定
                let dayClasses = ['calendar-day'];
                if (!isCurrentMonth) dayClasses.push('other-month');
                if (isToday) dayClasses.push('today');
                if (isWeekend || isHoliday) dayClasses.push('weekend');
                if (attendance) dayClasses.push('has-attendance');
                if (attendance && attendance.clockOutTime) dayClasses.push('clocked-out');
                if (attendance && attendance.clockInTime && !attendance.clockOutTime) dayClasses.push('clocked-in');

                // バッジ表示
                let badges = '';
                if (vacationRequest) {
                    const isApproved = vacationRequest.status === 'APPROVED';
                    const isPending = vacationRequest.status === 'PENDING';
                    const statusClass = isApproved ? 'bg-success' : 'bg-warning';
                    const label = isApproved ? '承認済' : '申請中';
                    const clickableClass = isPending ? 'vacation-badge clickable' : 'vacation-badge';
                    const title = isPending ? 'クリックして申請を取消' : '';
                    const dataAttrs = `data-vacation-id="${vacationRequest.vacationId || ''}" data-status="${vacationRequest.status}"`;
                    badges += `<span class="badge ${statusClass} badge-sm ${clickableClass}" ${dataAttrs} title="${title}">有給${label}</span>`;
                }
                if (adjustmentRequest) {
                    const statusClass = adjustmentRequest.status === 'APPROVED' ? 'bg-success' : 'bg-warning';
                    const label = adjustmentRequest.status === 'APPROVED' ? '承認済' : '申請中';
                    badges += `<span class="badge ${statusClass} badge-sm">打刻修正${label}</span>`;
                }

                calendarHtml += `
                    <div class="${dayClasses.join(' ')}" data-date="${dateString}" style="cursor: pointer;" title="クリックして詳細を表示">
                        <div class="day-number">${dayNumber}</div>
                        <div class="day-badges">${badges}</div>
                        ${attendance ? this.renderAttendanceInfo(attendance) : ''}
                        ${!attendance && (isWeekend || isHoliday) ? '<div class="day-status"><small>' + (isHoliday ? '祝日' : '休日') + '</small></div>' : ''}
                    </div>
                `;
            }
        }

        this.calendarGrid.innerHTML = calendarHtml;
        
        // カレンダーの日付クリックイベントを設定
        this.setupCalendarClickEvents();
        
        // 有給バッジのクリックイベント（申請取消）
        this.setupVacationBadgeActions();

        // 表示中の月が「今日」と同一なら、当日セルを自動選択し、明細も当日に同期
        try {
            const today = new Date();
            if (this.currentYear === today.getFullYear() && this.currentMonth === today.getMonth()) {
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                const todayStr = `${yyyy}-${mm}-${dd}`;
                const todayCell = this.calendarGrid.querySelector(`.calendar-day[data-date="${todayStr}"]`);
                if (todayCell) {
                    this.updateSelectedDate(todayCell);
                    this.filterAttendanceTableByDate(todayStr);
                }
            }
        } catch (e) {
            console.warn('当日セル自動選択中にエラー:', e);
        }
    }


    /**
     * 今日かどうか判定
     */
    isToday(date) {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    }

    /**
     * 祝日かどうか判定
     */
    isHoliday(date) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        
        // 日本の祝日判定（簡易版）
        const holidays = this.getHolidays(year);
        const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        return holidays.includes(dateString);
    }

    /**
     * 指定年の祝日一覧を取得
     */
    getHolidays(year) {
        const holidays = [];
        
        // 固定祝日
        holidays.push(`${year}-01-01`); // 元日
        holidays.push(`${year}-02-11`); // 建国記念の日
        holidays.push(`${year}-04-29`); // 昭和の日
        holidays.push(`${year}-05-03`); // 憲法記念日
        holidays.push(`${year}-05-04`); // みどりの日
        holidays.push(`${year}-05-05`); // こどもの日
        holidays.push(`${year}-08-11`); // 山の日
        holidays.push(`${year}-11-03`); // 文化の日
        holidays.push(`${year}-11-23`); // 勤労感謝の日
        holidays.push(`${year}-12-23`); // 天皇誕生日
        
        return holidays;
    }

    /**
     * 日付文字列フォーマット
     */
    formatDateString(date) {
        return date.getFullYear() + '-' + 
               String(date.getMonth() + 1).padStart(2, '0') + '-' + 
               String(date.getDate()).padStart(2, '0');
    }

    /**
     * 指定日の勤怠データ取得
     */
    getAttendanceForDate(dateString) {
        // 既存の実データのみを返し、モックは生成しない
        return this.attendanceData.find(record => record.attendanceDate === dateString) || null;
    }

    /**
     * 指定日のモック勤怠データ生成
     * @param {string} dateString - 日付文字列（YYYY-MM-DD形式）
     * @returns {Object|null} - モック勤怠データまたはnull
     */
    generateMockAttendanceForDate(dateString) {
        const date = new Date(dateString);
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = this.isHoliday(date);
        
        // 土日祝日は勤怠データなし
        if (isWeekend || isHoliday) {
            return null;
        }
        
        // 平日の場合、ランダムに勤怠データを生成（50%の確率）
        if (Math.random() < 0.5) {
            return null;
        }
        
        // 勤怠データを生成
        const clockIn = new Date(date);
        clockIn.setHours(9, Math.floor(Math.random() * 30), 0, 0); // 9:00-9:30の間でランダム

        const clockOut = new Date(date);
        clockOut.setHours(18, Math.floor(Math.random() * 60), 0, 0); // 18:00-19:00の間でランダム

        // 遅刻・早退・残業・深夜の計算
        const clockInMinutes = clockIn.getHours() * 60 + clockIn.getMinutes();
        const clockOutMinutes = clockOut.getHours() * 60 + clockOut.getMinutes();
        
        const lateMinutes = Math.max(0, clockInMinutes - (9 * 60)); // 9:00以降は遅刻
        const earlyLeaveMinutes = Math.max(0, (18 * 60) - clockOutMinutes); // 18:00より早い退勤
        const overtimeMinutes = Math.max(0, clockOutMinutes - (18 * 60)); // 18:00以降の残業
        const nightWorkMinutes = Math.max(0, clockOutMinutes - (22 * 60)); // 22:00以降の深夜

        return {
            attendanceDate: dateString,
            clockInTime: clockIn.toISOString(),
            clockOutTime: clockOut.toISOString(),
            lateMinutes: lateMinutes,
            earlyLeaveMinutes: earlyLeaveMinutes,
            overtimeMinutes: overtimeMinutes,
            nightWorkMinutes: nightWorkMinutes
        };
    }

    /**
     * 指定日の有給申請取得
     */
    getVacationRequestForDate(dateString) {
        return this.vacationRequests.find(request => request.date === dateString);
    }

    /**
     * 有給申請データ読み込み（当月分に整形）
     */
    async loadVacationRequests() {
        if (!window.currentEmployeeId) return;

        try {
            // 既存のAPI: /api/vacation/{employeeId} を利用し、フロントで月別に整形
            const response = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.get(`/api/vacation/${window.currentEmployeeId}`),
                '有給申請の取得に失敗しました'
            );

            // response は配列（List<VacationRequest>）を想定
            const requests = Array.isArray(response) ? response : [];

            // 申請を日付ごとに展開
            const expanded = [];
            requests.forEach(req => {
                if (!req.startDate || !req.endDate) return;

                const start = new Date(req.startDate);
                const end = new Date(req.endDate);

                // 範囲を1日ずつ展開（全休想定）
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    const y = d.getFullYear();
                    const m = d.getMonth(); // 0-based
                    // 表示中の年月のみ保持
                    if (y === this.currentYear && m === this.currentMonth) {
                        const status = req.status || 'PENDING';
                        // 取消/CANCELLED や 却下/REJECTED は表示しない
                        if (status !== 'CANCELLED' && status !== 'REJECTED') {
                            expanded.push({
                                date: this.formatDateString(d),
                                status: status,
                                vacationId: req.vacationId || req.id
                            });
                        }
                    }
                }
            });

            this.vacationRequests = expanded;
        } catch (error) {
            console.error('有給申請データ読み込みエラー:', error);
            this.vacationRequests = [];
        }
    }

    /**
     * 有給バッジのクリックアクション（申請取消）
     */
    setupVacationBadgeActions() {
        if (!this.calendarGrid) return;
        const badges = this.calendarGrid.querySelectorAll('.vacation-badge');
        badges.forEach(badge => {
            badge.addEventListener('click', async (e) => {
                e.stopPropagation();
                const status = badge.getAttribute('data-status');
                const vacationId = badge.getAttribute('data-vacation-id');

                if (status === 'PENDING' || status === 'APPROVED') {
                    if (!vacationId) return;
                    const confirmed = window.confirm('この有給申請を取消しますか？');
                    if (!confirmed) return;
                    try {
                        const data = await fetchWithAuth.handleApiCall(
                            () => fetchWithAuth.put(`/api/vacation/${vacationId}/status`, { status: 'CANCELLED' }),
                            '申請取消に失敗しました'
                        );
                        this.showAlert(data.message || '申請を取消しました', 'success');
                        await this.loadCalendarData();
                        this.generateCalendar();
                    } catch (error) {
                        this.showAlert(error.message, 'danger');
                    }
                } else {
                    this.showAlert('この申請は取消できません', 'warning');
                }
            });
        });
    }

    /**
     * 打刻修正申請データ読み込み（当月分に整形）
     */
    async loadAdjustmentRequests() {
        if (!window.currentEmployeeId) return;

        try {
            const response = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.get(`/api/attendance/adjustment/${window.currentEmployeeId}`),
                '打刻修正申請の取得に失敗しました'
            );

            const list = (response && response.success && Array.isArray(response.data)) ? response.data : [];

            // 当月のみ抽出し、カレンダー用に整形
            const filtered = [];
            list.forEach(req => {
                if (!req.targetDate) return;
                const d = new Date(req.targetDate);
                if (d.getFullYear() === this.currentYear && d.getMonth() === this.currentMonth) {
                    filtered.push({
                        date: this.formatDateString(d),
                        status: req.status || 'PENDING'
                    });
                }
            });

            this.adjustmentRequests = filtered;
        } catch (error) {
            console.error('打刻修正申請データ読み込みエラー:', error);
            this.adjustmentRequests = [];
        }
    }

    /**
     * 指定日の打刻修正申請取得
     */
    getAdjustmentRequestForDate(dateString) {
        return this.adjustmentRequests.find(request => request.date === dateString);
    }

    /**
     * カレンダークリックイベント設定
     */
    setupCalendarClickEvents() {
        const calendarDays = this.calendarGrid.querySelectorAll('.calendar-day');
        calendarDays.forEach(day => {
            day.addEventListener('click', () => {
                const dateString = day.getAttribute('data-date');
                
                // 選択状態の視覚的フィードバック
                this.updateSelectedDate(day);
                
                // 勤怠詳細テーブルを選択日付でフィルタリング
                this.filterAttendanceTableByDate(dateString);
            });
        });
    }

    /**
     * 選択日付の視覚的フィードバック更新
     * @param {HTMLElement} selectedDay - 選択された日付要素
     */
    updateSelectedDate(selectedDay) {
        // 既存の選択状態をクリア
        const calendarDays = this.calendarGrid.querySelectorAll('.calendar-day');
        calendarDays.forEach(day => {
            day.classList.remove('selected');
        });
        
        // 選択された日付にクラスを追加
        selectedDay.classList.add('selected');
    }

    /**
     * 勤怠詳細テーブルを指定日付でフィルタリング
     * @param {string} dateString - フィルタリングする日付（YYYY-MM-DD形式）
     */
    filterAttendanceTableByDate(dateString) {
        if (!this.historyTableBody) return;

        // 選択された日付の勤怠データを取得
        const attendance = this.getAttendanceForDate(dateString);
        
        // 日付の詳細情報を取得
        const selectedDate = new Date(dateString);
        const isWeekend = selectedDate.getDay() === 0 || selectedDate.getDay() === 6;
        const isHoliday = this.isHoliday(selectedDate);
        
        // テーブルをクリア
        this.historyTableBody.innerHTML = '';

        if (attendance && attendance.clockInTime && attendance.clockOutTime) {
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
        const workingTime = (attendance.clockInTime && attendance.clockOutTime)
            ? TimeUtils.calculateWorkingTime(attendance.clockInTime, attendance.clockOutTime)
            : '';

            // 遅刻・早退・残業・深夜の表示（0:00形式に統一）
            const lateDisplay = attendance.lateMinutes > 0 ? formatMinutesToTime(attendance.lateMinutes) : '0:00';
            const earlyLeaveDisplay = attendance.earlyLeaveMinutes > 0 ? formatMinutesToTime(attendance.earlyLeaveMinutes) : '0:00';
            const overtimeDisplay = attendance.overtimeMinutes > 0 ? formatMinutesToTime(attendance.overtimeMinutes) : '0:00';
            const nightWorkDisplay = attendance.nightShiftMinutes > 0 ? formatMinutesToTime(attendance.nightShiftMinutes) : '0:00';

            // ステータス表示
            let status = attendance.clockInTime && attendance.clockOutTime ? '退勤済み' : '';

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

            // クリックイベントを追加
            row.addEventListener('click', () => {
                this.showAttendanceDetail(attendance);
            });

            this.historyTableBody.appendChild(row);
        } else {
            // 勤怠データがない場合
            const row = document.createElement('tr');
            
            // ステータスを日付の種類に応じて設定
            let status = '';
            if (isHoliday) {
                status = '';
            } else if (isWeekend) {
                status = '';
            }

            row.innerHTML = `
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td>${status}</td>
            `;
            this.historyTableBody.appendChild(row);
        }
    }

    /**
     * 勤怠詳細表示
     * @param {Object} record - 勤怠記録
     */
    showAttendanceDetail(record) {
        // モーダルの要素を取得
        const modal = document.getElementById('attendanceDetailModal');
        if (!modal) {
            console.error('勤怠詳細モーダルが見つかりません');
            return;
        }

        // 基本情報を設定
        const isConfirmed = !!(record.clockInTime && record.clockOutTime);
        document.getElementById('detailDate').textContent = isConfirmed ? (record.attendanceDate || '') : '';
        
        const clockInTime = isConfirmed && record.clockInTime ? 
            new Date(record.clockInTime).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'}) : '';
        const clockOutTime = isConfirmed && record.clockOutTime ? 
            new Date(record.clockOutTime).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'}) : '';
        
        document.getElementById('detailClockIn').textContent = clockInTime;
        document.getElementById('detailClockOut').textContent = clockOutTime;

        // 勤務時間計算
        const workingTime = (isConfirmed && record.clockInTime && record.clockOutTime)
            ? TimeUtils.calculateWorkingTime(record.clockInTime, record.clockOutTime)
            : '';
        document.getElementById('detailWorkingTime').textContent = workingTime;

        // ステータス設定（未確定は空白）
        let status = (isConfirmed) ? '退勤済み' : '';
        document.getElementById('detailStatus').textContent = status;

        // 詳細情報を設定
        const lateDisplay = (isConfirmed && record.lateMinutes > 0) ? formatMinutesToTime(record.lateMinutes) : '';
        const earlyLeaveDisplay = (isConfirmed && record.earlyLeaveMinutes > 0) ? formatMinutesToTime(record.earlyLeaveMinutes) : '';
        const overtimeDisplay = (isConfirmed && record.overtimeMinutes > 0) ? formatMinutesToTime(record.overtimeMinutes) : '';
        const nightWorkDisplay = (isConfirmed && record.nightShiftMinutes > 0) ? formatMinutesToTime(record.nightShiftMinutes) : '';

        document.getElementById('detailLate').textContent = lateDisplay;
        document.getElementById('detailEarlyLeave').textContent = earlyLeaveDisplay;
        document.getElementById('detailOvertime').textContent = overtimeDisplay;
        document.getElementById('detailNightWork').textContent = nightWorkDisplay;

        // 備考設定
        const notes = record.notes || '特記事項はありません';
        document.getElementById('detailNotes').textContent = notes;

        // モーダルを表示
        const modalInstance = new bootstrap.Modal(modal);
        modalInstance.show();
    }

    /**
     * 勤怠情報レンダリング
     */
    renderAttendanceInfo(attendance) {
        if (!attendance) return '';

        const clockInTime = attendance.clockInTime ? 
            new Date(attendance.clockInTime).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'}) : '-';
        const clockOutTime = attendance.clockOutTime ? 
            new Date(attendance.clockOutTime).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'}) : '-';

        return `
            <div class="attendance-info">
                <div class="clock-times">
                    <small>出勤: ${clockInTime}</small><br>
                    <small>退勤: ${clockOutTime}</small>
                </div>
            </div>
        `;
    }
}

// グローバルインスタンスを作成
window.historyScreen = new HistoryScreen();
