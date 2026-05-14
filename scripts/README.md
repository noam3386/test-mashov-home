# Admin Scripts — Family Dashboard

סקריפטים שמאפשרים לנהל את Firestore ישירות דרך הצ'אט עם Claude (מהמחשב או הטלפון).

## הגדרה ראשונית

1. הורד Service Account מ-Firebase Console → Project Settings → Service accounts → **Generate new private key**
2. שמור את הקובץ כ: `scripts/serviceAccount.json` (מוגן ב-.gitignore)
3. התקן תלויות: `cd scripts && npm install`

## פקודות זמינות

### משימות
```bash
node list-tasks.js              # כל המשימות הפתוחות
node list-tasks.js done         # משימות שהושלמו
node list-tasks.js all          # הכל

node add-task.js "שם המשימה"
node add-task.js "שם המשימה" '{"priority":"high","dueDate":"2025-05-20","assignedTo":["uid_child1"]}'
```

### חברי משפחה
```bash
node list-members.js
node add-member.js <uid> <שם> <parent|child> [options-json]
```

### ציונים והודעות
```bash
node list-grades.js             # 10 ציונים אחרונים
node list-grades.js uid_child1  # ציונים של ילד ספציפי
node list-messages.js           # הודעות שלא נקראו
node list-messages.js false     # כל ההודעות
```

### Seed (פעם ראשונה בלבד)
```bash
node seed.js
```
