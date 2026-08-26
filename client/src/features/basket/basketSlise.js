import apiSlice from "../user/apiSlice";
const basketSlice=apiSlice.injectEndpoints({
    endpoints:(build)=>({
       
        getBasket:(build).query({
            query:()=>({
              url:`/basket`,
              method:"GET"
            }),
            providesTags:["basket"]
        }),
        deleteProduct:(build).mutation({
            query:(id)=>({
                url:`/basket/${id}`,
                method:"DELETE",
            }),
            invalidatesTags:["basket"]
        }),
        updeteProduct:(build).mutation({
                        query:({ id, selectedOptions = {}, seasonalDate = null })=>({
                url:`/basket/${id}`,
                                method:"PUT",
                                body: { selectedOptions, seasonalDate }
        }),
            invalidatesTags:["basket"]
        }),
        Deletebasket:(build).mutation({
            query:()=>({
                url:`/basket`,
                method:"DELETE",
            }),
            invalidatesTags:["basket"]
        }),
    })
})
export const{useGetBasketQuery,useDeleteProductMutation,useUpdeteProductMutation,useDeletebasketMutation}=basketSlice