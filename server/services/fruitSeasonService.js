const FruitSeason = require('../models/FruitSeason')

const getSeasonMap = async (date = new Date()) => {
    const seasons = await FruitSeason.find({ active: true, validFrom: { $lte: date }, validUntil: { $gte: date } }).sort({ updatedAt: -1 }).lean()
    return seasons.reduce((map, season) => {
        if (!map.has(season.fruitKey)) map.set(season.fruitKey, season)
        return map
    }, new Map())
}

const isFruitOption = (option) => {
    const name = String(option.name || '').toLowerCase()
    return name.includes('fruit') || name.includes('פרי') || name.includes('פירות')
}

const resolveSeasonalSelections = async (product, selectedOptions = {}, date = new Date()) => {
    const seasonMap = await getSeasonMap(date)
    const snapshots = []
    let adjustment = 0
    const fruitConfiguration = product.fruitConfiguration
    if (fruitConfiguration?.enabled) {
        const selected = Array.isArray(selectedOptions.fruits) ? selectedOptions.fruits : (selectedOptions.fruits ? [selectedOptions.fruits] : [])
        const allowed = new Set((fruitConfiguration.fruits || []).filter((fruit) => fruit.active !== false).map((fruit) => fruit.fruitKey))
        if (fruitConfiguration.selectionMode === 'customer' && selected.length !== fruitConfiguration.selectionCount) throw new Error(`יש לבחור בדיוק ${fruitConfiguration.selectionCount} פירות`)
        if (fruitConfiguration.selectionMode === 'fixed' && selected.length !== 0) throw new Error('פירות המגש קבועים מראש')
        if (selected.some((fruit) => !allowed.has(String(fruit).toLowerCase()))) throw new Error('נבחר פרי שאינו מוגדר במגש')
        if (fruitConfiguration.selectionMode === 'customer' && selected.length > 1) adjustment += (selected.length - 1) * Number(fruitConfiguration.additionalSelectionPrice || 0)
    }
    for (const option of product.customizationOptions || []) {
        if (!isFruitOption(option)) continue
        const selected = Array.isArray(selectedOptions[option.name]) ? selectedOptions[option.name] : (selectedOptions[option.name] ? [selectedOptions[option.name]] : [])
        for (const selectedValue of selected) {
            const value = option.values.find((item) => item.value === selectedValue || item.fruitKey === selectedValue)
            const fruitKey = String(value?.fruitKey || selectedValue).toLowerCase()
            const season = seasonMap.get(fruitKey)
            if (!value) throw new Error(`הפרי ${selectedValue} אינו מוגדר במוצר`)
            if (!season || season.status === 'unavailable') throw new Error(`הפרי ${value.label} אינו זמין בעונה שנבחרה`)
            const seasonalAdjustment = season.status === 'premium' ? Number(season.priceAdjustment || 0) : 0
            adjustment += seasonalAdjustment
            snapshots.push({ fruitKey: season.fruitKey, displayName: season.displayName, status: season.status, priceAdjustment: seasonalAdjustment, customerMessage: season.customerMessage, date: new Date(date), validFrom: season.validFrom, validUntil: season.validUntil })
        }
    }
    return { adjustment, snapshots }
}

module.exports = { resolveSeasonalSelections, isFruitOption }