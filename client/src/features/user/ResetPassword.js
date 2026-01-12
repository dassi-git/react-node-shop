import React, { useState, useRef, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useResetPasswordMutation } from './userSlice';
import { logOut } from './authSlice';
import './Auth.css';

const ResetPassword = () => {
    const { token } = useParams();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [resetPassword, { isLoading }] = useResetPasswordMutation();
    const [resetSuccess, setResetSuccess] = useState(false);
    const toast = useRef(null);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    // ניקוי טוקנים ישנים כשנכנסים לעמוד איפוס סיסמה
    useEffect(() => {
        dispatch(logOut());
    }, [dispatch]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!newPassword || !confirmPassword) {
            toast.current.show({
                severity: 'warn',
                summary: 'שים לב',
                detail: 'נא למלא את כל השדות',
                life: 3000
            });
            return;
        }

        if (newPassword.length < 6) {
            toast.current.show({
                severity: 'warn',
                summary: 'שים לב',
                detail: 'הסיסמה חייבת להכיל לפחות 6 תווים',
                life: 3000
            });
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.current.show({
                severity: 'warn',
                summary: 'שים לב',
                detail: 'הסיסמאות אינן תואמות',
                life: 3000
            });
            return;
        }

        try {
            await resetPassword({ token, newPassword }).unwrap();
            setResetSuccess(true);
            toast.current.show({
                severity: 'success',
                summary: 'הצלחה',
                detail: 'הסיסמה שונתה בהצלחה',
                life: 3000
            });
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (error) {
            toast.current.show({
                severity: 'error',
                summary: 'שגיאה',
                detail: error?.data?.message || 'אירעה שגיאה, נסה שוב',
                life: 3000
            });
        }
    };

    if (resetSuccess) {
        return (
            <div className="auth-container">
                <Toast ref={toast} />
                <div className="auth-card-wrapper">
                    <Card className="auth-card success-card">
                        <div className="auth-header">
                            <div className="success-icon">
                                <i className="pi pi-check-circle"></i>
                            </div>
                            <h2>הסיסמה שונתה בהצלחה!</h2>
                        </div>
                        
                        <div className="success-message">
                            <p>הסיסמה שלך עודכנה בהצלחה.</p>
                            <p>אתה מועבר לדף הכניסה...</p>
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <Toast ref={toast} />
            <div className="auth-card-wrapper">
                <Card className="auth-card">
                    <div className="auth-header">
                        <i className="pi pi-key auth-icon"></i>
                        <h2>איפוס סיסמה</h2>
                        <p>הזן סיסמה חדשה לחשבון שלך</p>
                    </div>

                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="p-field">
                            <label htmlFor="newPassword">סיסמה חדשה</label>
                            <Password
                                id="newPassword"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="הזן סיסמה חדשה"
                                toggleMask
                                feedback={true}
                                className="p-inputtext-lg"
                                disabled={isLoading}
                                inputStyle={{ width: '100%' }}
                            />
                        </div>

                        <div className="p-field">
                            <label htmlFor="confirmPassword">אימות סיסמה</label>
                            <Password
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="הזן סיסמה שוב"
                                toggleMask
                                feedback={false}
                                className="p-inputtext-lg"
                                disabled={isLoading}
                                inputStyle={{ width: '100%' }}
                            />
                        </div>

                        <Button
                            type="submit"
                            label={isLoading ? 'משנה סיסמה...' : 'שנה סיסמה'}
                            icon={isLoading ? 'pi pi-spin pi-spinner' : 'pi pi-check'}
                            className="p-button-lg"
                            disabled={isLoading}
                        />

                        <div className="auth-links">
                            <Button
                                label="חזרה לדף הכניסה"
                                className="p-button-text p-button-plain"
                                onClick={() => navigate('/login')}
                                type="button"
                            />
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default ResetPassword;
