import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../../features/user/useAuth';

const RequireAuth = ({ children }) => {
    const { isUserLoggedIn, authInitialized } = useSelector((state) => state.auth);
    const location = useLocation();
    const user = useAuth();

    if (!authInitialized) {
        return <p aria-live="polite">טוען חיבור...</p>;
    }

    if (!isUserLoggedIn || !user) {
        // שמירת המיקום הנוכחי כדי לחזור אליו אחרי התחברות
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
};

export default RequireAuth;
