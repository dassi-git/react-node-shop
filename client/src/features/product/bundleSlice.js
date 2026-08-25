import apiSlice from '../user/apiSlice'

const bundleSlice = apiSlice.injectEndpoints({
    endpoints: (build) => ({
        getBundles: build.query({
            query: () => ({
                url: '/bundle'
            }),
            providesTags: ['bundle']
        }),
        createBundle: build.mutation({
            query: (body) => ({
                url: '/bundle',
                method: 'POST',
                body
            }),
            invalidatesTags: ['bundle']
        }),
        deleteBundle: build.mutation({
            query: (id) => ({
                url: `/bundle/${id}`,
                method: 'DELETE'
            }),
            invalidatesTags: ['bundle']
        })
    })
})

export const { useGetBundlesQuery, useCreateBundleMutation, useDeleteBundleMutation } = bundleSlice
