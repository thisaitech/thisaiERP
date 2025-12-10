type StockRecord = {
  stock?: number | string
  reorderPoint?: number | string
  lowStockAlert?: number | string
}

const normalizeNumber = (value?: number | string) => {
  const parsed = Number(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

const getThreshold = (item: StockRecord) => {
  const reorderPoint = normalizeNumber(item.reorderPoint)
  const alertPoint = normalizeNumber(item.lowStockAlert)

  // Prefer explicit reorderPoint, fallback to lowStockAlert, then zero
  if (reorderPoint > 0) return reorderPoint
  if (alertPoint > 0) return alertPoint
  return 0
}

export const isLowStockItem = (item: StockRecord) => {
  const stock = normalizeNumber(item.stock)
  const threshold = getThreshold(item)
  return stock > 0 && threshold > 0 && stock <= threshold
}

export const getLowStockItems = <T extends StockRecord>(items: T[]) => {
  return items.filter(isLowStockItem)
}

export const getLowStockCount = (items: StockRecord[]) => getLowStockItems(items).length
