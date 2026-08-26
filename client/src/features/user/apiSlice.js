import { createApi, fetchBaseQuery } from
"@reduxjs/toolkit/query/react";
import { logOut } from './authSlice';

const configuredBaseUrl = process.env.REACT_APP_API_BASE_URL || "http://localhost:8888/api/"
const baseUrl = configuredBaseUrl.endsWith('/') ? configuredBaseUrl : `${configuredBaseUrl}/`

const baseQuery = fetchBaseQuery({
    baseUrl,
    credentials:"include",
    prepareHeaders:(Headers,{getState})=>{
        const token=getState().auth.token
        if(token){
            Headers.set("authorization", `Bearer ${token}`)
        }
        return Headers
    }
});

const baseQueryWithReauth = async (args, api, extraOptions) => {
    let result = await baseQuery(args, api, extraOptions);
    
    const url = typeof args === 'string' ? args : args.url;
    
    const isAuthEndpoint = url?.includes('/user/login') || url?.includes('/user/register');
    
    const authMessage = result?.error?.data?.message || '';
    const tokenExpired = result?.error?.status === 403 && authMessage.includes('Invalid or expired token');
    if ((result?.error?.status === 401 || tokenExpired) && !isAuthEndpoint) {
        alert('החיבור פקע, נא להתחבר מחדש');
        api.dispatch(logOut());
        window.location.href = '/login';
    }
    
    return result;
};

const apiSlice=createApi({
    reducerPath:"api",
    baseQuery: baseQueryWithReauth,
    tagTypes:["User", "Product", "Basket", "Order", "Quote", "Payment", "Season"],
    endpoints:()=>({})
})
export default apiSlice