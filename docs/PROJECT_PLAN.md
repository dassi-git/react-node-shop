# תכנון פרויקט – מערכת הזמנות לעיצובי פירות

## 1. מטרת הפרויקט

פיתוח מערכת הזמנות לעיצובי פירות, שבה לקוח בוחר מוצר/עיצוב, שולח בקשת הצעת מחיר, מנהל מאשר מחיר, והלקוח משלם רק לאחר אישור ההצעה. 
זוהי מערכת מותאמת אישית ולא חנות קלאסית עם רכישה מיידית.

---

## 2. עקרון העסקי

המודל הנכון הוא:

Order → Quote Request → Admin Quote → Customer Approval → Payment → Production / Delivery

במקום המודל הרגיל:

Add to cart → payment → order

במוצרי עיצוב אישיים, המחיר תלוי בכמות, סוג פרי, גודל, תאריך משלוח, הערות, תוספות, אזור משלוח, והכנה ייחודית.

---

## 3. תהליך עבודה מומלץ

### 3.1 תהליך לקוח
1. הלקוח בוחר מוצר/עיצוב.
2. בוחר אפשרויות:
   - סוג פרי
   - כמות
   - גודל / משקל
   - תאריך משלוח
   - אזור משלוח
   - כרטיס ברכה
   - תוספות
   - הערות מיוחדות
3. מוסיף לעגלה.
4. לוחץ על "שלח בקשת הצעת מחיר".
5. נוצרת הזמנה חדשה בסטטוס `quote_requested`.
6. המנהל רואה את הבקשה.
7. המנהל שולח הצעת מחיר.
8. הלקוח מאשר/דוחה את ההצעה.
9. אם מאשר – ממשיך לתשלום.
10. לאחר התשלום ההזמנה הופכת ל"מאושרת" ומתחיל תהליך הכנה/משלוח.

### 3.2 תהליך מנהל
1. בודק הזמנות הממתינות להצעת מחיר.
2. עובר על פרטי ההזמנה.
3. מחשב מחיר סופי.
4. קובע:
   - מחיר
   - דמי משלוח
   - מקדמה
   - תאריך אספקה
   - הערות
5. שולח הצעת מחיר.
6. מעקב אחרי תשלום ואישור.
7. מעדכן סטטוס הזמנה בהתאם להתקדמות.

---

## 4. סטטוסים מומלצים להזמנה

- `draft`
- `quote_requested`
- `quote_sent`
- `quote_accepted`
- `quote_rejected`
- `payment_pending`
- `paid`
- `confirmed`
- `preparing`
- `ready_for_delivery`
- `in_delivery`
- `completed`
- `cancelled`

### פירוש הסטטוסים
- `quote_requested`: הזמנה נשלחה, ממתינה להצעת מחיר
- `quote_sent`: המנהל שלח הצעת מחיר
- `quote_accepted`: לקוח אישר את ההצעה
- `payment_pending`: ממתין לתשלום
- `paid`: התשלום בוצע
- `confirmed`: ההזמנה אושרה סופית
- `preparing`: בהכנה
- `ready_for_delivery`: מוכן למשלוח
- `in_delivery`: בשילוח
- `completed`: הושלם
- `cancelled`: בוטלה

---

## 5. דרישות פונקציונליות

### 5.1 מוצרים
- הצגת מוצרים עם תמונות
- קטגוריות
- תיאור מוצר
- אפשרויות התאמה אישית
- מחיר בסיסי
- מצב זמינות

### 5.2 אפשרויות מותאמות אישית
- סוג פרי
- כמות
- גודל/משקל
- סוג עיצוב
- כרטיס ברכה
- תוספות
- מטרה/אירוע
- תאריך משלוח
- הערות מיוחדות

### 5.3 עגלת קניות
- הוספת פריט
- עדכון כמות
- מחיקת פריט
- סיכום הזמנה
- שמירת תאריך משלוח
- שמירת הערות
- חישוב עמלה/דמי משלוח

### 5.4 בקשת הצעת מחיר
- הלקוח משלים פרטי הזמנה
- נוצרה הזמנה עם סטטוס `quote_requested`
- נשלחת התראה למנהל
- המנהל יכול להציג את כל הבקשות

### 5.5 הצעת מחיר
- המנהל יכול לקבוע מחיר סופי
- המנהל יכול להוסיף:
  - מחיר
  - דמי משלוח
  - מקדמה
  - תאריך אספקה
  - הערות
- ההצעה נשלחת ללקוח

### 5.6 אישור/דחייה
- לקוח מאשר או דוחה את ההצעה
- אם דחה, אפשר לשנות פרטים ולבקש הצעה חדשה
- אם אישר, הופך ל-`quote_accepted`

### 5.7 תשלום
- מופיע רק לאחר אישור הצעת מחיר
- אפשרות לבחור אמצעי תשלום
- תשלום מראש או מקדמה
- יצירת רשומת תשלום
- עדכון סטטוס להזמנה ל-`payment_pending`, ואז ל-`paid`
- המנהל מאשר/מאמת את התשלום

### 5.8 ניהול הזמנות
- רשימת הזמנות למנהל
- סינון לפי סטטוס
- חיפוש לפי לקוח, טלפון, תאריך
- שינוי סטטוס
- הוספת הערות פנימיות

### 5.9 ניהול משלוחים
- כתובת משלוח
- אזור/עיר
- שעת משלוח אם יש
- עקיבה אחרי משלוח
- סטטוס שליח/משלוח

---

## 6. דרישות לא פונקציונליות

- אבטחת מערכת
- JWT לאימות משתמשים
- הרשאות לפי תפקיד (admin/user)
- UI רספונסיבי
- תאימות למובייל
- עיצוב נקי ומקצועי
- מהירות טעינה טובה
- הגנה על נתונים
- לוגים וניתוח שגיאות

---

## 7. מודלי נתונים מומלצים

### 7.1 User
- id
- name
- email
- phone
- password
- role
- address
- createdAt
- updatedAt

### 7.2 Product
- id
- name
- category
- description
- images
- basePrice
- isCustomizable
- isActive
- createdAt

### 7.3 ProductOption
- id
- productId
- name
- type
- values
- extraPrice

### 7.4 Cart
- id
- userId
- items
- updatedAt

### 7.5 CartItem
- id
- cartId
- productId
- quantity
- selectedOptions
- customNotes
- unitPrice

### 7.6 Order
- id
- userId
- orderNumber
- status
- subtotal
- deliveryFee
- totalPrice
- finalPrice
- deliveryDate
- deliveryAddress
- notes
- createdAt
- updatedAt

### 7.7 OrderItem
- id
- orderId
- productId
- productName
- quantity
- selectedOptions
- customNotes
- unitPrice
- totalPrice

### 7.8 Quote
- id
- orderId
- adminId
- quotePrice
- deliveryFee
- depositAmount
- notes
- validUntil
- status
- createdAt

### 7.9 Payment
- id
- orderId
- userId
- amount
- paymentMethod
- status
- transactionId
- createdAt

---

## 8. דוגמת JSON להזמנה

```json
{
  "userId": "u123",
  "orderNumber": "ORD-1042",
  "status": "quote_requested",
  "subtotal": 0,
  "deliveryFee": 0,
  "totalPrice": 0,
  "finalPrice": 0,
  "deliveryDate": "2026-09-05",
  "deliveryAddress": {
    "city": "תל אביב",
    "street": "ביצרון 10",
    "zipCode": "63303"
  },
  "notes": "הזמנה לתאריך יום הולדת",
  "items": [
    {
      "productId": "p456",
      "productName": "עיצוב פירות מסיבת יום הולדת",
      "quantity": 1,
      "selectedOptions": {
        "fruitType": "תפוחים וגרגרים",
        "size": "גדול",
        "greetingCard": "כן"
      },
      "customNotes": "הוסף כרטיס ברכה עברית",
      "unitPrice": 0,
      "totalPrice": 0
    }
  ]
}
```

---

## 9. דוגמת הצעת מחיר

```json
{
  "orderId": "ord_1042",
  "adminId": "admin_1",
  "quotePrice": 280,
  "deliveryFee": 25,
  "depositAmount": 140,
  "notes": "המחיר כולל משלוח באזור תל אביב",
  "validUntil": "2026-08-28T18:00:00Z",
  "status": "quote_sent"
}
```

---

## 10. API מומלץ

### Orders
- POST /api/orders
- GET /api/orders
- GET /api/orders/:id
- PUT /api/orders/:id/status
- POST /api/orders/:id/request-quote

### Quotes
- POST /api/quotes
- GET /api/quotes/:orderId
- PUT /api/quotes/:id/accept
- PUT /api/quotes/:id/reject

### Payments
- POST /api/payments/create
- POST /api/payments/confirm

### Cart
- GET /api/cart
- POST /api/cart/add
- PUT /api/cart/update
- DELETE /api/cart/remove

---

## 11. מסכי Frontend מומלצים

### לקוח
- Home
- Catalog
- Product Details
- Custom Order Form
- Cart
- Quote Request Page
- Quote Review Page
- Checkout Page
- My Orders
- User Profile

### מנהל
- Dashboard
- Pending Quote Requests
- Quote Management
- Order Management
- Product Management
- Customer Management
- Delivery Tracking

---

## 12. שלבי פיתוח מומלצים

### שלב 1 – בסיס
- User
- Product
- Cart
- Login/Register

### שלב 2 – הזמנה + בקשת מחיר
- Order
- OrderItem
- Quote
- Quote request page
- Admin quote page

### שלב 3 – תשלום + אקספקט
- Payment
- Checkout
- Status flow
- уведомיות

### שלב 4 – ניהול והרחבה
- Dashboard
- Order analytics
- Delivery tracking
- Filters and search
- Coupons and promotions

---

## 13. החלטה עסקית חשובה

בקשת מחיר היא חלק אינטגרלי מהמודל העסקי. 
לא מומלץ לקבוע מחיר מיידי לפני בדיקה של פרטי ההזמנה, כי:
- ההזמנה מותאמת אישית
- מחיר תלוי בסטייל, כמות, תוספות, פרי ויעד
- הלקוח צריך לראות מחיר סופי לפני תשלום

לכן המודל הנכון הוא:

לקוח בוחר → שולח בקשת מחיר → מנהל מציע מחיר → לקוח מאשר → תשלום

---

## 14. מסקנה

הפרויקט צריך להיות מערכת הזמנות מותאמת אישית לעיצובי פירות, עם זרימת עבודה של הצעת מחיר לפני תשלום. 
הפוקוס העיקרי הוא על:
- עיצוב מותאם
- תהליך הזמנה שוטף
- ניהול כספי ודירוג מחיר
- אפשרות לסגירת הזמנה רק לאחר אישור מסודר

זוהי מערכת אמיתית, עסקית, וניתנת להרחבה.

---

## 15. משימות מומלצות להתחלה

1. יצירת מודלי User, Product, Order, OrderItem, Quote
2. יצירת מסך הלקוח להזמנת עיצוב
3. יצירת דף בקשת מחיר
4. יצירת ממשק מנהל להצעת מחיר
5. יצירת לוגיקת אישור/דחייה
6. הוספת תשלום אחרי אישור
7. הוספת סטטוסים ומעקב
8. יצירת דשבורד מנהל

---

## 16. סיכום קצר

הפרויקט מתאים למודל של חנות בקשת מחיר, לא לחנות רגילה. 
העבודה הראשונה היא להקים את לב הזרימה: הזמנה → הצעת מחיר → אישור → תשלום.

זהו היסוד שיביא את המערכת לרמת חנות מקצועית ומהימנה.
