# יומן תוצאות בדיקות

מסמך זה מתעד בדיקות שבוצעו בפועל, תקלות שהתגלו, תיקונים שבוצעו, ומה עדיין פתוח. אין לסמן בדיקה כעוברת בלי פקודה, תוצאה או הוכחה ידנית.

## מקרא

- `PASS` - הבדיקה עברה.
- `FAIL` - הבדיקה נכשלה ונדרש תיקון.
- `BLOCKED` - לא ניתן היה להשלים את הבדיקה בגלל תלות חיצונית או סביבת הרצה.
- `FIXED` - תקלה שהתגלתה ותוקנה, עם בדיקה חוזרת שעברה.
- `OPEN` - תקלה שעדיין לא תוקנה.

## הרצה 2026-08-26

### סיכום

| בדיקה | סטטוס | תוצאה |
|---|---|---|
| Frontend unit tests | `PASS` | 1 suite, 2 tests עברו |
| Frontend production build במצב רגיל | `PASS` | נבנה בעבר עם אזהרות |
| Frontend production build במצב CI | `FIXED` | build עבר בהצלחה ללא אזהרות ESLint לאחר cleanup |
| Backend syntax checks | `PASS` | קבצי הליבה עברו `node --check` |
| Server dependency audit | `PASS` | `0 vulnerabilities` |
| Live API smoke test | `PASS` | Frontend `200`, products `200`, protected routes `401` |
| תרחיש משתמש מלא | `OPEN` | דורש חשבון משתמש, מנהל וסביבת DB יציבה |
| תשלום Stripe | `BLOCKED` | חסר `STRIPE_SECRET_KEY` |
| תשלום PayPal | `BLOCKED` | חסרים פרטי Sandbox |

## כשלי בדיקה פתוחים

### TEST-001 - CI build נכשל בגלל אזהרות ESLint

- **סטטוס:** `FIXED`
- **חומרה:** בינונית, חוסם אישור build נקי ל־production.
- **פקודה:** `CI=true npm --prefix client test -- --watchAll=false` ולאחר מכן `CI=true npm --prefix client run build`.
- **תוצאה:** בדיקות היחידה עברו, אבל ה־build נכשל כי `react-scripts` מתייחס לאזהרות ESLint כשגיאות במצב CI.
- **קבצים מושפעים:**
  - `client/src/features/basket/addProductToBasket.js`
  - `client/src/features/basket/getBasket.js`
  - `client/src/features/product/adminProducts.js`
  - `client/src/features/user/UserProfile.js`
  - `client/src/features/user/register.js`
  - `client/src/index.js`
- **סוגי בעיות:** משתנים וייבואים לא בשימוש, פונקציות לא בשימוש ו־dependency חסר ב־`useEffect`.
- **מה תוקן:** הוסרו imports, משתנים ו־helpers לא בשימוש, ותוקן dependency של `navigate` ב־`useEffect`.
- **בדיקה חוזרת:** `CI=true npm --prefix client run build` עבר עם `Compiled successfully` וללא אזהרות ESLint.
- **הערה:** נשארו הודעות תחזוקה של Node/Browserslist בלבד, שאינן כשלי lint.

### TEST-002 - בדיקת API חיה לא הושלמה

- **סטטוס:** `PASS`
- **חומרה:** גבוהה לפני staging, כי זו בדיקת קבלה של תהליך אמיתי.
- **סיבה קודמת:** שרת ה־API לא היה פעיל בזמן הרצה קודמת.
- **בדיקה חוזרת:** `/api/product` החזיר `200`; `/api/order/my`, `/api/quote/order/test` ו־`/api/payment/order/test` החזירו `401` ללא token; האתר החזיר `200`.
- **מה עדיין צריך לבדוק:** הרשמה, התחברות, סל ותרחיש הזמנה מלא עם משתמשים אמיתיים.
- **השלב הבא:** להריץ תרחיש authenticated מלא בסביבת staging.

### TEST-003 - תשלום חיצוני אינו מוגדר

- **סטטוס:** `BLOCKED`
- **חומרה:** גבוהה לפני קבלת תשלום אמיתי.
- **סיבה:** אין בקובץ `server/.env` מפתחות Stripe או PayPal Sandbox.
- **מה תוקן:** endpoints קיימים, כוללים בדיקות הרשאה, בדיקת quote ואימות סכום.
- **מה עדיין צריך לבדוק:** Checkout מוצלח, ביטול, כשל, תשלום כפול, וחזרה מאומתת מהספק.
- **השלב הבא:** להגדיר מפתחות Test/Sandbox ולהריץ תשלום בדיקה.

## בדיקות שעברו

### TEST-004 - בדיקות יחידה קיימות

- **סטטוס:** `PASS`
- **פקודה:** `CI=true npm --prefix client test -- --watchAll=false`
- **תוצאה:** `1` suite ו־`2` tests עברו.
- **כיסוי:** פונקציות עזר של bundles.
- **פער:** אין עדיין בדיקות יחידה ל־basket, order, quote, payment או auth.

### TEST-005 - בדיקות תחביר backend

- **סטטוס:** `PASS`
- **פקודה:** `node --check` על server, basket, order, quote, payment ו־user controllers.
- **תוצאה:** ללא שגיאות תחביר.
- **פער:** בדיקת תחביר אינה מוכיחה שהתרחיש העסקי עובד מול DB.

### TEST-006 - audit לתלויות production

- **סטטוס:** `PASS`
- **פקודה:** `npm --prefix server audit --omit=dev`
- **תוצאה:** `found 0 vulnerabilities`.
- **הערה:** יש להריץ מחדש לאחר כל שינוי תלות.

## תיקונים שבוצעו בעבר ונבדקו

- `FIX-001` - סל חדש מחזיר רשימה ריקה במקום `404`.
- `FIX-002` - פריטי הסל מועברים לבקשת הצעת המחיר.
- `FIX-003` - פריטי הסל מוצגים ללקוח ולמנהל.
- `FIX-004` - הצעת מחיר לא מאושרת אינה מאפשרת תשלום.
- `FIX-005` - בדיקת בעלות על הזמנה, הצעה ותשלום.
- `FIX-006` - סכום התשלום נלקח מהשרת ונבדק מול הספק.
- `FIX-007` - seed development אינו מוחק מוצרים קיימים.
- `FIX-008` - timeout לחיבור MongoDB קוצר כדי למנוע המתנה ארוכה.
- `FIX-009` - חולשות production dependencies תוקנו ל־`0 vulnerabilities`.
- `FIX-010` - אזהרות ESLint נוקו ו־CI build עבר ללא warnings.
- `FIX-011` - כמות מלאי נשמרת במודל מוצר ונבדקת בהוספה לסל ובהזמנה.
- `FIX-012` - מחיר מוצר להזמנה רגילה נלקח מהשרת ולא מהדפדפן.
- `FIX-013` - יצירת סל משתמש הפכה ל־upsert כדי למנוע סלים כפולים.
- `FIX-014` - מלאי ננעל ומופחת בעת יצירת הזמנה, מוחזר במקרה כשל, ומסומן כאזל בכמות אפס.

## סדר בדיקות להמשך

1. להפעיל DB ושרת ולשמור תוצאות API עם קודי HTTP.
2. לבדוק הרשמה והתחברות עם משתמש חדש.
3. לבדוק הוספה, שינוי כמות, מחיקה וריקון סל.
4. לבדוק שליחת הזמנה מתוך סל ולוודא את פריטי ההזמנה במסד ובמסך מנהל.
5. לבדוק הצעה, אישור, דחייה ותוקף הצעה.
6. לבדוק Stripe Test ו־PayPal Sandbox.
7. להריץ בדיקות UI/UX ידניות לפי `PRODUCTION_READINESS_CHECKLIST.md`.
8. לתעד כל כשל חדש כאן לפני תיקון.
9. להריץ regression מלא אחרי כל תיקון.
