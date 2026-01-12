import { Link, useNavigate } from "react-router-dom"
import { useSelector, useDispatch } from "react-redux"
import useAuth from "../../features/user/useAuth"
import { logOut } from "../../features/user/authSlice"
import { Button } from 'primereact/button'
import './Nav.css'


const Nav = () => {
    const { isUserLoggedIn } = useSelector((state) => state.auth)
    const dispatch = useDispatch()
    const navigate = useNavigate()

    const objToken = useAuth()

    let roles = null;
    if (objToken) {
        roles = objToken.role;
    }

    const handleLogout = () => {
        dispatch(logOut())
        navigate('/')
    }

    return (
        <>
            <nav className="nav-sticky">
                <div className="nav-container">
                    <Link to="/" className="nav-logo">
                        <img src="/logo.png" alt="happily" className="nav-logo-img" />
                    </Link>
                    
                    <div className="nav-links">
                        <Link to="/">דף הבית</Link>
                        <Link to="/allProduct">מוצרים</Link>
                        {isUserLoggedIn && <Link to="/basket">סל קניות</Link>}
                        {isUserLoggedIn && <Link to="/profile">הפרופיל שלי</Link>}
                        {roles === "Admin" && isUserLoggedIn && <Link to="/adminproduct">ניהול מוצרים</Link>}
                        {roles === "Admin" && isUserLoggedIn && <Link to="/adminusers">ניהול משתמשים</Link>}
                        {!isUserLoggedIn && <Link to="/login">התחברות</Link>}
                        {!isUserLoggedIn && <Link to="/register">הרשמה</Link>}
                    </div>
                    
                    <div className="nav-user-section">
                        {isUserLoggedIn && <span className="nav-user-name">שלום {objToken.name}</span>}
                        {isUserLoggedIn && (
                            <Button 
                                label="יציאה" 
                                icon="pi pi-sign-out" 
                                onClick={handleLogout}
                                className="p-button-sm p-button-outlined p-button-danger"
                            />
                        )}
                    </div>
                </div>
            </nav>
        </>
    )
}
export default Nav