(function() {
    'use strict';

    // =================================================================================
    // 【A. TIBOR金利更新機能】設定
    // =================================================================================
    // TIBOR金利を管理しているアプリのID
    const TIBOR_APP_ID = 1880;
    // TIBORアプリ内の日付フィールドコード (未使用だが設定として残す)
    const TIBOR_DATE_FIELD = '日付';
    // TIBOR UIを挿入する要素のID
    const TIBOR_HEADER_ID = 'tibor-header';

    // --- 1か月物 TIBOR ---
    // TIBORアプリ内の1か月物金利フィールドコード
    const TIBOR_RATE_FIELD_1M = '_1か月';
    // 借入アプリ内の1か月物TIBORを格納するフィールドコード
    const TIBOR_TARGET_FIELD_1M = 'TIBOR金利_1M';

    // --- 3か月物 TIBOR ---
    // TIBORアプリ内の3か月物金利フィールドコード
    const TIBOR_RATE_FIELD_3M = '_3か月';
    // 借入アプリ内の3か月物TIBORを格納するフィールドコード
    const TIBOR_TARGET_FIELD_3M = 'TIBOR金利_3M';

    // =================================================================================
    // 【B. 銀行別集計機能】設定
    // =================================================================================
    // 金融機関名フィールドコード
    const FIELD_CODE_BANK = '金融機関名＿借入中';
    // 確定返済日フィールドコード
    const FIELD_CODE_REPAY_DATE = '確定返済日';
    // 利息額フィールドコード
    const FIELD_CODE_INTEREST = '利息額';
    // 集計結果を挿入する要素のID
    const SUMMARY_CONTAINER_ID = 'bank-summary-container';
    // 全体を囲むアコーディオンコンテナのID
    const ACCORDION_ID = 'custom-accordion-wrapper';

    // =================================================================================
    // 【C. 権限制御】設定
    // =================================================================================
    // 機能を実行できるユーザーのログイン名または氏名
    const ALLOWED_USER_CODES = ['伊藤伶', '竹本新', '佐藤眞喜', '渋谷浩司', '阿保壱太', '駄原レイ', '西嶋秀太', '生田目明信', '高橋佳穂里', '渡邊莉央', '丸目真', ' 野中英樹', '吉年篤志'];
    // 機能を実行できるロールのコード
    const ALLOWED_ROLE_CODES = ['システム管理者']; 
    
    // =================================================================================
    // 【共通関数】現在のビューに表示されている全てのレコードを取得する
    // =================================================================================
    /**
     * 現在のビューのクエリを適用して、全レコードをAPI経由で取得します。
     * @param {number} appId - アプリID
     * @returns {Promise<Array<Object>>} - 全レコードの配列
     */
    async function fetchAllRecords(appId) {
        console.log("DEBUG: [FetchRecords] レコード取得開始。");
        // 1. ビューのクエリを取得
        let query = kintone.app.getQuery() || '';
        let allRecords = [];

        // 2. kintone.app.getQuery()にlimit/offsetが含まれている場合があるため、削除してクエリをクリーンアップ
        query = query.replace(/\s+(limit|offset)\s+\d+/gi, '').trim();

        let offset = 0;
        const limit = 500;
        // TIBOR更新と集計に必要なフィールドコード
        const fields = [
            '$id',
            FIELD_CODE_BANK,
            FIELD_CODE_REPAY_DATE,
            FIELD_CODE_INTEREST,
            TIBOR_TARGET_FIELD_1M,
            TIBOR_TARGET_FIELD_3M
        ];

        while (true) {
            // クリーンアップされたクエリに、ループ用のlimit/offsetを追加
            const params = {
                app: appId,
                // クエリが空の場合はスペースを追加しない
                query: `${query}${query ? ' ' : ''}limit ${limit} offset ${offset}`,
                fields: fields
            };

            try {
                const resp = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', params);

                allRecords = allRecords.concat(resp.records);

                if (resp.records.length < limit) {
                    break;
                }
                offset += limit;
            } catch (error) {
                console.error("ERROR: [FetchRecords] 全レコードの取得中にエラーが発生しました:", error);
                throw new Error("全レコードの取得に失敗しました。一覧画面のフィルタ条件を確認してください。");
            }
        }
        console.log(`DEBUG: [FetchRecords] 全レコード取得完了。件数: ${allRecords.length}`);
        return allRecords;
    }

    // =================================================================================
    // 【C. 権限制御】現在ログイン中のユーザーが許可されているか判定する
    // =================================================================================
    /**
     * ログインユーザーが許可されたユーザーコードまたはロールに属するかを判定します。（同期処理）
     * 氏名（Display Name）でのチェックを優先します。
     * @returns {boolean} - 許可されている場合は true
     */
    function isUserAllowed() { 
        const loginUser = kintone.getLoginUser();

        if (!loginUser || !loginUser.code) {
            console.error("ERROR: [Auth] ユーザー情報が取得できませんでした。");
            return false;
        }

        const userCode = loginUser.code;
        const userName = loginUser.name; 
        const roleCodes = loginUser.roles ? loginUser.roles.map(role => role.code) : [];
        console.log(`DEBUG: [Auth] 権限チェック開始。ユーザーコード: ${userCode}、氏名: ${userName}、所属ロール: ${roleCodes.join(', ')}`);

        // 1. 氏名によるチェック
        if (ALLOWED_USER_CODES.includes(userName)) {
            console.log("DEBUG: [Auth] 氏名による認証成功。");
            return true;
        }

        // 2. ユーザーコードによるチェック
        if (ALLOWED_USER_CODES.includes(userCode)) {
            console.log("DEBUG: [Auth] ユーザーコードによる認証成功。");
            return true;
        }

        // 3. ロールコードによるチェック
        const hasPermittedRole = roleCodes.some(role => ALLOWED_ROLE_CODES.includes(role));
        if (hasPermittedRole) {
            console.log("DEBUG: [Auth] ロールコードによる認証成功。");
            return true;
        }

        console.log("DEBUG: [Auth] 権限チェック失敗。許可されたユーザーコード・氏名・ロールコードに一致しません。");
        return false;
    }

    // =================================================================================
    // 一覧画面表示イベント
    // =================================================================================
    kintone.events.on('app.record.index.show', async function(event) {
        console.log("DEBUG: [Event] app.record.index.show イベント開始。");

        const headerSpaceElement = kintone.app.getHeaderSpaceElement();
        let allViewRecords = []; // APIから取得した全件格納用

        // 0. UI挿入要素のチェック
        if (!headerSpaceElement) {
            console.error("ERROR: [UI] ヘッダースペース要素が取得できませんでした。");
            window.alert('この機能は一覧画面上部の「ヘッダー部分のスペース」にUIを挿入します。アプリ設定でスペースが有効になっているか確認してください。');
            return event;
        }

        // 1. 権限制御：許可されたユーザーでなければ処理を中断
        const isAllowed = isUserAllowed(); // 権限チェックは同期実行
        if (!isAllowed) {
            console.log("DEBUG: [Event] ユーザーが許可されていないため、処理を中断します。");
            
            // 既にUI要素があれば削除して表示させない (権限がないユーザーにUIを見せない)
            const accordion = document.getElementById(ACCORDION_ID);
            if (accordion) {
                accordion.remove();
            }
            return event; // 処理を中断
        }
        console.log("DEBUG: [Event] 権限チェック通過。UI生成に進みます。");


        // 2. アコーディオンコンポーネントの作成（初回のみ）
        if (!document.getElementById(ACCORDION_ID)) {
            const accordionWrapper = document.createElement('div');
            accordionWrapper.id = ACCORDION_ID;
            // スタイル
            accordionWrapper.style.border = '1px solid #e0e0e0';
            accordionWrapper.style.borderRadius = '6px';
            accordionWrapper.style.marginBottom = '10px';
            accordionWrapper.style.backgroundColor = '#ffffff';

            // sessionStorageから前回の開閉状態を取得 (デフォルトは閉じる: 'none')
            const lastDisplayState = sessionStorage.getItem('customDashboardAccordion') || 'block'; // デフォルトを開くに変更
            const initialIcon = (lastDisplayState === 'block') ? '▲' : '▼';
            
            // UIのHTMLを挿入
            accordionWrapper.innerHTML = `
                <div id="accordion-header" style="padding: 12px; cursor: pointer; background-color: #f5f5f5; font-weight: bold; display: flex; justify-content: space-between; align-items: center; border-radius: 6px 6px 0 0;">
                    <span>📈 kintone改修機能ダッシュボード (集計・更新)</span>
                    <span id="accordion-icon">${initialIcon}</span>
                </div>
                <div id="accordion-content" style="padding: 10px; display: ${lastDisplayState};">
                    <div id="${TIBOR_HEADER_ID}" style="padding: 8px 0; border-bottom: 1px solid #ddd; margin-bottom: 15px;">
                        <!-- TIBOR UIがここに挿入される -->
                    </div>
                    <div id="${SUMMARY_CONTAINER_ID}" style="padding: 8px 0;">
                        <!-- 集計結果がここに挿入される -->
                    </div>
                </div>
            `;
            
            // 権限通過後にUIを挿入
            headerSpaceElement.appendChild(accordionWrapper);
            console.log("DEBUG: [UI] アコーディオンコンポーネントを初回作成しました。");

            // アコーディオン開閉ロジック
            const header = document.getElementById('accordion-header');
            const content = document.getElementById('accordion-content');
            const icon = document.getElementById('accordion-icon');

            header.addEventListener('click', () => {
                const isHidden = content.style.display === 'none';
                const newState = isHidden ? 'block' : 'none';
                
                content.style.display = newState;
                icon.textContent = isHidden ? '▲' : '▼';
                
                // 状態をsessionStorageに保存
                sessionStorage.setItem('customDashboardAccordion', newState);
            });
        }
        // UIコンポーネント取得
        const tiborDiv = document.getElementById(TIBOR_HEADER_ID);
        const summaryDiv = document.getElementById(SUMMARY_CONTAINER_ID);


        // -----------------------------------------------------------------
        // 3. 全レコードの取得 (全件取得関数を使用)
        // -----------------------------------------------------------------
        try {
            const loadingHtml = '<div style="color:#2563eb; font-weight:bold;">⚙️ 全レコードを取得して集計準備中...</div>';
            summaryDiv.innerHTML = loadingHtml; // 集計コンテナにローディング表示

            // 現在の一覧の絞り込み条件を適用した全レコードを取得
            allViewRecords = await fetchAllRecords(kintone.app.getId());
            summaryDiv.innerHTML = ''; // 取得完了後、ローディングをクリア

            if (allViewRecords.length === 0) {
                 summaryDiv.innerHTML = '<div style="color:#d97706;">🚨 現在のビューには集計対象のレコードがありません。</div>';
            }
        } catch (e) {
            console.error("ERROR: [Event] レコード取得フェーズでキャッチされたエラー:", e.message);
            summaryDiv.innerHTML = `<div style="color:#ef4444;">❌ レコード取得エラー: ${e.message}</div>`;
        }

        // -----------------------------------------------------------------
        // A. TIBOR金利更新機能の実行
        // -----------------------------------------------------------------
        console.log("DEBUG: [TIBOR] TIBOR金利更新機能の処理を開始します。");

        // TIBOR UIの作成とイベントリスナーの設定 (UI生成は初回のみなので再チェック)
        if (!document.getElementById('tiborSaveBtn_ALL')) {

            tiborDiv.innerHTML = `
                <div style="display:flex; flex-wrap: wrap; gap: 20px; align-items:center;">
                    <!-- 1M TIBOR -->
                    <div>
                        <label for="tiborInput_1M" style="font-weight:bold;">TIBOR金利（1M）:</label>
                        <input type="number" id="tiborInput_1M" step="0.001" style="width:80px; text-align:right; margin-left:8px; border: 1px solid #ccc; padding: 4px;">
                        <span id="tiborStatus_1M" style="margin-left:10px; color:#666; font-size: small;"></span>
                    </div>

                    <!-- 3M TIBOR -->
                    <div>
                        <label for="tiborInput_3M" style="font-weight:bold;">TIBOR金利（3M）:</label>
                        <input type="number" id="tiborInput_3M" step="0.001" style="width:80px; text-align:right; margin-left:8px; border: 1px solid #ccc; padding: 4px;">
                        <span id="tiborStatus_3M" style="margin-left:10px; color:#666; font-size: small;"></span>
                    </div>

                    <!-- 統合された更新ボタン -->
                    <button id="tiborSaveBtn_ALL" class="kintoneplugin-button-normal" style="margin-left:10px; font-weight: bold; background-color: #2563eb; color: white; border: none; padding: 6px 12px; border-radius: 4px;">1M 3M 更新</button>
                </div>
            `;
            console.log("DEBUG: [TIBOR] TIBOR UIを生成しました。");

            const tiborInput_1M = document.getElementById('tiborInput_1M');
            const tiborStatus_1M = document.getElementById('tiborStatus_1M');
            const tiborInput_3M = document.getElementById('tiborInput_3M');
            const tiborStatus_3M = document.getElementById('tiborStatus_3M');
            const tiborSaveBtn_ALL = document.getElementById('tiborSaveBtn_ALL');

            // 4. 最新のTIBOR金利を取得
            try {
                console.log(`DEBUG: [TIBOR] TIBORアプリ (ID: ${TIBOR_APP_ID}) から最新金利を取得中...`);
                const query = `order by ${TIBOR_DATE_FIELD} desc limit 1`;
                const resp = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', {
                    app: TIBOR_APP_ID,
                    query: query,
                    fields: [TIBOR_RATE_FIELD_1M, TIBOR_RATE_FIELD_3M, TIBOR_DATE_FIELD] // 日付フィールドも取得
                });

                if (resp.records.length > 0) {
                    const latestRecord = resp.records[0];
                    const rate1M = latestRecord[TIBOR_RATE_FIELD_1M]?.value || '';
                    const rate3M = latestRecord[TIBOR_RATE_FIELD_3M]?.value || '';
                    const date = latestRecord[TIBOR_DATE_FIELD]?.value ? ` (${latestRecord[TIBOR_DATE_FIELD].value})` : '';

                    tiborInput_1M.value = rate1M;
                    tiborStatus_1M.textContent = `最新値（自動取得）${date}`;
                    tiborInput_3M.value = rate3M;
                    tiborStatus_3M.textContent = `最新値（自動取得）${date}`;
                    console.log("DEBUG: [TIBOR] 最新金利の自動取得に成功しました。");
                } else {
                    tiborStatus_1M.textContent = 'TIBOR金利が見つかりません';
                    tiborStatus_3M.textContent = 'TIBOR金利が見つかりません';
                    console.log("DEBUG: [TIBOR] TIBORアプリにレコードがありませんでした。");
                }
            } catch (e) {
                console.error("ERROR: [TIBOR] TIBOR金利の取得エラー:", e);
                tiborStatus_1M.textContent = 'TIBOR金利の取得に失敗しました';
                tiborStatus_3M.textContent = 'TIBOR金利の取得に失敗しました';
            }

            // 5. 「1M 3M 更新」ボタン押下で両方を反映 (全レコード更新ロジック)
            tiborSaveBtn_ALL.addEventListener('click', async () => {
                const val_1M = tiborInput_1M.value;
                const val_3M = tiborInput_3M.value;

                // 入力値チェック（両方必須）
                if (!val_1M || !val_3M) {
                    window.alert('1Mと3Mの両方の金利を入力してください。');
                    return;
                }

                // レコード存在チェック
                if (allViewRecords.length === 0) {
                    window.alert('更新対象のレコードがありません。');
                    return;
                }
                console.log(`DEBUG: [TIBOR_UPDATE] レコード更新処理開始。対象件数: ${allViewRecords.length}`);

                // UIの更新
                tiborStatus_1M.textContent = '更新中...';
                tiborStatus_3M.textContent = '更新中...';
                tiborSaveBtn_ALL.disabled = true;

                try {
                    const recordsToUpdate = allViewRecords.map(r => ({
                        id: r.$id.value,
                        record: {
                            [TIBOR_TARGET_FIELD_1M]: { value: val_1M },
                            [TIBOR_TARGET_FIELD_3M]: { value: val_3M }
                        }
                    }));

                    // 100件ずつのバッチ更新処理 (kintone APIの制限に対応)
                    const BATCH_SIZE = 100;
                    for (let i = 0; i < recordsToUpdate.length; i += BATCH_SIZE) {
                        const chunk = recordsToUpdate.slice(i, i + BATCH_SIZE);
                        console.log(`DEBUG: [TIBOR_UPDATE] バッチ処理中: ${i + 1}件目から${Math.min(i + BATCH_SIZE, recordsToUpdate.length)}件目`);
                        await kintone.api(kintone.api.url('/k/v1/records', true), 'PUT', { app: kintone.app.getId(), records: chunk });
                    }

                    tiborStatus_1M.textContent = '✅ 更新完了';
                    tiborStatus_3M.textContent = '✅ 更新完了';
                    window.alert('TIBOR金利の更新が完了しました。一覧を再読み込みします。');

                    // 更新成功後、一覧を再読み込み
                    location.reload();

                } catch (e) {
                    console.error("ERROR: [TIBOR_UPDATE] レコードの更新エラー:", e);
                    // エラー詳細メッセージを取得
                    const errorMessage = e.message || `エラーコード: ${e.error?.code || '不明'}`;
                    
                    tiborStatus_1M.textContent = '❌ 更新に失敗しました';
                    tiborStatus_3M.textContent = '❌ 更新に失敗しました';
                    window.alert(`レコードの更新に失敗しました。\n${errorMessage}`);

                } finally {
                    tiborSaveBtn_ALL.disabled = false;
                }
            });
        }


        // -----------------------------------------------------------------
        // B. 銀行別利息額集計機能の実行 (全レコードを使用)
        // -----------------------------------------------------------------
        console.log("DEBUG: [Summary] 銀行別集計処理を開始します。");

        // allViewRecordsが空の場合は、エラーメッセージが表示されているためスキップ
        if (allViewRecords.length === 0) {
            console.log("DEBUG: [Summary] 集計対象レコードが0件のため、集計をスキップします。");
            // レコード取得エラーがない場合は集計ロジックをスキップするため、ここで抜ける
            if (summaryDiv.innerHTML === '') {
                summaryDiv.innerHTML = '<div style="color:#d97706;">🚨 現在のビューには集計対象のレコードがありません。</div>';
            }
            return event;
        }

        const recordsToAggregate = allViewRecords;

        // 2. 動的な条件判定と集計
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // *** 修正: 翌月の初日を取得（この日以降の確定返済日を持つレコードが対象） ***
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth(); // 0-based
        // 翌月の1日を取得
        const startOfNextMonth = new Date(currentYear, currentMonth + 1, 1);
        startOfNextMonth.setHours(0, 0, 0, 0);
        
        console.log(`DEBUG: [Summary] 本日の日付: ${today.toISOString().split('T')[0]}, 翌月の初日（集計開始日）: ${startOfNextMonth.toISOString().split('T')[0]}`);


        const interestSummary = {};

        recordsToAggregate.forEach(function(record) {
            const repayDateValue = record[FIELD_CODE_REPAY_DATE].value;
            let isTarget = false; // true: 翌月以降の日付

            const isNoDate = !repayDateValue;

            if (repayDateValue) {
                // kintoneの日付形式は YYYY-MM-DD
                const targetDate = new Date(repayDateValue);
                targetDate.setHours(0, 0, 0, 0);

                // *** 修正: 確定返済日が翌月の1日以降であること (未来の値でも今月内は除外) ***
                if (targetDate >= startOfNextMonth) {
                    isTarget = true;
                }
            }

            // 確定返済日がない、または翌月以降の日付であるレコードのみを対象とする
            if (isNoDate || isTarget) {
                const bankName = record[FIELD_CODE_BANK].value;
                // 値がない場合は0として処理
                const interestAmount = Number(record[FIELD_CODE_INTEREST].value || 0);

                if (interestSummary[bankName]) {
                    interestSummary[bankName] += interestAmount;
                } else {
                    interestSummary[bankName] = interestAmount;
                }
            }
        });

        // 3. 集計結果を配列に変換し、合計利息額で降順ソート
        const sortedSummary = Object.keys(interestSummary).map(bankName => {
            return {
                bankName: bankName,
                totalInterest: interestSummary[bankName]
            };
        });

        // 合計利息額（totalInterest）を基準に降順（大きい順）にソート
        sortedSummary.sort((a, b) => b.totalInterest - a.totalInterest);

        // 4. 集計結果のHTMLテーブル作成と挿入
        const currentMonthDisplay = new Date().toLocaleString('ja-JP', { month: 'long' });
        const nextMonthDisplay = new Date(startOfNextMonth).toLocaleString('ja-JP', { month: 'long' });

        let tableHtml = '<h3 style="font-size: 1.1rem; font-weight: bold; margin-bottom: 10px;">🏦 銀行別・借入中利息額 集計結果</h3>';
        // *** 修正: 集計対象の条件を明確に記載 ***
        tableHtml += `<p style="font-size: 12px; color: #4b5563; margin-bottom: 10px;">
            現在のビューのレコード <strong style="color: #10b981;">${recordsToAggregate.length.toLocaleString()}</strong> 件を対象に集計しました。<br>
            <strong style="color: #2563eb;">[集計対象]:</strong> 確定返済日が<strong style="font-weight: bold;">未記入</strong>、または<strong style="font-weight: bold;">${nextMonthDisplay}以降</strong>のレコード
        </p>`;
        tableHtml += '<table style="border-collapse: collapse; width: 100%; border: 1px solid #ddd; font-size: 0.9rem;">';
        tableHtml += '<tr style="background-color: #f0f8ff; font-weight: bold;">';
        tableHtml += '<th style="border: 1px solid #ddd; padding: 10px; text-align: left; width: 60%;">金融機関名</th>';
        tableHtml += '<th style="border: 1px solid #ddd; padding: 10px; text-align: right; width: 40%;">合計利息額 (円)</th>';
        tableHtml += '</tr>';

        // ソートされた配列を使用してテーブルを生成
        sortedSummary.forEach(function(item) {
            // カンマ区切りで整形
            const totalInterest = item.totalInterest.toLocaleString();

            tableHtml += '<tr>';
            tableHtml += '<td style="border: 1px solid #ddd; padding: 8px;">' + item.bankName + '</td>';
            tableHtml += '<td style="border: 1px solid #ddd; padding: 8px; text-align: right;">' + totalInterest + '</td>';
            tableHtml += '</tr>';
        });

        tableHtml += '</table>';
        summaryDiv.innerHTML += tableHtml; 
        console.log("DEBUG: [Summary] 集計結果のテーブルを挿入しました。");

        return event;
    });
})();