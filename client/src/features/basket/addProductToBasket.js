import React, { useRef } from 'react';
import { useUpdeteProductMutation } from "./basketSlise";
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';

const AddProductToBasket = ({ productId, productName, disabled = false }) => {
    const toast = useRef(null);
    const [updateProduct, { isLoading }] = useUpdeteProductMutation();

    const handleAddToBasket = async () => {
        try {
            await updateProduct(productId).unwrap();
            toast.current.show({ 
                severity: 'success', 
                summary: 'נוסף בהצלחה', 
                detail: `המוצר ${productName} נוסף לסל!`, 
                life: 3000 
            });
        } catch (error) {
            if (error?.data?.outOfStock) {
                toast.current.show({ 
                    severity: 'error', 
                    summary: 'המוצר אזל', 
                    detail: `${error.data.productName || productName} אזל מהמלאי`, 
                    life: 4000 
                });
            } else {
                toast.current.show({ 
                    severity: 'error', 
                    summary: 'שגיאה', 
                    detail: error?.data?.message || 'לא הצלחנו להוסיף את המוצר לסל', 
                    life: 3000 
                });
            }
        }
    };

    return (
        <>
            <Toast ref={toast} />
            <Button 
                icon={isLoading ? "pi pi-spin pi-spinner" : "pi pi-shopping-cart"}
                className="p-button-rounded" 
                disabled={disabled || isLoading}
                onClick={handleAddToBasket}
                loading={isLoading}
                tooltip="הוסף לסל"
                tooltipOptions={{ position: 'top' }}
            />
        </>
    );
};

export default AddProductToBasket;