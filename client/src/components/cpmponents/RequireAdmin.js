import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../../features/user/useAuth';

const RequireAdmin = ({ children }) => {
    const { isUserLoggedIn } = useSelector((state) => state.auth);
    const location = useLocation();
    const objToken = useAuth();

    // אם המשתמש לא מחובר בכלל - העבר להתחברות
    if (!isUserLoggedIn || !objToken) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // אם המשתמש מחובר אבל לא Admin - העבר לדף הבית
    if (objToken?.role !== 'Admin') {
        return <Navigate to="/" replace />;
    }

    // אם המשתמש הוא Admin - אפשר גישה
    return children;
};

export default RequireAdmin;
