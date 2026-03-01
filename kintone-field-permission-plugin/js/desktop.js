(function (PLUGIN_ID) {
    'use strict';

    // プラグイン設定の取得
    const config = kintone.plugin.app.getConfig(PLUGIN_ID);
    if (!config || !config.permissionSettings) return;

    const permissionSettings = JSON.parse(config.permissionSettings);

    /**
     * 現在のユーザーが許可されているか確認する
     * @param {Object} setting 1行分の設定
     * @param {string} loginUserCode ログインユーザーコード
     * @param {Array<string>} userOrgCodes ユーザーの所属組織コード一覧
     * @returns {boolean}
     */
    const checkPermission = (setting, loginUserCode, userOrgCodes) => {
        const { orgCodes = [], userCodes = [] } = setting;
        const inOrg = orgCodes.some(code => userOrgCodes.includes(code));
        const inUser = userCodes.includes(loginUserCode);
        return inOrg || inUser;
    };

    /**
     * フィールドの表示・非表示を切り替える
     */
    const controlFieldVisibility = async (event) => {
        try {
            const loginUser = kintone.getLoginUser();
            const userResp = await kintone.api(kintone.api.url('/v1/user/organizations', false), 'GET', { code: loginUser.code });
            const userOrgCodes = userResp.organizationTitles.map(ot => ot.organization ? ot.organization.code : ot.code);

            permissionSettings.forEach(setting => {
                const { fieldCode, subFields = [] } = setting;
                const hasPermission = checkPermission(setting, loginUser.code, userOrgCodes);

                if (!hasPermission) {
                    if (subFields.length === 0) {
                        // フィールド全体を非表示
                        kintone.app.record.setFieldShown(fieldCode, false);
                    } else {
                        // 特定の列のみを非表示
                        subFields.forEach(sf => {
                            kintone.app.record.setFieldShown(sf, false);
                        });
                    }
                } else {
                    // 許可されている場合は表示を確実にする（念のため）
                    if (subFields.length === 0) {
                        kintone.app.record.setFieldShown(fieldCode, true);
                    } else {
                        subFields.forEach(sf => {
                            kintone.app.record.setFieldShown(sf, true);
                        });
                    }
                }
            });
        } catch (error) {
            console.error('[Field Permission Plugin] Error:', error);
        }
        return event;
    };

    const events = [
        'app.record.detail.show',
        'app.record.create.show',
        'app.record.edit.show',
        'app.record.index.edit.show'
    ];

    kintone.events.on(events, controlFieldVisibility);

})(kintone.$PLUGIN_ID);
