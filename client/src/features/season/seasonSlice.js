import apiSlice from '../user/apiSlice'

const seasonSlice = apiSlice.injectEndpoints({
    endpoints: (build) => ({
        getCurrentSeasons: build.query({
            query: (date) => ({ url: `/fruit-season${date ? `?date=${encodeURIComponent(date)}` : ''}` }),
            transformResponse: (response) => response?.seasons || []
        }),
        getAllSeasons: build.query({
            query: () => ({ url: '/fruit-season/admin' }),
            providesTags: ['FruitSeason']
        }),
        createSeason: build.mutation({
            query: (season) => ({ url: '/fruit-season', method: 'POST', body: season }),
            invalidatesTags: ['FruitSeason']
        }),
        updateSeason: build.mutation({
            query: ({ id, ...season }) => ({ url: `/fruit-season/${id}`, method: 'PUT', body: season }),
            invalidatesTags: ['FruitSeason']
        }),
        cancelSeason: build.mutation({
            query: (id) => ({ url: `/fruit-season/${id}`, method: 'DELETE' }),
            invalidatesTags: ['FruitSeason']
        })
    })
})

export const {
    useGetCurrentSeasonsQuery,
    useGetAllSeasonsQuery,
    useCreateSeasonMutation,
    useUpdateSeasonMutation,
    useCancelSeasonMutation
} = seasonSlice