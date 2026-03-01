# AIニュース収集ダッシュボード

最新のAI関連ニュースをGoogle Newsから自動収集し、キーワードごとに整理して表示するWebダッシュボードです。

## 機能概要
- **リアルタイム検索**: 指定したキーワードに基づき、Google News RSSから最新記事を取得。
- **トレンド検知**: 特定のAI関連キーワード（GPT, LLM, Geminiなど）を含む記事を「Trending」として強調表示。
- **モダンなUI**: Streamlitを使用した、カード形式のレスポンシブなデザイン。

## 技術仕様
- **ファイル**: `app.py`
- **言語**: Python (Streamlit, feedparser)
- **実行方法**: `Start_Dashboard.bat` を実行（`streamlit run app.py`）。

## AIへの改修指示用メモ
- ニュースソースの変更や追加は `get_news` 関数内のURLを修正してください。
- デザイン（CSS）は `app.py` 冒頭の `st.markdown` 内で管理されています。
