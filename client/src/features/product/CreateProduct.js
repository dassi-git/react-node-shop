/* eslint-disable react-hooks/exhaustive-deps, no-unused-vars */
import { useCreateProductMutation } from "./productSlice"
import { useEffect, useState, useRef } from "react";
import {useNavigate} from "react-router-dom"
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { InputTextarea } from "primereact/inputtextarea";
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { Card } from 'primereact/card';
import './CreateProduct.css';
import CustomizationEditor from './CustomizationEditor';

const CreateProduct=()=>{
    const [register, { isError, isSuccess, error, isLoading }] = useCreateProductMutation()
    const navigate=useNavigate();
    const toast = useRef(null);

    const [formData, setFormData] = useState({
        name: "",
        price: 0,
        body: "",
        category: "General",
        inventoryStatus: "INSTOCK",
        rating: 4.5,
        image: "",
        images: [],
        customizationOptions: []
    })
    const [imageFiles, setImageFiles] = useState([])

    useEffect(() => {
        if (isSuccess) {
            toast.current.show({ 
                severity: 'success', 
                summary: 'הצלחה', 
                detail: 'המוצר נוסף בהצלחה', 
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
                detail: error?.data?.message || 'אירעה שגיאה ביצירת המוצר', 
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

        // If an image file is selected, send multipart/form-data
        if (imageFiles.length > 0) {
            const data = new FormData()
            data.append('name', formData.name)
            data.append('price', formData.price)
            data.append('body', formData.body)
            data.append('category', formData.category)
            data.append('inventoryStatus', formData.inventoryStatus)
            data.append('rating', formData.rating)
            imageFiles.forEach((file) => data.append('imageFiles', file))
            data.append('images', JSON.stringify(formData.image ? [formData.image] : []))
            data.append('customizationOptions', JSON.stringify(formData.customizationOptions))
            await register(data)
        } else {
            await register(formData)
        }
    }

    return (
        <div className="create-product-container">
            <Toast ref={toast} />
            
            {/* Hero Section */}
            <div className="create-product-hero">
                <h1 className="create-product-hero-title">הוספת מוצר חדש</h1>
                <p className="create-product-hero-subtitle">מלא את פרטי המוצר למטה</p>
            </div>

            <div className="create-product-content">
                <Card className="create-product-card">
                    <form onSubmit={handleSubmit} className="create-product-form">
                        <div className="form-grid">
                            <div className="form-field">
                                <label htmlFor="name">שם המוצר *</label>
                                <InputText 
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                    required
                                    placeholder="הזן שם מוצר"
                                    className="w-full"
                                />
                            </div>

                            <div className="form-field">
                                <label htmlFor="price">מחיר *</label>
                                <InputNumber 
                                    id="price"
                                    value={formData.price}
                                    onValueChange={(e) => handleChange('price', e.value)}
                                    mode="currency"
                                    currency="ILS"
                                    locale="he-IL"
                                    required
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
                            <div className="form-field full-width">
                                <CustomizationEditor value={formData.customizationOptions} onChange={(customizationOptions) => handleChange('customizationOptions', customizationOptions)} />
                            </div>

                            <div className="form-field">
                                <label htmlFor="category">קטגוריה</label>
                                <InputText 
                                    id="category"
                                    value={formData.category}
                                    onChange={(e) => handleChange('category', e.target.value)}
                                    placeholder="למשל: אלקטרוניקה"
                                    className="w-full"
                                />
                            </div>

                            <div className="form-field">
                                <label htmlFor="inventoryStatus">סטטוס מלאי</label>
                                <InputText 
                                    id="inventoryStatus"
                                    value={formData.inventoryStatus}
                                    onChange={(e) => handleChange('inventoryStatus', e.target.value)}
                                    placeholder="INSTOCK / LOWSTOCK / OUTOFSTOCK"
                                    className="w-full"
                                />
                            </div>

                            <div className="form-field">
                                <label htmlFor="rating">דירוג</label>
                                <InputNumber 
                                    id="rating"
                                    value={formData.rating}
                                    onValueChange={(e) => handleChange('rating', e.value)}
                                    min={0}
                                    max={5}
                                    step={0.5}
                                    className="w-full"
                                />
                            </div>

                            <div className="form-field">
                                <label htmlFor="imageFiles">תמונות מהמחשב (עד 7)</label>
                                <input
                                    id="imageFiles"
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => setImageFiles(Array.from(e.target.files).slice(0, 7))}
                                    className="w-full"
                                />
                                <label htmlFor="image">כתובת URL לתמונה ראשית</label>
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
                                label={isLoading ? "שומר..." : "שמור מוצר"}
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
export default CreateProduct