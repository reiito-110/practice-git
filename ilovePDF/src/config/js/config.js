(function (PLUGIN_ID) {
  'use strict';

  const $submitBtn = document.getElementById('config_submit');
  const $cancelBtn = document.getElementById('config_cancel');

  $submitBtn.onclick = function () {
    // No config to save
    kintone.plugin.app.setConfig({}, function () {
      alert('設定を保存しました。');
      window.location.href = '../../admin/app/flow?app=' + kintone.app.getId();
    });
  };

  $cancelBtn.onclick = function () {
    window.history.back();
  };

})(kintone.$PLUGIN_ID);
