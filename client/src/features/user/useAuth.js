import { useSelector } from "react-redux"

const useAuth = () => {
    return useSelector((state) => state?.auth?.user ?? null)
}

export default useAuth