(function () {
    'use strict';

    // モバイル版のイベントのみに限定
    const events = [
        'mobile.app.record.create.show',
        'mobile.app.record.edit.show'
    ];

    kintone.events.on(events, function (event) {
        const fullUrl = window.location.href;

        const getParamAggressive = (name) => {
            // URL全体から指定されたパラメータを探す
            // ?name=value, &name=value, #name=value のいずれにも対応
            const patterns = [
                new RegExp('[\\?&]' + name + '=([^&#]*)'),
                new RegExp('#.*[\\?&]' + name + '=([^&#]*)'),
                new RegExp('#' + name + '=([^&#]*)')
            ];

            for (const pattern of patterns) {
                const match = fullUrl.match(pattern);
                if (match) {
                    try {
                        return decodeURIComponent(match[1].replace(/\+/g, " "));
                    } catch (e) {
                        return match[1];
                    }
                }
            }
            return null;
        };

        const carName = getParamAggressive('car');

        if (carName) {
            alert('車両：' + carName + ' を取得しました');
            const record = event.record;
            const targetFieldCode = 'ナンバー';

            if (record[targetFieldCode]) {
                record[targetFieldCode].value = carName;
                record[targetFieldCode].lookup = true;
            } else {
                alert('失敗：フィールドコード「' + targetFieldCode + '」が見つかりません');
            }
        }

        return event;
    });

    // ---------------------------------------------------------------
    // モバイル版フィールド表示制御 (ATTAZoo代替機能)
    // ---------------------------------------------------------------
    const visibilityEvents = [
        'mobile.app.record.create.show',
        'mobile.app.record.edit.show',
        'mobile.app.record.create.change.報告種別',
        'mobile.app.record.edit.change.報告種別'
    ];

    kintone.events.on(visibilityEvents, function (event) {
        const record = event.record;
        const reportType = record['報告種別'].value;

        // 制御対象のフィールドコード定義
        const fieldEndMeter = '運転終了時メーター距離';
        const fieldsForAfter = [ // 運転後に不要なもの
            '行先',
            '運転開始時メーター距離',
            '日常点検' // グループ
        ];

        // 初期化：すべて表示させておく（トラブル防止）
        kintone.mobile.app.record.setFieldShown(fieldEndMeter, true);
        fieldsForAfter.forEach(code => {
            kintone.mobile.app.record.setFieldShown(code, true);
        });

        // 分岐ロジック
        if (reportType === '運転前') {
            // 運転前なら「終了時メーター」を隠す
            kintone.mobile.app.record.setFieldShown(fieldEndMeter, false);

        } else if (reportType === '運転後') {
            // 運転後なら指定項目（行先、開始時メーター、日常点検グループ）を隠す
            fieldsForAfter.forEach(code => {
                kintone.mobile.app.record.setFieldShown(code, false);
            });
        }

        return event;
    });
})();
