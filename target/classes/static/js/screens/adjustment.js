/**
 * 打刻修正申請画面モジュール
 */
class AdjustmentScreen {
    constructor() {
        this.adjustmentForm = null;
        this.adjustmentDate = null;
        this.adjustmentClockIn = null;
        this.adjustmentClockOut = null;
        this.adjustmentReason = null;
    }

    /**
     * 初期化
     */
    init() {
        this.initializeElements();
        this.setupEventListeners();
        this.setDefaultDate();
    }

    /**
     * DOM要素の初期化
     */
    initializeElements() {
        this.adjustmentForm = document.getElementById('adjustmentForm');
        this.adjustmentDate = document.getElementById('adjustmentDate');
        this.adjustmentClockIn = document.getElementById('adjustmentClockIn');
        this.adjustmentClockOut = document.getElementById('adjustmentClockOut');
        this.adjustmentReason = document.getElementById('adjustmentReason');
    }

    /**
     * イベントリスナー設定
     */
    setupEventListeners() {
        if (this.adjustmentForm) {
            this.adjustmentForm.addEventListener('submit', (e) => this.handleAdjustmentSubmit(e));
        }

        // 日付変更時のバリデーション
        if (this.adjustmentDate) {
            this.adjustmentDate.addEventListener('change', () => this.validateAdjustmentDate());
        }

        // 時刻変更時のバリデーション
        if (this.adjustmentClockIn) {
            this.adjustmentClockIn.addEventListener('change', () => this.validateTimeRange());
        }

        if (this.adjustmentClockOut) {
            this.adjustmentClockOut.addEventListener('change', () => this.validateTimeRange());
        }
    }

    /**
     * デフォルト日付設定（今日の日付）
     */
    setDefaultDate() {
        if (this.adjustmentDate) {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            this.adjustmentDate.value = `${year}-${month}-${day}`;
        }
    }

    /**
     * 打刻修正申請送信
     * @param {Event} e - イベント
     */
    async handleAdjustmentSubmit(e) {
        e.preventDefault();

        const date = this.adjustmentDate.value;
        const clockIn = this.adjustmentClockIn.value;
        const clockOut = this.adjustmentClockOut.value;
        const reason = this.adjustmentReason.value;

        if (!date || !clockIn || !clockOut || !reason) {
            this.showAlert('すべての項目を入力してください', 'warning');
            return;
        }

        // 日付の妥当性チェック
        if (!this.validateAdjustmentDate()) {
            return;
        }

        // 時刻の妥当性チェック
        if (!this.validateTimeRange()) {
            return;
        }

        if (!window.currentEmployeeId) {
            this.showAlert('従業員IDが取得できません', 'danger');
            return;
        }

        try {
            const data = await fetchWithAuth.handleApiCall(
                () => fetchWithAuth.post('/api/attendance/adjustment-request', {
                    employeeId: window.currentEmployeeId,
                    date: date,
                    clockInTime: clockIn,
                    clockOutTime: clockOut,
                    reason: reason
                }),
                '打刻修正申請に失敗しました'
            );

            this.showAlert(data.message, 'success');
            this.adjustmentForm.reset();
            this.setDefaultDate();
        } catch (error) {
            this.showAlert(error.message, 'danger');
        }
    }

    /**
     * 修正日付のバリデーション
     * @returns {boolean} - バリデーション結果
     */
    validateAdjustmentDate() {
        const date = this.adjustmentDate.value;
        if (!date) return true;

        const selectedDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 未来の日付は選択不可
        if (selectedDate > today) {
            this.showAlert('修正対象日は今日以前の日付を選択してください', 'warning');
            this.adjustmentDate.focus();
            return false;
        }

        // 30日より前の日付は選択不可（業務ルール）
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        
        if (selectedDate < thirtyDaysAgo) {
            this.showAlert('修正対象日は30日以内の日付を選択してください', 'warning');
            this.adjustmentDate.focus();
            return false;
        }

        return true;
    }

    /**
     * 時刻範囲のバリデーション
     * @returns {boolean} - バリデーション結果
     */
    validateTimeRange() {
        const clockIn = this.adjustmentClockIn.value;
        const clockOut = this.adjustmentClockOut.value;

        if (!clockIn || !clockOut) {
            return true; // まだ入力中
        }

        // 時刻を比較
        if (clockOut <= clockIn) {
            this.showAlert('退勤時刻は出勤時刻より後の時刻を入力してください', 'warning');
            this.adjustmentClockOut.focus();
            return false;
        }

        // 勤務時間が長すぎないかチェック（24時間以内）
        const clockInTime = new Date(`2000-01-01T${clockIn}:00`);
        const clockOutTime = new Date(`2000-01-01T${clockOut}:00`);
        const workHours = (clockOutTime - clockInTime) / (1000 * 60 * 60);

        if (workHours > 24) {
            this.showAlert('勤務時間が24時間を超えています。時刻を確認してください', 'warning');
            return false;
        }

        return true;
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
window.adjustmentScreen = new AdjustmentScreen();
