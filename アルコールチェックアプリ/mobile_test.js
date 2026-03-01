(function () {
    'use strict';

    // モバイル版の追加・編集画面で動作するかテスト
    const events = [
        'mobile.app.record.create.show',
        'mobile.app.record.edit.show'
    ];

    kintone.events.on(events, function (event) {
        alert('【テスト】モバイル版でJavaScriptが正常に動作しています！');
        return event;
    });
})();
