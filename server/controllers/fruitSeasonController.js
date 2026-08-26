const FruitSeason = require('../models/FruitSeason')

const parseDate = (value) => {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
}

const validateSeason = (body) => {
    const validFrom = parseDate(body.validFrom)
    const validUntil = parseDate(body.validUntil)
    const status = body.status || 'available'
    const priceAdjustment = Number(body.priceAdjustment || 0)
    if (!body.fruitKey || !body.displayName || !validFrom || !validUntil) throw new Error('Fruit, validFrom and validUntil are required.')
    if (validUntil < validFrom) throw new Error('validUntil must be after validFrom.')
    if (!['available', 'premium', 'unavailable'].includes(status)) throw new Error('Invalid seasonal status.')
    if (!Number.isFinite(priceAdjustment) || priceAdjustment < 0 || (status !== 'premium' && priceAdjustment !== 0)) throw new Error('Seasonal price adjustment is invalid.')
    return { fruitKey: String(body.fruitKey).trim().toLowerCase(), displayName: String(body.displayName).trim(), validFrom, validUntil, status, priceAdjustment, active: body.active !== false, customerMessage: body.customerMessage || '', internalNote: body.internalNote || '' }
}

const getSeasonForDate = async (req, res) => {
    try {
        const date = parseDate(req.query.date) || new Date()
        const seasons = await FruitSeason.find({ active: true, validFrom: { $lte: date }, validUntil: { $gte: date } }).sort({ fruitKey: 1, updatedAt: -1 }).lean()
        const current = seasons.reduce((result, season) => {
            if (!result[season.fruitKey]) result[season.fruitKey] = season
            return result
        }, {})
        return res.json({ date, seasons: Object.values(current) })
    } catch (error) {
        console.error('Error fetching fruit seasons:', error)
        return res.status(500).json({ message: 'Server error fetching fruit seasons' })
    }
}

const getAllSeasons = async (req, res) => {
    try { return res.json(await FruitSeason.find().sort({ validFrom: -1, fruitKey: 1 }).lean()) } catch (error) { return res.status(500).json({ message: 'Server error fetching fruit seasons' }) }
}

const createSeason = async (req, res) => {
    try {
        const data = validateSeason(req.body)
        if (data.active && await FruitSeason.exists({ fruitKey: data.fruitKey, active: true, validFrom: { $lte: data.validUntil }, validUntil: { $gte: data.validFrom } })) return res.status(409).json({ message: 'This fruit already has an overlapping active season.' })
        const season = await FruitSeason.create({ ...data, updatedBy: req.user._id })
        return res.status(201).json(season)
    } catch (error) { return res.status(error.message.includes('required') || error.message.includes('Invalid') || error.message.includes('adjustment') || error.message.includes('validUntil') ? 400 : 500).json({ message: error.message }) }
}

const updateSeason = async (req, res) => {
    try {
        const data = validateSeason(req.body)
        const season = await FruitSeason.findById(req.params.id)
        if (!season) return res.status(404).json({ message: 'Season not found.' })
        if (data.active && await FruitSeason.exists({ _id: { $ne: season._id }, fruitKey: data.fruitKey, active: true, validFrom: { $lte: data.validUntil }, validUntil: { $gte: data.validFrom } })) return res.status(409).json({ message: 'This fruit already has an overlapping active season.' })
        Object.assign(season, data, { updatedBy: req.user._id })
        return res.json(await season.save())
    } catch (error) { return res.status(error.message.includes('required') || error.message.includes('Invalid') || error.message.includes('adjustment') || error.message.includes('validUntil') ? 400 : 500).json({ message: error.message }) }
}

const deleteSeason = async (req, res) => {
    try {
        const season = await FruitSeason.findByIdAndUpdate(req.params.id, { active: false, updatedBy: req.user._id }, { new: true })
        if (!season) return res.status(404).json({ message: 'Season not found.' })
        return res.json(season)
    } catch (error) { return res.status(500).json({ message: 'Server error cancelling fruit season' }) }
}

module.exports = { getSeasonForDate, getAllSeasons, createSeason, updateSeason, deleteSeason }