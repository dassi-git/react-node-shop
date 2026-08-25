const Basket = require("../models/Basket")
const Product = require("../models/Product")

const getId = async (req, res) => {
    try {
        const userId = req.user._id
        const myBasket = await Basket.findOne({ userId: userId }).populate({
            path: 'Products.type',
            select: 'name price body image productExist' 
        });
        
        if (!myBasket) {
            return res.json([]);
        }
        
        const populatedProductsArray = myBasket.Products.map(item => {
            if (!item.type) {
                return null;
            }
            return {
                ...item.type.toObject(),
                quantity: item.quantity
            };
        })
        
        return res.json(populatedProductsArray)
    } catch (error) {
        console.error('Error fetching basket:', error)
        return res.status(500).json({ message: 'Server error fetching basket' })
    }
}

const deletebasket = async (req, res) => {
    try {
        const { id } = req.params
        const myBasket = await Basket.findOne({ userId: req.user._id })
        
        if (!myBasket) {
            return res.status(404).json({ message: "Basket not found" })
        }
        
        const delate = myBasket.Products.find((p) => {
            return p.type == id
        })
        
        if (!delate) {
            return res.status(404).json({ message: "Product not found in basket" })
        }
        
        if (delate.quantity > 1) {
            delate.quantity--
        } else {
            myBasket.Products = myBasket.Products.filter((p) => {
                return p.type != id
            })
        }
        
        const save = await myBasket.save()
        return res.json(save)
    } catch (error) {
        console.error('Error deleting from basket:', error)
        return res.status(500).json({ message: 'Server error deleting from basket' })
    }
}

const deleteAllbasket = async (req, res) => {
    try {
        const myBasket = await Basket.findOne({ userId: req.user._id })

        if (!myBasket) {
            return res.status(404).json({ message: "Basket not found" })
        }

        const save = await myBasket.deleteOne()
        return res.json(save)
    } catch (error) {
        console.error('Error deleting basket:', error)
        return res.status(500).json({ message: 'Server error deleting basket' })
    }
}

const updateBasket = async (req, res) => {
    try {
        const { id } = req.params
        
        const myProduct = await Product.findOne({ _id: id })
        if (!myProduct) {
            return res.status(404).json({ message: "המוצר לא נמצא במערכת" })
        }
        
        if (myProduct.productExist === "OUTOFSTOCK" || myProduct.productExist === "0") {
            return res.status(400).json({ 
                message: "מצטערים, המוצר אזל מהמלאי",
                productName: myProduct.name,
                outOfStock: true
            })
        }
        
        if (myProduct.productExist === "LOWSTOCK") {
            console.log(`Warning: Product ${myProduct.name} has low stock`)
        }
        
        let myBasket = await Basket.findOne({ userId: req.user._id })
        if (!myBasket) {
            myBasket = await Basket.create({ userId: req.user._id })
        }
        
        const existingProduct = myBasket.Products.find((p) => {
            return p.type.toString() === id
        })
        
        if (existingProduct) {
            existingProduct.quantity++
        } else {
            myBasket.Products.push({ type: myProduct._id, quantity: 1 })
        }
        
        const result = await myBasket.save()
        
        res.json({ 
            message: "המוצר נוסף לסל בהצלחה", 
            basket: myBasket,
            productName: myProduct.name,
            stockStatus: myProduct.productExist
        })
    } catch (error) {
        console.error('Error updating basket:', error)
        return res.status(500).json({ message: 'Server error updating basket' })
    }
}

const creatProduct = async (req, res) => {
    try {
        const userId = req.user._id
        const myBasket = await Basket.create({ userId })
        return res.json(myBasket)
    } catch (error) {
        console.error('Error creating basket:', error)
        return res.status(500).json({ message: 'Server error creating basket' })
    }
}





module.exports = { deletebasket, updateBasket, creatProduct, deleteAllbasket, getId }






