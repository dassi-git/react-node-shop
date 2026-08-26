import { useSelector } from "react-redux"
import { jwtDecode } from "jwt-decode"

const useAuth = () => {
    const token = useSelector((state) => state?.auth?.token ?? "")

    if (!token || typeof token !== "string") {
        return null
    }

    try {
        const tokenObj = jwtDecode(token)
        if (!tokenObj || typeof tokenObj !== "object") return null
        if (tokenObj.exp && Number(tokenObj.exp) * 1000 <= Date.now()) return null
        return tokenObj
    } catch (error) {
        return null
    }
}

export default useAuth