import streamlit as st
import feedparser
import urllib.parse
from datetime import datetime
import re

# -----------------------------------------------------------------------------
# Configuration & Styling
# -----------------------------------------------------------------------------
st.set_page_config(
    page_title="AIニュース収集ダッシュボード",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for "Calm White" Design & Clickable Cards
st.markdown("""
<style>
    /* Global Background */
    .stApp {
        background-color: #f9fafb; /* Very light gray/white */
        color: #333333;
    }

    /* Card Container Grid */
    .news-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 20px;
        padding: 20px 0;
    }

    /* News Card Styling */
    a.news-card {
        text-decoration: none;
        color: inherit;
        display: block;
        background-color: #ffffff;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        border: 1px solid #eaeaea;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }

    /* Hover Effect */
    a.news-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        border-color: #d1d5db;
    }

    /* Typography */
    .news-title {
        font-size: 1.1em;
        font-weight: 700;
        margin-bottom: 10px;
        color: #111827;
        line-height: 1.4;
    }

    .news-date {
        font-size: 0.85em;
        color: #6b7280;
        margin-bottom: 12px;
    }

    .news-summary {
        font-size: 0.9em;
        color: #4b5563;
        line-height: 1.5;
        flex-grow: 1; /* Pushes content to fill space */
    }
    
    /* Trend Highlight */
    .trend-highlight {
        border-left: 4px solid #6366f1; /* Indigo accent */
        background-color: #fefeff;
    }
    
    .trend-badge {
        display: inline-block;
        background-color: #e0e7ff;
        color: #4338ca;
        font-size: 0.75em;
        padding: 2px 8px;
        border-radius: 9999px;
        margin-bottom: 8px;
        font-weight: 600;
    }

    /* Sidebar Styling */
    section[data-testid="stSidebar"] {
        background-color: #ffffff;
        border-right: 1px solid #f0f0f0;
    }
    
</style>
""", unsafe_allow_html=True)

# -----------------------------------------------------------------------------
# Functionality
# -----------------------------------------------------------------------------

def get_news(query):
    """
    Fetch news from Google News RSS based on the query.
    Using JP edition for Japanese context but respecting the query.
    """
    # URL encode the query
    encoded_query = urllib.parse.quote(query)
    # Construct RSS URL (Google News Japan)
    rss_url = f"https://news.google.com/rss/search?q={encoded_query}&hl=ja&gl=JP&ceid=JP:ja"
    
    feed = feedparser.parse(rss_url)
    return feed.entries

def is_trending(text):
    """
    Check if text contains trending AI keywords.
    """
    keywords = ["gpt", "llm", "gemini", "claude", "sora", "generative ai", "生成ai", "transformer", "neural"]
    text_lower = text.lower()
    for k in keywords:
        if k in text_lower:
            return True
    return False

def clean_html(raw_html):
    """Remove HTML tags from summary"""
    cleanr = re.compile('<.*?>')
    cleantext = re.sub(cleanr, '', raw_html)
    return cleantext

# -----------------------------------------------------------------------------
# App Layout
# -----------------------------------------------------------------------------

# Sidebar
with st.sidebar:
    st.header("🔍 検索設定")
    query = st.text_input("キーワードを入力", value="Artificial Intelligence")
    st.markdown("---")
    st.write("出典: Google News (RSS)")
    st.caption("※トレンド記事は強調表示されます")

# Main Content
st.title("📰 AIニュース収集ダッシュボード")

if query:
    with st.spinner(f"「{query}」のニュースを取得中..."):
        news_items = get_news(query)
    
    if news_items:
        st.write(f"取得件数: {len(news_items)} 件")
        
        # Build HTML for grid layout
        html_content = '<div class="news-grid">'
        
        for item in news_items:
            title = item.title
            link = item.link
            pub_date = item.published
            
            # Clean up date format if possible (optional simplification)
            try:
                dt = datetime(*item.published_parsed[:6])
                date_str = dt.strftime('%Y/%m/%d %H:%M')
            except:
                date_str = pub_date

            # Process summary (Google RSS often puts HTML in description)
            summary = clean_html(item.description)
            if len(summary) > 120:
                summary = summary[:120] + "..."
            
            # Check trend
            trend_class = "trend-highlight" if (is_trending(title) or is_trending(summary)) else ""
            trend_badge = '<div class="trend-badge">🔥 Trending</div>' if trend_class else ""

            # Create Card HTML
            card_html = f"""<a href="{link}" target="_blank" class="news-card {trend_class}"><div>{trend_badge}<div class="news-title">{title}</div><div class="news-date">📅 {date_str}</div><div class="news-summary">{summary}</div></div></a>"""
            html_content += card_html
            
        html_content += '</div>'
        
        # Render the grid
        st.markdown(html_content, unsafe_allow_html=True)
        
    else:
        st.warning("ニュースが見つかりませんでした。別のキーワードを試してください。")
else:
    st.info("サイドバーから検索キーワードを入力してください。")
