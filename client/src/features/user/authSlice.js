import { createSlice } from "@reduxjs/toolkit";

const authSlice=createSlice({
    name:"auth",
    initialState:{
        token: localStorage.getItem("token") || "",
        isUserLoggedIn: Boolean(localStorage.getItem("token")),
        userFullName: ""
    },
    reducers:{
        setToken:(state, action)=>{
            const token = action.payload?.token || ""
            state.token = token
            state.isUserLoggedIn = Boolean(token)
            state.userFullName = ""
            if (token) {
                localStorage.setItem("token", token)
            } else {
                localStorage.removeItem("token")
            }
        },
        removeToken:(state)=>{
            state.token = ""
            state.isUserLoggedIn = false
            state.userFullName = ""
            localStorage.removeItem("token")
        },
        logOut:(state)=>{
            state.token = ""
            state.isUserLoggedIn = false
            state.userFullName = ""
            localStorage.removeItem("token")
        }
    }
})
export default authSlice.reducer
export const { setToken, removeToken, logOut } = authSlice.actions
