import React, { useState, useEffect, useRef } from 'react';
import { DataView } from 'primereact/dataview';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { Rating } from 'primereact/rating';
import { Dialog } from 'primereact/dialog';
import { useGetBasketQuery, useUpdeteProductMutation } from './basketSlise';
import { useDeleteProductMutation } from "../basket/basketSlise";
import {useDeletebasketMutation}from"../basket/basketSlise"
import { useNavigate } from 'react-router-dom';
import './Basket.css';
export default function GetBasket() {
    let emptyProduct = {
        id: null,
        name: '',
        image: null,
        description: '',
        category: null,
        price: 0,
        quantity: 0,
        rating: 0,
        inventoryStatus: 'INSTOCK'
    };

    const [products, setProducts] = useState([]);
    const [deleteProductDialog, setDeleteProductDialog] = useState(false);
    const [deleteProductsDialog, setDeleteProductsDialog] = useState(false);
    const [product, setProduct] = useState(emptyProduct);
    const toast = useRef(null);

    const { data: basket = [], isSuccess, isError, refetch } = useGetBasketQuery()

    useEffect(() => {
        if (isSuccess) {
            setProducts(basket)
        }
    }, [isSuccess, basket]);
    const formatCurrency = (value) => {
        return value.toLocaleString('he-IL', { style: 'currency', currency: 'ILS' });
    };

    const hideDeleteProductDialog = () => {
        setDeleteProductDialog(false);
    };

    const hideDeleteProductsDialog = () => {
        setDeleteProductsDialog(false);
    };


    const confirmDeleteProduct = (product) => {
        setProduct(product);
        setDeleteProductDialog(true);
    };
    const [register] = useDeleteProductMutation()
    const [deleteBasket] = useDeletebasketMutation()
    const [plus] = useUpdeteProductMutation()
    const navigate = useNavigate();

    const deleteProduct = async () => {
        try {
            await register(product._basketItemId || product._id).unwrap();
            let _products = products.filter((val) => (val._basketItemId || val._id) !== (product._basketItemId || product._id));
            setProducts(_products);
            toast.current.show({ severity: 'success', summary: 'הצלחה', detail: 'המוצר הוסר מהסל', life: 3000 });
            setDeleteProductDialog(false);
            setProduct(emptyProduct);
        } catch (error) {
            toast.current.show({ 
                severity: 'error', 
                summary: 'שגיאה', 
                detail: error?.data?.message || 'לא הצלחנו להסיר את המוצר', 
                life: 3000 
            });
        }
    };

    const confirmDeleteSelected = () => {
        setDeleteProductsDialog(true);
    };

    const deleteSelectedProducts = async () => {
        try {
            await deleteBasket().unwrap();
            setProducts([]);
            toast.current.show({ severity: 'success', summary: 'הצלחה', detail: 'הסל נוקה בהצלחה', life: 3000 });
            setDeleteProductsDialog(false);
        } catch (error) {
            toast.current.show({ 
                severity: 'error', 
                summary: 'שגיאה', 
                detail: error?.data?.message || 'לא הצלחנו לרוקן את הסל', 
                life: 3000 
            });
        }
    };

    const itemTemplate = (product) => {
        const totalPrice = product.price * product.quantity;
        
        return (
            <div className="basket-item-card">
                <div className="basket-item-content">
                    {/* Product Image */}
                    <div className="basket-item-image">
                        <img 
                            src={product.image ? `${process.env.REACT_APP_API_URL || 'http://localhost:8888'}${product.image.startsWith('/') ? '' : '/'}${product.image}` : '/logo.png'}
                            alt={product.name}
                        />
                    </div>
                    
                    {/* Product Details */}
                    <div className="basket-item-details">
                        <h3 className="basket-item-name">{product.name}</h3>
                        <Rating value={product.rating} readOnly cancel={false} className="basket-item-rating" />
                        <p className="basket-item-description">{product.body}</p>
                        {product.selectedOptions && Object.keys(product.selectedOptions).length > 0 && (
                            <div className="basket-item-options">
                                {Object.entries(product.selectedOptions).map(([name, value]) => (
                                    <div key={name}><strong>{name}:</strong> {Array.isArray(value) ? value.join(', ') : value}</div>
                                ))}
                                {(product.seasonalSnapshot || []).map((season) => (
                                    <div key={season.fruitKey}><strong>עונתיות:</strong> {season.displayName} {season.status === 'premium' ? `(+${season.priceAdjustment} ₪)` : ''}</div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    {/* Quantity Controls */}
                    <div className="basket-item-quantity">
                        <span className="basket-item-label">כמות</span>
                        <div className="basket-quantity-controls">
                            <Button 
                                icon="pi pi-minus" 
                                rounded 
                                outlined 
                                severity="secondary"
                                onClick={() => handleDecreaseQuantity(product)}
                                disabled={product.quantity <= 1}
                            />
                            <span className="basket-quantity-value">{product.quantity}</span>
                            <Button 
                                icon="pi pi-plus" 
                                rounded 
                                outlined 
                                severity="success"
                                onClick={() => handleIncreaseQuantity(product)}
                            />
                        </div>
                    </div>
                    
                    {/* Price Section */}
                    <div className="basket-item-price-section">
                        <div className="basket-price-details">
                            <span className="basket-item-label">מחיר יחידה</span>
                            <span className="basket-unit-price">{formatCurrency(product.price)}</span>
                        </div>
                        <div className="basket-price-details">
                            <span className="basket-item-label">סה״כ</span>
                            <span className="basket-total-price">{formatCurrency(totalPrice)}</span>
                        </div>
                    </div>
                    
                    {/* Delete Button */}
                    <div className="basket-item-actions">
                        <Button 
                            icon="pi pi-trash" 
                            rounded 
                            text
                            severity="danger" 
                            onClick={() => confirmDeleteProduct(product)}
                            tooltip="הסר מהסל"
                            tooltipOptions={{ position: 'top' }}
                        />
                    </div>
                </div>
            </div>
        );
    };

    const handleDecreaseQuantity = async (product) => {
        if (product.quantity <= 1) {
            confirmDeleteProduct(product);
        } else {
            // הפחתת כמות - מחיקה אחת
            try {
                await register(product._basketItemId || product._id).unwrap();
                // עדכון מקומי של הכמות
                const updatedProducts = products.map(p => 
                    (p._basketItemId || p._id) === (product._basketItemId || product._id) ? { ...p, quantity: p.quantity - 1 } : p
                );
                setProducts(updatedProducts);
                toast.current.show({ 
                    severity: 'success', 
                    summary: 'עודכן', 
                    detail: 'הכמות עודכנה', 
                    life: 2000 
                });
            } catch (error) {
                toast.current.show({ 
                    severity: 'error', 
                    summary: 'שגיאה', 
                    detail: error?.data?.message || 'לא הצלחנו לעדכן את הכמות', 
                    life: 3000 
                });
            }
        }
    };
    
    const handleIncreaseQuantity = async (product) => {
        try {
            await plus({ id: product._id, selectedOptions: product.selectedOptions || {}, seasonalDate: product.seasonalDate }).unwrap();
            // עדכון מקומי של הכמות
            const updatedProducts = products.map(p => 
                (p._basketItemId || p._id) === (product._basketItemId || product._id) ? { ...p, quantity: p.quantity + 1 } : p
            );
            setProducts(updatedProducts);
            toast.current.show({ 
                severity: 'success', 
                summary: 'עודכן', 
                detail: 'הכמות עודכנה', 
                life: 2000 
            });
        } catch (error) {
            if (error?.data?.outOfStock) {
                toast.current.show({ 
                    severity: 'error', 
                    summary: 'אזל מהמלאי', 
                    detail: `${error.data.productName || 'המוצר'} אזל מהמלאי`, 
                    life: 4000 
                });
            } else {
                toast.current.show({ 
                    severity: 'error', 
                    summary: 'שגיאה', 
                    detail: error?.data?.message || 'לא הצלחנו לעדכן את הכמות', 
                    life: 3000 
                });
            }
        }
    };

    const deleteProductDialogFooter = (
        <React.Fragment>
            <Button label="ביטול" icon="pi pi-times" outlined onClick={hideDeleteProductDialog} />
            <Button label="אישור" icon="pi pi-check" severity="danger" onClick={deleteProduct} />
        </React.Fragment>
    );
    const deleteProductsDialogFooter = (
        <React.Fragment>
            <Button label="ביטול" icon="pi pi-times" outlined onClick={hideDeleteProductsDialog} />
            <Button label="אישור" icon="pi pi-check" severity="danger" onClick={deleteSelectedProducts} />
        </React.Fragment>
    );

    return (
        <div className="basket-page-container">
            <Toast ref={toast} />
            
            {/* Hero Section */}
            <div className="basket-hero">
                <h1 className="basket-hero-title">סל הקניות שלי</h1>
                <p className="basket-hero-subtitle">סקור את המוצרים שבחרת והשלם את ההזמנה</p>
            </div>
            
            <div className="basket-container">
                {/* Empty basket state */}
                {isError ? (
                    <div className="basket-empty-container">
                        <i className="pi pi-exclamation-triangle basket-empty-icon"></i>
                        <h2 className="basket-empty-title">לא הצלחנו לטעון את הסל</h2>
                        <p className="basket-empty-text">בדוק את החיבור ונסה שוב.</p>
                        <Button label="נסה שוב" icon="pi pi-refresh" className="basket-empty-button" onClick={refetch} />
                    </div>
                ) : products.length === 0 ? (
                    <div className="basket-empty-container">
                        <i className="pi pi-shopping-cart basket-empty-icon"></i>
                        <h2 className="basket-empty-title">הסל שלך ריק</h2>
                        <p className="basket-empty-text">
                            נראה שעדיין לא הוספת מוצרים לסל הקניות.<br />
                            התחל לקנות עכשיו וגלה את המבחר המלא שלנו!
                        </p>
                        <Button 
                            label="חזרה לחנות" 
                            icon="pi pi-arrow-left" 
                            className="basket-empty-button"
                            onClick={() => navigate('/allProduct')}
                        />
                    </div>
                ) : (
                    <>
                        {/* Toolbar */}
                        <div className="basket-toolbar-container">
                            <div className="basket-toolbar-left">
                                <Button 
                                    label="המשך לקנות" 
                                    icon="pi pi-shopping-bag" 
                                    className="p-button-text"
                                    onClick={() => navigate('/allProduct')}
                                />
                                <Button 
                                    label="רוקן סל" 
                                    icon="pi pi-trash" 
                                    severity="danger" 
                                    className="p-button-text"
                                    onClick={confirmDeleteSelected}
                                />
                            </div>
                        </div>

                        {/* Main Content Area with Products and Order Summary */}
                        <div className="basket-main-content">
                            {/* Products List */}
                            <div className="basket-products-section">
                                <DataView 
                                    value={products} 
                                    itemTemplate={itemTemplate}
                                    className="basket-dataview"
                                />
                            </div>

                            {/* Order Summary Side Panel */}
                            <div className="basket-order-summary">
                                <div className="order-summary-card">
                                    <h3 className="order-summary-title">סיכום הזמנה</h3>
                                    
                                    <div className="order-summary-content">
                                        <div className="order-summary-row">
                                            <span className="order-summary-label">סכום ביניים:</span>
                                            <span className="order-summary-value">{formatCurrency(products.reduce((sum, product) => sum + (product.price * product.quantity), 0))}</span>
                                        </div>
                                        
                                        <div className="order-summary-row">
                                            <span className="order-summary-label">עלות משלוח:</span>
                                            <span className="order-summary-value order-summary-shipping">חינם</span>
                                        </div>
                                        
                                        <div className="order-summary-divider"></div>
                                        
                                        <div className="order-summary-row order-summary-total-row">
                                            <span className="order-summary-total-label">סה״כ לתשלום:</span>
                                            <span className="order-summary-total-value">{formatCurrency(products.reduce((sum, product) => sum + (product.price * product.quantity), 0))}</span>
                                        </div>
                                    </div>
                                    
                                    <Button 
                                        label="המשך לבקשת הצעת מחיר" 
                                        icon="pi pi-file-edit" 
                                        className="order-summary-checkout-button"
                                        onClick={() => navigate('/quote-request', { state: { fromBasket: true } })}
                                    />
                                    
                                    <div className="order-summary-info">
                                        <i className="pi pi-shield"></i>
                                        <span>תשלום מאובטח ב-SSL</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <Dialog 
                visible={deleteProductDialog} 
                className="basket-dialog"
                style={{ width: '32rem' }} 
                breakpoints={{ '960px': '75vw', '641px': '90vw' }} 
                header="אישור מחיקה" 
                modal 
                footer={deleteProductDialogFooter} 
                onHide={hideDeleteProductDialog}
            >
                <div className="confirmation-content">
                    <i className="pi pi-exclamation-triangle basket-confirmation-icon" />
                    {product && (
                        <span>
                            האם אתה בטוח שברצונך למחוק את <b>{product.name}</b> מהסל?
                        </span>
                    )}
                </div>
            </Dialog>

            <Dialog 
                visible={deleteProductsDialog} 
                className="basket-dialog"
                style={{ width: '32rem' }} 
                breakpoints={{ '960px': '75vw', '641px': '90vw' }} 
                header="אישור ריקון סל" 
                modal 
                footer={deleteProductsDialogFooter} 
                onHide={hideDeleteProductsDialog}
            >
                <div className="confirmation-content">
                    <i className="pi pi-exclamation-triangle basket-confirmation-icon" />
                    {product && <span>האם אתה בטוח שברצונך לרוקן את כל סל הקניות?</span>}
                </div>
            </Dialog>
        </div>
    );
}