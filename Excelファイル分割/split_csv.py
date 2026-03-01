import pandas as pd
import os
import math
import sys
sys.stdout.reconfigure(encoding='utf-8')
import shutil

# Configuration
print("★ DEBUG: Modified Script v2 STARTED ★")
print(f"★ CWD: {os.getcwd()} ★")
INPUT_FILE = 'AUBA_検索_不動産.csv' # Default fallback
LINES_PER_FILE = 100
OUTPUT_DIR = 'split_files'

def split_csv_to_excel():
    global INPUT_FILE, OUTPUT_DIR, BASE_NAME
    
    # Check for command line argument (Drag & Drop)
    if len(sys.argv) > 1:
        INPUT_FILE = sys.argv[1]
    
    # Check if input file exists
    if not os.path.exists(INPUT_FILE):
        print(f"Error: {INPUT_FILE} not found.")
        print("Usage: Drag and drop a CSV file onto run_split.bat")
        return

    # Dynamic configuration based on input file
    filename_no_ext = os.path.splitext(os.path.basename(INPUT_FILE))[0]
    BASE_NAME = filename_no_ext
    
    # Extract category from filename (e.g. "AUBA_検索_不動産" -> "不動産")
    # If there is an underscore, take the last part. Otherwise use the whole name.
    if '_' in filename_no_ext:
        category_name = filename_no_ext.split('_')[-1]
    else:
        category_name = filename_no_ext

    # Create output directory named after the category
    OUTPUT_DIR = os.path.join(os.path.dirname(INPUT_FILE), category_name)

    # Create output directory
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        print(f"Created directory: {OUTPUT_DIR}")

    print(f"Reading {INPUT_FILE}...")
    try:
        # Read CSV - attempting to detect encoding
        try:
             df = pd.read_csv(INPUT_FILE, encoding='utf-8')
        except UnicodeDecodeError:
             df = pd.read_csv(INPUT_FILE, encoding='cp932')
        
        total_rows = len(df)
        print(f"Total rows: {total_rows}")

        num_files = math.ceil(total_rows / LINES_PER_FILE)
        print(f"Splitting into {num_files} files...")

        for i in range(num_files):
            start_idx = i * LINES_PER_FILE
            end_idx = start_idx + LINES_PER_FILE
            
            chunk = df.iloc[start_idx:end_idx]
            
            # File naming: OriginalName_100.xlsx, OriginalName_200.xlsx ...
            suffix = (i + 1) * 100
            
            output_filename = f"{BASE_NAME}_{suffix}.xlsx"
            output_path = os.path.join(OUTPUT_DIR, output_filename)
            
            chunk.to_excel(output_path, index=False)
            print(f"Saved {output_path}")

        print("Done!")
        print("DEBUG: Step 1 Complete.", flush=True)

        # Automatically open the output folder
        # try:
        #     os.startfile(OUTPUT_DIR)
        #     print(f"Opened output folder: {OUTPUT_DIR}")
        # except Exception as e:
        #     print(f"Could not open folder automatically: {e}")

        print("DEBUG: Starting Drive Upload Sequence...", flush=True)

        # Interactive Upload -> Fully Automated Upload
        print("-" * 30)
        print("【Googleドライブへのアップロード】")
        
        target_dir = ""
        
        # 1. Detect Drive Root (G:\)
        drive_root = "G:\\"
        if os.path.exists(drive_root):
            # Find the "My Drive" equivalent folder (usually the first folder in G:)
            # This avoids hardcoding "マイドライブ" which can cause encoding issues
            try:
                drive_contents = os.listdir(drive_root)
                my_drive_path = None
                
                # Prioritize "マイドライブ" or "My Drive" if multiple exist
                for item in drive_contents:
                    full_path = os.path.join(drive_root, item)
                    if os.path.isdir(full_path):
                        if "マイドライブ" in item or "My Drive" in item:
                             my_drive_path = full_path
                             break
                
                # If no specific match, just take the first folder (usually only one exists in G:)
                if not my_drive_path and drive_contents:
                     for item in drive_contents:
                        full_path = os.path.join(drive_root, item)
                        if os.path.isdir(full_path):
                            my_drive_path = full_path
                            break
                
                if my_drive_path:
                    print(f"Googleドライブのルート検出: {my_drive_path}")
                    
                    # 2. Search for AUBA_Split in My Drive
                    search_target = "AUBA_Split"
                    try:
                        md_contents = os.listdir(my_drive_path)
                        for item in md_contents:
                            if item.lower() == search_target.lower():
                                target_dir = os.path.join(my_drive_path, item)
                                print(f"保存先フォルダを自動検出しました: {target_dir}")
                                break
                    except Exception as e:
                        print(f"マイドライブ内の検索エラー: {e}")
                else:
                    print("Gドライブ内にフォルダが見つかりませんでした。")

            except Exception as e:
                print(f"Gドライブ読み込みエラー: {e}")

        # Fallback to hardcoded attempts if dynamic failed
        if not target_dir:
            potential_targets = [
                r"G:\マイドライブ\AUBA_Split",
                r"G:\My Drive\AUBA_Split"
            ]
            for t in potential_targets:
                if os.path.exists(t):
                    target_dir = t
                    break

        if not target_dir:
            print("自動保存先が見つかりませんでした。")
            print("--------------------------------------------------")
            print("手動で保存先のGoogleドライブのフォルダ(例: G:\\マイドライブ\\...)を、")
            print("この画面にドラッグ＆ドロップしてエンターキーを押してください。")
            target_dir = input("保存先フォルダ: ").strip('"').strip("'").strip()
        
        if target_dir:
            if os.path.exists(target_dir):
                print(f"アップロード中...: {target_dir}")
                try:
                    # Construct destination path: target_dir / category_name
                    dest_path = os.path.join(target_dir, os.path.basename(OUTPUT_DIR))
                    
                    print(f"コピー元: {OUTPUT_DIR}")
                    print(f"コピー先: {dest_path}")
                    
                    # Use robocopy for robustness with network/virtual drives
                    import subprocess
                    
                    # robocopy source destination /E (recursive) /XO (exclude older) /R:1 (retry 1) /W:1 (wait 1s)
                    # Note on robocopy exit codes: 0-7 are success (0=no change, 1=copied, etc.)
                    # We wrap the paths in quotes implicitly by passing as list arguments
                    cmd = ['robocopy', OUTPUT_DIR, dest_path, '/E', '/XO', '/R:3', '/W:1']
                    
                    print(f"実行コマンド: {' '.join(cmd)}")
                    result = subprocess.run(cmd, capture_output=True, text=True, encoding='cp932')
                    
                    if result.returncode <= 7:
                        print(f"アップロード完了！: {dest_path}")
                        print("ログの一部:")
                        print('\n'.join(result.stdout.splitlines()[-5:]))
                    else:
                        print("Robocopyエラーが発生しました。")
                        print(result.stdout)
                        print(result.stderr)

                    # Also open the drive folder
                    try:
                        os.startfile(dest_path)
                    except:
                        pass
                        
                    print("次はブラウザでGASスクリプトを実行してください。")
                except Exception as e:
                    print(f"アップロードエラー: {e}")
                    import traceback
                    traceback.print_exc()

            else:
                 print(f"エラー: 指定されたフォルダ '{target_dir}' が見つかりませんでした。")
        else:
            print("アップロードをスキップしました。")

    except Exception as e:
        print(f"An error occurred: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    split_csv_to_excel()
