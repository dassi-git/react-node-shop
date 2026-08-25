import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from 'primereact/button'
import { InputText } from 'primereact/inputtext'
import { InputNumber } from 'primereact/inputnumber'
import { Calendar } from 'primereact/calendar'
import { Card } from 'primereact/card'
import { Toast } from 'primereact/toast'
import { useCreateOrderMutation } from './orderSlice'
import { useDeletebasketMutation, useGetBasketQuery } from '../basket/basketSlise'

const QuoteRequestPage = () => {
    const navigate = useNavigate()
    const [createOrder, { isLoading }] = useCreateOrderMutation()
    const { data: basket = [], isLoading: isBasketLoading } = useGetBasketQuery()
    const [deleteBasket] = useDeletebasketMutation()
    const toast = React.useRef(null)

    const [form, setForm] = useState({
        productName: 'עיצוב פירות מותאם אישית',
        quantity: 1,
        deliveryDate: null,
        city: '',
        street: '',
        notes: '',
        unitPrice: 0
    })

    const handleChange = (name, value) => {
        setForm((prev) => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async () => {
        if (!form.city || !form.street) {
            toast.current?.show({
                severity: 'warn',
                summary: 'שגיאה',
                detail: 'יש למלא את פרטי הכתובת והעיר',
                life: 3000
            })
            return
        }

        const basketItems = basket.filter((item) => item?._id && item?.name)
        const orderItems = basketItems.length > 0
            ? basketItems.map((item) => ({
                productId: item._id,
                productName: item.name,
                quantity: Number(item.quantity || 1),
                selectedOptions: { category: item.category || 'General' },
                customNotes: form.notes,
                unitPrice: Number(item.price || 0),
                totalPrice: Number(item.price || 0) * Number(item.quantity || 1)
            }))
            : [{
                productId: 'custom-order-item',
                productName: form.productName,
                quantity: Number(form.quantity || 1),
                selectedOptions: {
                    city: form.city,
                    deliveryDate: form.deliveryDate ? new Date(form.deliveryDate).toISOString() : null,
                    notes: form.notes
                },
                customNotes: form.notes,
                unitPrice: Number(form.unitPrice || 0),
                totalPrice: Number(form.unitPrice || 0) * Number(form.quantity || 1)
            }]

        const payload = {
            items: orderItems,
            deliveryDate: form.deliveryDate ? new Date(form.deliveryDate).toISOString() : null,
            deliveryAddress: {
                city: form.city,
                street: form.street,
                zipCode: '',
                phone: ''
            },
            notes: form.notes,
            deliveryFee: 0
        }

        try {
            await createOrder(payload).unwrap()
            if (basketItems.length > 0) {
                try {
                    await deleteBasket().unwrap()
                } catch (clearError) {
                    console.warn('Order created, but basket could not be cleared:', clearError)
                }
            }
            toast.current?.show({
                severity: 'success',
                summary: 'הזמנה נשלחה',
                detail: 'בקשת ההצעת מחיר נשלחה בהצלחה למנהל',
                life: 3000
            })
            setTimeout(() => navigate('/my-orders'), 1200)
        } catch (error) {
            toast.current?.show({
                severity: 'error',
                summary: 'שגיאה',
                detail: error?.data?.message || 'לא הצלחנו לשלוח את הבקשה',
                life: 3000
            })
        }
    }

    return (
        <div style={{ maxWidth: 900, margin: '32px auto', padding: 16 }}>
            <Toast ref={toast} />
            <Card title="בקשת הצעת מחיר">
                <div style={{ display: 'grid', gap: 20 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                        <div>
                            <label>שם ההזמנה</label>
                            <InputText value={form.productName} onChange={(e) => handleChange('productName', e.target.value)} style={{ width: '100%' }} />
                        </div>
                        <div>
                            <label>כמות</label>
                            <InputNumber value={form.quantity} onValueChange={(e) => handleChange('quantity', e.value)} style={{ width: '100%' }} />
                        </div>
                        <div>
                            <label>מחיר מוצע ראשוני</label>
                            <InputNumber value={form.unitPrice} onValueChange={(e) => handleChange('unitPrice', e.value)} mode="currency" currency="ILS" locale="he-IL" style={{ width: '100%' }} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                        <div>
                            <label>עיר</label>
                            <InputText value={form.city} onChange={(e) => handleChange('city', e.target.value)} style={{ width: '100%' }} />
                        </div>
                        <div>
                            <label>רחוב וכתובת</label>
                            <InputText value={form.street} onChange={(e) => handleChange('street', e.target.value)} style={{ width: '100%' }} />
                        </div>
                        <div>
                            <label>תאריך משלוח</label>
                            <Calendar value={form.deliveryDate} onChange={(e) => handleChange('deliveryDate', e.value)} dateFormat="dd/mm/yy" showIcon style={{ width: '100%' }} />
                        </div>
                    </div>

                    <div>
                        <label>הערות</label>
                        <textarea value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} rows={5} style={{ width: '100%', resize: 'vertical' }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                        <Button label="חזרה למוצרים" className="p-button-outlined" onClick={() => navigate('/allProduct')} />
                        <Button label={isLoading ? 'שולח...' : 'שלח בקשת הצעת מחיר'} onClick={handleSubmit} disabled={isLoading || isBasketLoading} />
                    </div>
                </div>
            </Card>
        </div>
    )
}

export default QuoteRequestPage
