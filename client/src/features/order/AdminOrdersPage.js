import React, { useMemo, useRef, useState } from 'react'
import { Button } from 'primereact/button'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { Dialog } from 'primereact/dialog'
import { Dropdown } from 'primereact/dropdown'
import { InputText } from 'primereact/inputtext'
import { Tag } from 'primereact/tag'
import { Toast } from 'primereact/toast'
import { useGetAllOrdersQuery, useUpdateOrderStatusMutation } from './orderSlice'
import './AdminOrdersPage.css'

const statusOptions = [
    { label: 'כל הסטטוסים', value: 'all' },
    { label: 'ממתין להצעת מחיר', value: 'quote_requested' },
    { label: 'הצעת מחיר נשלחה', value: 'quote_sent' },
    { label: 'הצעה אושרה', value: 'quote_accepted' },
    { label: 'ממתין לתשלום', value: 'payment_pending' },
    { label: 'שולם', value: 'paid' },
    { label: 'מאושר', value: 'confirmed' },
    { label: 'בהכנה', value: 'preparing' },
    { label: 'מוכן למשלוח', value: 'ready_for_delivery' },
    { label: 'במשלוח', value: 'in_delivery' },
    { label: 'הושלם', value: 'completed' },
    { label: 'בוטל', value: 'cancelled' }
]

const statusLabels = statusOptions.reduce((labels, option) => {
    if (option.value !== 'all') labels[option.value] = option.label
    return labels
}, {})

const statusSeverity = {
    quote_requested: 'warning',
    quote_sent: 'info',
    quote_accepted: 'success',
    payment_pending: 'warning',
    paid: 'success',
    confirmed: 'success',
    preparing: 'info',
    ready_for_delivery: 'info',
    in_delivery: 'info',
    completed: 'success',
    cancelled: 'danger'
}

const currency = (value) => `${Number(value || 0).toLocaleString('he-IL')} ₪`

const AdminOrdersPage = () => {
    const { data: orders = [], isLoading, isError, refetch } = useGetAllOrdersQuery()
    const [updateOrderStatus, { isLoading: isUpdating }] = useUpdateOrderStatusMutation()
    const [search, setSearch] = useState('')
    const [selectedStatus, setSelectedStatus] = useState('all')
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [nextStatus, setNextStatus] = useState(null)
    const toast = useRef(null)

    const filteredOrders = useMemo(() => {
        const term = search.trim().toLowerCase()
        return orders.filter((order) => {
            const customer = order.userId || {}
            const matchesSearch = !term || [order.orderNumber, customer.name, customer.email, customer.phone]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(term))
            const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus
            return matchesSearch && matchesStatus
        })
    }, [orders, search, selectedStatus])

    const stats = useMemo(() => ({
        total: orders.length,
        waiting: orders.filter((order) => ['quote_requested', 'quote_sent'].includes(order.status)).length,
        active: orders.filter((order) => ['quote_accepted', 'payment_pending', 'paid', 'confirmed', 'preparing', 'ready_for_delivery', 'in_delivery'].includes(order.status)).length,
        completed: orders.filter((order) => order.status === 'completed').length
    }), [orders])

    const saveStatus = async () => {
        if (!selectedOrder || !nextStatus || nextStatus === selectedOrder.status) return
        try {
            await updateOrderStatus({ id: selectedOrder._id, status: nextStatus }).unwrap()
            toast.current?.show({ severity: 'success', summary: 'הסטטוס עודכן', detail: 'סטטוס ההזמנה נשמר בהצלחה', life: 2500 })
            setSelectedOrder((order) => ({ ...order, status: nextStatus }))
            setNextStatus(null)
            refetch()
        } catch (error) {
            toast.current?.show({ severity: 'error', summary: 'שגיאה', detail: error?.data?.message || 'לא ניתן לעדכן את הסטטוס', life: 3000 })
        }
    }

    const openOrder = (order) => {
        setSelectedOrder(order)
        setNextStatus(order.status)
    }

    const dateBody = (order) => order.createdAt ? new Date(order.createdAt).toLocaleDateString('he-IL') : '-'
    const customerBody = (order) => <div><strong>{order.userId?.name || 'לקוח ללא שם'}</strong><small>{order.userId?.email || order.userId?.phone || ''}</small></div>
    const statusBody = (order) => <Tag value={statusLabels[order.status] || order.status} severity={statusSeverity[order.status] || 'secondary'} />
    const totalBody = (order) => currency(order.finalPrice || order.totalPrice)
    const actionBody = (order) => <Button icon="pi pi-eye" rounded outlined tooltip="פתיחת פרטי הזמנה" tooltipOptions={{ position: 'top' }} onClick={() => openOrder(order)} />

    if (isLoading) return <div className="admin-orders-state"><i className="pi pi-spin pi-spinner" /><p>טוען הזמנות...</p></div>
    if (isError) return <div className="admin-orders-state"><i className="pi pi-exclamation-circle" /><h2>לא הצלחנו לטעון את ההזמנות</h2><Button label="נסה שוב" icon="pi pi-refresh" onClick={refetch} /></div>

    return (
        <div className="admin-orders-page">
            <Toast ref={toast} />
            <header className="admin-orders-hero"><div><span>מרכז שליטה</span><h1>ניהול הזמנות</h1><p>מעקב אחר הזמנות, הצעות מחיר והכנת המשלוחים</p></div><Button label="רענן נתונים" icon="pi pi-refresh" outlined onClick={refetch} /></header>

            <section className="admin-orders-stats">
                <div><i className="pi pi-inbox" /><span>סה״כ הזמנות</span><strong>{stats.total}</strong></div>
                <div><i className="pi pi-clock" /><span>ממתינות לטיפול</span><strong>{stats.waiting}</strong></div>
                <div><i className="pi pi-truck" /><span>בטיפול ומשלוח</span><strong>{stats.active}</strong></div>
                <div><i className="pi pi-check-circle" /><span>הושלמו</span><strong>{stats.completed}</strong></div>
            </section>

            <section className="admin-orders-panel">
                <div className="admin-orders-toolbar">
                    <span className="p-input-icon-left"><i className="pi pi-search" /><InputText value={search} onChange={(event) => setSearch(event.target.value)} placeholder="חיפוש לפי מספר הזמנה או לקוח" /></span>
                    <Dropdown value={selectedStatus} options={statusOptions} onChange={(event) => setSelectedStatus(event.value)} placeholder="סינון לפי סטטוס" />
                </div>
                <DataTable value={filteredOrders} paginator rows={10} rowsPerPageOptions={[5, 10, 25]} responsiveLayout="scroll" stripedRows emptyMessage="לא נמצאו הזמנות מתאימות" currentPageReportTemplate="מציג {first} עד {last} מתוך {totalRecords} הזמנות">
                    <Column field="orderNumber" header="מספר הזמנה" sortable />
                    <Column header="לקוח" body={customerBody} />
                    <Column field="createdAt" header="תאריך" body={dateBody} sortable />
                    <Column header="סטטוס" body={statusBody} />
                    <Column header="סכום" body={totalBody} />
                    <Column header="פרטים" body={actionBody} />
                </DataTable>
            </section>

            <Dialog header={selectedOrder ? `הזמנה ${selectedOrder.orderNumber}` : 'פרטי הזמנה'} visible={Boolean(selectedOrder)} onHide={() => setSelectedOrder(null)} modal className="admin-order-dialog" footer={<><Button label="סגירה" outlined onClick={() => setSelectedOrder(null)} /><Button label={isUpdating ? 'שומר...' : 'שמור סטטוס'} icon="pi pi-check" onClick={saveStatus} disabled={isUpdating || !nextStatus || nextStatus === selectedOrder?.status} /></>}>
                {selectedOrder && <div className="admin-order-details">
                    <div className="detail-grid"><div><span>לקוח</span><strong>{selectedOrder.userId?.name || 'לא ידוע'}</strong></div><div><span>אימייל</span><strong>{selectedOrder.userId?.email || '-'}</strong></div><div><span>טלפון</span><strong>{selectedOrder.userId?.phone || '-'}</strong></div><div><span>תאריך אספקה</span><strong>{selectedOrder.deliveryDate ? new Date(selectedOrder.deliveryDate).toLocaleDateString('he-IL') : '-'}</strong></div></div>
                    <div className="status-editor"><label htmlFor="order-status">סטטוס הזמנה</label><Dropdown id="order-status" value={nextStatus} options={statusOptions.filter((option) => option.value !== 'all')} onChange={(event) => setNextStatus(event.value)} /></div>
                    <div className="detail-section"><h3>פריטים</h3>{selectedOrder.items?.map((item, index) => <div className="order-item" key={`${selectedOrder._id}-${index}`}><span>{item.productName} × {item.quantity}</span><strong>{currency(item.totalPrice)}</strong></div>)}</div>
                    <div className="detail-section"><h3>כתובת והערות</h3><p>{selectedOrder.deliveryAddress?.city || '-'} {selectedOrder.deliveryAddress?.street || ''}</p><p>{selectedOrder.notes || 'אין הערות'}</p></div>
                    {selectedOrder.quote && <div className="quote-summary"><h3>הצעת מחיר</h3><p>מחיר: <strong>{currency(selectedOrder.quote.quotePrice)}</strong></p><p>משלוח: <strong>{currency(selectedOrder.quote.deliveryFee)}</strong></p><p>מקדמה: <strong>{currency(selectedOrder.quote.depositAmount)}</strong></p><p>{selectedOrder.quote.notes || 'ללא הערות להצעה'}</p></div>}
                </div>}
            </Dialog>
        </div>
    )
}

export default AdminOrdersPage
