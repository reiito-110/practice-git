# PCキッティング効率化ツール群

Windows PCのセットアップ（キッティング）作業を自動化するためのPowerShellスクリプト集と、それらを簡単に実行するためのGUIランチャーです。

## 機能概要
- **キッティングランチャー (`kitting_launcher.ps1`)**: 各種自動化スクリプトを選択して一括実行できるGUIツール。
- **アプリ自動インストール**: Chrome、Slack、Zoomなどの一括インストール（Winget利用）。
- **Windows設定最適化**: タスクバーのカスタマイズ、不要な標準アプリの削除、Chromeの既定ブラウザ設定など。
- **環境整備**: プリンタードライバーのインストール、Outlookの自動構成、Chrome起動時URLのバッチ設定。

## 技術仕様
- **主要ファイル**: `kitting_launcher.ps1`, `install_apps_and_tweaks.ps1`, `customize_taskbar_settings.ps1` など
- **言語**: PowerShell
- **権限**: 管理者権限での実行を推奨。

## AIへの改修指示用メモ
- 新しいキッティング項目を追加する場合は、`kitting_launcher.ps1` 内の `$scripts` 配列に項目とファイル名を追加してください。
- 内部で `winget` や `reg` コマンドを使用しているため、環境依存の挙動に注意が必要です。
