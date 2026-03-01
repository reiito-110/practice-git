@echo off
chcp 65001
echo Installing requirements...
pip install pandas openpyxl

echo ---------------------------------------------------
echo 1. Splitting CSV file...
echo ---------------------------------------------------
python split_csv.py "%~1"

echo.
echo ---------------------------------------------------
echo Done!
echo The split files are in a new folder named after the category (e.g. '不動産').
echo Please upload this folder to Google Drive and use the GAS script.
echo ---------------------------------------------------
echo.
echo Process completed. 
echo If there are any errors above, please take a screenshot.
pause
