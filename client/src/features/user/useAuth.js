import { useSelector } from "react-redux"
import { jwtDecode } from "jwt-decode"

const useAuth = () => {
    const token = useSelector((state) => state?.auth?.token ?? "")

    if (!token || typeof token !== "string") {
        return null
    }

    try {
        const tokenObj = jwtDecode(token)
        return tokenObj && typeof tokenObj === "object" ? tokenObj : null
    } catch (error) {
        return null
    }
}

export default useAuth