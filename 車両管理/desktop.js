(function() {
  'use strict';

  // レコード追加画面が表示された時のイベント
  kintone.events.on('app.record.create.show', function(event) {
    // 1. URLからパラメータ「car」を取得
    const urlParams = new URLSearchParams(window.location.search);
    const carName = urlParams.get('car'); 

    // 2. パラメータが存在する場合のみ処理
    if (carName) {
      const record = event.record;
      // ドロップダウンのフィールドコード「車両」に値をセット
      // URLで指定した文字列が選択肢に存在しないとエラーになるので注意
      record['車両'].value = decodeURIComponent(carName);
    }

    return event;
  });
})();
