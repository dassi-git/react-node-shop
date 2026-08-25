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
    const roles = objToken?.role ?? null
    const isLoggedIn = Boolean(isUserLoggedIn && objToken)

    const handleLogout = () => {
        dispatch(logOut())
        navigate('/')
    }

    return (
        <>
            <div className="nav-top-strip">
                <div className="nav-top-strip-inner">
                    <span>💬 שירות לקוחות 24/7</span>
                    <span>🚚 משלוח חינם על הזמנות מעל 200$</span>
                    <span>🔒 תשלום מאובטח</span>
                </div>
            </div>

            <nav className="nav-sticky">
                <div className="nav-container">
                    <Link to="/" className="nav-logo">
                        <img src="/logo.png" alt="happily" className="nav-logo-img" />
                    </Link>
                    
                    <div className="nav-links">
                        <Link to="/">דף הבית</Link>
                        <Link to="/allProduct">מוצרים</Link>
                        {isLoggedIn && <Link to="/basket">סל קניות</Link>}
                        {isLoggedIn && <Link to="/my-orders">הזמנות שלי</Link>}
                        {isLoggedIn && <Link to="/profile">הפרופיל שלי</Link>}
                        {roles === "Admin" && isLoggedIn && <Link to="/adminproduct">ניהול מוצרים</Link>}
                        {roles === "Admin" && isLoggedIn && <Link to="/bundle-manager">ניהול חבילות</Link>}
                        {roles === "Admin" && isLoggedIn && <Link to="/adminusers">ניהול משתמשים</Link>}
                        {roles === "Admin" && isLoggedIn && <Link to="/admin-quotes">הצעות מחיר</Link>}
                        {isLoggedIn && <Link to="/quote-request">בקשת מחיר</Link>}
                        {!isLoggedIn && <Link to="/login">התחברות</Link>}
                        {!isLoggedIn && <Link to="/register">הרשמה</Link>}
                    </div>
                    
                    <div className="nav-user-section">
                        {isLoggedIn && <span className="nav-user-name">שלום {objToken?.name}</span>}
                        {isLoggedIn && (
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