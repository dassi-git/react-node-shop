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
| Authorization integration tests | `PASS` | 3 tests עברו מול MongoMemoryReplSet: משתמש רגיל נדחה, מנהל קיבל גישה ללא סיסמאות, ו־JWT שפג נדחה |
| Failure-case integration tests | `PASS` | 3 tests עברו: מוצר חסר, מלאי שאזל, ותשלום כפול נדחו כראוי |
| Live API smoke test | `PASS` | Frontend `200`, products `200`, protected routes `401` |
| תרחיש משתמש מלא | `PASS` | MongoDB Replica Set מקומי ו־API על `8888`: הרשמה, התחברות, פרופיל, סל, יצירת הזמנה, כניסת מנהל, יצירת הצעה ואישור הצעה עברו; סטטוס סופי `quote_accepted` |
| תשלום Stripe | `BLOCKED` | בדיקת Checkout authenticated החזירה `503`: חסר `STRIPE_SECRET_KEY`; לא ניתן לבצע תשלום Test ללא מפתח Stripe |
| תשלום PayPal | `BLOCKED` | בדיקת יצירת PayPal Order authenticated החזירה `503`: חסרים פרטי Sandbox |
| Browser catalog smoke test | `PASS` | דף הקטלוג הציג 3 מוצרים ותמונות fallback תקינות |
| Browser interaction smoke test | `PASS` | סינון, חיפוש, פתיחת מוצר וניתוב התחברות נבדקו |
| Browser visual UX check | `PASS` | RTL, ₪, תמונות, ניגודיות וללא overflow אופקי נבדקו |
| Login and protected-route UX check | `PASS` | מסך התחברות תקין וכניסה לא מורשית לסל הופנתה להתחברות |
| Advanced catalog filters | `PASS` | טווח מחיר, דירוג, זמינות, מיון ואיפוס נבדקו בדפדפן ללא overflow |
| Product customization build and syntax | `PASS` | אפשרויות מוצר, בחירות קונה, סל ותמחור הזמנה נבנו; React build ו-node --check עברו |
| Product multi-image build and syntax | `PASS` | העלאה/URL עד 7 תמונות וגלריית מוצר נבנו; React build ו-node --check עברו |
| Seasonal fruit feature build and syntax | `PASS` | API גלובלי, מסך מנהל, תצוגת מוצר ואימות סל/הזמנה נבנו; React build ו-node --check עברו |
| Seasonal snapshot order views | `PASS` | snapshot עונתי ותוספת premium מוצגים בהיסטוריית הלקוח ובפרטי הזמנה למנהל |
| Explicit product-to-season fruit link | `PASS` | ערכי פירות כוללים `fruitKey` מפורש והשרת/לקוח פותרים עונתיות לפי אותו מפתח |
| Product fruit selection limits | `PASS` | `maxSelections` ותוספת לכל פרי נוסף נאכפים בשרת ומוצגים בממשק הקונה |
| Seasonal public API smoke test | `PASS` | `/api/fruit-season` ו־`?date=2026-08-26` החזירו `200` עם רשימת עונות ריקה בסביבת in-memory |
| Seasonal admin authorization smoke test | `PASS` | `/api/fruit-season/admin` ללא token החזיר `401` |
| Running app smoke test | `PASS` | API על `8888`, React על `3000`, root ונתיב SPA החזירו `200` לאחר האתחול |

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

### TEST-008 - Stripe Checkout חסום ללא מפתח Test

- **סטטוס:** `BLOCKED`
- **חומרה:** גבוהה לפני קבלת תשלום אמיתי.
- **פקודה:** התחברות עם משתמש בעל הזמנה בסטטוס `quote_accepted`, ולאחר מכן `POST /api/payment/stripe/checkout` עם `orderId` תקין.
- **תוצאה:** HTTP `503`, גוף התשובה: `Stripe is not configured. Add STRIPE_SECRET_KEY to server/.env.`
- **מה עדיין צריך לבדוק:** להגדיר `STRIPE_SECRET_KEY` במצב Test, לבצע Checkout, לבדוק ביטול, כשל, חזרה מאומתת, התאמת סכום, webhook חתום ותשלום כפול.

### TEST-009 - PayPal Sandbox חסום ללא credentials

- **סטטוס:** `BLOCKED`
- **חומרה:** גבוהה לפני קבלת תשלום אמיתי.
- **פקודה:** `POST /api/payment/paypal/order` עם משתמש מורשה והזמנה בסטטוס `quote_accepted` או `payment_pending`.
- **תוצאה:** HTTP `503`, גוף התשובה: `PayPal is not configured. Add sandbox credentials to server/.env.`
- **מה עדיין צריך לבדוק:** להגדיר `PAYPAL_CLIENT_ID` ו־`PAYPAL_CLIENT_SECRET` של Sandbox, ליצור Order, לבצע Capture, לבדוק התאמת סכום ותשלום כפול.

### TEST-007 - תרחיש authenticated מלא נעצר בכניסת מנהל

- **סטטוס:** `FIXED`
- **חומרה:** גבוהה לפני staging, כי שלב הצעת המחיר דורש הרשאת מנהל.
- **פקודה:** סקריפט Node חד-פעמי מול `http://127.0.0.1:8888` שביצע הרשמה, התחברות, פרופיל, קטלוג, הוספה וקריאה של סל, יצירת הזמנה ושליפת הזמנות; לאחר מכן ניסיון התחברות עם `admin / Admin1234`.
- **תוצאה:** `register 201`, `user login 200`, `user profile 200`, `product listing 200`, `basket add 200`, `basket read 200`, `create order 201`, `user orders 200`; `admin login 401 Unauthorized`.
- **בדיקת סביבה:** `node server/scripts/listUsers.js` נכשל עם `ECONNREFUSED 127.0.0.1:27017`; השרת החי פועל עם fallback למסד in-memory, ולכן כלי הסקריפטים אינם רואים את נתוני השרת.
- **תיקון סביבת בדיקה:** MongoDB הופעל כ־single-node Replica Set בשם `rs0`, וה־API הופעל מול `mongodb://127.0.0.1:27017/329166185?replicaSet=rs0`; נוצר וקודם חשבון מנהל בדיקה.
- **בדיקה חוזרת:** התחברות משתמש `200`, שליפת הזמנות `200`, התחברות מנהל `200`, שליפת הזמנות מנהל `200`, יצירת הצעה `201`, אישור הצעה `200`; סטטוס ההזמנה הסופי `quote_accepted`.

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

### TEST-010 - בדיקות integration להרשאות

- **סטטוס:** `PASS`
- **פקודה:** `node --test server/authorization.test.js`
- **תוצאה:** 3 tests עברו מול `MongoMemoryReplSet` מבודד.
- **כיסוי:** משתמש רגיל מקבל `403` בנתיב מנהלים, מנהל מקבל `200` ורשימת המשתמשים אינה כוללת סיסמאות, ו־JWT שפג מקבל `403`.

### TEST-011 - בדיקות כשל ו־idempotency לתשלום

- **סטטוס:** `FIXED`
- **פקודה:** `node --test server/failure-cases.test.js`
- **תוצאה:** 3 tests עברו מול `MongoMemoryReplSet`: מוצר חסר ומוצר שאזל מחזירים `400` ללא יצירת הזמנה; שליחת תשלום פנימי חוזר מחזירה `409` ונשמרת רשומת תשלום אחת.
- **תיקון:** `createPayment` בודק תשלום קיים בסטטוס `pending` או `paid` לפני יצירת רשומה חדשה.

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
- `FIX-015` - תמונת placeholder משמשת כאשר למוצר אין תמונה, במקום בקשת URL שבור.
- `FIX-016` - כתובת API ונרמול תשובת מוצרים הוקשחו כדי למנוע הצגת 0 מוצרים על response תקין.
- `FIX-017` - מחירים, כותרות bundle ותמונות דומות יושרו לעברית ולשקלים עם ניגודיות ו־fallback תקינים.
- `FIX-018` - סל הקניות יושר למטבע ₪ וקיבל fallback לתמונות חסרות.
- `FIX-019` - טווח המחיר של הסינון המתקדם מסתנכרן מיד עם נתוני הקטלוג ולא מסתיר מוצרים בזמן טעינה.
- `FIX-020` - נוספו אפשרויות התאמה לכל מוצר עם בחירה יחידה/מרובה, חובה/רשות, זמינות ותוספות מחיר.
- `FIX-021` - הבחירות נשמרות ב-snapshot בסל ובהזמנה, והשרת מחשב ומאמת את מחיר ההתאמות.
- `FIX-022` - נוסף עורך מנהל להגדרת קבוצות, ערכים ותוספות מחיר ביצירה ובעדכון מוצר.
- `FIX-023` - מוצר תומך בעד 7 תמונות, העלאה מרובה, כתובות URL וגלריה לבחירת תמונה.
- `FIX-024` - נוספה מערכת עונתיות גלובלית עם תקופות, Preview, סטטוס, תוספת מחיר ו-soft cancel.
- `FIX-025` - עונתיות נאכפת בסל ובהזמנה ונשמרת ב-snapshot להצגת ההקשר ההיסטורי.
- `FIX-026` - snapshot עונתי מוצג ללקוח ולמנהל בפרטי ההזמנה.
- `FIX-027` - נוסף קישור מפורש `fruitKey` בין ערכי פירות במוצר לקטלוג העונתיות.
- `FIX-028` - נוספו מגבלת מספר פירות ותוספת מחיר לכל פרי מעבר לראשון לפי הגדרת המוצר.

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
10. לבדוק בדפדפן מוצר עם אפשרויות, שתי התאמות שונות לאותו מוצר, והזמנה מלאה בסביבת staging.
11. ליצור חשבון מנהל בדיקה, להוסיף עונת `mango`, ולהריץ תרחיש premium/available/unavailable מלא מול מוצר אמיתי.
