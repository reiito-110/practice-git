/* global kintone */
(function () {
  'use strict';

  // 対象の一覧名
  const VIEW_NAME = '経理課確認';
  // 添付ファイルフィールドのフィールドコード
  const FILE_FIELD = '事業計画書_0';
  // ボタン表示を許可するユーザーの氏名リスト
  // const ALLOWED_USER_NAMES = ['伊藤伶', '丸目真', '高橋佳穂里', '駄原レイ', '渋谷浩司', '生田目明信'];

  /**
   * XMLHttpRequestを使用してファイルをダウンロードし、Blobとして返します。
   * ※kintone.proxyはバイナリデータを文字列化して破損させるため、XHRを使用します。
   * @param {string} fileKey - ダウンロードするファイルのfileKey。
   * @returns {Promise<Blob>} ファイルのBlobオブジェクト。
   */
  const downloadFile = (fileKey) => {
    return new Promise((resolve, reject) => {
      const url = kintone.api.url('/k/v1/file.json', true) + '?fileKey=' + fileKey;
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url);
      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      xhr.responseType = 'blob';
      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve(xhr.response);
        } else {
          reject(new Error(`Download failed. Status: ${xhr.status}`));
        }
      };
      xhr.onerror = () => {
        reject(new Error('Network error during download.'));
      };
      xhr.send();
    });
  };

  /**
   * Blobオブジェクトをファイルとしてクライアントサイドで保存します。
   * @param {Blob} blob - 保存するBlobオブジェクト。
   * @param {string} fileName - 保存するファイル名。
   */
  const saveAs = (blob, fileName) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  kintone.events.on('app.record.index.show', function (event) {
    // 1. 対象の一覧画面でなければ処理を終了
    if (event.viewName !== VIEW_NAME) {
      return event;
    }

    // 権限チェック: ログインユーザーの氏名が許可リストに含まれていない場合は終了
    // const loginUser = kintone.getLoginUser();
    // if (!ALLOWED_USER_NAMES.includes(loginUser.name)) {
    //   return event;
    // }

    // 2. ボタンが既に存在すれば処理を終了（多重描画防止）
    if (document.getElementById('download-files-btn')) {
      return event;
    }

    // 3. ボタンの作成
    const button = document.createElement('button');
    button.id = 'download-files-btn';
    button.innerText = '事業計画書ダウンロード';
    button.style.marginLeft = '10px';
    button.classList.add('kintoneplugin-button-normal');

    // 一覧のヘッダーメニュー部分にボタンを追加
    kintone.app.getHeaderMenuSpaceElement().appendChild(button);

    // 4. ボタンクリック時の処理 (event.records を利用)
    button.onclick = async () => {
      const records = event.records;

      if (records.length === 0) {
        alert('一覧にレコードが表示されていません。');
        return;
      }

      if (!confirm(`販売決済日から一覧を絞りましたか？現在表示されている ${records.length} 件のレコードから添付ファイルをダウンロードします。よろしいですか？`)) {
        return;
      }
      button.innerText = 'ダウンロード中...';

      try {
        const filesToDownload = [];
        const processedKeys = new Set(); // 重複チェック用
        const targetPropertyNames = []; // 出力用リスト
        const skippedPropertyNames = []; // 重複スキップ用リスト

        records.forEach(record => {
          const files = record[FILE_FIELD].value;
          if (files && files.length > 0) {
            // 物件名と号室を取得
            const propertyName = record['物件名'] ? record['物件名'].value : '';
            const roomNumber = record['号室'] ? record['号室'].value : '';

            // 重複チェック用のキー生成（全角・半角スペースを削除）
            const uniqueKey = (propertyName + roomNumber).replace(/\s+/g, '');

            // 既に処理済みの物件＋号室ならスキップ
            if (uniqueKey && processedKeys.has(uniqueKey)) {
              skippedPropertyNames.push(propertyName + roomNumber);
              return;
            }
            // 未処理ならキーを登録
            if (uniqueKey) {
              processedKeys.add(uniqueKey);
              targetPropertyNames.push(propertyName + roomNumber);
            }

            files.forEach(file => {
              // ファイル名の生成: 物件名＋号室.拡張子
              let fileName = file.name;
              if (propertyName || roomNumber) {
                const extension = file.name.lastIndexOf('.') !== -1 ? file.name.substring(file.name.lastIndexOf('.')) : '';
                fileName = propertyName + roomNumber + '号室' + extension;
              }
              filesToDownload.push({
                recordId: record.$id.value,
                fileKey: file.fileKey,
                fileName: fileName
              });
            });
          }
        });
        
        if (filesToDownload.length === 0) {
          alert('表示されているレコードにダウンロード対象のファイルが見つかりませんでした。');
          return;
        }

        let downloadedCount = 0;
        for (let i = 0; i < filesToDownload.length; i++) {
          const fileInfo = filesToDownload[i];
          button.innerText = `ファイル取得中... (${i + 1}/${filesToDownload.length})`;
          try {
            const fileBlob = await downloadFile(fileInfo.fileKey);
            saveAs(fileBlob, fileInfo.fileName);
            downloadedCount++;

            // 10件ごとに長めの待機時間を設ける（ブラウザの制限回避）
            if ((i + 1) % 10 === 0 && (i + 1) < filesToDownload.length) {
              await new Promise(resolve => setTimeout(resolve, 3000));
            } else {
              // 連続処理による負荷軽減のためわずかに待機
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          } catch (e) {
            console.error(`ファイル(fileName: ${fileInfo.fileName}, fileKey: ${fileInfo.fileKey})のダウンロードに失敗しました。`, e);
            // 特定のファイルでエラーが起きても処理を続行する
          }
        }

        let resultMessage = `${downloadedCount} 件のファイルのダウンロードを開始しました。\n\n【保存した物件】\n${targetPropertyNames.join('\n')}`;
        if (skippedPropertyNames.length > 0) {
          resultMessage += `\n\nーーーーーーーーー\n重複が確認された物件\n${skippedPropertyNames.join('\n')}`;
        }

        // 結果表示用のカスタムダイアログを作成（alertの文字数制限回避のため）
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;justify-content:center;align-items:center;';
        
        const dialog = document.createElement('div');
        dialog.style.cssText = 'background:white;padding:20px;border-radius:5px;width:600px;max-width:90%;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 4px 6px rgba(0,0,0,0.1);';
        
        const messageArea = document.createElement('div');
        messageArea.style.cssText = 'overflow-y:auto;margin-bottom:20px;white-space:pre-wrap;font-size:14px;line-height:1.5;border:1px solid #ccc;padding:10px;background:#f9f9f9;';
        messageArea.textContent = resultMessage;
        
        const closeButton = document.createElement('button');
        closeButton.innerText = '閉じる';
        closeButton.className = 'kintoneplugin-button-normal';
        closeButton.style.alignSelf = 'center';
        closeButton.style.width = '120px';
        closeButton.onclick = () => document.body.removeChild(overlay);
        
        dialog.appendChild(messageArea);
        dialog.appendChild(closeButton);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

      } catch (e) {
        console.error(e);
        alert('処理中にエラーが発生しました。コンソールを確認してください。');
      } finally {
        // 8. ボタンの状態を元に戻す
        button.disabled = false;
        button.innerText = '事業計画書ダウンロード';
      }
    };

    return event;
  });
})();