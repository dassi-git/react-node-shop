import React, { useState } from 'react';
import { useGetAllProductQuery } from './productSlice';
import { useCreateBundleMutation } from './bundleSlice';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { MultiSelect } from 'primereact/multiselect';

const BundleManager = () => {
  const { data: products = [] } = useGetAllProductQuery();
  const [createBundle, { isLoading }] = useCreateBundleMutation();

  const [form, setForm] = useState({
    title: '',
    description: '',
    discountPercent: 10,
    productIds: []
  });

  const handleSubmit = async () => {
    if (!form.title || form.productIds.length === 0) return;

    await createBundle({
      title: form.title,
      description: form.description,
      discountPercent: form.discountPercent,
      productIds: form.productIds
    });

    setForm({
      title: '',
      description: '',
      discountPercent: 10,
      productIds: []
    });
  };

  return (
    <div style={{ maxWidth: 800, margin: '2rem auto', padding: 20, border: '1px solid #ddd', borderRadius: 16 }}>
      <h3>יצירת חבילה למוצרים</h3>
      <div style={{ display: 'grid', gap: 12 }}>
        <InputText
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="שם החבילה"
        />
        <InputText
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="תיאור החבילה"
        />
        <InputNumber
          value={form.discountPercent}
          onValueChange={(e) => setForm({ ...form, discountPercent: e.value || 0 })}
          min={0}
          max={100}
          suffix=" %"
        />
        <MultiSelect
          value={form.productIds}
          options={products.map((product) => ({ label: product.name, value: product._id }))}
          onChange={(e) => setForm({ ...form, productIds: e.value })}
          placeholder="בחר מוצרים לחבילה"
          display='chip'
          style={{ width: '100%' }}
        />
        <Button label={isLoading ? 'שומר...' : 'צור חבילה'} onClick={handleSubmit} disabled={isLoading} />
      </div>
    </div>
  );
};

export default BundleManager;
