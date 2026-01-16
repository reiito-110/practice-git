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
        records.forEach(record => {
          const files = record[FILE_FIELD].value;
          if (files && files.length > 0) {
            files.forEach(file => {
              filesToDownload.push({
                recordId: record.$id.value,
                fileKey: file.fileKey,
                fileName: file.name
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
          } catch (e) {
            console.error(`ファイル(fileName: ${fileInfo.fileName}, fileKey: ${fileInfo.fileKey})のダウンロードに失敗しました。`, e);
            // 特定のファイルでエラーが起きても処理を続行する
          }
        }

        alert(`${downloadedCount} 件のファイルのダウンロードを開始しました。`);

      } catch (e) {
        console.error(e);
        alert('処理中にエラーが発生しました。コンソールを確認してください。');
      } finally {
        // 8. ボタンの状態を元に戻す
        button.disabled = false;
        button.innerText = '表示中の事業計画書をダウンロード';
      }
    };

    return event;
  });
})();