/**
 * メインアプリケーション
 * SPAの初期化と全体制御を行う
 */
class App {
    constructor() {
        this.isInitialized = false;
    }

    /**
     * アプリケーション初期化
     */
    async init() {
        if (this.isInitialized) return;

        console.log('勤怠管理システムを初期化しています...');

        try {
            // セッション情報を確認してユーザー情報を取得
            await this.checkAndUpdateUserInfo();

            // ログイン画面を初期化
            if (window.loginScreen) {
                await window.loginScreen.init();
            }

            // ルーターの初期化は既に完了している
            console.log('ルーターが初期化されました');

            // 管理者メニューの表示制御
            this.updateAdminMenu();

            this.isInitialized = true;
            console.log('勤怠管理システムの初期化が完了しました');
        } catch (error) {
            console.error('アプリケーション初期化エラー:', error);
            this.showError('アプリケーションの初期化に失敗しました');
        }
    }

    /**
     * セッション情報を確認してユーザー情報を更新
     */
    async checkAndUpdateUserInfo() {
        try {
            console.log('セッション情報を確認中...');
            const response = await fetchWithAuth.get('/api/auth/session');
            console.log('セッション確認レスポンス:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('セッション確認データ:', data);
                
                if (data.authenticated) {
                    console.log('セッション確認成功:', data);
                    console.log('取得した従業員ID:', data.employeeId, '型:', typeof data.employeeId);
                    this.updateUserInfo(data.username, data.employeeId);
                    return true;
                } else {
                    console.log('セッションが無効です');
                }
            } else {
                console.log('セッション確認失敗:', response.status, response.statusText);
                const errorText = await response.text();
                console.log('エラーレスポンス:', errorText);
            }
        } catch (error) {
            console.log('セッション確認エラー:', error);
        }
        return false;
    }

    /**
     * 管理者メニューの表示制御
     */
    updateAdminMenu() {
        const isAdmin = window.currentUser === 'admin';
        if (window.router) {
            window.router.toggleAdminMenu(isAdmin);
        }
    }

    /**
     * エラー表示
     * @param {string} message - エラーメッセージ
     */
    showError(message) {
        const alertContainer = document.getElementById('alertContainer');
        if (!alertContainer) return;

        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show';
        alertDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2"></i>${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        alertContainer.appendChild(alertDiv);

        // 10秒後に自動削除
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 10000);
    }

    /**
     * ユーザー情報更新
     * @param {string} username - ユーザー名
     * @param {number} employeeId - 従業員ID
     */
    updateUserInfo(username, employeeId) {
        console.log('ユーザー情報を更新:', { username, employeeId });
        
        window.currentUser = username;
        window.currentEmployeeId = employeeId;
        this.updateAdminMenu();
        
        // ユーザー名表示を更新
        const currentUserDisplay = document.getElementById('currentUserDisplay');
        if (currentUserDisplay) {
            currentUserDisplay.textContent = username || 'ユーザー名';
            console.log('ユーザー名表示を更新:', username);
        } else {
            console.error('currentUserDisplay要素が見つかりません');
        }
    }

    /**
     * ログアウト処理
     */
    async logout() {
        try {
            await fetchWithAuth.post('/api/auth/logout');
            
            window.currentUser = null;
            window.currentEmployeeId = null;
            this.updateAdminMenu();
            
            // ログイン画面に戻る
            if (window.loginScreen) {
                window.loginScreen.showLoginInterface();
            }
        } catch (error) {
            console.error('ログアウトエラー:', error);
            this.showError('ログアウト処理中にエラーが発生しました');
        }
    }
}

// グローバルアプリケーションインスタンスを作成
window.app = new App();

// DOM読み込み完了時にアプリケーションを初期化
document.addEventListener('DOMContentLoaded', async () => {
    await window.app.init();
});

// ページ離脱時の処理
window.addEventListener('beforeunload', () => {
    // 必要に応じてクリーンアップ処理を追加
    console.log('ページを離脱します');
});

// エラーハンドリング
window.addEventListener('error', (event) => {
    console.error('グローバルエラー:', event.error);
    if (window.app) {
        window.app.showError('予期しないエラーが発生しました');
    }
});

// 未処理のPromise拒否をキャッチ
window.addEventListener('unhandledrejection', (event) => {
    console.error('未処理のPromise拒否:', event.reason);
    if (window.app) {
        window.app.showError('処理中にエラーが発生しました');
    }
});
