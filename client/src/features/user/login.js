import { useEffect, useState, useRef } from "react";
import { useLoginMutation } from "./userSlice";
import {useNavigate, Link} from "react-router-dom"
import { InputText } from "primereact/inputtext";
import { FloatLabel } from "primereact/floatlabel";
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { setToken } from "./authSlice";
import { useUpdeteProductMutation } from "../basket/basketSlise";
import './Auth.css';
/* eslint-disable react-hooks/exhaustive-deps, no-unused-vars */
import {useSelector,useDispatch} from "react-redux"
const Login = () => {
    const toast = useRef(null);
    const dispatch=useDispatch() 
    const [login, { isError, isSuccess, error, data: loginData, isLoading }] = useLoginMutation()
    const [updateProduct] = useUpdeteProductMutation()
    const navigate=useNavigate();

    const [formDate, setFromDate] = useState({
       
        userName: "",
        password: ""
    })
    useEffect(() => {
        if (isSuccess) {
            toast.current.show({severity:'success', summary: 'הצלחה', detail: 'התחברת בהצלחה!', life: 3000});
            dispatch(setToken({ user: loginData?.user }))
            
            const pendingProductId = sessionStorage.getItem('pendingProductId');
            if (pendingProductId) {
                updateProduct({ id: pendingProductId })
                    .unwrap()
                    .then((response) => {
                        sessionStorage.removeItem('pendingProductId');
                        
                        setTimeout(() => {
                            toast.current.show({
                                severity:'success', 
                                summary: 'המוצר נוסף לסל', 
                                detail: response.message || 'המוצר שבחרת נוסף לסל הקניות', 
                                life: 3000
                            });
                        }, 1200);
                        
                        setTimeout(() => navigate("/allProduct/basket"), 2000);
                    })
                    .catch((error) => {
                        sessionStorage.removeItem('pendingProductId');
                        
                        setTimeout(() => {
                            if (error.data?.outOfStock) {
                                toast.current.show({
                                    severity:'error', 
                                    summary: 'המוצר אזל מהמלאי', 
                                    detail: `מצטערים, ${error.data.productName || 'המוצר'} אזל מהמלאי במהלך ההתחברות`, 
                                    life: 5000
                                });
                            } else {
                                toast.current.show({
                                    severity:'error', 
                                    summary: 'שגיאה', 
                                    detail: error.data?.message || 'לא הצלחנו להוסיף את המוצר לסל', 
                                    life: 4000
                                });
                            }
                        }, 1200);
                        
                        setTimeout(() => navigate("/allProduct"), 2500);
                    });
            } else {
                setTimeout(() => navigate("/allProduct"), 1000);
            }
        }
    }, [isSuccess])
    
    useEffect(() => {
        if (isError && error) {
            let errorMessage = 'שם משתמש או סיסמה שגויים';
            
            if (error.status === 429) {
                errorMessage = 'בוצעו יותר מדי ניסיונות התחברות. נסה שוב בעוד 15 דקות';
            } else if (error.data?.message) {
                errorMessage = error.data.message;
            } else if (error.error) {
                errorMessage = error.error;
            } else if (error.status) {
                switch(error.status) {
                    case 400:
                        errorMessage = 'יש למלא את כל השדות';
                        break;
                    case 401:
                        errorMessage = 'שם משתמש או סיסמה שגויים';
                        break;
                    case 429:
                        errorMessage = 'בוצעו יותר מדי ניסיונות התחברות. נסה שוב בעוד 15 דקות';
                        break;
                    case 500:
                        errorMessage = 'שגיאת שרת, נסה שוב מאוחר יותר';
                        break;
                    default:
                        errorMessage = `שגיאה: ${error.status}`;
                }
            }
            
            toast.current.show({
                severity: 'error', 
                summary: 'שגיאה בהתחברות', 
                detail: errorMessage,
                life: 5000
            });
        }
    }, [isError, error])
const change=(e)=>{
    const {name,value}=e.target
    setFromDate({
        ...formDate,
        [name]:value
    })
}
const submit= (e)=>{
    e.preventDefault();
    login(formDate)
}

    return (
        <div className="auth-container">
            <Toast ref={toast} />
            <div className="auth-card">
                <div className="auth-header">
                    <i className="pi pi-sign-in auth-icon"></i>
                    <h1 className="auth-title">התחברות</h1>
                    <p className="auth-subtitle">ברוכים השבים! נשמח לראות אותך שוב</p>
                </div>
                
                <form onSubmit={(e) => submit(e)} className="auth-form">
                    <div className="auth-input-group">
                        <div className="auth-input-wrapper">
                            <FloatLabel>
                                <InputText 
                                    id="userName" 
                                    value={formDate.userName}  
                                    onChange={(e) => change(e)} 
                                    type="text"  
                                    name="userName" 
                                    required 
                                />
                                <label htmlFor="userName">שם משתמש</label>
                            </FloatLabel>
                        </div>
                    </div>
                    
                    <div className="auth-input-group">
                        <div className="auth-input-wrapper">
                            <FloatLabel>
                                <InputText 
                                    id="password" 
                                    onChange={(e) => change(e)} 
                                    type="password" 
                                    name="password" 
                                    required 
                                />
                                <label htmlFor="password">סיסמה</label>
                            </FloatLabel>
                        </div>
                    </div>
                    
                    <Button 
                        label={isLoading ? "מתחבר..." : "התחבר"} 
                        type="submit"
                        loading={isLoading}
                        icon={isLoading ? "pi pi-spin pi-spinner" : "pi pi-sign-in"}
                        disabled={isLoading}
                        className="auth-submit-button"
                    />
                </form>
                
                <div className="auth-footer">
                    <p className="auth-footer-text">
                        <Link to="/forgot-password" className="auth-footer-link">שכחתי סיסמה</Link>
                    </p>
                    <p className="auth-footer-text">
                        עדיין לא רשום? <Link to="/register" className="auth-footer-link">הרשם עכשיו</Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
export default Login

