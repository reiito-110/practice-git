(function() {
  'use strict';

  // 編集画面表示イベント
  kintone.events.on('app.record.edit.show', function(event) {
    
    // タブプラグインの描画が終わるのを少し待ってからボタンを配置する
    setTimeout(() => {
      const space = kintone.app.record.getSpaceElement('jump_and_add_button_space');
      if (!space) return;

      const createBtn = (label, color, tableIndex) => {
        const btn = document.createElement('button');
        btn.innerText = label;
        btn.style.cssText = `
          margin-right: 12px;
          padding: 10px 18px;
          background-color: ${color};
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: bold;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;

        btn.onclick = () => {
          // 1. 画面上の全テーブルを取得
          const tables = document.querySelectorAll('.subtable-gaia');
          const targetTable = tables[tableIndex];
          
          if (targetTable) {
            // 2. そのテーブル内の「＋」ボタンを探す
            const addButtons = targetTable.querySelectorAll('.add-row-image-gaia');
            const lastAddButton = addButtons[addButtons.length - 1];
            
            if (lastAddButton) {
              lastAddButton.click(); // 標準機能のクリックをシミュレート
              
              // 3. 行が増えるのを待ってからスクロール
              setTimeout(() => {
                const rows = targetTable.querySelectorAll('tr');
                const lastRow = rows[rows.length - 1];
                lastRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // 追加行をハイライト
                lastRow.style.backgroundColor = '#fff9c4';
                setTimeout(() => { lastRow.style.backgroundColor = ''; }, 800);
              }, 150);
            }
          }
        };
        return btn;
      };

      space.innerHTML = '';
      // タブ内でのテーブルの順番（上から 0, 1, 2）に合わせて指定
      space.appendChild(createBtn('＋ レタパ行追加', '#c0392b', 0));
      space.appendChild(createBtn('＋ 印紙行追加', '#27ae60', 1));
      space.appendChild(createBtn('＋ 切手行追加', '#e67e22', 2));
      
    }, 500); // 0.5秒待ってから実行（プラグインとのバッティング回避）

    return event;
  });
})();