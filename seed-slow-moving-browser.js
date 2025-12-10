// Realistic Slow Moving Items Test Data
// Run this in browser console to add realistic data for testing Slow Moving Items report
// This simulates a typical shop with dead stock and slow-moving items

console.log('🔄 Generating realistic slow-moving items data...')

// Add realistic items with varying sales patterns
const realisticItems = [
  // Dead Stock - 0 sales in 30 days
  { name: 'Old Brand Soap', stock: 50, minStock: 10, sellingPrice: 25, purchasePrice: 18, sku: 'SOAP-OLD-001', monthlySales: 0 },
  { name: 'Discontinued Shampoo', stock: 30, minStock: 5, sellingPrice: 120, purchasePrice: 90, sku: 'SHMP-OLD-001', monthlySales: 0 },
  { name: 'Expired Promo Pack', stock: 25, minStock: 5, sellingPrice: 150, purchasePrice: 110, sku: 'PROMO-001', monthlySales: 0 },

  // Very Slow - Less than 0.1/day (~3 per month)
  { name: 'Premium Ghee 500g', stock: 40, minStock: 10, sellingPrice: 350, purchasePrice: 280, sku: 'GHEE-001', monthlySales: 2 },
  { name: 'Organic Honey 250g', stock: 35, minStock: 8, sellingPrice: 280, purchasePrice: 220, sku: 'HONEY-001', monthlySales: 3 },
  { name: 'Special Masala Mix', stock: 30, minStock: 10, sellingPrice: 85, purchasePrice: 65, sku: 'MASALA-001', monthlySales: 2 },

  // Slow - 4-10 units per month
  { name: 'Import Chocolate', stock: 45, minStock: 15, sellingPrice: 180, purchasePrice: 140, sku: 'CHOC-001', monthlySales: 5 },
  { name: 'Diet Cola 500ml', stock: 50, minStock: 20, sellingPrice: 40, purchasePrice: 32, sku: 'COLA-001', monthlySales: 7 },
  { name: 'Sugar-Free Biscuit', stock: 40, minStock: 15, sellingPrice: 55, purchasePrice: 42, sku: 'BISC-SF-001', monthlySales: 8 },
  { name: 'Green Tea Bags', stock: 35, minStock: 12, sellingPrice: 150, purchasePrice: 115, sku: 'TEA-GRN-001', monthlySales: 6 }
]

// Add items to inventory
const existingItems = JSON.parse(localStorage.getItem('thisai_crm_items') || '[]')

realisticItems.forEach(item => {
  const existing = existingItems.find(i => i.name === item.name)
  if (!existing) {
    existingItems.push({
      id: `item_${item.name.replace(/\s+/g, '_').toLowerCase()}`,
      name: item.name,
      itemCode: item.sku,
      sku: item.sku,
      category: 'Grocery',
      stock: item.stock,
      minStock: item.minStock,
      maxStock: item.stock * 3,
      reorderPoint: item.minStock,
      sellingPrice: item.sellingPrice,
      purchasePrice: item.purchasePrice,
      unit: 'PCS',
      taxPreference: 'taxable',
      tax: { cgst: 2.5, sgst: 2.5, igst: 0, cess: 0 },
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }
})

localStorage.setItem('thisai_crm_items', JSON.stringify(existingItems))
console.log('✅ Added', realisticItems.length, 'slow-moving items to inventory')

// Generate sparse sales data for slow-moving items
const invoices = []
const startDate = new Date()
startDate.setDate(startDate.getDate() - 30) // Start 30 days ago

// Generate sales for slow-moving items (very few invoices)
realisticItems.forEach(item => {
  if (item.monthlySales === 0) {
    // Dead stock - no invoices
    return
  }

  // Generate invoices based on monthly sales
  for (let i = 0; i < item.monthlySales; i++) {
    const randomDay = Math.floor(Math.random() * 30)
    const currentDate = new Date(startDate)
    currentDate.setDate(currentDate.getDate() + randomDay)
    const dateStr = currentDate.toISOString().split('T')[0]

    const quantity = 1 // Usually 1 unit per invoice for slow movers
    const rate = item.sellingPrice
    const amount = quantity * rate
    const taxRate = 5 // 5% GST
    const taxAmount = amount * taxRate / 100

    const invoice = {
      id: `inv_slow_${item.sku}_${i}_${Date.now()}`,
      type: 'sale',
      invoiceNumber: `INV-SLOW-${String(randomDay * 100 + i).padStart(4, '0')}`,
      invoiceDate: dateStr,
      partyName: `Customer ${Math.floor(Math.random() * 50) + 1}`,
      items: [{
        itemId: `item_${item.name.replace(/\s+/g, '_').toLowerCase()}`,
        itemName: item.name,
        description: item.name,
        quantity: quantity,
        unit: 'PCS',
        rate: rate,
        amount: amount,
        taxRate: taxRate,
        tax: taxAmount,
        taxableAmount: amount,
        cgstPercent: taxRate / 2,
        cgstAmount: taxAmount / 2,
        sgstPercent: taxRate / 2,
        sgstAmount: taxAmount / 2,
        igstPercent: 0,
        igstAmount: 0,
        totalAmount: amount + taxAmount
      }],
      subtotal: amount,
      totalTaxAmount: taxAmount,
      grandTotal: amount + taxAmount,
      payment: {
        mode: 'cash',
        status: 'paid',
        paidAmount: amount + taxAmount,
        dueAmount: 0
      },
      createdAt: currentDate.toISOString()
    }

    invoices.push(invoice)
  }
})

// Add to existing invoices
const existingInvoices = JSON.parse(localStorage.getItem('thisai_crm_invoices') || '[]')
invoices.forEach(inv => existingInvoices.push(inv))
localStorage.setItem('thisai_crm_invoices', JSON.stringify(existingInvoices))

console.log('✅ SUCCESS! Generated', invoices.length, 'sparse sales invoices for slow-moving items')
console.log('')
console.log('📊 Expected Slow Moving Items Report Results:')
console.log('')
console.log('🔴 DEAD STOCK (0 sales in 30 days):')
console.log('  • Old Brand Soap: 50 stock × ₹18 = ₹900 capital tied up')
console.log('  • Discontinued Shampoo: 30 stock × ₹90 = ₹2,700 capital tied up')
console.log('  • Expired Promo Pack: 25 stock × ₹110 = ₹2,750 capital tied up')
console.log('')
console.log('🟠 VERY SLOW (<0.1/day = ~3 per month):')
console.log('  • Premium Ghee: 2 sales → 0.067/day')
console.log('  • Organic Honey: 3 sales → 0.1/day')
console.log('  • Special Masala Mix: 2 sales → 0.067/day')
console.log('')
console.log('🟡 SLOW (4-10 units in 30 days):')
console.log('  • Import Chocolate: 5 sales')
console.log('  • Diet Cola: 7 sales')
console.log('  • Sugar-Free Biscuit: 8 sales')
console.log('  • Green Tea Bags: 6 sales')
console.log('')
console.log('💰 Total Capital Tied Up: ~₹20,000+')
console.log('')
console.log('🎯 Now go to Reports → Inventory → Slow Moving Items to see the report!')
console.log('⚠️ You should see 3 Dead Stock items with red badges!')
