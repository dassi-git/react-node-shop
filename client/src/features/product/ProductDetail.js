import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Rating } from 'primereact/rating';
import { useGetAllProductQuery } from './productSlice';
import { useGetBundlesQuery } from './bundleSlice';
import './ProductDetail.css';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: products = [] } = useGetAllProductQuery();
  const { data: bundles = [] } = useGetBundlesQuery();
  const { isUserLoggedIn } = useSelector((state) => state.auth);

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

  if (!product) {
    return (
      <div className="product-detail-page">
        <h2>המוצר לא נמצא</h2>
        <Button label="חזרה למוצרים" onClick={() => navigate('/allProduct')} />
      </div>
    );
  }

  const imageUrl = product.image ? `${process.env.REACT_APP_API_URL || 'http://localhost:8888'}${product.image.startsWith('/') ? '' : '/'}${product.image}` : '/logo.png';
  const finalBundlePrice = selectedBundleData
    ? Number(product.price || 0) * (1 - Number(selectedBundleData.discountPercent || 0) / 100)
    : null;

  return (
    <div className="product-detail-page">
      <div className="product-detail-card">
        <div className="product-detail-grid">
          <div className="product-gallery-panel">
            <img className="product-detail-image" src={imageUrl} alt={product.name} />
            <div className="product-gallery-thumbs">
              <span className="thumb active" />
              <span className="thumb" />
              <span className="thumb" />
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
              <div className="product-detail-price">${product.price}</div>
              {selectedBundleData && (
                <div className="bundle-price-tag">
                  חבילה: ${finalBundlePrice?.toFixed(2)}
                </div>
              )}
            </div>

            <p className="product-detail-description">{product.body || 'מוצר איכותי ושירותי, אידיאלי לשימוש יומיומי.'}</p>

            <div className="product-feature-list">
              <span>✅ איכות גבוהה</span>
              <span>✅ בטחתי לשימוש יומיומי</span>
              <span>✅ החלפה וקבלת משלוח</span>
            </div>

            <div className="product-detail-actions">
              <Button label={isUserLoggedIn ? 'הוסף לסל' : 'התחבר'} onClick={() => navigate('/allProduct')} />
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
                  <img src={`${process.env.REACT_APP_API_URL || 'http://localhost:8888'}${item.image || ''}`} alt={item.name} />
                  <div className="similar-product-name"><strong>{item.name}</strong></div>
                  <div className="similar-product-price">${item.price}</div>
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
