(function (PLUGIN_ID) {
    'use strict';

    const $tableBody = document.getElementById('permission-table-body');
    const $addRowBtn = document.getElementById('add-row-button');
    const $saveBtn = document.getElementById('save-button');
    const $cancelBtn = document.getElementById('cancel-button');

    let allFields = {};
    let tableFields = [];
    let orgList = [];
    let userList = [];

    // 設定の読み込み
    const loadConfig = () => {
        const config = kintone.plugin.app.getConfig(PLUGIN_ID);
        if (config.permissionSettings) {
            const settings = JSON.parse(config.permissionSettings);
            settings.forEach(setting => {
                addRow(setting);
            });
        } else {
            addRow();
        }
    };

    // メタデータの取得
    const fetchMetadata = async () => {
        try {
            const appId = kintone.app.getId();
            const appResp = await kintone.api(kintone.api.url('/k/v1/app/form/fields', false), 'GET', { app: appId });
            allFields = appResp.properties;
            tableFields = Object.values(allFields)
                .filter(p => !['RECORD_NUMBER', '__ID__', '__REVISION__', 'STATUS', 'STATUS_ASSIGNEE', 'CATEGORY', 'SPACER', 'HR'].includes(p.type))
                .map(p => ({ label: p.label, code: p.code, type: p.type, fields: p.fields }));

            const orgResp = await kintone.api(kintone.api.url('/v1/organizations', false), 'GET', { size: 100 });
            orgList = orgResp.organizations.map(o => ({ name: o.name, code: o.code }));

            const userResp = await kintone.api(kintone.api.url('/v1/users', false), 'GET', { size: 100 });
            userList = userResp.users.map(u => ({ name: u.name, code: u.code }));

            loadConfig();
        } catch (error) {
            console.error('Metadata Fetch Error:', error);
            alert('データの同期に失敗しました。');
        }
    };

    // 検索可能プルダウン（フィールド選択用）の作成
    const createSearchableSelect = (items, initialValue = '', onSelect = () => { }) => {
        const container = document.createElement('div');
        container.className = 'searchable-select-container';

        const display = document.createElement('div');
        display.className = 'searchable-select-display kintoneplugin-select';
        const selectedItem = items.find(i => i.code === initialValue);
        display.textContent = selectedItem ? `${selectedItem.label} (${selectedItem.code})` : '-- 選択してください --';

        const dropdown = document.createElement('div');
        dropdown.className = 'searchable-select-dropdown';
        dropdown.style.display = 'none';

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'kintoneplugin-input-text searchable-select-search';
        searchInput.placeholder = 'フィールドを検索...';

        const list = document.createElement('div');
        list.className = 'searchable-select-list';

        const renderList = (filterText = '') => {
            list.innerHTML = '';
            items.filter(i => i.label.toLowerCase().includes(filterText.toLowerCase()) || i.code.toLowerCase().includes(filterText.toLowerCase()))
                .forEach(i => {
                    const item = document.createElement('div');
                    item.className = 'searchable-select-item';
                    item.textContent = `${i.label} (${i.code})`;
                    item.onclick = () => {
                        display.textContent = item.textContent;
                        container.dataset.value = i.code;
                        dropdown.style.display = 'none';
                        onSelect(i.code);
                    };
                    list.appendChild(item);
                });
        };

        display.onclick = () => {
            const isVisible = dropdown.style.display === 'block';
            dropdown.style.display = isVisible ? 'none' : 'block';
            if (!isVisible) searchInput.focus();
        };

        searchInput.oninput = (e) => renderList(e.target.value);
        renderList();

        dropdown.appendChild(searchInput);
        dropdown.appendChild(list);
        container.appendChild(display);
        container.appendChild(dropdown);
        container.dataset.value = initialValue;

        // 外側をクリックで閉じる
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) dropdown.style.display = 'none';
        });

        return container;
    };

    // タグ表示付き検索リスト（組織・ユーザー用）
    const createTagSearchableList = (allItems, type, initialSelectedCodes = []) => {
        const container = document.createElement('div');
        container.className = 'tag-searchable-list';

        let selectedCodes = [...initialSelectedCodes];

        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'tags-container';

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'kintoneplugin-input-text search-input';
        searchInput.placeholder = `${type === 'org' ? '組織' : 'ユーザー'}を検索...`;

        const itemList = document.createElement('div');
        itemList.className = 'item-list';

        const updateTags = () => {
            tagsContainer.innerHTML = '';
            selectedCodes.forEach(code => {
                const item = allItems.find(i => i.code === code);
                if (!item) return;

                const tag = document.createElement('div');
                tag.className = 'tag-item';
                tag.textContent = item.name;

                const removeBtn = document.createElement('span');
                removeBtn.className = 'tag-remove';
                removeBtn.textContent = '×';
                removeBtn.onclick = () => {
                    selectedCodes = selectedCodes.filter(c => c !== code);
                    updateTags();
                    renderItems(searchInput.value);
                };

                tag.appendChild(removeBtn);
                tagsContainer.appendChild(tag);
            });
            container.dataset.selected = JSON.stringify(selectedCodes);
        };

        const renderItems = (filterText = '') => {
            itemList.innerHTML = '';
            const filtered = allItems.filter(i =>
                i.name.toLowerCase().includes(filterText.toLowerCase()) ||
                i.code.toLowerCase().includes(filterText.toLowerCase())
            );

            filtered.forEach(item => {
                const label = document.createElement('label');
                label.className = 'item-label';
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.value = item.code;
                cb.checked = selectedCodes.includes(item.code);

                cb.onchange = (e) => {
                    if (e.target.checked) {
                        if (!selectedCodes.includes(item.code)) selectedCodes.push(item.code);
                    } else {
                        selectedCodes = selectedCodes.filter(c => c !== item.code);
                    }
                    updateTags();
                };

                label.appendChild(cb);
                label.appendChild(document.createTextNode(` ${item.name}`));
                itemList.appendChild(label);
            });
        };

        searchInput.oninput = (e) => renderItems(e.target.value);

        updateTags();
        renderItems();

        container.appendChild(tagsContainer);
        container.appendChild(searchInput);
        container.appendChild(itemList);
        return container;
    };

    // サブフィールド制御UI用（+ボタン）
    const createSubFieldRow = (tableCode, selectedSubField = '') => {
        const div = document.createElement('div');
        div.className = 'sub-field-row';
        const select = document.createElement('select');
        select.className = 'kintoneplugin-select sub-field-select';

        const table = tableFields.find(t => t.code === tableCode);
        if (table && table.fields) {
            Object.values(table.fields).forEach(f => {
                const opt = document.createElement('option');
                opt.value = f.code;
                opt.textContent = `${f.label} (${f.code})`;
                if (f.code === selectedSubField) opt.selected = true;
                select.appendChild(opt);
            });
        }

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'remove-sub-field';
        delBtn.textContent = '-';
        delBtn.onclick = () => div.remove();

        div.appendChild(select);
        div.appendChild(delBtn);
        return div;
    };

    // 行の追加
    const addRow = (setting = {}) => {
        const tr = document.createElement('tr');

        // 1. 対象フィールド
        const tdField = document.createElement('td');
        tdField.className = 'kintoneplugin-table-td';

        const updateDetailUI = (fieldCode) => {
            detailContainer.innerHTML = '';
            const field = tableFields.find(f => f.code === fieldCode);
            if (field && field.type === 'SUBTABLE') {
                const radioAll = document.createElement('input');
                radioAll.type = 'radio';
                radioAll.name = `type-${tr.rowIndex}-${Math.random()}`; // ユニークにする
                radioAll.value = 'all';
                radioAll.checked = !setting.subFields || setting.subFields.length === 0;

                const labelAll = document.createElement('label');
                labelAll.className = 'radio-label';
                labelAll.appendChild(radioAll);
                labelAll.appendChild(document.createTextNode(' 全体'));

                const radioPart = document.createElement('input');
                radioPart.type = 'radio';
                radioPart.name = radioAll.name;
                radioPart.value = 'part';
                radioPart.checked = setting.subFields && setting.subFields.length > 0;

                const labelPart = document.createElement('label');
                labelPart.className = 'radio-label';
                labelPart.appendChild(radioPart);
                labelPart.appendChild(document.createTextNode(' 列指定'));

                const subFieldsDiv = document.createElement('div');
                subFieldsDiv.className = 'sub-fields-list';
                subFieldsDiv.style.display = radioPart.checked ? 'block' : 'none';

                const addSubFieldBtn = document.createElement('button');
                addSubFieldBtn.type = 'button';
                addSubFieldBtn.className = 'kintoneplugin-button-small';
                addSubFieldBtn.textContent = '+ 列を追加';
                addSubFieldBtn.onclick = () => subFieldsDiv.insertBefore(createSubFieldRow(fieldCode), addSubFieldBtn);

                radioAll.onchange = () => subFieldsDiv.style.display = 'none';
                radioPart.onchange = () => subFieldsDiv.style.display = 'block';

                detailContainer.appendChild(labelAll);
                detailContainer.appendChild(labelPart);
                detailContainer.appendChild(subFieldsDiv);

                // 先にボタンを追加
                subFieldsDiv.appendChild(addSubFieldBtn);

                if (setting.subFields) {
                    setting.subFields.forEach(sf => {
                        subFieldsDiv.insertBefore(createSubFieldRow(fieldCode, sf), addSubFieldBtn);
                    });
                }
            } else {
                detailContainer.textContent = 'フィールド全体を制御';
            }
        };

        const searchableSelect = createSearchableSelect(tableFields, setting.fieldCode, updateDetailUI);
        tdField.appendChild(searchableSelect);

        // 2. 詳細設定
        const tdDetail = document.createElement('td');
        tdDetail.className = 'kintoneplugin-table-td';
        const detailContainer = document.createElement('div');
        detailContainer.className = 'detail-container';
        tdDetail.appendChild(detailContainer);
        if (setting.fieldCode) updateDetailUI(setting.fieldCode);

        // 3. 組織
        const tdOrg = document.createElement('td');
        tdOrg.className = 'kintoneplugin-table-td';
        const orgSearch = createTagSearchableList(orgList, 'org', setting.orgCodes || []);
        tdOrg.appendChild(orgSearch);

        // 4. ユーザー
        const tdUser = document.createElement('td');
        tdUser.className = 'kintoneplugin-table-td';
        const userSearch = createTagSearchableList(userList, 'user', setting.userCodes || []);
        tdUser.appendChild(userSearch);

        // 5. 削除
        const tdDel = document.createElement('td');
        tdDel.className = 'kintoneplugin-table-td-blankspace';
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'remove-row-button';
        delBtn.textContent = '✖';
        delBtn.onclick = () => tr.remove();
        tdDel.appendChild(delBtn);

        tr.appendChild(tdField);
        tr.appendChild(tdDetail);
        tr.appendChild(tdOrg);
        tr.appendChild(tdUser);
        tr.appendChild(tdDel);
        $tableBody.appendChild(tr);
    };

    // 保存
    $saveBtn.onclick = () => {
        const settings = [];
        const rows = $tableBody.querySelectorAll('tr');

        for (const row of rows) {
            const fieldCode = row.querySelector('.searchable-select-container').dataset.value;
            if (!fieldCode) continue;

            const orgCodes = JSON.parse(row.querySelectorAll('.tag-searchable-list')[0].dataset.selected || '[]');
            const userCodes = JSON.parse(row.querySelectorAll('.tag-searchable-list')[1].dataset.selected || '[]');

            if (orgCodes.length === 0 && userCodes.length === 0) {
                alert('各行で、少なくとも1つの組織またはユーザーを選択してください。');
                return;
            }

            const subFields = [];
            const typeRadio = row.querySelector('input[type="radio"]:checked');
            if (typeRadio && typeRadio.value === 'part') {
                row.querySelectorAll('.sub-field-select').forEach(sel => {
                    if (sel.value) subFields.push(sel.value);
                });
            }

            settings.push({ fieldCode, orgCodes, userCodes, subFields });
        }

        if (settings.length === 0) {
            alert('設定を少なくとも1つ追加してください。');
            return;
        }

        kintone.plugin.app.setConfig({
            permissionSettings: JSON.stringify(settings)
        }, () => {
            alert('設定を保存しました。');
            window.location.href = '../../' + kintone.app.getId() + '/plugin/';
        });
    };

    $cancelBtn.onclick = () => {
        window.location.href = '../../' + kintone.app.getId() + '/plugin/';
    };

    $addRowBtn.onclick = () => addRow();

    fetchMetadata();

})(kintone.$PLUGIN_ID);
