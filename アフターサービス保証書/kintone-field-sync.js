(() => {
  'use strict';

  // フィールドコードの設定
  const STRING_FIELD_CODE = '物件番号';
  const LOOKUP_FIELD_CODE = '物件番号_仕入融資アプリ';

  // レコード作成・編集画面のフィールド変更イベント
  const changeEvents = [
    'app.record.create.change.' + STRING_FIELD_CODE,
    'app.record.edit.change.' + STRING_FIELD_CODE
  ];

  kintone.events.on(changeEvents, (event) => {
    const record = event.record;
    record[LOOKUP_FIELD_CODE].value = record[STRING_FIELD_CODE].value;
    record[LOOKUP_FIELD_CODE].lookup = true;
    return event;
  });

  // レコード編集画面の表示イベント
  kintone.events.on('app.record.edit.show', (event) => {
    const record = event.record;

    // ルックアップフィールドに値がなく、文字列フィールドに値がある場合のみコピー
    if (!record[LOOKUP_FIELD_CODE].value && record[STRING_FIELD_CODE].value) {
      record[LOOKUP_FIELD_CODE].value = record[STRING_FIELD_CODE].value;
      record[LOOKUP_FIELD_CODE].lookup = true;
    }

    return event;
  });

})();
