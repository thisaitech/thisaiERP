/**
 * Multi-Unit Conversion Utilities
 * Handles conversion between different units (Pcs, Box, etc.)
 * Stock is always stored in base units (pieces)
 */

export interface StockDisplay {
  fullUnits: number
  loosePieces: number
  displayText: string
}

/**
 * Get unit price based on selected unit
 * @param selectedUnit - 'Pcs' or 'Box' (or other purchase unit)
 * @param pricePerPiece - Selling price per single piece
 * @param piecesPerBox - How many pieces in one box
 */
export function getUnitPrice(
  selectedUnit: string,
  pricePerPiece: number,
  piecesPerBox: number
): number {
  if (selectedUnit === 'Pcs' || selectedUnit === 'PCS') {
    return pricePerPiece
  }
  return pricePerPiece * piecesPerBox
}

/**
 * Convert sale quantity to base units (pieces)
 * @param selectedUnit - 'Pcs' or 'Box'
 * @param qty - Quantity in selected unit
 * @param piecesPerBox - Conversion factor
 */
export function getBaseQtyForSale(
  selectedUnit: string,
  qty: number,
  piecesPerBox: number
): number {
  if (selectedUnit === 'Pcs' || selectedUnit === 'PCS') {
    return qty
  }
  return qty * piecesPerBox
}

/**
 * Convert purchase quantity to base units (pieces)
 * @param purchaseUnit - Purchase unit (e.g., 'Box')
 * @param qty - Quantity purchased
 * @param piecesPerBox - Conversion factor
 */
export function getBaseQtyForPurchase(
  purchaseUnit: string,
  qty: number,
  piecesPerBox: number
): number {
  if (purchaseUnit === 'Pcs' || purchaseUnit === 'PCS') {
    return qty
  }
  return qty * piecesPerBox
}

/**
 * Display stock in both units (e.g., "5 Boxes + 3 Pieces")
 * @param baseStock - Stock in base units (pieces)
 * @param piecesPerBox - Conversion factor
 * @param purchaseUnit - Name of the larger unit (default: 'Box')
 * @param baseUnit - Name of the base unit (default: 'Pcs')
 */
export function getStockDisplay(
  baseStock: number,
  piecesPerBox: number,
  purchaseUnit: string = 'Box',
  baseUnit: string = 'Pcs'
): StockDisplay {
  const fullUnits = Math.floor(baseStock / piecesPerBox)
  const loosePieces = baseStock % piecesPerBox

  let displayText = ''
  if (fullUnits > 0 && loosePieces > 0) {
    displayText = `${fullUnits} ${purchaseUnit}${fullUnits > 1 ? 'es' : ''} + ${loosePieces} ${baseUnit}`
  } else if (fullUnits > 0) {
    displayText = `${fullUnits} ${purchaseUnit}${fullUnits > 1 ? 'es' : ''}`
  } else {
    displayText = `${loosePieces} ${baseUnit}`
  }

  return {
    fullUnits,
    loosePieces,
    displayText
  }
}

/**
 * Check if stock is sufficient for sale
 * @param currentStockBase - Current stock in base units
 * @param requiredQtyBase - Required quantity in base units
 */
export function hasEnoughStock(
  currentStockBase: number,
  requiredQtyBase: number
): boolean {
  return currentStockBase >= requiredQtyBase
}

/**
 * Get available stock message for error display
 * @param currentStockBase - Current stock in base units
 * @param piecesPerBox - Conversion factor
 * @param purchaseUnit - Name of larger unit
 * @param baseUnit - Name of base unit
 */
export function getAvailableStockMessage(
  currentStockBase: number,
  piecesPerBox: number,
  purchaseUnit: string = 'Box',
  baseUnit: string = 'Pcs'
): string {
  const stock = getStockDisplay(currentStockBase, piecesPerBox, purchaseUnit, baseUnit)
  return `Only ${stock.displayText} available`
}

/**
 * Calculate total pieces from mixed units input
 * @param boxes - Number of boxes
 * @param pieces - Number of loose pieces
 * @param piecesPerBox - Conversion factor
 */
export function calculateTotalPieces(
  boxes: number,
  pieces: number,
  piecesPerBox: number
): number {
  return (boxes * piecesPerBox) + pieces
}

/**
 * Get unit options for dropdown
 * @param hasMultiUnit - Whether item has multi-unit enabled
 * @param baseUnit - Base unit name
 * @param purchaseUnit - Purchase unit name
 */
export function getUnitOptions(
  hasMultiUnit: boolean,
  baseUnit: string = 'Pcs',
  purchaseUnit: string = 'Box'
): { value: string; label: string }[] {
  if (!hasMultiUnit) {
    return [{ value: baseUnit, label: baseUnit }]
  }
  return [
    { value: baseUnit, label: baseUnit },
    { value: purchaseUnit, label: purchaseUnit }
  ]
}
