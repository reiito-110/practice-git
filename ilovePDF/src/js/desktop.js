(function (PLUGIN_ID) {
    'use strict';

    // --- Main Event Listener ---
    kintone.events.on('app.record.detail.show', function (event) {
        const headerSpace = kintone.app.record.getHeaderMenuSpaceElement();
        if (!headerSpace) return event;
        if (headerSpace.querySelector('.pdf-merge-plugin-btn')) return event;

        const btn = document.createElement('button');
        btn.innerText = 'PDF結合';
        btn.className = 'pdf-merge-plugin-btn kintoneplugin-button-normal';
        btn.onclick = function () {
            showMergeModal(event.record);
        };

        headerSpace.appendChild(btn);
        return event;
    });

    // --- Modal UI & Logic ---
    function showMergeModal(record) {
        // Determine attachment fields in the record
        const attachmentFields = [];
        for (const key in record) {
            if (record[key].type === 'FILE' && record[key].value.length > 0) {
                // Check if any file is PDF
                const pdfs = record[key].value.filter(f => f.contentType === 'application/pdf');
                if (pdfs.length > 0) {
                    attachmentFields.push({ code: key, label: key, files: pdfs });
                }
            }
        }

        // Create Modal Elements
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'pdf-merge-modal-overlay';

        const modalContent = document.createElement('div');
        modalContent.className = 'pdf-merge-modal-content';

        const title = document.createElement('h2');
        title.innerText = 'PDF結合';
        modalContent.appendChild(title);

        // Inner Div for padding/layout
        const innerDiv = document.createElement('div');
        innerDiv.className = 'pdf-merge-inner';
        modalContent.appendChild(innerDiv);

        // Section 1: Record Files
        const sec1 = document.createElement('div');
        sec1.className = 'pdf-merge-section';
        sec1.innerHTML = '<h3>レコード内のPDF</h3>';

        const fileList = document.createElement('div');
        fileList.className = 'pdf-merge-file-list';

        if (attachmentFields.length === 0) {
            fileList.innerText = 'レコード内にPDFファイルが見つかりません。';
        } else {
            attachmentFields.forEach(field => {
                field.files.forEach(file => {
                    const row = document.createElement('div');
                    row.className = 'pdf-merge-file-row';

                    const chk = document.createElement('input');
                    chk.type = 'checkbox';
                    chk.value = JSON.stringify({ type: 'record', fileKey: file.fileKey, name: file.name });
                    chk.checked = true; // Default checked

                    const label = document.createElement('label');
                    label.innerText = `${file.name} (${field.code})`;
                    label.prepend(chk);

                    row.appendChild(label);
                    fileList.appendChild(row);
                });
            });
        }
        sec1.appendChild(fileList);
        innerDiv.appendChild(sec1);

        // Section 2: Local Files
        const sec2 = document.createElement('div');
        sec2.className = 'pdf-merge-section';
        sec2.innerHTML = '<h3>ローカルファイルを追加</h3>';

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'application/pdf';
        fileInput.multiple = true;
        sec2.appendChild(fileInput);
        innerDiv.appendChild(sec2);

        // Actions
        const actionDiv = document.createElement('div');
        actionDiv.className = 'pdf-merge-actions';

        const runBtn = document.createElement('button');
        runBtn.innerText = '結合してダウンロード';
        runBtn.className = 'kintoneplugin-button-dialog-ok';

        const cancelBtn = document.createElement('button');
        cancelBtn.innerText = 'キャンセル';
        cancelBtn.className = 'kintoneplugin-button-dialog-cancel';
        cancelBtn.style.marginLeft = '10px';

        actionDiv.appendChild(runBtn);
        actionDiv.appendChild(cancelBtn);
        innerDiv.appendChild(actionDiv);

        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);

        // Event Handlers
        cancelBtn.onclick = function () {
            document.body.removeChild(modalOverlay);
        };

        runBtn.onclick = async function () {
            // Collect selected files
            const selectedFiles = [];

            // Record files
            const checks = fileList.querySelectorAll('input[type="checkbox"]:checked');
            checks.forEach(c => selectedFiles.push(JSON.parse(c.value)));

            // Local files
            if (fileInput.files.length > 0) {
                for (let i = 0; i < fileInput.files.length; i++) {
                    selectedFiles.push({ type: 'local', file: fileInput.files[i], name: fileInput.files[i].name });
                }
            }

            if (selectedFiles.length === 0) {
                alert('結合するファイルが選択されていません。');
                return;
            }

            showSpinner();
            try {
                await executeMerge(selectedFiles);
                document.body.removeChild(modalOverlay);
            } catch (e) {
                console.error(e);
                alert('エラーが発生しました: ' + e.message);
            } finally {
                hideSpinner();
            }
        };
    }

    // --- Logic ---
    async function executeMerge(files) {
        const { PDFDocument } = PDFLib;
        const mergedPdf = await PDFDocument.create();

        for (const item of files) {
            let arrayBuffer;
            if (item.type === 'record') {
                const resp = await kintone.api(kintone.api.url('/k/v1/file', true), 'GET', { fileKey: item.fileKey });
                arrayBuffer = await (new Response(resp)).arrayBuffer();
            } else if (item.type === 'local') {
                arrayBuffer = await item.file.arrayBuffer();
            }

            if (arrayBuffer) {
                const pdf = await PDFDocument.load(arrayBuffer);
                const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            }
        }

        const mergedPdfBytes = await mergedPdf.save();
        const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'merged_' + new Date().getTime() + '.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // --- Custom Spinner ---
    function showSpinner() {
        let spinner = document.getElementById('pdf-merge-spinner');
        if (!spinner) {
            spinner = document.createElement('div');
            spinner.id = 'pdf-merge-spinner';
            spinner.innerHTML = '<div class="pdf-spinner-content">処理中...</div>';
            document.body.appendChild(spinner);
        }
        spinner.style.display = 'flex';
    }

    function hideSpinner() {
        const spinner = document.getElementById('pdf-merge-spinner');
        if (spinner) {
            spinner.style.display = 'none';
        }
    }

})(kintone.$PLUGIN_ID);
