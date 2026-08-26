import React, { useState, useRef, useEffect } from 'react';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { Avatar } from 'primereact/avatar';
import { Divider } from 'primereact/divider';
import { Password } from 'primereact/password';
import { Skeleton } from 'primereact/skeleton';
import { Tag } from 'primereact/tag';
import { useUpdateUserMutation, useGetCurrentUserProfileQuery } from './userSlice';
import useAuth from './useAuth';
import './UserProfile.css';

const UserProfile = () => {
    const { _id } = useAuth();
    const [updateUser, { isLoading }] = useUpdateUserMutation();
    const { data: userData, isLoading: isLoadingUsers, error } = useGetCurrentUserProfileQuery();
    const toast = useRef(null);
    
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        userName: '',
        email: '',
        phone: '',
        address: '',
        newPassword: '',
        confirmPassword: ''
    });

    // טעינת נתונים מהשרת
    useEffect(() => {
        if (userData) {
            setFormData({
                name: userData.name || '',
                userName: userData.userName || '',
                email: userData.email || '',
                phone: userData.phone || '',
                address: userData.address || '',
                newPassword: '',
                confirmPassword: ''
            });
        }
    }, [userData]);
    
    // הצגת שגיאה אם יש
    useEffect(() => {
        if (error) {
            toast.current?.show({
                severity: 'error',
                summary: 'שגיאה',
                detail: error?.data?.message || 'שגיאה בטעינת הפרופיל',
                life: 5000
            });
        }
    }, [error]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();


        if (!formData.name || !formData.userName || !formData.email || !formData.phone || !formData.address) {
            toast.current.show({
                severity: 'warn',
                summary: 'שים לב',
                detail: 'יש למלא את כל השדות הנדרשים',
                life: 3000
            });
            return;
        }

        // בדיקת סיסמה חדשה
        if (formData.newPassword) {
            if (formData.newPassword.length < 6) {
                toast.current.show({
                    severity: 'warn',
                    summary: 'שים לב',
                    detail: 'הסיסמה חייבת להכיל לפחות 6 תווים',
                    life: 3000
                });
                return;
            }
            if (formData.newPassword !== formData.confirmPassword) {
                toast.current.show({
                    severity: 'warn',
                    summary: 'שים לב',
                    detail: 'הסיסמאות אינן תואמות',
                    life: 3000
                });
                return;
            }
        }

        try {
            const updateData = {
                _id,
                name: formData.name,
                userName: formData.userName,
                email: formData.email,
                phone: formData.phone,
                address: formData.address
            };

            // הוספת סיסמה רק אם הוזנה
            if (formData.newPassword) {
                updateData.password = formData.newPassword;
            }

            await updateUser(updateData).unwrap();
            
            toast.current.show({
                severity: 'success',
                summary: 'הצלחה',
                detail: 'הפרטים עודכנו בהצלחה',
                life: 3000
            });

            setFormData(prev => ({
                ...prev,
                newPassword: '',
                confirmPassword: ''
            }));

            setIsEditing(false);
        } catch (error) {
            toast.current.show({
                severity: 'error',
                summary: 'שגיאה',
                detail: error?.data?.message || 'לא הצלחנו לעדכן את הפרטים',
                life: 3000
            });
        }
    };

    const getInitials = (name) => {
        if (!name) return 'U';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return parts[0][0] + parts[1][0];
        }
        return name[0];
    };

    const getRoleBadge = (role) => {
        if (role === 'Admin') {
            return <Tag value="מנהל" severity="success" icon="pi pi-shield" />;
        }
        return <Tag value="משתמש" severity="info" icon="pi pi-user" />;
    };

    const formatDate = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('he-IL');
    };

    if (isLoadingUsers || !userData) {
        return (
            <div className="user-profile-container">
                <div className="user-profile-hero">
                    <div className="user-profile-hero-content">
                        <Skeleton shape="circle" size="100px" />
                        <div>
                            <Skeleton width="200px" height="2.5rem" className="mb-2" />
                            <Skeleton width="250px" height="1.5rem" />
                        </div>
                    </div>
                </div>
                <div className="user-profile-content">
                    <Card className="user-profile-card">
                        <Skeleton width="200px" height="2rem" className="mb-3" />
                        <Divider />
                        <div className="form-grid">
                            <Skeleton width="100%" height="3rem" className="mb-3" />
                            <Skeleton width="100%" height="3rem" className="mb-3" />
                            <Skeleton width="100%" height="3rem" className="mb-3" />
                            <Skeleton width="100%" height="3rem" className="mb-3" />
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="user-profile-container">
            <Toast ref={toast} />

            {/* Hero Section */}
            <div className="user-profile-hero">
                <div className="user-profile-hero-content">
                    <Avatar 
                        label={getInitials(userData.name)} 
                        size="xlarge" 
                        shape="circle"
                        className="user-profile-avatar"
                    />
                    <div className="user-profile-hero-info">
                        <div className="user-profile-title-row">
                            <h1 className="user-profile-hero-title">{userData.name}</h1>
                            {getRoleBadge(userData.role)}
                        </div>
                        <p className="user-profile-hero-subtitle">
                            <i className="pi pi-envelope"></i> {userData.email}
                        </p>
                        <p className="user-profile-hero-subtitle">
                            <i className="pi pi-calendar"></i> הצטרף ב-{formatDate(userData.createdAt)}
                        </p>
                    </div>
                </div>
            </div>

            <div className="user-profile-content">
                {/* Info Cards */}
                <div className="profile-stats-grid">
                    <div className="profile-stat-card">
                        <div className="stat-icon stat-icon-primary">
                            <i className="pi pi-user"></i>
                        </div>
                        <div className="stat-content">
                            <p className="stat-label">שם משתמש</p>
                            <h3 className="stat-value">{userData.userName}</h3>
                        </div>
                    </div>

                    <div className="profile-stat-card">
                        <div className="stat-icon stat-icon-success">
                            <i className="pi pi-phone"></i>
                        </div>
                        <div className="stat-content">
                            <p className="stat-label">טלפון</p>
                            <h3 className="stat-value">{userData.phone || 'לא צוין'}</h3>
                        </div>
                    </div>

                    <div className="profile-stat-card">
                        <div className="stat-icon stat-icon-info">
                            <i className="pi pi-map-marker"></i>
                        </div>
                        <div className="stat-content">
                            <p className="stat-label">כתובת</p>
                            <h3 className="stat-value">{userData.address || 'לא צוינה'}</h3>
                        </div>
                    </div>
                </div>

                <Card className="user-profile-card">
                    <div className="user-profile-header">
                        <h2>
                            <i className="pi pi-user"></i>
                            פרטים אישיים
                        </h2>
                        {!isEditing && (
                            <Button
                                label="עריכה"
                                icon="pi pi-pencil"
                                className="p-button-outlined"
                                onClick={() => setIsEditing(true)}
                            />
                        )}
                    </div>

                    <Divider />

                    <form onSubmit={handleSubmit} className="user-profile-form">
                        <div className="form-grid">
                            <div className="form-field">
                                <label htmlFor="name">שם מלא *</label>
                                <InputText
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    disabled={!isEditing}
                                    className="w-full"
                                />
                            </div>

                            <div className="form-field">
                                <label htmlFor="userName">שם משתמש *</label>
                                <InputText
                                    id="userName"
                                    name="userName"
                                    value={formData.userName}
                                    onChange={handleInputChange}
                                    disabled={!isEditing}
                                    className="w-full"
                                />
                            </div>

                            <div className="form-field">
                                <label htmlFor="email">אימייל *</label>
                                <InputText
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    disabled={!isEditing}
                                    className="w-full"
                                />
                            </div>

                            <div className="form-field">
                                <label htmlFor="phone">טלפון *</label>
                                <InputText
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    disabled={!isEditing}
                                    className="w-full"
                                />
                            </div>

                            <div className="form-field form-field-full">
                                <label htmlFor="address">כתובת *</label>
                                <InputText
                                    id="address"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    disabled={!isEditing}
                                    className="w-full"
                                />
                            </div>
                        </div>

                        {isEditing && (
                            <>
                                <Divider />
                                <h3 className="password-section-title">
                                    <i className="pi pi-lock"></i>
                                    שינוי סיסמה (אופציונלי)
                                </h3>
                                
                                <div className="form-grid">
                                    <div className="form-field">
                                        <label htmlFor="newPassword">סיסמה חדשה</label>
                                        <Password
                                            id="newPassword"
                                            name="newPassword"
                                            value={formData.newPassword}
                                            onChange={handleInputChange}
                                            toggleMask
                                            feedback={false}
                                            className="w-full"
                                            inputClassName="w-full"
                                            placeholder="השאר ריק אם לא רוצה לשנות"
                                        />
                                    </div>

                                    <div className="form-field">
                                        <label htmlFor="confirmPassword">אימות סיסמה</label>
                                        <Password
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleInputChange}
                                            toggleMask
                                            feedback={false}
                                            className="w-full"
                                            inputClassName="w-full"
                                            placeholder="הזן שוב את הסיסמה החדשה"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {isEditing && (
                            <div className="form-actions">
                                <Button
                                    type="button"
                                    label="ביטול"
                                    icon="pi pi-times"
                                    className="p-button-outlined p-button-secondary"
                                    onClick={() => {
                                        setIsEditing(false);
                                        // איפוס השדות
                                        setFormData(prev => ({
                                            ...prev,
                                            newPassword: '',
                                            confirmPassword: ''
                                        }));
                                    }}
                                />
                                <Button
                                    type="submit"
                                    label="שמור שינויים"
                                    icon="pi pi-check"
                                    loading={isLoading}
                                />
                            </div>
                        )}
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default UserProfile;
