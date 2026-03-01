(function () {
    'use strict';

    // PC版のイベントのみに限定
    const events = [
        'app.record.create.show',
        'app.record.edit.show'
    ];

    kintone.events.on(events, function (event) {
        const url = window.location.href;

        const getParam = (name) => {
            const patterns = [
                new RegExp('[\\?&]' + name + '=([^&#]*)'),
                new RegExp('#.*[\\?&]' + name + '=([^&#]*)'),
                new RegExp('#' + name + '=([^&#]*)')
            ];

            for (const pattern of patterns) {
                const match = url.match(pattern);
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

        const carName = getParam('car');

        if (carName) {
            const record = event.record;
            const targetFieldCode = 'ナンバー';

            if (record[targetFieldCode]) {
                record[targetFieldCode].value = carName;
                record[targetFieldCode].lookup = true;
            }
        }

        return event;
    });
})();
