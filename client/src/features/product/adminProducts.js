
import React, { useState, useEffect, useRef } from 'react';
import { classNames } from 'primereact/utils';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { FileUpload } from 'primereact/fileupload';
import { Rating } from 'primereact/rating';
import { Toolbar } from 'primereact/toolbar';
import { InputTextarea } from 'primereact/inputtextarea';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { RadioButton } from 'primereact/radiobutton';
import { InputNumber } from 'primereact/inputnumber';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Tag } from 'primereact/tag';
import { Skeleton } from 'primereact/skeleton';
import { useNavigate } from 'react-router-dom';
import {useCreateProductMutation,useDelateProductMutation,useUppdateProductMutation,useGetAllProductQuery}from "./productSlice"
import './AdminProducts.css';
export default function AdminProducts() {
    const navigate = useNavigate();
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

    const [products, setProducts] = useState(null);
    const [filteredProducts, setFilteredProducts] = useState(null);
    const [productDialog, setProductDialog] = useState(false);
    const [deleteProductDialog, setDeleteProductDialog] = useState(false);
    const [deleteProductsDialog, setDeleteProductsDialog] = useState(false);
    const [product, setProduct] = useState(emptyProduct);
    const [selectedProducts, setSelectedProducts] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const [globalFilter, setGlobalFilter] = useState('');
    const toast = useRef(null);
    const dt = useRef(null);
    const {data:getAllProduct=[], isLoading}=useGetAllProductQuery()
    useEffect(() => {
        setProducts(getAllProduct)
        setFilteredProducts(getAllProduct)
    }, [getAllProduct]);
    
    // פונקציה לסינון מוצרים
    const handleSearch = (searchValue) => {
        setGlobalFilter(searchValue);
        
        if (!searchValue || searchValue.trim() === '') {
            setFilteredProducts(products);
            return;
        }
        
        const searchLower = searchValue.toLowerCase().trim();
        const filtered = products?.filter(product => {
            return (
                product.name?.toLowerCase().includes(searchLower) ||
                product.category?.toLowerCase().includes(searchLower) ||
                product.description?.toLowerCase().includes(searchLower) ||
                product.price?.toString().includes(searchLower) ||
                product.quantity?.toString().includes(searchLower)
            );
        });
        
        setFilteredProducts(filtered);
    };

    const formatCurrency = (value) => {
        return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    };

    const openNew = () => {
        setProduct(emptyProduct);
        setSubmitted(false);
        setProductDialog(true);
    };

    const hideDialog = () => {
        setSubmitted(false);
        setProductDialog(false);
    };
    const hideDeleteProductDialog = () => {

        setDeleteProductDialog(false);
    };

    const hideDeleteProductsDialog = () => {
        setDeleteProductsDialog(false);
    };
const [creatProduct,{isSuccess}]=useCreateProductMutation()
const [updateProduct]=useUppdateProductMutation()
    const saveProduct = async () => {
        setSubmitted(true);
        if (product.name.trim()) {
            let _products = [...products];
            let _product = { ...product };

            if (product._id) {
                const index = findIndexById(product._id);

                _products[index] = _product;
                //פונקציה שליחה לעדכון
                try {
                    await updateProduct(_product).unwrap();
                    toast.current.show({ severity: 'success', summary: 'הצלחה', detail: 'המוצר עודכן בהצלחה', life: 3000 });
                } catch (err) {
                    toast.current.show({ severity: 'error', summary: 'שגיאה', detail: err?.data?.message || 'שגיאה בעדכון המוצר', life: 3000 });
                    return;
                }
            } else {
                _product._id = createId();
                _product.image = 'product-placeholder.svg';
                _products.push(_product);
                try {
                    await creatProduct(product).unwrap();
                    toast.current.show({ severity: 'success', summary: 'הצלחה', detail: 'המוצר נוצר בהצלחה', life: 3000 });
                } catch (err) {
                    toast.current.show({ severity: 'error', summary: 'שגיאה', detail: err?.data?.message || 'שגיאה ביצירת המוצר', life: 3000 });
                    return;
                }
            }
          
            setProducts(_products);
            setProductDialog(false);
           //********** */
          
            setProduct(emptyProduct);
        }
    // }

    };

    const editProduct = (product) => {
        setProduct({ ...product });
        setProductDialog(true);
    };

    const confirmDeleteProduct = (product) => {

        setProduct(product);
        setDeleteProductDialog(true);
    };
    const [delete1]=useDelateProductMutation()

    const deleteProduct = async () => {
        try {
            await delete1(product._id).unwrap();
            let _products = products.filter((val) => val._id !== product._id);

            setProducts(_products);
            setDeleteProductDialog(false);
            setProduct(emptyProduct);
            toast.current.show({ severity: 'success', summary: 'הצלחה', detail: 'המוצר נמחק בהצלחה', life: 3000 });
        } catch (err) {
            toast.current.show({ severity: 'error', summary: 'שגיאה', detail: err?.data?.message || 'שגיאה במחיקת המוצר', life: 3000 });
            setDeleteProductDialog(false);
        }
    };

    const findIndexById = (id) => {
        let index = -1;

        for (let i = 0; i < products.length; i++) {
            if (products[i]._id === id) {
                index = i;
                break;
            }
        }

        return index;
    };

    const createId = () => {
        let id = '';
        let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

        for (let i = 0; i < 5; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        return id;
    };

    const exportCSV = () => {
        dt.current.exportCSV();
    };

    const confirmDeleteSelected = () => {
        setDeleteProductsDialog(true);
    };

    const deleteSelectedProducts = () => {
        let _products = products.filter((val) => !selectedProducts.includes(val));

        setProducts(_products);
        setDeleteProductsDialog(false);
        setSelectedProducts(null);
        toast.current.show({ severity: 'success', summary: 'Successful', detail: 'Products Deleted', life: 3000 });
    };

    const onCategoryChange = (e) => {
        let _product = { ...product };

        _product['category'] = e.value;
        setProduct(_product);
    };

    const onInputChange = (e, name) => {
        const val = (e.target && e.target.value) || '';
        let _product = { ...product };

        _product[`${name}`] = val;

        setProduct(_product);
    };

    const onInputNumberChange = (e, name) => {
        const val = e.value || 0;
        let _product = { ...product };

        _product[`${name}`] = val;

        setProduct(_product);
    };

    const leftToolbarTemplate = () => {
        return (
            <div className="flex flex-wrap gap-2">
                <Button label="New" icon="pi pi-plus" severity="success" onClick={openNew} />
            </div>
        );
    };

    const rightToolbarTemplate = () => {
        return <Button label="Export" icon="pi pi-upload" className="p-button-help" onClick={exportCSV} />;
    };

    const imageBodyTemplate = (rowData) => {
        return <img src={`${process.env.REACT_APP_API_URL || 'http://localhost:8888'}/${rowData.image}`} alt={rowData.name} className="admin-product-image" />;
    };

    const priceBodyTemplate = (rowData) => {
        return <span className="admin-product-price">₪{rowData.price}</span>;
    };

    const ratingBodyTemplate = (rowData) => {
        return <Rating value={rowData.rating} readOnly cancel={false} />;
    };

    const statusBodyTemplate = (rowData) => {
        return <Tag value={rowData.inventoryStatus} severity={getSeverity(rowData)}></Tag>;
    };

    const actionBodyTemplate = (rowData) => {
        return (
            <div className="flex gap-2">
                <Button 
                    icon="pi pi-pencil" 
                    rounded 
                    outlined 
                    className="p-button-warning" 
                    onClick={() => navigate('/updateProduct', { state: rowData })}
                    tooltip="ערוך מוצר"
                    tooltipOptions={{ position: 'top' }}
                />
                <Button 
                    icon="pi pi-trash" 
                    rounded 
                    outlined 
                    severity="danger" 
                    onClick={() => confirmDeleteProduct(rowData)}
                    tooltip="מחק מוצר"
                    tooltipOptions={{ position: 'top' }}
                />
            </div>
        );
    };

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

    const header = (
        <div className="flex flex-wrap gap-2 align-items-center justify-content-between">
            <h4 className="m-0">Manage Products</h4>
            <IconField iconPosition="left">
                <InputIcon className="pi pi-search" />
                <InputText type="search" onInput={(e) => setGlobalFilter(e.target.value)} placeholder="Search..." />
            </IconField>
        </div>
    );
    const productDialogFooter = (
        <React.Fragment>
            <Button label="Cancel" icon="pi pi-times" outlined onClick={hideDialog} />
            <Button label="Save" icon="pi pi-check" onClick={saveProduct} />
        </React.Fragment>
    );
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

    if (isLoading) {
        return (
            <div className="admin-products-loading">
                <i className="pi pi-spin pi-spinner" style={{ fontSize: '3rem' }}></i>
                <p>טוען מוצרים...</p>
            </div>
        );
    }

    return (
        <div className="admin-products-container">
            <Toast ref={toast} />

            {/* Hero Section */}
            <div className="admin-products-hero">
                <div className="admin-products-hero-content">
                    <div>
                        <h1 className="admin-products-hero-title">ניהול מוצרים</h1>
                        <p className="admin-products-hero-subtitle">צפייה, עריכה והוספת מוצרים חדשים</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button 
                            label="הוסף מוצר חדש" 
                            icon="pi pi-plus" 
                            className="admin-products-add-btn"
                            onClick={() => navigate('/adProduct')}
                        />
                        <Button 
                            label="ניהול חבילות" 
                            icon="pi pi-tags" 
                            className="p-button-outlined"
                            onClick={() => navigate('/bundle-manager')}
                        />
                    </div>
                </div>
            </div>

            <div className="admin-products-content">
                {/* Statistics Cards */}
                <div className="admin-products-stats-grid">
                    <div className="admin-products-stat-card">
                        <div className="stat-card-icon stat-card-icon-primary">
                            <i className="pi pi-box"></i>
                        </div>
                        <div className="stat-card-content">
                            <h3>{products?.length || 0}</h3>
                            <p>סה"כ מוצרים</p>
                        </div>
                    </div>

                    <div className="admin-products-stat-card">
                        <div className="stat-card-icon stat-card-icon-success">
                            <i className="pi pi-check-circle"></i>
                        </div>
                        <div className="stat-card-content">
                            <h3>{products?.filter(p => p.quantity > 0).length || 0}</h3>
                            <p>מוצרים במלאי</p>
                        </div>
                    </div>

                    <div className="admin-products-stat-card">
                        <div className="stat-card-icon stat-card-icon-warning">
                            <i className="pi pi-exclamation-triangle"></i>
                        </div>
                        <div className="stat-card-content">
                            <h3>{products?.filter(p => p.quantity === 0).length || 0}</h3>
                            <p>מוצרים חסרים</p>
                        </div>
                    </div>

                    <div className="admin-products-stat-card">
                        <div className="stat-card-icon stat-card-icon-info">
                            <i className="pi pi-tag"></i>
                        </div>
                        <div className="stat-card-content">
                            <h3>{new Set(products?.map(p => p.category).filter(Boolean)).size || 0}</h3>
                            <p>קטגוריות</p>
                        </div>
                    </div>
                </div>

                <div className="admin-products-card">
                    <div className="admin-products-header">
                        <div className="admin-products-stats">
                            <i className="pi pi-box"></i>
                            <span>סה"כ {products?.length || 0} מוצרים</span>
                        </div>
                        <div className="admin-products-search">
                            <IconField iconPosition="left">
                                <InputIcon className="pi pi-search" />
                                <InputText 
                                    type="search" 
                                    value={globalFilter}
                                    onChange={(e) => handleSearch(e.target.value)} 
                                    placeholder="חיפוש לפי שם, קטגוריה, מחיר..." 
                                />
                            </IconField>
                        </div>
                    </div>

                    <DataTable 
                        ref={dt} 
                        value={filteredProducts} 
                        selection={selectedProducts} 
                        onSelectionChange={(e) => setSelectedProducts(e.value)}
                        dataKey="_id"  
                        paginator 
                        rows={10} 
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                        currentPageReportTemplate="מציג {first} עד {last} מתוך {totalRecords} מוצרים" 
                        className="admin-products-table"
                        emptyMessage={globalFilter ? "לא נמצאו תוצאות לחיפוש" : "לא נמצאו מוצרים"}
                        responsiveLayout="scroll"
                    >
                        <Column field="name" header="שם המוצר" sortable style={{ minWidth: '200px' }}></Column>
                        <Column field="image" header="תמונה" body={imageBodyTemplate}></Column>
                        <Column field="price" header="מחיר" body={priceBodyTemplate} sortable style={{ minWidth: '120px' }}></Column>
                        <Column field="category" header="קטגוריה" sortable style={{ minWidth: '120px' }}></Column>
                        <Column field="quantity" header="כמות במלאי" sortable style={{ minWidth: '120px' }}></Column>
                        <Column header="פעולות" body={actionBodyTemplate} exportable={false} style={{ minWidth: '150px' }}></Column>
                    </DataTable>
                </div>
            </div>

            <Dialog visible={productDialog} style={{ width: '32rem' }} breakpoints={{ '960px': '75vw', '641px': '90vw' }} header="Product Details" modal className="p-fluid" footer={productDialogFooter} onHide={hideDialog}>
                {product.image && <img src={`${process.env.REACT_APP_API_URL || 'http://localhost:8888'}/${product.image}`} alt={product.image} className="product-image block m-auto pb-3" style={{width:'500px'}}/>}
                <div className="field">
                    <label htmlFor="name" className="font-bold">
                        Name
                    </label>
                    <InputText id="name" value={product.name} onChange={(e) => onInputChange(e, 'name')} required autoFocus className={classNames({ 'p-invalid': submitted && !product.name })} />
                    {submitted && !product.name && <small className="p-error">Name is required.</small>}
                </div>
                <div className="field">
                    <label htmlFor="image" className="font-bold">
                    image
                    </label>
                    <InputText id="image" value={product.image} onChange={(e) => onInputChange(e, 'image')}  />
                    {/* {submitted && !product.name && <small className="p-error">Name is required.</small>} */}
                </div>
                <div className="field">
                    <label htmlFor="description" className="font-bold">
                        Description
                    </label>
                    <InputTextarea id="description" value={product.description} onChange={(e) => onInputChange(e, 'description')} required rows={3} cols={20} />
                </div>

                <div className="field">
                    <label className="mb-3 font-bold">Category</label>
                    <div className="formgrid grid">
                        <div className="field-radiobutton col-6">
                            <RadioButton inputId="category1" name="category" value="Accessories" onChange={onCategoryChange} checked={product.category === 'Accessories'} />
                            <label htmlFor="category1">Accessories</label>
                        </div>
                        <div className="field-radiobutton col-6">
                            <RadioButton inputId="category2" name="category" value="Clothing" onChange={onCategoryChange} checked={product.category === 'Clothing'} />
                            <label htmlFor="category2">Clothing</label>
                        </div>
                        <div className="field-radiobutton col-6">
                            <RadioButton inputId="category3" name="category" value="Electronics" onChange={onCategoryChange} checked={product.category === 'Electronics'} />
                            <label htmlFor="category3">Electronics</label>
                        </div>
                        <div className="field-radiobutton col-6">
                            <RadioButton inputId="category4" name="category" value="Fitness" onChange={onCategoryChange} checked={product.category === 'Fitness'} />
                            <label htmlFor="category4">Fitness</label>
                        </div>
                    </div>
                </div>

                <div className="formgrid grid">
                    <div className="field col">
                        <label htmlFor="price" className="font-bold">
                            Price
                        </label>
                        <InputNumber id="price" value={product.price} onValueChange={(e) => onInputNumberChange(e, 'price')} mode="currency" currency="USD" locale="en-US" />
                    </div>
                    <div className="field col">
                        <label htmlFor="quantity" className="font-bold">
                            Quantity
                        </label>
                        <InputNumber id="quantity" value={product.quantity} onValueChange={(e) => onInputNumberChange(e, 'quantity')} />
                    </div>
                </div>
            </Dialog>

            <Dialog visible={deleteProductDialog} style={{ width: '32rem' }} breakpoints={{ '960px': '75vw', '641px': '90vw' }} header="אישור מחיקה" modal footer={deleteProductDialogFooter} onHide={hideDeleteProductDialog} className="admin-products-dialog">
                <div className="confirmation-content">
                    <i className="pi pi-exclamation-triangle" style={{ fontSize: '3rem', color: '#ffc107' }} />
                    {product && (
                        <span>
                            האם אתה בטוח שברצונך למחוק את המוצר <b>{product.name}</b>?
                        </span>
                    )}
                </div>
            </Dialog>
        </div>
    );
}
        