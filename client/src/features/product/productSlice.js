import apiSlice from "../user/apiSlice"
const productSlice=apiSlice.injectEndpoints({
    endpoints:(build)=>({
        getAllProduct:build.query({
            query:()=>({
                url:"/product"
            }),
            transformResponse: (response) => {
                if (typeof response === 'string') {
                    try {
                        response = JSON.parse(response)
                    } catch (error) {
                        return []
                    }
                }
                if (Array.isArray(response)) return response
                if (Array.isArray(response?.products)) return response.products
                if (Array.isArray(response?.data)) return response.data
                return []
            }
        }),
        getProductId:build.query({
            query:(product)=>({
                url:"/product/id",
                body:product
            })
        }),

        delateProduct:build.mutation({
            query:(id)=>({
                url:`/product/${id}`,
                method:"DELETE",
                // body:id
                
                
            })
        }),
        uppdateProduct:build.mutation({
            query:(product)=>{
                // Support FormData for update as well
                try {
                    if (product instanceof FormData) {
                        return {
                            url: "/product",
                            method: "PUT",
                            body: product
                        }
                    }
                } catch (e) {}
                return {
                    url:"/product",
                    method:"PUT",
                    body:product
                }
            }
        }),

        createProduct:build.mutation({
            query:(product)=>{
                // If product is FormData, return it directly so fetchBaseQuery doesn't set JSON headers
                try {
                    if (product instanceof FormData) {
                        return {
                            url: "/product",
                            method: "POST",
                            body: product
                        }
                    }
                } catch (e) {
                    // In some Node environments FormData may not be defined; fall back to normal behavior
                }
                return {
                    url: "/product",
                    method: "POST",
                    body: product
                }
            }
        })
    })

})
export const{useGetAllProductQuery,useGetProductIdQuery,useDelateProductMutation,useUppdateProductMutation,useCreateProductMutation}=productSlice

