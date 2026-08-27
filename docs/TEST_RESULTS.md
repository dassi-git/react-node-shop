# יומן תוצאות בדיקות

מסמך זה מתעד בדיקות שבוצעו בפועל, תקלות שהתגלו, תיקונים שבוצעו, ומה עדיין פתוח. אין לסמן בדיקה כעוברת בלי פקודה, תוצאה או הוכחה ידנית.

## מקרא

- `PASS` - הבדיקה עברה.
- `FAIL` - הבדיקה נכשלה ונדרש תיקון.
- `BLOCKED` - לא ניתן היה להשלים את הבדיקה בגלל תלות חיצונית או סביבת הרצה.
- `FIXED` - תקלה שהתגלתה ותוקנה, עם בדיקה חוזרת שעברה.
- `OPEN` - תקלה שעדיין לא תוקנה.

## הרצה 2026-08-27

| בדיקה | סטטוס | תוצאה |
|---|---|---|
| Basket and order regression | `PASS` | `node --test server/basket.test.js server/order.test.js`: 2 tests עברו, כולל התאמות, תמחור מהשרת, שמירת מלאי ואכיפת בעלות |
| Customized basket integration | `PASS` | `node --test --test-name-pattern="different customization" server/basket.test.js`: בדיקה אחת עברה; שתי התאמות שונות נשמרו כשורות נפרדות עם תוספות מחיר `2` ו־`11` |
| Basket and order regression after customization coverage | `PASS` | `node --test server/basket.test.js server/order.test.js`: 3 tests עברו |
| Client startup for browser acceptance | `PASS` | `npm start` מתוך `client` הסתיים ב־`Compiled successfully` וה־client זמין על `3000` |
| Browser catalog after loopback CORS fix | `PASS` | הקטלוג נטען מ־`127.0.0.1:3000` ומציג 3 מוצרים; ה־API החזיר `200` עם `Access-Control-Allow-Origin: http://127.0.0.1:3000` |
| Browser customized-product acceptance | `PASS` | נוצר מוצר בדיקה מותאם, התחברות לקוח הצליחה, שתי קומבינציות נוספו בדפדפן במחירים `₪42.00` ו־`₪51.00`, ובמסד נשמרו שתי שורות נפרדות עם תוספות `2` ו־`11` |
| Browser customized-product order continuation | `PASS` | טופס בקשת המחיר הציג את שתי השורות, עיר וכתובת נשלחו, ונוצרה הזמנה `ORD-MTB3BXG0-MRWYJD` בסטטוס `quote_requested` בסך `93 ₪` |
| Duplicate React key in quote request | `FIXED` | תוקן `key` של פריטי הסל לפי מזהה שורת הסל; `npm --prefix client run build` עבר ללא שגיאת runtime חדשה |
| Full server regression | `PASS` | `npm test` מתוך `server` עם `--test-concurrency=1`: 21 tests עברו; תצורת הבדיקה עודכנה כדי למנוע race condition בין suites של Mongoose |
| Seasonal boundary and validation coverage | `PASS` | `node --test fruitSeason.test.js`: 2 tests עברו; גבולות תאריך כוללים, חפיפות פעילות נדחות ותוספת מחיר מזויפת נדחית |
| Full server regression after seasonal coverage | `PASS` | `npm test` מתוך `server`: 23 tests עברו עם `--test-concurrency=1` |
| Concurrent payment idempotency | `PASS` | `node --test payment.test.js`: 3 tests עברו; שתי בקשות תשלום מקבילות יוצרות תשלום פעיל יחיד |
| Full server regression after payment hardening | `PASS` | `npm test` מתוך `server`: 24 tests עברו עם `--test-concurrency=1` |
| Auth rate-limit coverage | `PASS` | `node --test auth-rate-limit.test.js`: 2 tests עברו; ניסיון שישי ל-login ורביעי ל-register מאותו IP נחסמו ב־`429` |
| Full server regression after rate-limit coverage | `PASS` | `npm test` מתוך `server`: 26 tests עברו עם `--test-concurrency=1` |
| Seasonal ID validation | `PASS` | `node --test fruitSeason.test.js`: 3 tests עברו; update/delete עם מזהה לא תקין מחזירים `400` לפני גישה למסד |
| Full server regression after seasonal ID validation | `PASS` | `npm test` מתוך `server`: 27 tests עברו עם `--test-concurrency=1`; frontend build עבר בהצלחה |
| JSON request-size limit | `PASS` | `node --test --test-name-pattern="larger than 1 MB" server.test.js`: payload מעל `1MB` נדחה ב־`413` |
| Full server regression after JSON limit coverage | `PASS` | `npm test` מתוך `server`: 28 tests עברו עם `--test-concurrency=1` |
| Image upload validation | `PASS` | `node --test upload-validation.test.js`: 2 tests עברו; GIF נדחה וקובץ PNG מעל `5MB` נדחה |
| Full server regression after upload validation | `PASS` | `npm test` מתוך `server`: 30 tests עברו עם `--test-concurrency=1` |
| Low-stock warning browser check | `PASS` | דף מוצר עם `LOWSTOCK` הציג בדפדפן את האזהרה "מלאי נמוך - מומלץ להזמין בהקדם" עם `role=status`; frontend CI build עבר |
| Order transaction rollback coverage | `PASS` | `node --test --test-name-pattern="rolls back inventory" order.test.js`: כשל בשריון פריט מאוחר החזיר `400`, ביטל את שריון המלאי, שמר את הסל ולא יצר הזמנה נוספת |
| Mobile catalog and product accessibility check | `PASS` | בדפדפן ב־viewport `390x844`: הקטלוג הציג 4 כרטיסים ושדה חיפוש ללא overflow אופקי; דף המוצר נטען ללא overflow, עם label לתאריך, focusable controls ו־warning עם `role=status` |
| Duplicate username registration coverage | `PASS` | `node --test authorization.test.js`: 6 tests עברו; username קיים לאחר normalization מחזיר `409 Duplicate username` ואינו יוצר משתמש נוסף |
| Registration input validation coverage | `PASS` | `node --test --test-name-pattern="invalid email and short password" authorization.test.js`: אימייל לא תקין וסיסמה קצרה נדחו ב־`400` לפני כתיבה למסד |
| Registration phone validation coverage | `PASS` | `node --test --test-name-pattern="invalid phone" authorization.test.js`: מספר טלפון לא תקין נדחה ב־`400` לפני כתיבה למסד |
| Unknown-user login coverage | `PASS` | `node --test --test-name-pattern="unknown user" authorization.test.js`: משתמש שאינו קיים מקבל `401 Unauthorized` כללי ללא `Set-Cookie` |
| Expired-token client redirect | `PASS` | בדפדפן: cookie לא תקף בנתיב מוגן הפעיל את alert פקיעת החיבור, ניקה את session והפנה ל־`/login`; `CI=true npm --prefix client run build` עבר |
| Cross-user profile authorization coverage | `PASS` | `node --test --test-name-pattern="another user" authorization.test.js`: משתמש רגיל קיבל `403` בקריאה ובעדכון משתמש אחר, והנתונים המוגנים נשארו ללא שינוי |
| Product seasonal premium/unavailable order flow | `PASS` | `node --test fruitSeason.test.js`: 4 tests עברו; מוצר עם `fruitKey` אמיתי חישב תוספת premium, חסם פרי unavailable ושמר seasonal snapshot בהזמנה |
| Catalog PrimeReact warning cleanup | `PASS` | `CI=true npm --prefix client run build` ו־`CI=true npm --prefix client test -- --watchAll=false --runInBand` עברו; הוסר `inputId` שהועבר ל־DOM כ-prop לא תקין |
| Browser catalog recheck after warning cleanup | `BLOCKED` | הדפדפן נשאר בלולאת alert של session שפג עם תגובות `401`, ולכן לא ניתן היה לבצע reload נקי ולאמת console לאחר ה-build |
| Anonymous profile request prevention | `PASS` | דף `/allProduct` חדש בדפדפן נטען ללא alert וללא בקשת `GET /api/user/profile` אנונימית; `CI=true npm --prefix client test -- --watchAll=false --runInBand` עבר עם 3 tests ו־build CI עבר |
| Product API and catalog search recheck | `PASS` | `GET http://127.0.0.1:8888/api/product` החזיר `200` עם 4 מוצרים; בדפדפן החיפוש `סלסלת` צמצם לתוצאה אחת, וב־viewport `620x347` לא נמצא overflow אופקי |
| Browser registration/login/profile acceptance | `PASS` | בדפדפן נוצר משתמש בדיקה, ההתחברות הצליחה, הניווט הציג `שלום Browser Test User`, נוצר `csrfToken`, ו־`GET /api/user/profile` נטען ללא `401`; השרת אותחל מחדש מקוד המקור הנוכחי |
| Browser basket-to-quote acceptance | `PASS` | בדפדפן מוצר נוסף לסל עם הודעת הצלחה, הסל הציג כמות `1` וסכום `189 ₪`, בקשת הצעת המחיר כללה עיר, כתובת ותאריך `27/08/2026`, ונוצרה הזמנה `ORD-MTB8TUJX-PYQOCK` בסטטוס `ממתין להצעת מחיר` |
| Admin quote duplicate status update | `FIXED` | בדיקת דפדפן חשפה שיצירת הצעה הצליחה אך עדכון `quote_sent` הכפול החזיר `400`; הוסר העדכון הכפול מ־`AdminQuotePage`, ולאחר מכן build CI ובדיקות `quote.test.js` עברו |
| Admin quote and customer approval acceptance | `PASS` | API מקומי לאחר אתחול rate limiter: login/orders/quotes/accept החזירו `200`; ההצעה `210 ₪` עם מקדמה `105 ₪` אושרה וההזמנה `ORD-MTB8TUJX-PYQOCK` עברה ל־`quote_accepted` |
| Approved-order external payment fallback | `PASS` | API מקומי עם CSRF תקין: להזמנה `ORD-MTB8TUJX-PYQOCK` עם מקדמה `105 ₪`, Stripe ו־PayPal החזירו `503` עם הודעת configuration ברורה, ורשומות התשלום נותרו ריקות |
| Protected-route auth bootstrap race | `FIXED` | פתיחה ישירה של `/my-orders` עם session cookie הציגה `טוען חיבור...` במקום redirect מוקדם, ולאחר bootstrap נטענה ההזמנה המאושרת עם כפתורי התשלום |
| Mobile approved-order UX | `PASS` | בדפדפן ב־viewport `390x844`: ההזמנה, מחיר `210 ₪`, מקדמה `105 ₪` וכפתורי Stripe/PayPal הוצגו ללא overflow אופקי |
| Local API response-time smoke check | `PASS` | `Invoke-WebRequest` מול השרת המקומי: `/health` החזיר `200` בכ־`36.34ms`, `/ready` החזיר `200` בכ־`17.40ms`, ו־`/api/product` החזיר `200` בכ־`20.79ms` |
| Lazy image loading in catalog | `PASS` | נוספה טעינה עצלה לתמונות חוזרות בקטלוג, thumbnails ומוצרים דומים; בדפדפן 4 כרטיסים הכילו `loading="lazy"`, ללא overflow; frontend tests ו־CI build עברו |
| Catalog pagination implementation | `PASS` | נוסף pagination מקומי של 12 מוצרים לעמוד עם איפוס עמוד בעת שינוי סינון וכפתורי ניווט נגישים; frontend tests ו־CI build עברו, ובדפדפן קטלוג של 4 מוצרים נשאר ללא overflow. תרחיש רב־עמודים דורש נתוני קטלוג גדולים יותר |
| MongoDB index synchronization | `FIXED` | `Payment` partial index עם `$ne` נדחה על ידי MongoDB; הוחלף ל־`$gt: ''`, וכל המודלים נטענים ומריצים `createIndexes` לאחר startup. בדיקת האינדקס הציגה בפועל `provider_1_providerPaymentId_1` ייחודי |
| Order regression after index synchronization | `PASS` | `node --test order.test.js`: 6 tests עברו לאחר תיקון fixture היסטוריית המוצר לשימוש ב־Basket ועדכון ציפיית מספר ההזמנות |
| Full server regression after index synchronization | `PASS` | `npm test` מתוך `server`: 47 tests עברו עם `--test-concurrency=1` |
| Order status history audit trail | `PASS` | `node --test --test-name-pattern="order status updates" order.test.js`: בדיקה אחת עברה; שינויי סטטוס נשמרים עם רצף סטטוסים, משתמש מבצע ו־timestamp, ומוצגים בפרטי ההזמנה למנהל |
| Full server regression after status history | `PASS` | `npm test` מתוך `server`: 47 tests עברו עם `--test-concurrency=1`; `CI=true npm --prefix client run build` עבר עם `Compiled successfully` |
| Quote request form accessibility labels | `PASS` | `CI=true npm --prefix client test -- --watchAll=false --runInBand`: 2 suites ו־3 tests עברו; כל שדות טופס בקשת הצעת המחיר מקושרים ל־label, ו־`CI=true npm --prefix client run build` עבר |
| Admin quote form accessibility labels | `PASS` | `CI=true npm --prefix client test -- --watchAll=false --runInBand`: 2 suites ו־3 tests עברו; כל שדות טופס מנהל הצעות המחיר מקושרים ל־label, ו־`CI=true npm --prefix client run build` עבר |
| Customization editor accessibility labels | `PASS` | `CI=true npm --prefix client test -- --watchAll=false --runInBand`: 2 suites ו־3 tests עברו; פקדי radio/checkbox ושדות המספר בעורך ההתאמות מקושרים ל־label, ו־`CI=true npm --prefix client run build` עבר |
| Customization editor control names | `PASS` | `CI=true npm --prefix client test -- --watchAll=false --runInBand`: 2 suites ו־3 tests עברו; שדות ההתאמות הדינמיים כוללים שמות נגישים, ו־`CI=true npm --prefix client run build` עבר |
| Temporary manual payment is the active customer flow | `PASS` | `node --test payment.test.js`: 5 tests עברו; תשלום ידני בהעברה או במזומן נוצר כ־`pending`, ממתין לאישור מנהל, ותשלומי Stripe/PayPal נשארו זמינים בקוד; `CI=true npm --prefix client run build` עבר עם `Compiled successfully` |
| Payment blocked before quote acceptance | `PASS` | `node --test --test-concurrency=1 payment.test.js`: 6 tests עברו; גם `/api/payment/manual` וגם `/api/payment` מחזירים `400` להזמנה עם הצעה בסטטוס `sent`, ללא יצירת תשלום וללא שינוי סטטוס ההזמנה |
| Full server regression after payment prerequisite coverage | `PASS` | `npm test -- --test-concurrency=1` מתוך `server`: 49 tests עברו |
| Production environment separation | `PASS` | `node --check server/server.js` ו־`node --check server/config/dbconn.js` עברו; נוספו `.env.production.example` נפרדים לשרת וללקוח, ו־production טוען רק `.env.production` |
| Production database does not use memory fallback | `PASS` | `NODE_ENV=production` ללא `DATABASE_URI` או `MONGO_URI` והרצת `connectDB()` החזירה `DATABASE_URI or MONGO_URI must be configured in production` לפני ניסיון fallback |
| Full server regression after production environment separation | `PASS` | `NODE_ENV=development npm test -- --test-concurrency=1` מתוך `server`: 49 tests עברו; `basket.test.js` עבר גם בהרצה מבודדת עם 2 tests |
| Product CRUD authorization coverage | `PASS` | `NODE_ENV=development node --test --test-concurrency=1 authorization.test.js`: 11 tests עברו; משתמש אנונימי קיבל `401` ומשתמש רגיל `403` ביצירה, עדכון ומחיקת מוצר |
| Full server regression after product authorization coverage | `PASS` | `NODE_ENV=development npm test -- --test-concurrency=1` מתוך `server`: 50 tests עברו |
| Admin route guard authorization coverage | `PASS` | `CI=true npm --prefix client test -- --watchAll=false --runInBand`: 3 suites ו־6 tests עברו; `RequireAdmin` ממתין ל־auth bootstrap, חוסם משתמש רגיל ומציג תוכן למנהל; `CI=true npm --prefix client run build` עבר |
| All admin endpoint authorization coverage | `PASS` | `NODE_ENV=development node --test --test-concurrency=1 authorization.test.js`: 12 tests עברו; נקודות ה־admin של users, orders, quotes, seasons, bundles, products ו־payments החזירו `401` ללא token ו־`403` למשתמש רגיל |
| Full server regression after admin endpoint authorization coverage | `PASS` | `NODE_ENV=development npm test -- --test-concurrency=1` מתוך `server`: 51 tests עברו |
| P0 #1: Server-side data validation coverage (client-data tampering) | `PASS` | `NODE_ENV=development node --test --test-concurrency=1 failure-cases.test.js`: 7 tests עברו (3 קיימים + 4 חדשים). בדיקות חדשות: (1) מחיר מזויף מהלקוח (`clientPrice: 1`) נדחה – ההזמנה נוצרה עם מחיר שרת `50`; (2) `userId` מזויף בגוף הבקשה נדחה – ההזמנה נוצרה עם ה-userId מה-JWT; (3) `role: 'Admin'` בגוף הבקשה נדחה – endpoint מוגן-Admin החזיר `403`; (4) JWT שפג תוקפו (expired) → `403 Forbidden` |
| P0 #2: Full end-to-end flow test | `PASS` | `NODE_ENV=development node --test --test-concurrency=1 full-flow.test.js`: 1 test עבר עם 9 שלבים: Register→Login(cookie JWT)→AddToBasket→CreateOrder→AdminCreateQuote→UserAcceptQuote→ManualPayment(bank_transfer)→AdminConfirmPayment→order.status='paid'. statusHistory: `quote_requested → quote_sent → quote_accepted → payment_pending → paid`, finalPrice=120 |
| Full server regression after P0 coverage additions | `PASS` | `NODE_ENV=development node --test --test-concurrency=1` מתוך `server`: **56 tests עברו, 0 נכשלו** (51 קיימים + 4 חדשים ב-failure-cases.test.js + 1 full-flow.test.js) |

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
| Basket integration tests | `PASS` | בדיקה אחת עברה: יצירת סל, הוספה פעמיים, ירידת כמות, מחיקת פריט, ריקון ואימות במסד |
| Quote integration tests | `PASS` | בדיקה אחת עברה: יצירה כמנהל, הרשאות, צפייה, אישור, דחייה והצעה שפג תוקפה |
| Internal payment integration tests | `PASS` | 2 בדיקות עברו: יצירת תשלום לפי deposit מהשרת, הרשאות, אישור מנהל, אישור חוזר ללא כפילות ותגובות חסר credentials לספקים חיצוניים |
| Order integration tests | `PASS` | בדיקה אחת עברה: תמחור מהשרת, שמירת פריטים, הפחתת מלאי ואכיפת בעלות |
| Live API smoke test | `PASS` | Frontend `200`, products `200`, protected routes `401` |
| תרחיש משתמש מלא | `PASS` | MongoDB Replica Set מקומי ו־API על `8888`: הרשמה, התחברות, פרופיל, סל, יצירת הזמנה, כניסת מנהל, יצירת הצעה ואישור הצעה עברו; סטטוס סופי `quote_accepted` |
| תשלום Stripe | `BLOCKED` | בדיקת Checkout authenticated החזירה `503`: חסר `STRIPE_SECRET_KEY`; לא ניתן לבצע תשלום Test ללא מפתח Stripe |
| תשלום PayPal | `BLOCKED` | בדיקת יצירת PayPal Order authenticated החזירה `503`: חסרים פרטי Sandbox |
| Signed Stripe webhook idempotency | `PASS` | `node --test payment.test.js`: 4 tests עברו; webhook חתום שנמסר פעמיים אישר את ההזמנה פעם אחת ושמר רשומת תשלום יחידה |
| Concurrent quote idempotency | `PASS` | `node --test quote.test.js`: 2 tests עברו; שתי בקשות הצעה מקבילות החזירו `201` ו־`409` ונשמרה הצעה פעילה יחידה |
| Order delivery validation | `PASS` | `node --test order.test.js`: 2 tests עברו; כתובת חסרה, תאריך לא תקין, הערות ארוכות וסל ריק נדחו ב־`400` ללא יצירת הזמנה |
| Full server regression after order validation coverage | `PASS` | `npm test` מתוך `server`: 35 tests עברו עם `--test-concurrency=1` |
| Auth registration and login integration | `PASS` | `node --test authorization.test.js`: 5 tests עברו; הרשמה, normalization, duplicate email, cookies וסיסמה שגויה נבדקו |
| Order status transition authorization | `PASS` | `node --test order.test.js`: 3 tests עברו; משתמש רגיל נדחה, מעברים חוקיים נאכפו, ומעבר ל־`paid` ללא תשלום מאושר נדחה ללא שינוי במסד |
| Terminal order immutability | `PASS` | `node --test order.test.js`: 4 tests עברו; הזמנות `completed` ו־`cancelled` דחו שינוי סטטוס ושמרו את הסטטוס המקורי |
| Quote cross-user authorization | `PASS` | `node --test quote.test.js`: 2 tests עברו; משתמש שאינו בעל ההזמנה נחסם בקריאת הצעה ובאישור הצעה, ללא שינוי במסד |
| Quote input validation | `PASS` | `node --test quote.test.js`: 3 tests עברו; מחיר/משלוח שליליים, מקדמה גבוהה, תוקף שפג והערות ארוכות נדחו ללא יצירת הצעה |
| Rejected quote immutability | `PASS` | `node --test quote.test.js`: 3 tests עברו; הצעה שנדחתה לא ניתנת לאישור מחדש והצעת המחיר וההזמנה נשארות `rejected` ו־`quote_rejected` |
| Password reset security integration | `PASS` | `node --test authorization.test.js`: 6 tests עברו; תשובה כללית, סיסמה חלשה, token חד־פעמי ו־token שפג נבדקו |
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
- **החלטת מוצר:** בשלב הנוכחי אין לעסק עוסק פטור או עוסק מורשה, ולכן אין אפשרות להגדיר חשבונות Stripe/PayPal. נחזור למשימה הזו לפני העלייה לענן.
- **מה תוקן:** endpoints קיימים, כוללים בדיקות הרשאה, בדיקת quote ואימות סכום.
- **מה עדיין צריך לבדוק:** Checkout מוצלח, ביטול, כשל, תשלום כפול, וחזרה מאומתת מהספק.
- **השלב הבא:** לפני העלייה לענן, לאחר רישום העסק ופתיחת חשבונות מתאימים, להגדיר מפתחות Test/Sandbox ולהריץ תשלום בדיקה מלא.

### TEST-008 - Stripe Checkout חסום ללא מפתח Test

- **סטטוס:** `BLOCKED`
- **חומרה:** גבוהה לפני קבלת תשלום אמיתי.
- **פקודה:** התחברות עם משתמש בעל הזמנה בסטטוס `quote_accepted`, ולאחר מכן `POST /api/payment/stripe/checkout` עם `orderId` תקין.
- **תוצאה:** HTTP `503`, גוף התשובה: `Stripe is not configured. Add STRIPE_SECRET_KEY to server/.env.`
- **החלטת מוצר:** אין כרגע credentials משום שהעסק טרם נרשם; יש לחזור לבדיקה הזו לפני העלייה לענן.
- **מה עדיין צריך לבדוק:** להגדיר `STRIPE_SECRET_KEY` במצב Test, לבצע Checkout, לבדוק ביטול, כשל, חזרה מאומתת, התאמת סכום, webhook חתום ותשלום כפול.

### TEST-009 - PayPal Sandbox חסום ללא credentials

- **סטטוס:** `BLOCKED`
- **חומרה:** גבוהה לפני קבלת תשלום אמיתי.
- **פקודה:** `POST /api/payment/paypal/order` עם משתמש מורשה והזמנה בסטטוס `quote_accepted` או `payment_pending`.
- **תוצאה:** HTTP `503`, גוף התשובה: `PayPal is not configured. Add sandbox credentials to server/.env.`
- **החלטת מוצר:** אין כרגע credentials משום שהעסק טרם נרשם; יש לחזור לבדיקה הזו לפני העלייה לענן.
- **מה עדיין צריך לבדוק:** להגדיר `PAYPAL_CLIENT_ID` ו־`PAYPAL_CLIENT_SECRET` של Sandbox, ליצור Order, לבצע Capture, לבדוק התאמת סכום ותשלום כפול.

### TEST-016 - webhook חתום של Stripe והעברה חוזרת

- **סטטוס:** `PASS`
- **חומרה:** גבוהה לפני production, כדי שאירוע ספק חוזר לא יסמן עסקה פעמיים.
- **פקודה:** `node --test payment.test.js`
- **תוצאה:** 4 tests עברו; webhook `checkout.session.completed` חתום מקומית שנשלח פעמיים השאיר את ההזמנה ב־`paid` ואת התשלום ברשומה יחידה.
- **הערה:** הבדיקה אינה מחליפה בדיקת Stripe Test מול ספק חיצוני; זו עדיין חסומה ללא `STRIPE_SECRET_KEY` ו־`STRIPE_WEBHOOK_SECRET` אמיתיים.

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

### TEST-012 - בדיקות integration למחזור חיי הסל

- **סטטוס:** `PASS`
- **פקודה:** `node --test server/basket.test.js`
- **תוצאה:** בדיקה אחת עברה מול `MongoMemoryReplSet` מבודד.
- **כיסוי:** יצירת סל, הוספת מוצר פעמיים, שינוי כמות, מחיקת פריט בהדרגה, ריקון סל, וסל ריק לאחר הריקון; מצב הכמות נבדק גם ישירות במסד.

### TEST-013 - בדיקות integration למחזור חיי הצעה

- **סטטוס:** `PASS`
- **פקודה:** `node --test server/quote.test.js`
- **תוצאה:** בדיקה אחת עברה מול `MongoMemoryReplSet` מבודד.
- **כיסוי:** מנהל יוצר הצעה, משתמש רגיל נדחה ביצירה, בעל ההזמנה צופה בהצעה, אישור ודחייה משנים את סטטוס ההצעה וההזמנה, והצעה שפג תוקפה נדחית ללא שינוי במסד.

### TEST-014 - בדיקות integration לתשלום פנימי

- **סטטוס:** `PASS`
- **פקודה:** `node --test server/payment.test.js`
- **תוצאה:** 2 בדיקות עברו מול `MongoMemoryReplSet` מבודד.
- **כיסוי:** יצירת תשלום להזמנה עם הצעה מאושרת, שימוש בסכום deposit מהשרת, חסימת משתמש שאינו בעלים, אישור מנהל, אישור חוזר idempotent ורשומת תשלום יחידה; Stripe ו־PayPal מחזירים `503` ללא credentials וללא יצירת רשומת תשלום.

### TEST-015 - בדיקות integration ליצירת הזמנה

- **סטטוס:** `PASS`
- **פקודה:** `node --test server/order.test.js`
- **תוצאה:** בדיקה אחת עברה מול `MongoMemoryReplSet` מבודד.
- **כיסוי:** מחיר מוצר נלקח מהשרת ולא מהלקוח, פריטי ההזמנה נשמרים, המלאי מופחת בעת יצירת ההזמנה, וגישה להזמנה מוגבלת לבעלים.

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

## הרצה 2026-08-27 (המשך)

| בדיקה | סטטוס | תוצאה |
|---|---|---|
| Server-side price validation — client cannot forge price | `PASS` | `node --test --test-concurrency=1 failure-cases.test.js`: בדיקה עברה; `clientPrice: 1` ו־`deliveryFee: 999` נדחו, ההזמנה נוצרה עם `unitPrice=50` ו־`deliveryFee=0` מהשרת |
| Server-side ownership — userId injected in body is ignored | `PASS` | `node --test --test-concurrency=1 failure-cases.test.js`: בדיקה עברה; `userId` של משתמש אחר בגוף הבקשה נדחה, ההזמנה הוקצתה ל-userId מה-JWT |
| Server-side role — role injected in body is ignored | `PASS` | `node --test --test-concurrency=1 failure-cases.test.js`: בדיקה עברה; `role: 'Admin'` בגוף הבקשה נדחה, endpoint מוגן-Admin החזיר `403` לפי ה-JWT |
| Expired JWT rejected with 403 | `PASS` | `node --test --test-concurrency=1 failure-cases.test.js`: בדיקה עברה; token עם `expiresIn: 1` לאחר 1.1 שניות החזיר `403 Forbidden - Invalid or expired token` |
| Full end-to-end flow with manual payment | `PASS` | `node --test --test-concurrency=1 full-flow.test.js`: בדיקה עברה; Register→Login→Basket→Order→AdminQuote→AcceptQuote→ManualPayment(bank_transfer)→AdminConfirm; סטטוס סופי `paid`, מחיר מהשרת `120`, statusHistory: `quote_requested → quote_sent → quote_accepted → payment_pending → paid` |
| Full server regression after P0/P1 coverage | `PASS` | `NODE_ENV=development node --test --test-concurrency=1` מתוך `server`: **56 tests עברו**, 0 נכשלו |

## סיכום כיסוי P0/P1

### P0 — server-side validation (COMPLETE)
- מחיר: `orderController` לוקח `product.price` מהשרת; `clientPrice`, `items[].unitPrice` מגוף הבקשה מתעלמים לחלוטין — **מוכח בבדיקה**
- userId: ה-controller משתמש ב-`req.user._id` מה-JWT בלבד — **מוכח בבדיקה**
- role: `verifyJwt` + `admin.js` middleware קוראים מה-JWT, לא מה-body — **מוכח בבדיקה**
- מלאי: `basketController` ו-`orderController` בודקים `inventoryStatus`/`quantity` מה-DB לפני כל פעולה — **מוכח בבדיקות failure-cases וorder**

### P0 — תרחיש מלא (COMPLETE)
- Register→Login→Product→Basket→Quote→AdminQuote→Approval→ManualPayment→AdminConfirm→paid — **מוכח ב-full-flow.test.js**

### P1 — בדיקות כשל (COMPLETE)
- מוצר חסר → `400` — failure-cases.test.js
- מלאי אזל → `400` — failure-cases.test.js
- תשלום כפול → `409` — failure-cases.test.js
- token שפג → `403` — failure-cases.test.js
- webhook חוזר (idempotency) → רשומה יחידה — payment.test.js

### P1 — transaction ומלאי (COMPLETE — קיים בקוד)
- `createOrder`: `mongoose.startSession()` + `withTransaction` לשריון מלאי ויצירת הזמנה אטומית
- `createQuote`: `withTransaction` לעדכון הזמנה והצעה ביחד

### P1 — idempotency (COMPLETE — קיים בקוד)
- `createPayment`/`createManualPayment`: `Payment.findOne({ orderId, status: { $in: ['pending','paid'] } })` לפני create
- `finishPayment`: `findOneAndUpdate` עם upsert + transaction
- Unique index על `{ orderId }` עם `partialFilterExpression` למניעת כפילות DB-level
- Stripe webhook: בדיקת `existingPayment.status === 'paid'` לפני עדכון

## סדר בדיקות להמשך

1. לבדוק Stripe Test ו־PayPal Sandbox לאחר רישום עסק ופתיחת חשבונות.
2. להריץ בדיקות UI/UX ידניות לפי `PRODUCTION_READINESS_CHECKLIST.md`.
3. לבדוק בדפדפן מוצר עם אפשרויות, שתי התאמות שונות לאותו מוצר, והזמנה מלאה בסביבת staging.
4. ליצור חשבון מנהל בדיקה, להוסיף עונת `mango`, ולהריץ תרחיש premium/available/unavailable מלא מול מוצר אמיתי.
