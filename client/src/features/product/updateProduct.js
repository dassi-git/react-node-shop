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
import CustomizationEditor from './CustomizationEditor';

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
        image: productFromState?.image || "",
        images: productFromState?.images || (productFromState?.image ? [productFromState.image] : []),
        customizationOptions: productFromState?.customizationOptions || []
    })
    const [imageFiles, setImageFiles] = useState([])
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
                image: productFromState.image || "",
                images: productFromState.images || (productFromState.image ? [productFromState.image] : []),
                customizationOptions: productFromState.customizationOptions || []
            });
        }
    }, [productFromState]);

    useEffect(() => {
        if (imageFiles.length > 0) {
            const reader = new FileReader()
            reader.onload = (e) => setPreviewSrc(e.target.result)
            reader.readAsDataURL(imageFiles[0])
        } else {
            setPreviewSrc(formData.image || '')
        }
    }, [imageFiles, formData.image])

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

    const updateImageUrl = (index, value) => {
        const images = [...(formData.images || [])]
        images[index] = value
        handleChange('images', images)
        if (index === 0) handleChange('image', value)
    }

    const addImageUrl = () => {
        if ((formData.images || []).length < 7) handleChange('images', [...(formData.images || []), ''])
    }

    const removeImageUrl = (index) => {
        const images = (formData.images || []).filter((_, imageIndex) => imageIndex !== index)
        handleChange('images', images)
        handleChange('image', images[0] || '')
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        // If a new file is selected, send multipart/form-data
        if (imageFiles.length > 0) {
            const data = new FormData()
            data.append('_id', formData._id)
            data.append('name', formData.name)
            data.append('price', formData.price)
            data.append('body', formData.body)
            data.append('productExit', formData.productExit)
            data.append('customizationOptions', JSON.stringify(formData.customizationOptions))
            imageFiles.forEach((file) => data.append('imageFiles', file))
            data.append('images', JSON.stringify(formData.images || (formData.image ? [formData.image] : [])))
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
                                    currency="ILS"
                                    locale="he-IL"
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
                                    onChange={(e) => updateImageUrl(0, e.target.value)}
                                    placeholder="נתיב או URL לתמונה"
                                    className="w-full"
                                />
                                <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                                    {(formData.images || []).slice(1).map((image, index) => (
                                        <div key={index + 1} style={{ display: 'flex', gap: 8 }}>
                                            <InputText value={image} onChange={(e) => updateImageUrl(index + 1, e.target.value)} placeholder={`כתובת URL לתמונה ${index + 2}`} className="w-full" />
                                            <Button type="button" icon="pi pi-times" text severity="danger" onClick={() => removeImageUrl(index + 1)} tooltip="הסר כתובת" />
                                        </div>
                                    ))}
                                    {(formData.images || []).length < 7 && <Button type="button" label="הוסף כתובת URL" icon="pi pi-plus" outlined onClick={addImageUrl} />}
                                </div>
                            </div>

                            <div className="form-field">
                                <label htmlFor="imageFiles">העלאת תמונות נוספות (עד 7 בסך הכל)</label>
                                <input id="imageFiles" type="file" accept="image/*" multiple onChange={(e) => setImageFiles(Array.from(e.target.files).slice(0, 7))} />
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
                            <div className="form-field full-width">
                                <CustomizationEditor value={formData.customizationOptions} onChange={(customizationOptions) => handleChange('customizationOptions', customizationOptions)} />
                            </div>
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