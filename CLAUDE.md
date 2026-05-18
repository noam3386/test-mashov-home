# Family Dashboard — Multi-Tenant

דשבורד משפחתי עם תמיכה במשפחות מרובות. כל משפחה מתחברת עם Google, רואה רק את הנתונים שלה.

## Stack
- **Frontend**: React + TypeScript + Vite + Tailwind — נפרס ל-Firebase Hosting
- **Auth**: Firebase Authentication (Google sign-in)
- **DB**: Firestore — מבנה `/families/{familyId}/...`
- **Sync**: GitHub Actions — רץ כל שעה, מסנכרן משוב + Google Calendar לכל משפחה

## Firebase Project
- **Project ID**: `family-dashboard-67ac1`
- **Hosting URL**: `https://family-dashboard-67ac1.web.app`
- **Service Account**: `firebase-adminsdk-fbsvc@family-dashboard-67ac1.iam.gserviceaccount.com`

## Firestore Structure
```
/families/{familyId}/
  settings/mashov     ← פרטי משוב + calendarId (נכתב מהדפדפן)
  config/mashov       ← lastSyncAt, consecutiveFailures (נכתב רק מ-Admin SDK)
  members/{memberId}  ← name, role, color
  schoolUpdates/      ← ציונים, הודעות, התנהגות, שיעורי בית
  timetable/          ← מערכת שעות
  schedule/           ← יומן Google Calendar
  tasks/              ← משימות משפחתיות
```

## GitHub Secrets (ב-family-dashboard repo)
- `FIREBASE_SERVICE_ACCOUNT` — JSON של service account
- `VITE_FIREBASE_API_KEY` וכו׳ — config לבניית ה-frontend

## GitHub Actions
- **sync.yml** — סינכרון משוב + יומן, כל שעה
- **deploy.yml** — בניה + פריסה ל-Firebase Hosting, אוטומטי בכל push ל-main

## Architecture
```
main.tsx → useAuth() → אם לא מחובר: LoginPage (Google)
                     → אם מחובר: FamilyProvider(uid) → DashboardGrid | SettingsPage
```

- `FamilyContext` — מספק `familyId = auth.uid` לכל ה-tiles
- `useMembers` — קורא מ-`families/${familyId}/members`
- כל tile משתמש ב-`useFamilyId()` לבניית ה-path ב-Firestore

## מה עובד כבר
- [x] Login עם Google
- [x] Dashboard מלא (כל ה-tiles)
- [x] הגדרות — שמירת פרטי משוב + Calendar ID
- [x] GitHub Actions סינכרון מרובה-משפחות
- [x] Firestore rules מבודדות כל משפחה
- [x] Auto-deploy ב-push ל-main

## מה עדיין חסר / בעיות ידועות
- [ ] הדשבורד ריק עד שמגדירים הגדרות ורצים sync ראשון
- [ ] אין onboarding flow מונחה למשתמש חדש (אחרי login → הפנייה להגדרות)
- [ ] Google Calendar — המשתמש צריך לשתף ידנית עם service account
- [ ] אין ניהול משתמשים (הוספה/הסרה של משפחות) — כרגע כל מי שמתחבר עם Google נכנס

## ריפו קשור
- `noam3386/test-mashov-home` — הגרסה האישית המקורית (לא נוגעים בה)
- Branch עם כל השינויים: `claude/continue-previous-work-qRZoY`

## פקודות שימושיות
```bash
# פריסה ידנית
cd web && npm run build
firebase deploy --only hosting

# עדכון מהריפו המקורי
git fetch upstream claude/continue-previous-work-qRZoY
git merge upstream/claude/continue-previous-work-qRZoY && git push origin main
```
