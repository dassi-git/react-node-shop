// ייבוא ספריית jsonwebtoken לאימות טוקנים
const jwt = require('jsonwebtoken');

// middleware לאימות JWT token
const verifyJWT = (req, res, next) => {
    // קריאת ה-header של Authorization (תומך גם באותיות קטנות וגדולות)
    const authHeader = req.headers.authorization || req.headers.Authorization;

    // בדיקה שיש header ושהוא מתחיל ב-'Bearer '
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized - No token provided' });
    }

    // הפרדת הטוקן מהמילה 'Bearer'
    const token = authHeader.split(' ')[1];

    // אימות הטוקן מול המפתח הסודי
    jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET,
        (err, decoded) => {
            // אם יש שגיאה באימות הטוקן (פג תוקף, לא תקין, וכו')
            if (err) {
                return res.status(403).json({ message: 'Forbidden - Invalid or expired token' });
            }
            
            // הטוקן תקין - שמירת מידע המשתמש מהטוקן ב-req.user
            req.user = decoded;
            next(); // המשך לפונקציה הבאה
        }   
    );
};

module.exports = verifyJWT;
