import React from 'react'
import { Card } from 'primereact/card'
import { Button } from 'primereact/button'
import { Tag } from 'primereact/tag'
import { Toast } from 'primereact/toast'
import { useGetMyOrdersQuery, useAcceptQuoteMutation, useRejectQuoteMutation, useCreatePaymentMutation } from './orderSlice'

const statusLabels = {
    draft: 'טיוטה',
    quote_requested: 'ממתין להצעת מחיר',
    quote_sent: 'הצעת מחיר נשלחה',
    quote_accepted: 'הצעה אושרה',
    quote_rejected: 'הצעה נדחתה',
    payment_pending: 'ממתין לתשלום',
    paid: 'שולם',
    confirmed: 'מאושר',
    preparing: 'בהכנה',
    ready_for_delivery: 'מוכן למשלוח',
    in_delivery: 'במשלוח',
    completed: 'הושלם',
    cancelled: 'בוטל'
}

const MyOrdersPage = () => {
    const { data: orders = [], isLoading, refetch } = useGetMyOrdersQuery()
    const [acceptQuote, { isLoading: isAccepting }] = useAcceptQuoteMutation()
    const [rejectQuote, { isLoading: isRejecting }] = useRejectQuoteMutation()
    const [createPayment, { isLoading: isPaying }] = useCreatePaymentMutation()
    const toast = React.useRef(null)

    const handleAcceptQuote = async (quoteId) => {
        try {
            await acceptQuote(quoteId).unwrap()
            toast.current?.show({
                severity: 'success',
                summary: 'הצלחה',
                detail: 'הצעת המחיר אושרה',
                life: 3000
            })
            refetch()
        } catch (error) {
            toast.current?.show({
                severity: 'error',
                summary: 'שגיאה',
                detail: error?.data?.message || 'לא הצלחנו לאשר את ההצעה',
                life: 3000
            })
        }
    }

    const handleRejectQuote = async (quoteId) => {
        try {
            await rejectQuote(quoteId).unwrap()
            toast.current?.show({
                severity: 'warn',
                summary: 'הצעה נדחתה',
                detail: 'הצעת המחיר נדחתה',
                life: 3000
            })
            refetch()
        } catch (error) {
            toast.current?.show({
                severity: 'error',
                summary: 'שגיאה',
                detail: error?.data?.message || 'לא הצלחנו לדחות את ההצעה',
                life: 3000
            })
        }
    }

    const handlePayOrder = async (order) => {
        const quote = order?.quote
        const amount = Number(quote?.depositAmount || quote?.quotePrice || order?.finalPrice || order?.totalPrice || 0)

        if (!amount) {
            toast.current?.show({
                severity: 'warn',
                summary: 'שגיאה',
                detail: 'לא נקבע סכום לתשלום',
                life: 3000
            })
            return
        }

        try {
            await createPayment({
                orderId: order._id,
                amount,
                paymentMethod: 'card',
                transactionId: `custom-order-${order.orderNumber}`,
                notes: 'תשלום עבור הזמנת עיצוב פירות' 
            }).unwrap()

            toast.current?.show({
                severity: 'success',
                summary: 'התשלום נשלח',
                detail: 'הזמנתך עברה לסטטוס תשלום בהמתנה',
                life: 3000
            })
            refetch()
        } catch (error) {
            toast.current?.show({
                severity: 'error',
                summary: 'שגיאה',
                detail: error?.data?.message || 'לא הצלחנו להתחיל את התשלום',
                life: 3000
            })
        }
    }

    return (
        <div style={{ maxWidth: 1100, margin: '32px auto', padding: 16 }}>
            <Toast ref={toast} />
            <Card title="ההזמנות שלי">
                {isLoading ? (
                    <p>טוען הזמנות...</p>
                ) : orders.length === 0 ? (
                    <p>עדיין אין הזמנות.</p>
                ) : (
                    <div style={{ display: 'grid', gap: 18 }}>
                        {orders.map((order) => (
                            <div key={order._id} style={{ border: '1px solid #ececec', borderRadius: 14, padding: 18 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                                    <div>
                                        <strong>{order.orderNumber}</strong>
                                        <div>תאריך: {new Date(order.createdAt).toLocaleDateString('he-IL')}</div>
                                    </div>
                                    <Tag value={statusLabels[order.status] || order.status} severity={order.status === 'paid' || order.status === 'confirmed' ? 'success' : 'info'} />
                                </div>

                                <div style={{ marginTop: 12 }}>
                                    {order.items?.map((item, index) => (
                                        <div key={`${order._id}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                                            <span>{item.productName}</span>
                                            <span>{item.totalPrice || 0} ₪</span>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                                    <strong>סך הכל: {order.finalPrice || order.totalPrice || 0} ₪</strong>

                                    {order.quote && (
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                            {(order.status === 'quote_sent' || order.status === 'quote_requested') && (
                                                <>
                                                    <Button
                                                        label={isAccepting ? 'מאשר...' : 'אשר הצעה'}
                                                        onClick={() => handleAcceptQuote(order.quote._id)}
                                                        disabled={isAccepting || isRejecting}
                                                    />
                                                    <Button
                                                        label={isRejecting ? 'דוחה...' : 'דחה הצעה'}
                                                        severity="secondary"
                                                        className="p-button-outlined"
                                                        onClick={() => handleRejectQuote(order.quote._id)}
                                                        disabled={isAccepting || isRejecting}
                                                    />
                                                </>
                                            )}

                                            {order.status === 'quote_accepted' && (
                                                <Button
                                                    label={isPaying ? 'מעביר לתשלום...' : 'שלם עכשיו'}
                                                    onClick={() => handlePayOrder(order)}
                                                    disabled={isPaying}
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>

                                {order.quote && (
                                    <div style={{ marginTop: 14, background: '#fafafa', borderRadius: 10, padding: 12 }}>
                                        <div><strong>הצעת מחיר:</strong> {order.quote.quotePrice || 0} ₪</div>
                                        <div><strong>דמי משלוח:</strong> {order.quote.deliveryFee || 0} ₪</div>
                                        <div><strong>מקדמה:</strong> {order.quote.depositAmount || 0} ₪</div>
                                        {order.quote.notes && <div><strong>הערות:</strong> {order.quote.notes}</div>}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    )
}

export default MyOrdersPage
