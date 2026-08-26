import React, { useMemo, useRef, useState } from 'react'
import { Button } from 'primereact/button'
import { Calendar } from 'primereact/calendar'
import { Dropdown } from 'primereact/dropdown'
import { InputNumber } from 'primereact/inputnumber'
import { InputText } from 'primereact/inputtext'
import { InputTextarea } from 'primereact/inputtextarea'
import { Tag } from 'primereact/tag'
import { Toast } from 'primereact/toast'
import { useCancelSeasonMutation, useCreateSeasonMutation, useGetAllSeasonsQuery, useGetCurrentSeasonsQuery, useUpdateSeasonMutation } from './seasonSlice'

const createEmptyForm = () => ({ fruitKey: '', displayName: '', validFrom: null, validUntil: null, status: 'available', priceAdjustment: 0, active: true, customerMessage: '', internalNote: '' })
const statuses = [{ label: 'זמין', value: 'available' }, { label: 'פרימיום עם תוספת', value: 'premium' }, { label: 'לא זמין', value: 'unavailable' }]
const statusLabels = { available: 'זמין', premium: 'פרימיום', unavailable: 'לא זמין' }

const toDate = (value) => value ? new Date(value) : null
const toDateString = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : value

const SeasonManagementPage = () => {
    const { data: seasons = [], isLoading, isError, refetch } = useGetAllSeasonsQuery()
    const [previewDate, setPreviewDate] = useState(new Date())
    const { data: preview = [] } = useGetCurrentSeasonsQuery(toDateString(previewDate))
    const [createSeason, { isLoading: isCreating }] = useCreateSeasonMutation()
    const [updateSeason, { isLoading: isUpdating }] = useUpdateSeasonMutation()
    const [cancelSeason] = useCancelSeasonMutation()
    const [form, setForm] = useState(createEmptyForm)
    const [editingId, setEditingId] = useState(null)
    const toast = useRef(null)

    const activePreview = useMemo(() => new Map(preview.map((item) => [item.fruitKey, item])), [preview])
    const updateField = (name, value) => setForm((current) => ({ ...current, [name]: value }))

    const submit = async (event) => {
        event.preventDefault()
        if (!form.fruitKey || !form.displayName || !form.validFrom || !form.validUntil) {
            toast.current?.show({ severity: 'warn', summary: 'פרטים חסרים', detail: 'יש למלא מפתח פרי, שם פרי, תאריך התחלה ותאריך סיום', life: 3000 })
            return
        }
        if (form.validUntil < form.validFrom) {
            toast.current?.show({ severity: 'warn', summary: 'טווח תאריכים שגוי', detail: 'תאריך הסיום חייב להיות אחרי תאריך ההתחלה', life: 3000 })
            return
        }
        const payload = { ...form, validFrom: toDateString(form.validFrom), validUntil: toDateString(form.validUntil), priceAdjustment: form.status === 'premium' ? Number(form.priceAdjustment || 0) : 0 }
        try {
            if (editingId) await updateSeason({ id: editingId, ...payload }).unwrap()
            else await createSeason(payload).unwrap()
            toast.current?.show({ severity: 'success', summary: 'נשמר', detail: 'הגדרת העונתיות נשמרה', life: 2500 })
            setForm(createEmptyForm())
            setEditingId(null)
        } catch (error) {
            toast.current?.show({ severity: 'error', summary: 'שגיאה', detail: error?.data?.message || 'לא ניתן לשמור את התקופה', life: 3500 })
        }
    }

    const startEdit = (season) => {
        setEditingId(season._id)
        setForm({ ...season, validFrom: toDate(season.validFrom), validUntil: toDate(season.validUntil) })
    }
    const cancel = async (season) => {
        try { await cancelSeason(season._id).unwrap(); toast.current?.show({ severity: 'success', summary: 'בוטל', detail: 'התקופה בוטלה', life: 2200 }) } catch (error) { toast.current?.show({ severity: 'error', summary: 'שגיאה', detail: error?.data?.message || 'לא ניתן לבטל את התקופה', life: 3000 }) }
    }

    return <div style={{ maxWidth: 1200, margin: '32px auto', padding: 16 }}>
        <Toast ref={toast} />
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginBottom: 24 }}>
            <div><h1>ניהול פירות עונתיים</h1><p>הגדרה גלובלית שמשפיעה על כל המוצרים באתר</p></div>
            <Button label="רענן" icon="pi pi-refresh" outlined onClick={refetch} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(320px, 1fr)', gap: 24 }}>
            <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
                <h2>{editingId ? 'עריכת תקופה' : 'הוספת תקופה'}</h2>
                <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
                    <InputText value={form.fruitKey} onChange={(event) => updateField('fruitKey', event.target.value)} placeholder="fruitKey למשל mango" required />
                    <InputText value={form.displayName} onChange={(event) => updateField('displayName', event.target.value)} placeholder="שם הפרי למשל מנגו" required />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><Calendar value={form.validFrom} onChange={(event) => updateField('validFrom', event.value)} dateFormat="yy-mm-dd" placeholder="מתאריך" showIcon required /><Calendar value={form.validUntil} onChange={(event) => updateField('validUntil', event.value)} dateFormat="yy-mm-dd" placeholder="עד תאריך" showIcon required /></div>
                    <Dropdown value={form.status} options={statuses} onChange={(event) => updateField('status', event.value)} />
                    {form.status === 'premium' && <InputNumber value={form.priceAdjustment} onValueChange={(event) => updateField('priceAdjustment', event.value)} mode="currency" currency="ILS" locale="he-IL" min={0} placeholder="תוספת מחיר" />}
                    <InputText value={form.customerMessage} onChange={(event) => updateField('customerMessage', event.target.value)} placeholder="הודעה ללקוח" />
                    <InputTextarea value={form.internalNote} onChange={(event) => updateField('internalNote', event.target.value)} placeholder="הערה פנימית" rows={3} />
                    <div style={{ display: 'flex', gap: 8 }}><Button type="submit" label={isCreating || isUpdating ? 'שומר...' : editingId ? 'עדכן תקופה' : 'שמור תקופה'} loading={isCreating || isUpdating} /><Button type="button" label="נקה" outlined onClick={() => { setForm(createEmptyForm()); setEditingId(null) }} /></div>
                </form>
            </section>
            <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
                <h2>Preview לפי תאריך</h2>
                <Calendar value={previewDate} onChange={(event) => setPreviewDate(event.value)} dateFormat="yy-mm-dd" showIcon />
                <div style={{ display: 'grid', gap: 8, marginTop: 16 }}>{Array.from(activePreview.values()).map((season) => <div key={season.fruitKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}><span>{season.displayName}</span><span><Tag value={statusLabels[season.status]} severity={season.status === 'premium' ? 'warning' : season.status === 'available' ? 'success' : 'danger'} /> {season.status === 'premium' && `+${season.priceAdjustment} ₪`}</span></div>)}{preview.length === 0 && <p>אין הגדרות פעילות בתאריך זה</p>}</div>
            </section>
        </div>
        <section style={{ marginTop: 24, display: 'grid', gap: 10 }}><h2>כל התקופות</h2>{isLoading ? <p>טוען...</p> : isError ? <Button label="נסה שוב" onClick={refetch} /> : seasons.map((season) => <div key={season._id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'center', borderBottom: '1px solid #eee', padding: '12px 0' }}><div><strong>{season.displayName}</strong><small style={{ display: 'block' }}>{season.fruitKey}</small></div><span>{new Date(season.validFrom).toLocaleDateString('he-IL')} - {new Date(season.validUntil).toLocaleDateString('he-IL')}</span><span><Tag value={statusLabels[season.status]} /> {season.status === 'premium' && `+${season.priceAdjustment} ₪`} {!season.active && ' (מבוטל)'}</span><div style={{ display: 'flex', gap: 6 }}><Button icon="pi pi-pencil" rounded text onClick={() => startEdit(season)} tooltip="ערוך" /><Button icon="pi pi-ban" rounded text severity="danger" disabled={!season.active} onClick={() => cancel(season)} tooltip="בטל תקופה" /></div></div>)}</section>
    </div>
}

export default SeasonManagementPage