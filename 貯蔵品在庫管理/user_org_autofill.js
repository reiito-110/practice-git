(function() {
  'use strict';

  // ▼▼▼ 自動入力の設定 ▼▼▼
  const AUTO_FILL_CONFIG = [
    {
      tableCode: 'レターパック',
      userField: '使用者_レタパ',       // ユーザー選択フィールド
      orgField: '組織選択_使用履歴レタパ' // 自動入力する組織選択フィールド
    },
    {
      tableCode: '使用履歴_印紙',
      userField: '使用者_印紙',
      orgField: '組織選択_使用履歴印紙'
    },
    {
      tableCode: '使用履歴_切手',
      userField: '使用者_切手',
      orgField: '組織選択_使用履歴切手'
    }
  ];

  // ▼▼▼ 除外する組織名のキーワード（これらを含む組織は自動入力しません） ▼▼▼
  // 組織変更があっても、ここに含まれる「役割名」などは除外され続けます
  const EXCLUDED_KEYWORDS = ['部門長', '役員', '☆', '管理職', '契約事務課'];

  // 監視するイベントを作成
  const changeEvents = [];
  AUTO_FILL_CONFIG.forEach(config => {
    changeEvents.push(`app.record.create.change.${config.userField}`);
    changeEvents.push(`app.record.edit.change.${config.userField}`);
  });

  kintone.events.on(changeEvents, (event) => {
    const row = event.changes.row;
    const fieldCode = event.type.split('.').pop();
    
    // どの設定に該当するか特定
    const config = AUTO_FILL_CONFIG.find(c => c.userField === fieldCode);
    if (!config) return event;

    const users = row.value[config.userField].value;
    
    // ユーザーがクリアされた場合は何もしない
    if (!users || users.length === 0) {
      return event;
    }

    const userCode = users[0].code;

    // 変更された行がテーブルの何行目かを特定
    const tableRows = event.record[config.tableCode].value;
    const rowIndex = tableRows.findIndex(r => r === row);
    
    if (rowIndex === -1) return event;

    // kintone APIでユーザーの所属組織を取得
    kintone.api(kintone.api.url('/v1/user/organizations', true), 'GET', { code: userCode })
      .then((resp) => {
        // 所属組織がある場合
        if (resp.organizationTitles.length > 0) {
          // 組織情報を抽出し、除外キーワードが含まれるものをフィルタリング
          let orgs = resp.organizationTitles
            .map((t) => t.organization)
            .filter((org) => {
              // 除外キーワードのいずれかが組織名に含まれていたら false (除外)
              return !EXCLUDED_KEYWORDS.some(keyword => org.name.includes(keyword));
            })
            .map((org) => ({
              code: org.code,
              name: org.name
            }));
          
          // 「課」が含まれる組織があれば、それらを優先してセットする（部などは除外）
          const sectionOrgs = orgs.filter(org => org.name.includes('課'));
          if (sectionOrgs.length > 0) {
            orgs = sectionOrgs;
          }

          // 現在の画面上のレコード情報を取得して更新
          const currentRecord = kintone.app.record.get();
          if (currentRecord) {
            const targetRow = currentRecord.record[config.tableCode].value[rowIndex];
            
            // 行が存在する場合、組織フィールドに値をセット
            if (targetRow) {
              // 組織フィールドが空の場合のみセットする
              const currentOrgs = targetRow.value[config.orgField].value;
              if (!currentOrgs || currentOrgs.length === 0) {
                targetRow.value[config.orgField].value = orgs;
                kintone.app.record.set(currentRecord);
              }
            }
          }
        }
      }).catch((err) => {
        console.error('組織情報の取得に失敗しました:', err);
      });

    return event;
  });
})();