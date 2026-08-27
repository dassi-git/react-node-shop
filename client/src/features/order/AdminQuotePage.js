import React, { useState } from 'react'
import { useGetAllOrdersQuery, useCreateQuoteMutation } from './orderSlice'
import { Button } from 'primereact/button'
import { Card } from 'primereact/card'
import { InputNumber } from 'primereact/inputnumber'
import { InputText } from 'primereact/inputtext'
import { Toast } from 'primereact/toast'

const AdminQuotePage = () => {
    const { data: orders = [], isLoading } = useGetAllOrdersQuery()
    const [createQuote, { isLoading: isSendingQuote }] = useCreateQuoteMutation()
    const toast = React.useRef(null)
    const [quoteForm, setQuoteForm] = useState({
        orderId: '',
        quotePrice: 0,
        deliveryFee: 0,
        depositAmount: 0,
        notes: ''
    })

    const handleSubmitQuote = async () => {
        if (!quoteForm.orderId) {
            toast.current?.show({
                severity: 'warn',
                summary: 'שגיאה',
                detail: 'יש לבחור הזמנה',
                life: 3000
            })
            return
        }

        try {
            await createQuote({
                orderId: quoteForm.orderId,
                quotePrice: quoteForm.quotePrice,
                deliveryFee: quoteForm.deliveryFee,
                depositAmount: quoteForm.depositAmount,
                notes: quoteForm.notes,
                validUntil: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString()
            }).unwrap()

            toast.current?.show({
                severity: 'success',
                summary: 'הצעת מחיר נשלחה',
                detail: 'ההצעה נשלחה ללקוח',
                life: 3000
            })

            setQuoteForm({
                orderId: '',
                quotePrice: 0,
                deliveryFee: 0,
                depositAmount: 0,
                notes: ''
            })
        } catch (error) {
            toast.current?.show({
                severity: 'error',
                summary: 'שגיאה',
                detail: error?.data?.message || 'לא הצלחנו לשלח הצעת מחיר',
                life: 3000
            })
        }
    }

    return (
        <div style={{ maxWidth: 1100, margin: '32px auto', padding: 16 }}>
            <Toast ref={toast} />
            <Card title="ניהול הצעות מחיר">
                <div style={{ display: 'grid', gap: 20 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                        <div>
                            <label>בחר הזמנה</label>
                            <select value={quoteForm.orderId} onChange={(e) => setQuoteForm((prev) => ({ ...prev, orderId: e.target.value }))} style={{ width: '100%', padding: 10 }}>
                                <option value="">בחר...</option>
                                {orders.map((order) => (
                                    <option key={order._id} value={order._id}>
                                        {order.orderNumber} – {order.userId?.name || 'לקוח'}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label>מחיר מוצע</label>
                            <InputNumber value={quoteForm.quotePrice} onValueChange={(e) => setQuoteForm((prev) => ({ ...prev, quotePrice: e.value || 0 }))} mode="currency" currency="ILS" locale="he-IL" style={{ width: '100%' }} />
                        </div>
                        <div>
                            <label>דמי משלוח</label>
                            <InputNumber value={quoteForm.deliveryFee} onValueChange={(e) => setQuoteForm((prev) => ({ ...prev, deliveryFee: e.value || 0 }))} mode="currency" currency="ILS" locale="he-IL" style={{ width: '100%' }} />
                        </div>
                        <div>
                            <label>מקדמה</label>
                            <InputNumber value={quoteForm.depositAmount} onValueChange={(e) => setQuoteForm((prev) => ({ ...prev, depositAmount: e.value || 0 }))} mode="currency" currency="ILS" locale="he-IL" style={{ width: '100%' }} />
                        </div>
                    </div>

                    <div>
                        <label>הערות</label>
                        <InputText value={quoteForm.notes} onChange={(e) => setQuoteForm((prev) => ({ ...prev, notes: e.target.value }))} style={{ width: '100%' }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button label={isSendingQuote ? 'שולח...' : 'שלח הצעת מחיר'} onClick={handleSubmitQuote} disabled={isSendingQuote || isLoading} />
                    </div>
                </div>
            </Card>

            <div style={{ marginTop: 24 }}>
                <Card title="הזמנות ממתינות">
                    {orders.length === 0 ? (
                        <p>אין הזמנות כרגע.</p>
                    ) : (
                        <div style={{ display: 'grid', gap: 12 }}>
                            {orders.map((order) => (
                                <div key={order._id} style={{ border: '1px solid #ddd', borderRadius: 12, padding: 16 }}>
                                    <strong>{order.orderNumber}</strong>
                                    <div>לקוח: {order.userId?.name || 'לא ידוע'}</div>
                                    <div>סטטוס: {order.status}</div>
                                    <div>סכום: {order.totalPrice || 0} ₪</div>
                                    <div style={{ marginTop: 10 }}><strong>פריטים שביקש הלקוח:</strong></div>
                                    {order.items?.length ? (
                                        <ul style={{ margin: '8px 0 12px', paddingRight: 20 }}>
                                            {order.items.map((item, index) => (
                                                <li key={`${order._id}-item-${index}`}>
                                                    {item.productName} × {item.quantity} | {item.unitPrice || 0} ₪ ליחידה
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div style={{ margin: '8px 0 12px' }}>לא נמצאו פריטים בהזמנה</div>
                                    )}
                                    {order.deliveryAddress && <div>כתובת: {order.deliveryAddress.city || '-'} {order.deliveryAddress.street || ''}</div>}
                                    {order.notes && <div>הערות לקוח: {order.notes}</div>}
                                    <Button label="בחר להזמנה" className="p-button-outlined" onClick={() => setQuoteForm((prev) => ({ ...prev, orderId: order._id, quotePrice: order.totalPrice || 0 }))} />
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    )
}

export default AdminQuotePage
