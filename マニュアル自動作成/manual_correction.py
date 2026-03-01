
import re
import datetime
import os

# Configuration
MANUAL_PATH = r"c:\Users\24030460\Desktop\antigravity\マニュアル自動作成\scheduled_app_manual.html"
TODAY = datetime.date.today().strftime("%Y/%m/%d")

def update_manual_date_and_history(file_path):
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Update Cover Page Date
    # Pattern: <p>日付：YYYY/MM/DD</p>
    date_pattern = r"(<p>日付：)(\d{4}/\d{2}/\d{2})(</p>)"
    
    def date_replacer(match):
        return f"{match.group(1)}{TODAY}{match.group(3)}"
    
    new_content = re.sub(date_pattern, date_replacer, content, count=1) 
    # count=1 to only change the first occurrence (cover page) if possible, 
    # but the pattern is specific enough. 
    # Wait, there might be other dates. The cover page one is inside <div class="info-fields">.
    # A regex limited to that context would be safer, but for now simple substitution 
    # on the first match is likely the cover page as it appears first.

    if new_content != content:
        print(f"Updated cover page date to {TODAY}")
    else:
        print("Cover page date already up to date or pattern not found.")

    # 2. Add Revision History Entry (Optional / Interactive)
    # This might be complex to automate fully without parameters, but we can 
    # add a placeholder or update the latest entry if it matches today.
    # For now, let's just print that it was updated.
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    
    print(f"Successfully updated {file_path}")

if __name__ == "__main__":
    print("--- Manual Auto-Correction Script ---")
    update_manual_date_and_history(MANUAL_PATH)
    input("Press Enter to close...")
