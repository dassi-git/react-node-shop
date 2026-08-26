const mongoose = require('mongoose')
const userSchema = new mongoose.Schema(
    {
        name:{
            type:String,
            required:true,
        },
        userName:{
            type:String,
            required:true,
            trim:true,
        },
        address:{
            type:String,
            required:true,
        }, 
        phone:{
            type:String,
            required:true,
        },
        email:{
            type:String,
            required:true,
            trim:true,
            lowercase:true,
        },
        password:{
            type:String,
            required:true,
        },
        role:{
            type:String,
            enum: ["User","Admin"],
            default:"User"
        }   
       
    
        
    }  , { timestamps:true})

// הוספת indexes ייחודיים
userSchema.index({ email: 1 }, { unique: true })
userSchema.index({ userName: 1 }, { unique: true })

module.exports = mongoose.model("User", userSchema)
