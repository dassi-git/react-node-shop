import apiSlice from "./apiSlice";

const userSlice=apiSlice.injectEndpoints({
    endpoints: (build)=>({
        // כניסה
        login:build.mutation({
            query:(user)=>({
                url:"/user/login",
                method:"POST",
                body:user
            })
        }),

        register:build.mutation({
            query:(user)=>({
                url:"/user/register",
                method:"POST",
                body:user
            })
        }),
        logout:build.mutation({
            query:() => ({
                url:"/user/logout",
                method:"POST"
            })
        }),
        // קבלת כל המשתמשים
        getAllUser:build.query({
            query:()=>({
                url:"/user",
                method:"GET"
            }),
            providesTags:["User"]
        }),
        // קבלת פרופיל המשתמש המחובר
        getCurrentUserProfile:build.query({
            query:()=>({
                url:"/user/profile",
                method:"GET"
            }),
            providesTags:["User"]
        }),
        // מחיקת משתמש
        deleteUser:build.mutation({
            query:(userId)=>({
                url:`/user/${userId}`,
                method:"DELETE"
            }),
            invalidatesTags:["User"]
        }),
        // עדכון משתמש
        updateUser:build.mutation({
            query:(user)=>{
                const { _id, createdAt, updatedAt, __v, ...userData } = user;
                return {
                    url:`/user/${_id}`,
                    method:"PUT",
                    body:userData
                };
            },
            invalidatesTags:["User"]
        }),
        // שכחתי סיסמה
        forgotPassword:build.mutation({
            query:(data)=>({
                url:"/user/forgot-password",
                method:"POST",
                body:data
            })
        }),
        // איפוס סיסמה
        resetPassword:build.mutation({
            query:(data)=>({
                url:"/user/reset-password",
                method:"POST",
                body:data
            })
        })
    })
})
export const {useLoginMutation, useRegisterMutation, useLogoutMutation, useGetAllUserQuery, useDeleteUserMutation, useUpdateUserMutation, useGetCurrentUserProfileQuery, useForgotPasswordMutation, useResetPasswordMutation}=userSlice