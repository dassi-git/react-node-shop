/* eslint-disable react-hooks/exhaustive-deps, no-unused-vars */
import { useUppdateProductMutation } from "./productSlice"
import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom"
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { InputTextarea } from "primereact/inputtextarea";
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { Card } from 'primereact/card';
import './CreateProduct.css';

const UpdateProduct = () => {
    const [updateProduct, { isError, isSuccess, error, isLoading }] = useUppdateProductMutation()
    const navigate = useNavigate();
    const location = useLocation();
    const toast = useRef(null);
    
    // תמיכה בשתי דרכי העברת הנתונים: state.product או state ישירות
    const productFromState = location.state?.product || location.state;

    const [formData, setFormData] = useState({
        _id: productFromState?._id || "",
        name: productFromState?.name || "",
        price: productFromState?.price || 0,
        body: productFromState?.body || "",
        productExit: productFromState?.productExit || "",
        image: productFromState?.image || ""
    })
    const [imageFile, setImageFile] = useState(null)
    const [previewSrc, setPreviewSrc] = useState(formData.image || '')

    // טעינת נתונים מה-state כשהוא משתנה
    useEffect(() => {
        if (productFromState) {
            setFormData({
                _id: productFromState._id || "",
                name: productFromState.name || "",
                price: productFromState.price || 0,
                body: productFromState.body || "",
                productExit: productFromState.productExit || "",
                image: productFromState.image || ""
            });
        }
    }, [productFromState]);

    useEffect(() => {
        if (imageFile) {
            const reader = new FileReader()
            reader.onload = (e) => setPreviewSrc(e.target.result)
            reader.readAsDataURL(imageFile)
        } else {
            setPreviewSrc(formData.image || '')
        }
    }, [imageFile, formData.image])

    useEffect(() => {
        if (isSuccess) {
            toast.current.show({ 
                severity: 'success', 
                summary: 'הצלחה', 
                detail: 'המוצר עודכן בהצלחה', 
                life: 2000 
            });
            setTimeout(() => {
                navigate("/adminproduct")
            }, 2000);
        }
    }, [isSuccess])

    useEffect(() => {
        if (isError) {
            toast.current.show({ 
                severity: 'error', 
                summary: 'שגיאה', 
                detail: error?.data?.message || 'אירעה שגיאה בעדכון המוצר', 
                life: 3000 
            });
        }
    }, [isError])

    const handleChange = (name, value) => {
        setFormData({
            ...formData,
            [name]: value
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        // If a new file is selected, send multipart/form-data
        if (imageFile) {
            const data = new FormData()
            data.append('_id', formData._id)
            data.append('name', formData.name)
            data.append('price', formData.price)
            data.append('body', formData.body)
            data.append('productExit', formData.productExit)
            data.append('imageFile', imageFile)
            await updateProduct(data)
        } else {
            await updateProduct(formData)
        }
    }

    return (
        <div className="create-product-container">
            <Toast ref={toast} />
            
            {/* Hero Section */}
            <div className="create-product-hero">
                <h1 className="create-product-hero-title">עדכון מוצר</h1>
                <p className="create-product-hero-subtitle">ערוך את פרטי המוצר למטה</p>
            </div>

            <div className="create-product-content">
                <Card className="create-product-card">
                    <form onSubmit={handleSubmit} className="create-product-form">
                        <div className="form-grid">
                            <div className="form-field full-width">
                                <label htmlFor="_id">מזהה מוצר</label>
                                <InputText 
                                    id="_id"
                                    value={formData._id}
                                    disabled
                                    className="w-full"
                                />
                            </div>

                            <div className="form-field">
                                <label htmlFor="name">שם המוצר</label>
                                <InputText 
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                    placeholder="הזן שם מוצר"
                                    className="w-full"
                                />
                            </div>

                            <div className="form-field">
                                <label htmlFor="price">מחיר</label>
                                <InputNumber 
                                    id="price"
                                    value={formData.price}
                                    onValueChange={(e) => handleChange('price', e.value)}
                                    mode="currency"
                                    currency="USD"
                                    locale="en-US"
                                    placeholder="0.00"
                                    className="w-full"
                                    min={0}
                                />
                            </div>

                            <div className="form-field full-width">
                                <label htmlFor="body">תיאור</label>
                                <InputTextarea 
                                    id="body"
                                    value={formData.body}
                                    onChange={(e) => handleChange('body', e.target.value)}
                                    rows={4}
                                    placeholder="תיאור המוצר"
                                    className="w-full"
                                />
                            </div>

                            <div className="form-field">
                                <label htmlFor="productExit">מלאי</label>
                                <InputText 
                                    id="productExit"
                                    value={formData.productExit}
                                    onChange={(e) => handleChange('productExit', e.target.value)}
                                    placeholder="כמות במלאי"
                                    className="w-full"
                                />
                            </div>

                            <div className="form-field">
                                <label htmlFor="image">תמונה (URL)</label>
                                <InputText 
                                    id="image"
                                    value={formData.image}
                                    onChange={(e) => handleChange('image', e.target.value)}
                                    placeholder="נתיב או URL לתמונה"
                                    className="w-full"
                                />
                            </div>

                            <div className="form-field">
                                <label htmlFor="imageFile">החלפת תמונה (ממחשב)</label>
                                <input id="imageFile" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} />
                            </div>

                            {(previewSrc) && (
                                <div className="form-field full-width">
                                    <label>תצוגה מקדימה</label>
                                    <img 
                                        src={previewSrc.startsWith('http') || previewSrc.startsWith('/') ? previewSrc : previewSrc}
                                        alt="תצוגה מקדימה"
                                        style={{ 
                                            maxWidth: '200px', 
                                            maxHeight: '200px',
                                            borderRadius: '12px',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="form-actions">
                            <Button 
                                label="ביטול" 
                                icon="pi pi-times" 
                                onClick={() => navigate('/adminproduct')}
                                className="p-button-outlined p-button-secondary"
                                type="button"
                            />
                            <Button 
                                label={isLoading ? "מעדכן..." : "עדכן מוצר"}
                                icon={isLoading ? "pi pi-spin pi-spinner" : "pi pi-check"}
                                type="submit"
                                loading={isLoading}
                                className="create-product-submit-btn"
                            />
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    )
}
export default UpdateProduct