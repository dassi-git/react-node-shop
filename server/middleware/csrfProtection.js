const crypto = require('crypto')

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS'])

const getCookie = (cookieHeader, name) => {
    const match = cookieHeader?.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))
    return match ? decodeURIComponent(match[1]) : null
}

const csrfProtection = (req, res, next) => {
    if (safeMethods.has(req.method) || !getCookie(req.get('cookie'), 'accessToken')) return next()

    const cookieToken = getCookie(req.get('cookie'), 'csrfToken')
    const headerToken = req.get('x-csrf-token')
    if (!cookieToken || !headerToken || cookieToken.length !== headerToken.length
        || !crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
        return res.status(403).json({ message: 'Invalid CSRF token' })
    }

    return next()
}

module.exports = csrfProtection