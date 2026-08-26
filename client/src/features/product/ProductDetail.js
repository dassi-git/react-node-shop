import React, { useMemo, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Checkbox } from 'primereact/checkbox';
import { RadioButton } from 'primereact/radiobutton';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Rating } from 'primereact/rating';
import { useGetAllProductQuery } from './productSlice';
import { useGetBundlesQuery } from './bundleSlice';
import './ProductDetail.css';
import { useUpdeteProductMutation } from '../basket/basketSlise';
import { Toast } from 'primereact/toast';
import { useGetCurrentSeasonsQuery } from '../season/seasonSlice';
import { Calendar } from 'primereact/calendar';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: products = [] } = useGetAllProductQuery();
  const { data: bundles = [] } = useGetBundlesQuery();
  const { isUserLoggedIn } = useSelector((state) => state.auth);
  const [deliveryDate, setDeliveryDate] = useState(new Date());
  const { data: seasonalFruits = [] } = useGetCurrentSeasonsQuery(deliveryDate.toISOString().slice(0, 10));
  const [selectedOptions, setSelectedOptions] = useState({});
  const [selectedImage, setSelectedImage] = useState(0);
  const [addToBasket, { isLoading: isAdding }] = useUpdeteProductMutation();
  const toast = useRef(null);

  const product = useMemo(
    () => products.find((item) => String(item._id) === String(id) || String(item.id) === String(id)),
    [products, id]
  );

  const similarProducts = useMemo(() => {
    if (!product) return [];
    const category = product.category || 'General';
    return products.filter((item) => {
      const sameId = String(item._id) === String(product._id) || String(item.id) === String(product._id);
      const sameCategory = (item.category || 'General') === category;
      return !sameId && sameCategory;
    }).slice(0, 4);
  }, [product, products]);

  const [selectedBundle, setSelectedBundle] = useState(null);

  const bundleOptions = useMemo(() => {
    return bundles.filter((bundle) => bundle.productIds?.some((item) => String(item._id || item) === String(id)));
  }, [bundles, id]);

  const selectedBundleData = useMemo(
    () => bundleOptions.find((bundle) => bundle._id === selectedBundle),
    [bundleOptions, selectedBundle]
  );

  const seasonByFruitKey = useMemo(() => new Map(seasonalFruits.map((season) => [season.fruitKey, season])), [seasonalFruits]);

  if (!product) {
    return (
      <div className="product-detail-page">
        <h2>המוצר לא נמצא</h2>
        <Button label="חזרה למוצרים" onClick={() => navigate('/allProduct')} />
      </div>
    );
  }

  const productImages = (product.images?.length ? product.images : [product.image]).filter(Boolean).slice(0, 7);
  const imageBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8888';
  const imageUrl = productImages[0] ? `${imageBaseUrl}${productImages[0].startsWith('/') ? '' : '/'}${productImages[0]}` : '/logo.png';
  const finalBundlePrice = selectedBundleData
    ? Number(product.price || 0) * (1 - Number(selectedBundleData.discountPercent || 0) / 100)
    : null;
  const customizationOptions = [...(product.customizationOptions || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const fruitConfiguration = product.fruitConfiguration?.enabled ? product.fruitConfiguration : null;
  const seasonalFruitMap = seasonByFruitKey;
  const configuredFruits = (fruitConfiguration?.fruits || []).filter((fruit) => fruit.active !== false).map((fruit) => ({ ...fruit, season: seasonalFruitMap.get(fruit.fruitKey) })).filter((fruit) => fruit.season?.status !== 'unavailable');
  const getSeasonalValue = (option, value) => {
    const optionName = String(option.name || '').toLowerCase();
    if (!optionName.includes('פרי') && !optionName.includes('fruit')) return { ...value, seasonalStatus: 'available', seasonalPriceAdjustment: 0 };
    const season = seasonByFruitKey.get(String(value.fruitKey || value.value).toLowerCase());
    if (!season) return { ...value, seasonalStatus: 'unavailable', seasonalPriceAdjustment: 0 };
    return { ...value, seasonalStatus: season.status, seasonalPriceAdjustment: Number(season.status === 'premium' ? season.priceAdjustment || 0 : 0), seasonalMessage: season.customerMessage };
  };
  const customizationAdjustment = customizationOptions.reduce((sum, option) => {
    const selected = Array.isArray(selectedOptions[option.name]) ? selectedOptions[option.name] : [selectedOptions[option.name]].filter(Boolean);
    const additionalPrice = option.selectionType === 'multiple' && selected.length > 1 ? (selected.length - 1) * Number(option.additionalSelectionPrice || 0) : 0;
    return sum + selected.reduce((inner, selectedValue) => {
      const value = option.values.find((item) => item.value === selectedValue);
      const seasonal = value ? getSeasonalValue(option, value) : null;
      return inner + Number(value?.priceAdjustment || 0) + Number(seasonal?.seasonalPriceAdjustment || 0);
    }, 0) + additionalPrice;
  }, 0);
  const livePrice = Number(product.price || 0) + customizationAdjustment;

  const handleAddToBasket = async () => {
    const missing = customizationOptions.find((option) => option.required && (!selectedOptions[option.name] || (Array.isArray(selectedOptions[option.name]) && selectedOptions[option.name].length === 0)));
    if (missing) {
      toast.current?.show({ severity: 'warn', summary: 'בחירה חסרה', detail: `יש לבחור ${missing.name}`, life: 3000 });
      return;
    }
    if (!isUserLoggedIn) {
      navigate('/login');
      return;
    }
    try {
      const basketOptions = fruitConfiguration ? { ...selectedOptions, fruits: selectedOptions.fruits || (fruitConfiguration.selectionMode === 'fixed' ? fruitConfiguration.fruits.map((fruit) => fruit.fruitKey) : []) } : selectedOptions;
      await addToBasket({ id, selectedOptions: basketOptions, seasonalDate: deliveryDate.toISOString() }).unwrap();
      toast.current?.show({ severity: 'success', summary: 'נוסף בהצלחה', detail: 'המגש נוסף לסל', life: 2500 });
    } catch (error) {
      toast.current?.show({ severity: 'error', summary: 'שגיאה', detail: error?.data?.message || 'לא הצלחנו להוסיף את המגש לסל', life: 3500 });
    }
  };

  return (
    <div className="product-detail-page">
      <Toast ref={toast} />
      <div className="product-detail-card">
        <div className="product-detail-grid">
          <div className="product-gallery-panel">
            <img className="product-detail-image" src={productImages[selectedImage] ? `${imageBaseUrl}${productImages[selectedImage].startsWith('/') ? '' : '/'}${productImages[selectedImage]}` : imageUrl} alt={`${product.name} ${selectedImage + 1}`} />
            <div className="product-gallery-thumbs">
              {productImages.map((image, index) => (
                <button type="button" className={`thumb ${selectedImage === index ? 'active' : ''}`} key={image} onClick={() => setSelectedImage(index)} aria-label={`תמונה ${index + 1}`}>
                  <img src={`${imageBaseUrl}${image.startsWith('/') ? '' : '/'}${image}`} alt="" />
                </button>
              ))}
            </div>
          </div>

          <div className="product-detail-body">
            <div className="product-detail-meta">
              <Tag value={product.category || 'General'} />
              <Tag value={product.inventoryStatus || 'INSTOCK'} severity="success" />
              <Tag value="משלוח מהיר" severity="info" />
            </div>

            <h1>{product.name}</h1>
            <div className="product-rating-row">
              <Rating value={Number(product.rating) || 4.5} readOnly cancel={false} />
              <span className="rating-text">{Number(product.rating) || 4.5}/5</span>
            </div>

            <div className="product-price-block">
              <div className="product-detail-price">₪{livePrice.toFixed(2)}</div>
              {selectedBundleData && (
                <div className="bundle-price-tag">
                  חבילה: ₪{finalBundlePrice?.toFixed(2)}
                </div>
              )}
            </div>

            <p className="product-detail-description">{product.body || 'מוצר איכותי ושירותי, אידיאלי לשימוש יומיומי.'}</p>

            {customizationOptions.length > 0 && (
              <div className="product-customization-options">
                <h3>התאמת המגש</h3>
                {customizationOptions.map((option) => (
                  <div className="product-customization-group" key={option.name}>
                    <strong>{option.name} {option.required ? '*' : '(רשות)'} {option.selectionType === 'multiple' && option.maxSelections ? `(עד ${option.maxSelections})` : ''}</strong>
                    {option.values.filter((value) => value.active !== false).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map((value) => {
                      const seasonal = getSeasonalValue(option, value);
                      if (seasonal.seasonalStatus === 'unavailable') return null;
                      const checked = option.selectionType === 'multiple' ? (selectedOptions[option.name] || []).includes(value.value) : selectedOptions[option.name] === value.value;
                      const inputId = `${option.name}-${value.value}`;
                      const updateSelection = () => setSelectedOptions((current) => {
                        if (option.selectionType === 'single') return { ...current, [option.name]: value.value };
                        const currentValues = current[option.name] || [];
                        if (!checked && option.maxSelections && currentValues.length >= option.maxSelections) {
                          toast.current?.show({ severity: 'warn', summary: 'הגעת למגבלה', detail: `ניתן לבחור עד ${option.maxSelections} אפשרויות`, life: 2500 });
                          return current;
                        }
                        return { ...current, [option.name]: checked ? currentValues.filter((item) => item !== value.value) : [...currentValues, value.value] };
                      });
                      return option.selectionType === 'multiple' ? (
                        <label className="product-customization-choice" key={value.value} htmlFor={inputId}><Checkbox inputId={inputId} checked={checked} onChange={updateSelection} /> <span>{value.label}{seasonal.seasonalStatus === 'premium' && ` (פרי עונתי${seasonal.seasonalMessage ? `: ${seasonal.seasonalMessage}` : ''})`}</span><span>+₪{(Number(value.priceAdjustment || 0) + seasonal.seasonalPriceAdjustment).toFixed(2)}{!checked && option.additionalSelectionPrice && (selectedOptions[option.name] || []).length > 0 ? ` + ${option.additionalSelectionPrice} ₪ נוסף` : ''}</span></label>
                      ) : (
                        <label className="product-customization-choice" key={value.value} htmlFor={inputId}><RadioButton inputId={inputId} name={option.name} value={value.value} checked={checked} onChange={updateSelection} /> <span>{value.label}{seasonal.seasonalStatus === 'premium' && ` (פרי עונתי${seasonal.seasonalMessage ? `: ${seasonal.seasonalMessage}` : ''})`}</span><span>+₪{(Number(value.priceAdjustment || 0) + seasonal.seasonalPriceAdjustment).toFixed(2)}</span></label>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            {fruitConfiguration && (
              <div className="product-customization-options">
                <h3>פירות המגש</h3>
                <strong>{fruitConfiguration.selectionMode === 'customer' ? `בחר בדיוק ${fruitConfiguration.selectionCount} פירות` : 'פירות קבועים מראש'}</strong>
                {fruitConfiguration.selectionMode === 'customer' ? configuredFruits.map((fruit) => {
                  const selected = selectedOptions.fruits || [];
                  const checked = selected.includes(fruit.fruitKey);
                  return <label className="product-customization-choice" key={fruit.fruitKey}><Checkbox checked={checked} onChange={() => setSelectedOptions((current) => ({ ...current, fruits: checked ? selected.filter((item) => item !== fruit.fruitKey) : [...selected, fruit.fruitKey] }))} /><span>{fruit.displayName}{fruit.season.status === 'premium' ? ' (עונתי)' : ''}</span><span>+₪{(fruit.season.status === 'premium' ? fruit.season.priceAdjustment || 0 : 0).toFixed(2)}</span></label>;
                }) : <p>{fruitConfiguration.fruits.map((fruit) => fruit.displayName).join(', ')}</p>}
              </div>
            )}

            <div className="product-delivery-date-field">
              <label htmlFor="product-delivery-date">תאריך משלוח לחישוב העונתיות</label>
              <Calendar id="product-delivery-date" value={deliveryDate} onChange={(event) => setDeliveryDate(event.value || new Date())} minDate={new Date()} dateFormat="dd/mm/yy" showIcon />
            </div>

            <div className="product-feature-list">
              <span>✅ איכות גבוהה</span>
              <span>✅ בטחתי לשימוש יומיומי</span>
              <span>✅ החלפה וקבלת משלוח</span>
            </div>

            <div className="product-detail-actions">
              <Button label={isAdding ? 'מוסיף...' : isUserLoggedIn ? 'הוסף לסל' : 'התחבר'} loading={isAdding} onClick={handleAddToBasket} />
              <Button label="חזרה למוצרים" className="p-button-outlined" onClick={() => navigate('/allProduct')} />
            </div>
          </div>
        </div>

        <div className="product-detail-section">
          {bundleOptions.length > 0 && (
            <div className="bundle-manager-box">
              <div className="bundle-box-header">
                <h3>הצעות חבילה</h3>
                {selectedBundleData && (
                  <span className="bundle-selected-label">נבחרה: {selectedBundleData.title}</span>
                )}
              </div>

              {bundleOptions.map((bundle) => (
                <div className={`bundle-option ${selectedBundle === bundle._id ? 'selected' : ''}`} key={bundle._id}>
                  <div>
                    <strong>{bundle.title}</strong>
                    <div>{bundle.description || 'סל משולב במחיר מיוחד'}</div>
                  </div>
                  <div className="bundle-option-side">
                    <span className="bundle-discount">-{bundle.discountPercent}%</span>
                    <Button
                      label={selectedBundle === bundle._id ? 'נבחר' : 'בחר חבילה'}
                      className={selectedBundle === bundle._id ? 'p-button-success' : 'p-button-outlined'}
                      onClick={() => setSelectedBundle(bundle._id)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <h3>מוצרים דומים</h3>
          {similarProducts.length > 0 ? (
            <div className="similar-products-row">
              {similarProducts.map((item) => (
                <div key={item._id} className="similar-product-card" onClick={() => navigate(`/product/${item._id}`)}>
                  <img src={item.image ? `${process.env.REACT_APP_API_URL || 'http://localhost:8888'}${item.image.startsWith('/') ? '' : '/'}${item.image}` : '/logo.png'} alt={item.name} />
                  <div className="similar-product-name"><strong>{item.name}</strong></div>
                  <div className="similar-product-price">₪{item.price}</div>
                </div>
              ))}
            </div>
          ) : (
            <p>אין מוצרים דומים כרגע.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
