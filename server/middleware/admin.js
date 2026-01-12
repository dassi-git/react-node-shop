// middleware לבדיקה שהמשתמש הוא אדמין
// צריך לרוץ אחרי verifyJWT middleware שמוודא שיש req.user
const verifyAdminJWT = (req, res, next) => {
    // בדיקה שיש משתמש מחובר (req.user צריך להיות קיים מה-verifyJWT middleware)
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized - No user found' })
    }

    // בדיקה אם המשתמש הוא אדמין
    if (req.user.role === "Admin") {
        next() // המשתמש הוא אדמין - המשך לפונקציה הבאה
    } else {
        // המשתמש לא אדמין - גישה נדחית
        return res.status(403).json({ message: 'Forbidden - Admin access required' })
    }
}

module.exports = verifyAdminJWT
