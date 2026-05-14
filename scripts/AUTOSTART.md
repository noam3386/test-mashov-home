# הרצה אוטומטית של סינכרון הדשבורד

## הרצה ידנית (בדיקה)
```bash
cd scripts
node run.js
```

---

## Windows — הרצה אוטומטית עם הפעלת המחשב

1. לחץ `Win+R` → הקלד `shell:startup` → Enter
2. צור קובץ חדש בשם `dashboard-sync.bat` עם התוכן:
```bat
@echo off
cd /d "C:\נתיב\לתיקייה\test-mashov-home\scripts"
node run.js
```
3. שמור — הסקריפט ירוץ אוטומטית בכל הפעלה

---

## Mac — הרצה אוטומטית עם הפעלת המחשב

צור קובץ `~/Library/LaunchAgents/com.family.dashboard.plist`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.family.dashboard</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>/נתיב/לתיקייה/test-mashov-home/scripts/run.js</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>WorkingDirectory</key>
  <string>/נתיב/לתיקייה/test-mashov-home/scripts</string>
</dict>
</plist>
```
הפעל:
```bash
launchctl load ~/Library/LaunchAgents/com.family.dashboard.plist
```

---

## לוגים
הסקריפט מדפיס כל פעולה עם שעה בעברית:
```
[08:00:01] 📅  מסנכרן יומן Google...
[08:00:03] ✅  יומן: 55 אירועים עודכנו
[08:00:03] 🏫  מסנכרן מחוון...
[08:00:05] ✅  מחוון uid_aviv: 3 רשומות חדשות
[08:00:05] 💤  רץ ברקע — השאר חלון זה פתוח
```
