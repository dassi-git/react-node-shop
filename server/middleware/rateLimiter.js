// ייבוא הספרייה express-rate-limit שמספקת פונקציונליות של הגבלת קצב בקשות
const rateLimit = require('express-rate-limit');

// הגדרת מגביל קצב לניסיונות התחברות
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // חלון זמן של 15 דקות (במילישניות)
    max: 5, // מקסימום 5 בקשות לכל IP בתוך חלון הזמן
    message: {
        message: 'Too many login attempts from this IP, please try again after 15 minutes' // הודעת שגיאה שתוצג כשעוברים את המגבלה
    },
    standardHeaders: true, // הוספת headers סטנדרטיים (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset)
    legacyHeaders: false, // ללא headers ישנים (X-RateLimit-*)
    skipSuccessfulRequests: false // ספירת גם בקשות מצליחות (לא רק כושלות)
});

// הגדרת מגביל קצב לרישום משתמשים חדשים
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // חלון זמן של שעה אחת (במילישניות)
    max: 3, // מקסימום 3 בקשות רישום לכל IP בתוך חלון הזמן
    message: {
        message: 'Too many accounts created from this IP, please try again after an hour' // הודעת שגיאה שתוצג כשעוברים את המגבלה
    },
    standardHeaders: true, // הוספת headers סטנדרטיים לתשובה
    legacyHeaders: false // ללא headers ישנים
});

// הגדרת מגביל קצב לבקשות איפוס סיסמה
const passwordResetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // חלון זמן של 15 דקות (במילישניות)
    max: 3, // מקסימום 3 בקשות איפוס לכל IP בתוך חלון הזמן
    message: {
        message: 'Too many password reset attempts from this IP, please try again after 15 minutes' // הודעת שגיאה שתוצג כשעוברים את המגבלה
    },
    standardHeaders: true, // הוספת headers סטנדרטיים לתשובה
    legacyHeaders: false // ללא headers ישנים
});

// הגדרת מגביל קצב כללי לכל בקשות ה-API
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // חלון זמן של 15 דקות (במילישניות)
    max: 100, // מקסימום 100 בקשות לכל IP בתוך חלון הזמן
    message: {
        message: 'Too many requests from this IP, please try again after 15 minutes' // הודעת שגיאה שתוצג כשעוברים את המגבלה
    },
    standardHeaders: true, // הוספת headers סטנדרטיים לתשובה
    legacyHeaders: false // ללא headers ישנים
});

// ייצוא כל המגבלים כדי שניתן יהיה להשתמש בהם במסלולים השונים
module.exports = {
    loginLimiter, // מגביל התחברות
    registerLimiter, // מגביל רישום
    passwordResetLimiter, // מגביל איפוס סיסמה
    apiLimiter // מגביל כללי
};
