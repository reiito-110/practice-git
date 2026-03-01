from pypdf import PdfReader
import sys

def extract_text(pdf_path):
    try:
        reader = PdfReader(pdf_path)
        text = ""
        for i, page in enumerate(reader.pages):
            text += f"\n--- Page {i+1} ---\n"
            text += page.extract_text()
        return text
    except Exception as e:
        return f"Error: {e}"

if __name__ == "__main__":
    path = r"c:\Users\24030460\Desktop\antigravity\マニュアル自動作成\予定管理マニュアル\20250915_予定アプリマニュアル_Ver1.pdf"
    print(extract_text(path))
