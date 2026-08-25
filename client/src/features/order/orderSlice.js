import apiSlice from '../user/apiSlice'

const orderSlice = apiSlice.injectEndpoints({
    endpoints: (build) => ({
        createOrder: build.mutation({
            query: (orderData) => ({
                url: '/order',
                method: 'POST',
                body: orderData
            }),
            invalidatesTags: ['Order']
        }),

        getMyOrders: build.query({
            query: () => ({
                url: '/order/my',
                method: 'GET'
            }),
            providesTags: ['Order']
        }),

        getAllOrders: build.query({
            query: () => ({
                url: '/order/admin',
                method: 'GET'
            }),
            providesTags: ['Order']
        }),

        updateOrderStatus: build.mutation({
            query: ({ id, status }) => ({
                url: `/order/${id}/status`,
                method: 'PUT',
                body: { status }
            }),
            invalidatesTags: ['Order']
        }),

        acceptOrderQuote: build.mutation({
            query: (id) => ({
                url: `/order/${id}/accept-quote`,
                method: 'POST'
            }),
            invalidatesTags: ['Order']
        }),

        createQuote: build.mutation({
            query: (quoteData) => ({
                url: '/quote',
                method: 'POST',
                body: quoteData
            }),
            invalidatesTags: ['Order', 'Quote']
        }),

        getQuotesForOrder: build.query({
            query: (orderId) => ({
                url: `/quote/order/${orderId}`,
                method: 'GET'
            }),
            providesTags: ['Quote']
        }),

        acceptQuote: build.mutation({
            query: (quoteId) => ({
                url: `/quote/${quoteId}/accept`,
                method: 'PUT'
            }),
            invalidatesTags: ['Order', 'Quote']
        }),

        rejectQuote: build.mutation({
            query: (quoteId) => ({
                url: `/quote/${quoteId}/reject`,
                method: 'PUT'
            }),
            invalidatesTags: ['Order', 'Quote']
        }),

        createPayment: build.mutation({
            query: (paymentData) => ({
                url: '/payment',
                method: 'POST',
                body: paymentData
            }),
            invalidatesTags: ['Order', 'Payment']
        }),

        confirmPayment: build.mutation({
            query: (paymentId) => ({
                url: `/payment/${paymentId}/confirm`,
                method: 'PUT'
            }),
            invalidatesTags: ['Order', 'Payment']
        })
    })
})

export const {
    useCreateOrderMutation,
    useGetMyOrdersQuery,
    useGetAllOrdersQuery,
    useUpdateOrderStatusMutation,
    useAcceptOrderQuoteMutation,
    useCreateQuoteMutation,
    useGetQuotesForOrderQuery,
    useAcceptQuoteMutation,
    useRejectQuoteMutation,
    useCreatePaymentMutation,
    useConfirmPaymentMutation
} = orderSlice
