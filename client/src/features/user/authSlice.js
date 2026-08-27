import { createSlice } from "@reduxjs/toolkit";

const authSlice=createSlice({
    name:"auth",
    initialState:{
        user: null,
        isUserLoggedIn: false,
        userFullName: "",
        authInitialized: false
    },
    reducers:{
        setToken:(state, action)=>{
            state.user = action.payload?.user || null
            state.isUserLoggedIn = Boolean(state.user)
            state.userFullName = state.user?.name || ""
        },
        removeToken:(state)=>{
            state.user = null
            state.isUserLoggedIn = false
            state.userFullName = ""
        },
        logOut:(state)=>{
            state.user = null
            state.isUserLoggedIn = false
            state.userFullName = ""
            state.authInitialized = true
        },
        setAuthInitialized:(state)=>{
            state.authInitialized = true
        }
    }
})
export default authSlice.reducer
export const { setToken, removeToken, logOut, setAuthInitialized } = authSlice.actions
