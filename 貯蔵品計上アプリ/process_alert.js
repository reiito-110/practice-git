(function () {
    'use strict';

    /**
     * 貯蔵品計上アプリ プロセス管理入力漏れ防止スクリプト
     * 特定のステータス変更時に確認ダイアログを表示します。
     */
    kintone.events.on('app.record.detail.process.proceed', function (event) {
        const nextStatus = event.nextStatus.value;
        const action = event.action.value;

        // 条件：アクションが「管理者承認」かつ次のステータスが「管理職_確認中」の場合のみ実行
        if (action === '管理者承認' && nextStatus === '管理職_確認中') {
            const isProceed = window.confirm('実際在高タブの入力は完了しましたか？\n（入力漏れがある場合は「キャンセル」を押して内容を修正してください）');

            if (!isProceed) {
                // キャンセルが押された場合、ステータス更新を中断
                return false;
            }
        }

        return event;
    });
})();
