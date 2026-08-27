// import { DataView, DataViewLayoutOptions } from 'primereact/dataview';

/* eslint-disable no-unused-vars */
import { useGetAllProductQuery } from "./productSlice"
import React, { useState, useEffect, useRef, useMemo } from 'react';
import './allProduct.css';
import { getRelatedProducts, getBundleProducts } from './bundleHelpers';
import { Button } from 'primereact/button';
import { DataView, DataViewLayoutOptions } from 'primereact/dataview';
import { Rating } from 'primereact/rating';
import { Tag } from 'primereact/tag';
import { classNames } from 'primereact/utils';
import { Skeleton } from 'primereact/skeleton';
import { useSelector } from 'react-redux';
import { Toast } from 'primereact/toast';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Slider } from 'primereact/slider';
// import { useUppdateProductMutation } from "../basket/basketSlise";
// import DeleteProduct from "./deleteProduct";
import { useNavigate } from "react-router-dom"
import { Link } from "react-router-dom"
import GetBasket from "../basket/getBasket";
import AddProductToBasket from "../basket/addProductToBasket";
import { useUpdeteProductMutation } from "../basket/basketSlise";
import useAuth from '../user/useAuth';

const AllProduct = () => {
    const navigate = useNavigate();
    const { data: products = [], isError, isLoading, refetch } = useGetAllProductQuery()
    const normalizedProducts = useMemo(
        () => products.map((product, index) => ({
            ...product,
            _id: product._id || product.id || `product-${index}`,
            category: product.category || product.body || 'General',
            inventoryStatus: product.inventoryStatus || product.productExist || product.productExit || 'INSTOCK',
            rating: Number(product.rating) || 4.5
        })),
        [products]
    );
    const [updateProduct, { isLoading: isAddingToCart }] = useUpdeteProductMutation()
    const { isUserLoggedIn } = useSelector((state) => state.auth)
    const objToken = useAuth();
    const isAdmin = objToken?.role === 'Admin';
    const toast = useRef(null);
    const [addingProductId, setAddingProductId] = useState(null);

    const [layout, setLayout] = useState('grid');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [priceRange, setPriceRange] = useState([0, 1000]);
    const [minimumRating, setMinimumRating] = useState(0);
    const [stockFilter, setStockFilter] = useState('all');
    const [sortOption, setSortOption] = useState('rating');
    const [currentPage, setCurrentPage] = useState(1);
    const productsPerPage = 12;

    const categoryOptions = useMemo(() => {
        const unique = [...new Set(normalizedProducts.map((product) => product.category || 'General'))];
        return ['All', ...unique];
    }, [normalizedProducts]);

    const maxProductPrice = Math.max(100, ...normalizedProducts.map((product) => Number(product.price || 0)));
    const activePriceMin = normalizedProducts.length > 0 ? Math.min(priceRange[0], maxProductPrice) : priceRange[0];
    const activePriceMax = normalizedProducts.length > 0 ? Math.min(Math.max(priceRange[1], maxProductPrice), maxProductPrice) : priceRange[1];

    const filteredProducts = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        let items = normalizedProducts;

        if (selectedCategory && selectedCategory !== 'All') {
            items = items.filter((product) => (product.category || 'General') === selectedCategory);
        }

        if (term) {
            items = items.filter((product) => {
                const name = (product.name || '').toLowerCase();
                const category = (product.category || '').toLowerCase();
                return name.includes(term) || category.includes(term);
            });
        }

        items = items.filter((product) => {
            const price = Number(product.price || 0);
            const rating = Number(product.rating || 0);
            return price >= activePriceMin && price <= activePriceMax
                && rating >= minimumRating
                && (stockFilter === 'all' || product.inventoryStatus === stockFilter);
        });

        return [...items].sort((a, b) => {
            if (sortOption === 'priceAsc') return Number(a.price || 0) - Number(b.price || 0);
            if (sortOption === 'priceDesc') return Number(b.price || 0) - Number(a.price || 0);
            if (sortOption === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            return (Number(b.rating) || 0) - (Number(a.rating) || 0);
        });
    }, [normalizedProducts, selectedCategory, searchTerm, activePriceMin, activePriceMax, minimumRating, stockFilter, sortOption]);

    const pageCount = Math.max(1, Math.ceil(filteredProducts.length / productsPerPage));
    const paginatedProducts = useMemo(() => {
        const start = (currentPage - 1) * productsPerPage;
        return filteredProducts.slice(start, start + productsPerPage);
    }, [currentPage, filteredProducts]);

    useEffect(() => {
        if (normalizedProducts.length > 0) {
            setPriceRange((currentRange) => {
                const nextMinimum = Math.min(currentRange[0], maxProductPrice);
                const nextMaximum = currentRange[1] === 1000 || currentRange[1] < maxProductPrice
                    ? maxProductPrice
                    : currentRange[1];
                return [nextMinimum, nextMaximum];
            });
        }
    }, [maxProductPrice, normalizedProducts.length]);

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedCategory, searchTerm, activePriceMin, activePriceMax, minimumRating, stockFilter, sortOption]);

    useEffect(() => {
        if (currentPage > pageCount) setCurrentPage(pageCount);
    }, [currentPage, pageCount]);

    const resetFilters = () => {
        setSelectedCategory('All');
        setSearchTerm('');
        setPriceRange([0, maxProductPrice]);
        setMinimumRating(0);
        setStockFilter('all');
        setSortOption('rating');
    };

    const topSellingProducts = useMemo(() => filteredProducts.slice(0, 4), [filteredProducts]);
    const newestProducts = useMemo(() => {
        return [...filteredProducts].sort((a, b) => {
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return bTime - aTime;
        }).slice(0, 4);
    }, [filteredProducts]);

    const addproduct = async (id) => {
        if (!isUserLoggedIn) {
            // שמירת מזהה המוצר ב-sessionStorage
            sessionStorage.setItem('pendingProductId', id);
            
            toast.current.show({ 
                severity: 'warn', 
                summary: 'נדרשת התחברות', 
                detail: 'עליך להירשם או להתחבר כדי לבצע רכישות', 
                life: 3000 
            });
            setTimeout(() => {
                navigate('/login');
            }, 1500);
            return;
        }
        
        // סימון המוצר שנמצא בתהליך הוספה
        setAddingProductId(id);
        
        try {
            await updateProduct({ id }).unwrap();
            toast.current.show({ 
                severity: 'success', 
                summary: 'נוסף בהצלחה', 
                detail: 'המוצר נוסף לסל הקניות', 
                life: 2000 
            });
        } catch (error) {
            toast.current.show({ 
                severity: 'error', 
                summary: 'שגיאה', 
                detail: error?.data?.message || 'לא הצלחנו להוסיף את המוצר לסל', 
                life: 3000 
            });
        } finally {
            setAddingProductId(null);
        }
    }


    const getSeverity = (product) => {
        switch (product.inventoryStatus) {
            case 'INSTOCK':
                return 'success';

            case 'LOWSTOCK':
                return 'warning';

            case 'OUTOFSTOCK':
                return 'danger';

            default:
                return null;
        }
    };


    const listItem = (product, index) => {
        const originalPrice = Number(product.price || 0) * 1.18;

        return (
            <React.Fragment key={product._id || product.id || `list-${index}`}>

                <div className="col-12">
                    <div className={classNames('product-list-item flex flex-column xl:flex-row xl:align-items-start p-4 gap-4 border-round-lg', { 'border-top-1 surface-border': index !== 0 })}>
                        <img loading="lazy" className="w-9 sm:w-16rem xl:w-10rem shadow-2 block xl:block mx-auto border-round" src={product.image ? `${process.env.REACT_APP_API_URL || 'http://localhost:8888'}${product.image.startsWith('/') ? '' : '/'}${product.image}` : '/logo.png'} alt={product.name} />

                        <div className="flex flex-column sm:flex-row justify-content-between align-items-center xl:align-items-start flex-1 gap-4">
                            <div className="flex flex-column align-items-center sm:align-items-start gap-3">
                                <div className="text-2xl font-bold text-900">{product.name}</div>
                                <Rating value={product.rating} readOnly cancel={false}></Rating>
                                <div className="flex align-items-center gap-3">
                                    <span className="flex align-items-center gap-2">
                                        <i className="pi pi-tag"></i>
                                        <span className="font-semibold">{product.category || 'General'}</span>
                                    </span>
                                    <Tag value={product.inventoryStatus} severity={getSeverity(product)}></Tag>
                                </div>
                            </div>
                            <div className="flex sm:flex-column align-items-center sm:align-items-end gap-3 sm:gap-2">
                                <div className="product-price-stack">
                                    <span className="old-price">₪{originalPrice.toFixed(2)}</span>
                                    <span className="text-2xl font-semibold">₪{product.price}</span>
                                </div>
                                <div className="flex gap-2">
                                    <Button 
                                        icon="pi pi-eye" 
                                        className="p-button-rounded p-button-info" 
                                        onClick={() => navigate(`/product/${product._id}`)}
                                        tooltip="צפה במוצר"
                                        tooltipOptions={{ position: 'top' }}
                                    />
                                    {isAdmin && (
                                        <Button 
                                            icon="pi pi-pencil" 
                                            className="p-button-rounded p-button-warning" 
                                            onClick={() => navigate('/updateProduct', { state: { product } })}
                                            tooltip="ערוך מוצר"
                                            tooltipOptions={{ position: 'top' }}
                                        />
                                    )}
                                    {isUserLoggedIn ? (
                                        <Button 
                                            icon={product.customizationOptions?.length ? "pi pi-sliders-h" : addingProductId === product._id ? "pi pi-spin pi-spinner" : "pi pi-shopping-cart"}
                                            className="p-button-rounded" 
                                            disabled={product.inventoryStatus === 'OUTOFSTOCK' || addingProductId === product._id} 
                                            onClick={() => product.customizationOptions?.length ? navigate(`/product/${product._id}`) : addproduct(product._id)}
                                            loading={addingProductId === product._id}
                                            tooltip={product.customizationOptions?.length ? 'בחר התאמות' : 'הוסף לסל'}
                                        />
                                    ) : (
                                        <Button 
                                            label="התחבר" 
                                            icon="pi pi-sign-in" 
                                            className="p-button-sm p-button-outlined" 
                                            onClick={() => navigate('/login')}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </React.Fragment>
        );
    };


    const gridItem = (product) => {
        const similarProducts = getRelatedProducts(normalizedProducts, product._id, 3);
        const originalPrice = Number(product.price || 0) * 1.18;
        const isTopSeller = Number(product.rating || 0) >= 4.7;
        const isNew = product.createdAt && Date.now() - new Date(product.createdAt).getTime() < 1000 * 60 * 60 * 24 * 90;

        return (
            <div className="col-12 sm:col-6 lg:col-4 xl:col-3 p-2" key={product._id}>
                <div className="product-card p-4 border-1 surface-border surface-card border-round-xl">
                    <div className="product-card-topline">
                        <div className="product-card-meta">
                            <i className="pi pi-tag"></i>
                            <span>{product.category || 'General'}</span>
                        </div>
                        <Tag value={product.inventoryStatus} severity={getSeverity(product)}></Tag>
                    </div>

                    <div className="product-card-badges">
                        {isTopSeller && <span className="product-badge hot">הכי נמכר</span>}
                        {isNew && <span className="product-badge new">הכי חדש</span>}
                    </div>

                    <div className="product-card-image-wrap">
                        <img loading="lazy" className="product-card-image" src={product.image ? `${process.env.REACT_APP_API_URL || 'http://localhost:8888'}${product.image.startsWith('/') ? '' : '/'}${product.image}` : '/logo.png'} alt={product.name} />
                    </div>

                    <div className="product-card-body">
                        <div className="product-card-name">{product.name}</div>
                        {product.inventoryStatus === 'LOWSTOCK' && <div className="product-low-stock-warning" role="status">מלאי נמוך - מומלץ להזמין בהקדם</div>}
                        <div className="product-card-rating-row">
                            <Rating value={product.rating} readOnly cancel={false}></Rating>
                            <span>{Number(product.rating || 0).toFixed(1)}</span>
                        </div>
                    </div>

                    {similarProducts.length > 0 && (
                        <div className="similar-products-mini">
                            <span className="similar-products-title">מוצרים דומים</span>
                            <div className="similar-products-list">
                                {similarProducts.map((similar) => (
                                    <button
                                        key={similar._id}
                                        type="button"
                                        className="similar-product-pill"
                                        onClick={() => navigate(`/product/${similar._id}`)}
                                    >
                                        {similar.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="product-card-footer">
                        <div className="product-price-stack">
                            <span className="old-price">₪{originalPrice.toFixed(2)}</span>
                            <span className="product-card-price">₪{product.price}</span>
                        </div>

                        <div className="product-card-actions">
                            <Button
                                label="הצגה"
                                icon="pi pi-eye"
                                className="card-view-btn"
                                onClick={() => navigate(`/product/${product._id}`)}
                            />
                            {isUserLoggedIn ? (
                                <Button
                                    label={product.customizationOptions?.length ? 'בחר התאמות' : addingProductId === product._id ? '...' : 'לקופה'}
                                    icon={product.customizationOptions?.length ? 'pi pi-sliders-h' : addingProductId === product._id ? 'pi pi-spin pi-spinner' : 'pi pi-shopping-cart'}
                                    className="card-buy-btn"
                                    disabled={product.inventoryStatus === 'OUTOFSTOCK' || addingProductId === product._id}
                                    onClick={() => product.customizationOptions?.length ? navigate(`/product/${product._id}`) : addproduct(product._id)}
                                    loading={addingProductId === product._id}
                                />
                            ) : (
                                <Button
                                    label="התחבר"
                                    icon="pi pi-sign-in"
                                    className="card-buy-btn"
                                    onClick={() => navigate('/login')}
                                />
                            )}

                            {isAdmin && (
                                <Button
                                    icon="pi pi-pencil"
                                    className="p-button-rounded p-button-warning card-icon-btn"
                                    onClick={() => navigate('/updateProduct', { state: { product } })}
                                    tooltip="ערוך מוצר"
                                    tooltipOptions={{ position: 'top' }}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const itemTemplate = (product, layout, index) => {
        if (!product) {
            return;
        }

        if (layout === 'list') return listItem(product, index);
        else if (layout === 'grid') return gridItem(product);
    };

    const listTemplate = (products, layout) => {
        return <div className="grid grid-nogutter">{products.map((product, index) => itemTemplate(product, layout, index))}</div>;
    };

    const bundleOffer = getBundleProducts(filteredProducts.length ? filteredProducts : normalizedProducts, 3)[0];

    const header = () => {
        return (
            <div className="products-header">
                <div className="products-count">
                    <i className="pi pi-shopping-bag" style={{ marginLeft: '0.5rem' }}></i>
                    {filteredProducts.length} מוצרים זמינים
                </div>
                <div className="products-header-actions">
                    <div className="products-search-box">
                        <InputText
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="חיפוש מוצר או קטגוריה"
                        />
                    </div>
                    {isUserLoggedIn && (
                        <Button 
                            label="לסל הקניות" 
                            icon="pi pi-shopping-cart"
                            className="basket-button"
                            onClick={() => navigate('./basket')}
                        />
                    )}
                    <DataViewLayoutOptions layout={layout} onChange={(e) => setLayout(e.value)} />
                </div>
                <div className="advanced-filters" aria-label="סינון מתקדם">
                    <div className="advanced-filter-field price-filter">
                        <label htmlFor="price-range-filter">טווח מחיר: ₪{activePriceMin} - ₪{activePriceMax}</label>
                        <Slider value={[activePriceMin, activePriceMax]} onChange={(e) => setPriceRange(e.value)} range min={0} max={maxProductPrice} step={1} />
                    </div>
                    <div className="advanced-filter-field">
                        <label htmlFor="rating-filter">דירוג מינימלי</label>
                        <Dropdown id="rating-filter" value={minimumRating} options={[{ label: 'כל הדירוגים', value: 0 }, { label: '3 ומעלה', value: 3 }, { label: '4 ומעלה', value: 4 }, { label: '4.5 ומעלה', value: 4.5 }]} onChange={(e) => setMinimumRating(e.value)} />
                    </div>
                    <div className="advanced-filter-field">
                        <label htmlFor="stock-filter">זמינות</label>
                        <Dropdown id="stock-filter" value={stockFilter} options={[{ label: 'כל המוצרים', value: 'all' }, { label: 'במלאי', value: 'INSTOCK' }, { label: 'מלאי נמוך', value: 'LOWSTOCK' }]} onChange={(e) => setStockFilter(e.value)} />
                    </div>
                    <div className="advanced-filter-field">
                        <label htmlFor="sort-filter">מיון</label>
                        <Dropdown id="sort-filter" value={sortOption} options={[{ label: 'דירוג גבוה', value: 'rating' }, { label: 'מחיר: מהנמוך לגבוה', value: 'priceAsc' }, { label: 'מחיר: מהגבוה לנמוך', value: 'priceDesc' }, { label: 'החדשים ביותר', value: 'newest' }]} onChange={(e) => setSortOption(e.value)} />
                    </div>
                    <Button label="נקה סינון" icon="pi pi-filter-slash" className="p-button-text" onClick={resetFilters} />
                </div>
            </div>
        );
    };

    const skeletonGridItem = () => {
        return (
            <div className="col-12 sm:col-6 lg:col-12 xl:col-4 p-2">
                <div className="product-card p-4 border-1 surface-border surface-card border-round-xl">
                    {/* Tag area - small rounded skeleton */}
                    <div className="flex flex-wrap align-items-center justify-content-between gap-2">
                        <div className="flex align-items-center gap-2">
                            <Skeleton width="1rem" height="1rem" borderRadius="4px"></Skeleton>
                            <Skeleton width="5rem" height="1.2rem" borderRadius="4px"></Skeleton>
                        </div>
                        <Skeleton width="4.5rem" height="1.5rem" borderRadius="16px"></Skeleton>
                    </div>
                    
                    {/* Image and content area */}
                    <div className="flex flex-column align-items-center gap-3 py-5">
                        {/* Product image - large square */}
                        <Skeleton className="w-9" height="200px" borderRadius="8px"></Skeleton>
                        
                        {/* Product name - thick line */}
                        <Skeleton width="75%" height="1.75rem" borderRadius="4px"></Skeleton>
                        
                        {/* Rating - small circles */}
                        <div className="flex gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} width="1rem" height="1rem" borderRadius="2px"></Skeleton>
                            ))}
                        </div>
                    </div>
                    
                    {/* Price and button area */}
                    <div className="flex align-items-center justify-content-between">
                        <Skeleton width="4.5rem" height="1.75rem" borderRadius="4px"></Skeleton>
                        <Skeleton shape="circle" size="3rem"></Skeleton>
                    </div>
                </div>
            </div>
        );
    };

    const skeletonListItem = () => {
        return (
            <div className="col-12">
                <div className="product-list-item flex flex-column xl:flex-row xl:align-items-start p-4 gap-4 border-round-lg">
                    {/* Product image */}
                    <Skeleton className="w-9 sm:w-16rem xl:w-10rem" height="10rem" borderRadius="8px"></Skeleton>
                    
                    <div className="flex flex-column sm:flex-row justify-content-between align-items-center xl:align-items-start flex-1 gap-4" style={{width: '100%'}}>
                        <div className="flex flex-column align-items-center sm:align-items-start gap-3" style={{flex: 1}}>
                            {/* Product name */}
                            <Skeleton width="70%" height="1.75rem" borderRadius="4px"></Skeleton>
                            
                            {/* Rating */}
                            <div className="flex gap-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Skeleton key={i} width="1rem" height="1rem" borderRadius="2px"></Skeleton>
                                ))}
                            </div>
                            
                            {/* Category and tag */}
                            <div className="flex align-items-center gap-3">
                                <div className="flex align-items-center gap-2">
                                    <Skeleton width="1rem" height="1rem" borderRadius="4px"></Skeleton>
                                    <Skeleton width="6rem" height="1.2rem" borderRadius="4px"></Skeleton>
                                </div>
                                <Skeleton width="4.5rem" height="1.5rem" borderRadius="16px"></Skeleton>
                            </div>
                        </div>
                        
                        {/* Price and button */}
                        <div className="flex sm:flex-column align-items-center sm:align-items-end gap-3 sm:gap-2">
                            <Skeleton width="5rem" height="1.75rem" borderRadius="4px"></Skeleton>
                            <Skeleton shape="circle" size="3rem"></Skeleton>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="products-page-container">
                <Toast ref={toast} />
                <div className="products-hero">
                    <h1 className="products-hero-title">המוצרים שלנו</h1>
                    <p className="products-hero-subtitle">גלה את המבחר המלא שלנו</p>
                </div>
                <div className="products-container">
                    {header()}
                    <div className="grid grid-nogutter">
                        {layout === 'grid' 
                            ? Array.from({ length: 6 }).map((_, i) => <React.Fragment key={`skeleton-grid-${i}`}>{skeletonGridItem()}</React.Fragment>)
                            : Array.from({ length: 4 }).map((_, i) => <React.Fragment key={`skeleton-list-${i}`}>{skeletonListItem()}</React.Fragment>)
                        }
                    </div>
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="products-page-container">
                <Toast ref={toast} />
                <div className="products-hero">
                    <h1 className="products-hero-title">המוצרים שלנו</h1>
                    <p className="products-hero-subtitle">גלה את המבחר המלא שלנו</p>
                </div>
                <div className="products-container">
                    <div className="products-empty-state">
                        <i className="pi pi-exclamation-triangle products-empty-icon"></i>
                        <h2 className="products-empty-title">לא הצלחנו לטעון את המוצרים</h2>
                        <p className="products-empty-text">בדוק שהשרת פעיל ונסה שוב.</p>
                        <Button label="נסה שוב" icon="pi pi-refresh" onClick={refetch} />
                    </div>
                </div>
            </div>
        );
    }

    if (products.length === 0) {
        return (
            <div className="products-page-container">
                <Toast ref={toast} />
                <div className="products-hero">
                    <h1 className="products-hero-title">המוצרים שלנו</h1>
                    <p className="products-hero-subtitle">גלה את המבחר המלא שלנו</p>
                </div>
                <div className="products-container">
                    <div className="products-empty-state">
                        <i className="pi pi-inbox products-empty-icon"></i>
                        <h2 className="products-empty-title">אין מוצרים זמינים כרגע</h2>
                        <p className="products-empty-text">נסה שוב מאוחר יותר או צור קשר עם התמיכה</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="products-page-container">
            <Toast ref={toast} />
            <div className="products-hero">
                <div className="products-hero-inner">
                    <div className="hero-copy">
                        <span className="hero-label">קניות חכמות • משלוחים מהירים</span>
                        <h1 className="products-hero-title">המוצרים שלנו</h1>
                        <p className="products-hero-subtitle">מבחר ענק של מוצרים איכותיים במחירים הכי משתלמים</p>
                    </div>
                    <div className="hero-badges">
                        <span>💳 תשלום מאובטח</span>
                        <span>🚚 משלוח מהיר</span>
                        <span>⭐ דירוגים מצוינים</span>
                    </div>
                </div>
            </div>
            <div className="products-container">
                {bundleOffer && (
                    <div className="bundle-offer-card">
                        <div className="bundle-offer-header">
                            <span className="bundle-badge">שילוב חבילה</span>
                            <h2>{bundleOffer.name}</h2>
                        </div>
                        <div className="bundle-offer-items">
                            {bundleOffer.items.map((item) => (
                                <div key={item._id} className="bundle-item">
                                    <span>{item.name}</span>
                                    <strong>₪{item.price}</strong>
                                </div>
                            ))}
                        </div>
                        <div className="bundle-offer-price">
                            <span>מחיר רגיל: ₪{bundleOffer.totalPrice}</span>
                            <span className="bundle-sale">הנחה: ₪{bundleOffer.discount}</span>
                            <strong>סופית: ₪{bundleOffer.finalPrice}</strong>
                        </div>
                    </div>
                )}

                <div className="category-filter-bar">
                    {categoryOptions.map((category) => (
                        <button
                            key={category}
                            type="button"
                            className={selectedCategory === category ? 'category-chip active' : 'category-chip'}
                            onClick={() => setSelectedCategory(category)}
                        >
                            {category}
                        </button>
                    ))}
                </div>

                <div className="product-spotlight-strip">
                    <div className="spotlight-card">
                        <span className="spotlight-label">הכי נמכר</span>
                        <div className="spotlight-items">
                            {topSellingProducts.map((item) => (
                                <button key={item._id} className="spotlight-item" onClick={() => navigate(`/product/${item._id}`)}>
                                    <span>{item.name}</span>
                                    <strong>₪{item.price}</strong>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="spotlight-card alternate">
                        <span className="spotlight-label">הכי חדש</span>
                        <div className="spotlight-items">
                            {newestProducts.map((item) => (
                                <button key={item._id} className="spotlight-item" onClick={() => navigate(`/product/${item._id}`)}>
                                    <span>{item.name}</span>
                                    <strong>₪{item.price}</strong>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <DataView value={paginatedProducts} listTemplate={listTemplate} layout={layout} header={header()} />
                {pageCount > 1 && (
                    <nav className="products-pagination" aria-label="ניווט בין עמודי מוצרים">
                        <Button label="הקודם" icon="pi pi-chevron-right" className="p-button-outlined" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1} />
                        <span aria-live="polite">עמוד {currentPage} מתוך {pageCount}</span>
                        <Button label="הבא" icon="pi pi-chevron-left" iconPos="right" className="p-button-outlined" onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))} disabled={currentPage === pageCount} />
                    </nav>
                )}
            </div>
        </div>
    )
}

export default AllProduct
