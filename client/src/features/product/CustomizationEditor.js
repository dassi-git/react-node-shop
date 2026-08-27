import React from 'react';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Checkbox } from 'primereact/checkbox';
import { useGetAllSeasonsQuery } from '../season/seasonSlice';

const emptyValue = () => ({ label: '', value: '', priceAdjustment: 0, active: true });
const emptyOption = () => ({ name: '', selectionType: 'single', required: false, values: [emptyValue()] });

export const normalizeCustomizationOptions = (options) => (Array.isArray(options) ? options : []).map((option) => ({
    ...option,
    maxSelections: option.maxSelections || null,
    additionalSelectionPrice: option.additionalSelectionPrice || 0,
    values: Array.isArray(option.values) && option.values.length ? option.values : [emptyValue()]
}));

const CustomizationEditor = ({ value, onChange }) => {
    const options = normalizeCustomizationOptions(value);
    const { data: seasons = [] } = useGetAllSeasonsQuery();
    const updateOption = (index, patch) => onChange(options.map((option, itemIndex) => itemIndex === index ? { ...option, ...patch } : option));
    const updateValue = (optionIndex, valueIndex, patch) => onChange(options.map((option, itemIndex) => itemIndex !== optionIndex ? option : {
        ...option,
        values: option.values.map((item, currentIndex) => currentIndex === valueIndex ? { ...item, ...patch } : item)
    }));
    const isFruitOption = (option) => String(option.name || '').toLowerCase().includes('פרי') || String(option.name || '').toLowerCase().includes('fruit');
    const fruitOptions = seasons.map((season) => ({ label: `${season.displayName} (${season.fruitKey})`, value: season.fruitKey }));
    const fruitOptionIndex = options.findIndex((option) => String(option.name || '').toLowerCase().includes('פרי') || String(option.name || '').toLowerCase().includes('fruit'));
    const fruitOption = fruitOptionIndex >= 0 ? options[fruitOptionIndex] : null;
    const fruitKeys = new Set((fruitOption?.values || []).map((item) => item.fruitKey || item.value));
    const updateFruitConfiguration = (patch) => {
        const current = options[fruitOptionIndex] || { name: 'בחירת פירות', selectionType: 'multiple', required: true, values: [] };
        const next = { ...current, ...patch };
        const nextOptions = fruitOptionIndex >= 0 ? options.map((item, index) => index === fruitOptionIndex ? next : item) : [...options, next];
        onChange(nextOptions);
    };
    const toggleFruit = (season) => {
        const values = fruitOption?.values || [];
        const exists = fruitKeys.has(season.fruitKey);
        const nextValues = exists ? values.filter((item) => (item.fruitKey || item.value) !== season.fruitKey) : [...values, { label: season.displayName, value: season.fruitKey, fruitKey: season.fruitKey, priceAdjustment: 0, active: true }];
        updateFruitConfiguration({ name: fruitOption?.name || 'בחירת פירות', selectionType: 'multiple', required: true, values: nextValues });
    };

    return (
        <div className="customization-editor" style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>פירות המגש</strong>
                <Button type="button" label={fruitOption ? 'הגדרת פירות קיימת' : 'הוסף הגדרת פירות'} icon="pi pi-apple" outlined onClick={() => updateFruitConfiguration({})} />
            </div>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, display: 'grid', gap: 12 }}>
                <p style={{ margin: 0 }}>בחר מתוך כל הקטלוג את הפירות שיכולים להיכלל במגש. העונה תקבע מה יוצג ללקוח בזמן ההזמנה.</p>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <label htmlFor="fruit-selection-customer"><input id="fruit-selection-customer" type="radio" checked={fruitOption?.required !== false && fruitOption?.selectionType === 'multiple'} onChange={() => updateFruitConfiguration({ name: 'בחירת פירות', selectionType: 'multiple', required: true })} /> הלקוח בוחר פירות</label>
                    <label htmlFor="fruit-selection-fixed"><input id="fruit-selection-fixed" type="radio" checked={Boolean(fruitOption && fruitOption.selectionType === 'single' && fruitOption.required === false)} onChange={() => updateFruitConfiguration({ name: 'בחירת פירות', selectionType: 'single', required: false, maxSelections: null, additionalSelectionPrice: 0 })} /> פירות קבועים מראש</label>
                </div>
                {fruitOption && fruitOption.selectionType === 'multiple' && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}><label htmlFor="fruit-max-selections">מספר פירות לבחירה<InputNumber inputId="fruit-max-selections" value={fruitOption.maxSelections || null} min={1} placeholder="מספר פירות לבחירה" onValueChange={(e) => updateFruitConfiguration({ maxSelections: e.value || null })} /></label><label htmlFor="fruit-additional-price">תוספת לכל פרי נוסף<InputNumber inputId="fruit-additional-price" value={fruitOption.additionalSelectionPrice || 0} min={0} mode="currency" currency="ILS" locale="he-IL" placeholder="תוספת לכל פרי נוסף" onValueChange={(e) => updateFruitConfiguration({ additionalSelectionPrice: e.value || 0 })} /></label></div>}
                {fruitOptions.length === 0 ? <p>יש להגדיר תחילה פירות במסך ניהול עונתיות.</p> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>{fruitOptions.map((season) => { const inputId = `fruit-option-${season.value}`; return <label key={season.value} htmlFor={inputId} style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Checkbox inputId={inputId} checked={fruitKeys.has(season.value)} onChange={() => toggleFruit(season)} />{season.label}</label> })}</div>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>אפשרויות נוספות</strong>
                <Button type="button" label="הוסף קבוצת אפשרויות" icon="pi pi-plus" onClick={() => onChange([...options, emptyOption()])} />
            </div>
            {options.map((option, optionIndex) => (optionIndex === fruitOptionIndex ? null : (
                <div key={optionIndex} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, display: 'grid', gap: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 8, alignItems: 'center' }}>
                        <InputText aria-label={`שם קבוצת אפשרויות ${optionIndex + 1}`} value={option.name} placeholder="למשל: גודל מגש" onChange={(e) => updateOption(optionIndex, { name: e.target.value })} />
                        <Dropdown aria-label={`סוג בחירה לקבוצה ${optionIndex + 1}`} value={option.selectionType} options={[{ label: 'בחירה אחת', value: 'single' }, { label: 'בחירה מרובה', value: 'multiple' }]} onChange={(e) => updateOption(optionIndex, { selectionType: e.value, maxSelections: e.value === 'single' ? null : option.maxSelections, additionalSelectionPrice: e.value === 'single' ? 0 : option.additionalSelectionPrice })} />
                        <label htmlFor={`option-required-${optionIndex}`}><input id={`option-required-${optionIndex}`} type="checkbox" checked={Boolean(option.required)} onChange={(e) => updateOption(optionIndex, { required: e.target.checked })} /> חובה</label>
                        <Button type="button" icon="pi pi-trash" severity="danger" text tooltip="מחק קבוצה" onClick={() => onChange(options.filter((_, index) => index !== optionIndex))} />
                    </div>
                    {option.selectionType === 'multiple' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <InputNumber aria-label={`מספר בחירות מרבי לקבוצה ${optionIndex + 1}`} value={option.maxSelections || null} min={1} placeholder="מספר פירות מרבי" onValueChange={(e) => updateOption(optionIndex, { maxSelections: e.value || null })} />
                            <InputNumber aria-label={`תוספת לבחירה נוספת בקבוצה ${optionIndex + 1}`} value={option.additionalSelectionPrice || 0} min={0} mode="currency" currency="ILS" locale="he-IL" placeholder="תוספת לכל פרי נוסף" onValueChange={(e) => updateOption(optionIndex, { additionalSelectionPrice: e.value || 0 })} />
                        </div>
                    )}
                    {option.values.map((item, valueIndex) => (
                        <div key={valueIndex} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 130px auto', gap: 8, alignItems: 'center' }}>
                            <InputText aria-label={`שם תצוגה לערך ${valueIndex + 1} בקבוצה ${optionIndex + 1}`} value={item.label} placeholder="שם תצוגה" onChange={(e) => updateValue(optionIndex, valueIndex, { label: e.target.value, value: item.value || e.target.value })} />
                            {isFruitOption(option) && fruitOptions.length > 0 ? (
                                <Dropdown aria-label={`fruitKey לערך ${valueIndex + 1} בקבוצה ${optionIndex + 1}`} value={item.fruitKey || item.value} options={fruitOptions} placeholder="בחר fruitKey גלובלי" onChange={(e) => {
                                    const season = seasons.find((item) => item.fruitKey === e.value)
                                    updateValue(optionIndex, valueIndex, { value: e.value, fruitKey: e.value, label: season?.displayName || item.label })
                                }} />
                            ) : (
                                <InputText aria-label={`מזהה לערך ${valueIndex + 1} בקבוצה ${optionIndex + 1}`} value={item.value} placeholder={isFruitOption(option) ? 'fruitKey למשל mango' : 'מזהה באנגלית'} onChange={(e) => updateValue(optionIndex, valueIndex, { value: e.target.value.toLowerCase().replace(/\s+/g, '-') })} />
                            )}
                            <InputNumber aria-label={`תוספת מחיר לערך ${valueIndex + 1} בקבוצה ${optionIndex + 1}`} value={item.priceAdjustment || 0} mode="currency" currency="ILS" locale="he-IL" min={0} onValueChange={(e) => updateValue(optionIndex, valueIndex, { priceAdjustment: e.value || 0 })} />
                            <Button type="button" icon="pi pi-times" severity="danger" text disabled={option.values.length === 1} onClick={() => updateOption(optionIndex, { values: option.values.filter((_, index) => index !== valueIndex) })} />
                        </div>
                    ))}
                    <Button type="button" label="הוסף ערך" icon="pi pi-plus" outlined onClick={() => updateOption(optionIndex, { values: [...option.values, emptyValue()] })} />
                </div>
            )))}
        </div>
    );
};

export default CustomizationEditor;