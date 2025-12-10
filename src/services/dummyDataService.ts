// Dummy Data Service
// Generate comprehensive dummy data for testing all CRM features

import { createInvoice } from './invoiceService'
import { createParty } from './partyService'
import { createItem } from './itemService'
import { recordPayment } from './paymentService'
import { createDeliveryChallan } from './deliveryChallanService'
import { createPurchaseOrder } from './purchaseOrderService'

// Sample party names
const customerNames = [
  'Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sneha Reddy', 'Vikram Singh',
  'Anita Desai', 'Sanjay Gupta', 'Meera Iyer', 'Rahul Verma', 'Kavita Nair',
  'Arjun Mehta', 'Deepa Joshi', 'Suresh Pillai', 'Lakshmi Rao', 'Kiran Kumar'
]

const supplierNames = [
  'ABC Suppliers Ltd', 'XYZ Traders', 'Global Imports Co', 'National Distributors',
  'Prime Wholesale', 'Elite Trading Co', 'Mega Suppliers', 'Best Buy Distributors',
  'Supreme Traders', 'Quality Imports Ltd'
]

// Sample items
const productItems = [
  { name: 'Premium Office Chair', hsn: '94013000', category: 'Furniture', basePrice: 3000 },
  { name: 'Wireless Mouse', hsn: '84716060', category: 'Electronics', basePrice: 500 },
  { name: 'Mechanical Keyboard', hsn: '84716060', category: 'Electronics', basePrice: 2000 },
  { name: 'Monitor Stand', hsn: '94032000', category: 'Furniture', basePrice: 800 },
  { name: 'LED Desk Lamp', hsn: '94054090', category: 'Lighting', basePrice: 600 },
  { name: 'Laptop Bag', hsn: '42021290', category: 'Accessories', basePrice: 1200 },
  { name: 'USB Cable', hsn: '85444920', category: 'Electronics', basePrice: 150 },
  { name: 'Notepad A4', hsn: '48201000', category: 'Stationery', basePrice: 50 },
  { name: 'Pen Set', hsn: '96081000', category: 'Stationery', basePrice: 200 },
  { name: 'Water Bottle', hsn: '39233090', category: 'Accessories', basePrice: 300 },
  { name: 'Desk Organizer', hsn: '39269099', category: 'Accessories', basePrice: 400 },
  { name: 'Whiteboard Marker', hsn: '96083000', category: 'Stationery', basePrice: 100 },
  { name: 'File Folder', hsn: '48201000', category: 'Stationery', basePrice: 80 },
  { name: 'Calculator', hsn: '84701000', category: 'Electronics', basePrice: 500 },
  { name: 'Stapler', hsn: '82055900', category: 'Stationery', basePrice: 150 }
]

// Helper to generate random date in range
function randomDate(start: Date, end: Date): string {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  return date.toISOString().split('T')[0]
}

// Helper to generate random phone
function randomPhone(): string {
  return `+91${Math.floor(7000000000 + Math.random() * 3000000000)}`
}

// Helper to generate random email
function randomEmail(name: string): string {
  const cleanName = name.toLowerCase().replace(/\s+/g, '.')
  return `${cleanName}@example.com`
}

// Helper to generate random GST number
function randomGSTIN(): string {
  const state = Math.floor(10 + Math.random() * 27).toString()
  const pan = Math.random().toString(36).substring(2, 12).toUpperCase()
  return `${state}${pan}1Z5`
}

/**
 * Generate dummy parties (customers and suppliers)
 */
export async function generateDummyParties(): Promise<number> {
  let count = 0

  // Generate customers
  for (const name of customerNames) {
    const partyData = {
      name,
      type: 'customer' as const,
      phone: randomPhone(),
      email: randomEmail(name),
      gstin: Math.random() > 0.3 ? randomGSTIN() : undefined,
      billingAddress: {
        street: `${Math.floor(1 + Math.random() * 999)}, Main Street`,
        city: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata'][Math.floor(Math.random() * 5)],
        state: ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'West Bengal'][Math.floor(Math.random() * 5)],
        pincode: `${Math.floor(100000 + Math.random() * 900000)}`,
        country: 'India'
      },
      openingBalance: Math.floor(-50000 + Math.random() * 100000),
      creditLimit: Math.floor(50000 + Math.random() * 200000)
    }

    const result = await createParty(partyData)
    if (result) count++
  }

  // Generate suppliers
  for (const name of supplierNames) {
    const partyData = {
      name,
      type: 'supplier' as const,
      phone: randomPhone(),
      email: randomEmail(name),
      gstin: Math.random() > 0.2 ? randomGSTIN() : undefined,
      billingAddress: {
        street: `${Math.floor(1 + Math.random() * 999)}, Industrial Area`,
        city: ['Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Ahmedabad'][Math.floor(Math.random() * 5)],
        state: ['Maharashtra', 'Delhi', 'Karnataka', 'Maharashtra', 'Gujarat'][Math.floor(Math.random() * 5)],
        pincode: `${Math.floor(100000 + Math.random() * 900000)}`,
        country: 'India'
      },
      openingBalance: Math.floor(-100000 + Math.random() * 200000),
      creditLimit: Math.floor(100000 + Math.random() * 500000)
    }

    const result = await createParty(partyData)
    if (result) count++
  }

  return count
}

/**
 * Generate dummy items
 */
export async function generateDummyItems(): Promise<number> {
  let count = 0

  for (const item of productItems) {
    const itemData = {
      name: item.name,
      type: 'product' as const,
      category: item.category,
      hsn: item.hsn,
      unit: 'pcs',
      salePrice: item.basePrice,
      purchasePrice: Math.floor(item.basePrice * 0.6),
      taxRate: [0, 5, 12, 18, 28][Math.floor(Math.random() * 5)],
      openingStock: Math.floor(10 + Math.random() * 100),
      minStockLevel: Math.floor(5 + Math.random() * 20),
      maxStockLevel: Math.floor(100 + Math.random() * 200)
    }

    const result = await createItem(itemData)
    if (result) count++
  }

  return count
}

/**
 * Generate dummy sales invoices
 */
export async function generateDummySales(count: number = 50): Promise<number> {
  let created = 0
  const startDate = new Date('2024-01-01')
  const endDate = new Date('2024-12-31')

  for (let i = 0; i < count; i++) {
    const numItems = Math.floor(1 + Math.random() * 5)
    const items = []

    for (let j = 0; j < numItems; j++) {
      const product = productItems[Math.floor(Math.random() * productItems.length)]
      const quantity = Math.floor(1 + Math.random() * 10)
      const rate = product.basePrice
      const discount = Math.random() > 0.7 ? Math.floor(rate * 0.1) : 0
      const taxRate = [0, 5, 12, 18, 28][Math.floor(Math.random() * 5)]
      const amount = (rate - discount) * quantity

      items.push({
        id: `item_${j}`,
        description: product.name,
        hsn: product.hsn,
        quantity,
        unit: 'pcs',
        rate,
        discount,
        taxRate,
        amount
      })
    }

    const subtotal = items.reduce((sum, item) => sum + item.amount, 0)
    const totalTaxAmount = items.reduce((sum, item) => sum + (item.amount * item.taxRate / 100), 0)
    const grandTotal = subtotal + totalTaxAmount

    const invoiceData = {
      type: 'sale' as const,
      invoiceNumber: `INV-${String(i + 1).padStart(4, '0')}`,
      invoiceDate: randomDate(startDate, endDate),
      dueDate: randomDate(startDate, endDate),
      partyName: customerNames[Math.floor(Math.random() * customerNames.length)],
      partyPhone: randomPhone(),
      partyEmail: randomEmail(customerNames[Math.floor(Math.random() * customerNames.length)]),
      partyGSTIN: Math.random() > 0.3 ? randomGSTIN() : undefined,
      items,
      subtotal,
      discountAmount: 0,
      totalTaxAmount,
      grandTotal,
      payment: {
        mode: ['cash', 'bank', 'upi', 'card', 'cheque'][Math.floor(Math.random() * 5)] as any,
        status: ['paid', 'pending', 'partial'][Math.floor(Math.random() * 3)] as any,
        paidAmount: Math.random() > 0.5 ? grandTotal : Math.floor(grandTotal * Math.random()),
        dueAmount: Math.random() > 0.5 ? 0 : Math.floor(grandTotal * Math.random())
      },
      notes: Math.random() > 0.7 ? 'Thank you for your business!' : undefined,
      createdBy: 'user'
    }

    const result = await createInvoice(invoiceData)
    if (result) created++
  }

  return created
}

/**
 * Generate dummy purchase invoices
 */
export async function generateDummyPurchases(count: number = 40): Promise<number> {
  let created = 0
  const startDate = new Date('2024-01-01')
  const endDate = new Date('2024-12-31')

  for (let i = 0; i < count; i++) {
    const numItems = Math.floor(1 + Math.random() * 5)
    const items = []

    for (let j = 0; j < numItems; j++) {
      const product = productItems[Math.floor(Math.random() * productItems.length)]
      const quantity = Math.floor(5 + Math.random() * 50)
      const rate = Math.floor(product.basePrice * 0.6)
      const discount = Math.random() > 0.8 ? Math.floor(rate * 0.05) : 0
      const taxRate = [0, 5, 12, 18, 28][Math.floor(Math.random() * 5)]
      const amount = (rate - discount) * quantity

      items.push({
        id: `item_${j}`,
        description: product.name,
        hsn: product.hsn,
        quantity,
        unit: 'pcs',
        rate,
        discount,
        taxRate,
        amount
      })
    }

    const subtotal = items.reduce((sum, item) => sum + item.amount, 0)
    const totalTaxAmount = items.reduce((sum, item) => sum + (item.amount * item.taxRate / 100), 0)
    const grandTotal = subtotal + totalTaxAmount

    const invoiceData = {
      type: 'purchase' as const,
      invoiceNumber: `PINV-${String(i + 1).padStart(4, '0')}`,
      invoiceDate: randomDate(startDate, endDate),
      dueDate: randomDate(startDate, endDate),
      partyName: supplierNames[Math.floor(Math.random() * supplierNames.length)],
      partyPhone: randomPhone(),
      partyEmail: randomEmail(supplierNames[Math.floor(Math.random() * supplierNames.length)]),
      partyGSTIN: Math.random() > 0.2 ? randomGSTIN() : undefined,
      items,
      subtotal,
      discountAmount: 0,
      totalTaxAmount,
      grandTotal,
      payment: {
        mode: ['cash', 'bank', 'upi', 'card', 'cheque'][Math.floor(Math.random() * 5)] as any,
        status: ['paid', 'pending', 'partial'][Math.floor(Math.random() * 3)] as any,
        paidAmount: Math.random() > 0.5 ? grandTotal : Math.floor(grandTotal * Math.random()),
        dueAmount: Math.random() > 0.5 ? 0 : Math.floor(grandTotal * Math.random())
      },
      notes: undefined,
      createdBy: 'user'
    }

    const result = await createInvoice(invoiceData)
    if (result) created++
  }

  return created
}

/**
 * Generate dummy delivery challans
 */
export async function generateDummyDeliveryChallans(count: number = 20): Promise<number> {
  let created = 0
  const startDate = new Date('2024-01-01')
  const endDate = new Date('2024-12-31')

  for (let i = 0; i < count; i++) {
    const numItems = Math.floor(1 + Math.random() * 4)
    const items = []

    for (let j = 0; j < numItems; j++) {
      const product = productItems[Math.floor(Math.random() * productItems.length)]
      items.push({
        id: `item_${j}`,
        itemName: product.name,
        quantity: Math.floor(1 + Math.random() * 20),
        unit: 'pcs',
        description: undefined
      })
    }

    const challanData: any = {
      challanNumber: `DC-${String(i + 1).padStart(4, '0')}`,
      challanDate: randomDate(startDate, endDate),
      customerName: customerNames[Math.floor(Math.random() * customerNames.length)],
      customerPhone: randomPhone(),
      items,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      status: ['pending', 'in-transit', 'delivered', 'returned'][Math.floor(Math.random() * 4)] as any,
      vehicleNumber: `MH${Math.floor(10 + Math.random() * 90)}-AB-${Math.floor(1000 + Math.random() * 9000)}`,
      remarks: undefined
    }

    const result = await createDeliveryChallan(challanData)
    if (result) created++
  }

  return created
}

/**
 * Generate dummy purchase orders
 */
export async function generateDummyPurchaseOrders(count: number = 15): Promise<number> {
  let created = 0
  const startDate = new Date('2024-01-01')
  const endDate = new Date('2024-12-31')

  for (let i = 0; i < count; i++) {
    const numItems = Math.floor(1 + Math.random() * 5)
    const items = []

    for (let j = 0; j < numItems; j++) {
      const product = productItems[Math.floor(Math.random() * productItems.length)]
      const quantity = Math.floor(10 + Math.random() * 100)
      const rate = Math.floor(product.basePrice * 0.6)

      items.push({
        id: `item_${j}`,
        itemName: product.name,
        quantity,
        unit: 'pcs',
        rate,
        taxRate: 18,
        amount: quantity * rate
      })
    }

    const subtotal = items.reduce((sum, item) => sum + item.amount, 0)
    const taxAmount = subtotal * 0.18

    const poData: any = {
      poNumber: `PO-${String(i + 1).padStart(4, '0')}`,
      poDate: randomDate(startDate, endDate),
      supplierName: supplierNames[Math.floor(Math.random() * supplierNames.length)],
      supplierPhone: randomPhone(),
      items,
      subtotal,
      taxAmount,
      totalAmount: subtotal + taxAmount,
      status: ['draft', 'sent', 'approved', 'rejected', 'received'][Math.floor(Math.random() * 5)] as any,
      paymentTerms: 'Net 30 days'
    }

    const result = await createPurchaseOrder(poData)
    if (result) created++
  }

  return created
}

/**
 * Generate all dummy data at once
 */
export async function generateAllDummyData() {
  console.log('🔄 Starting dummy data generation...')

  const parties = await generateDummyParties()
  console.log(`✅ Created ${parties} parties`)

  const items = await generateDummyItems()
  console.log(`✅ Created ${items} items`)

  const sales = await generateDummySales(50)
  console.log(`✅ Created ${sales} sales invoices`)

  const purchases = await generateDummyPurchases(40)
  console.log(`✅ Created ${purchases} purchase invoices`)

  const challans = await generateDummyDeliveryChallans(20)
  console.log(`✅ Created ${challans} delivery challans`)

  const pos = await generateDummyPurchaseOrders(15)
  console.log(`✅ Created ${pos} purchase orders`)

  return {
    parties,
    items,
    sales,
    purchases,
    challans,
    purchaseOrders: pos,
    total: parties + items + sales + purchases + challans + pos
  }
}

/**
 * Clear all dummy data
 */
export async function clearAllDummyData() {
  // Clear from localStorage
  const keys = [
    'thisai_crm_invoices',
    'thisai_crm_parties',
    'thisai_crm_items',
    'thisai_crm_payments',
    'thisai_crm_delivery_challans',
    'thisai_crm_purchase_orders'
  ]

  keys.forEach(key => localStorage.removeItem(key))

  console.log('✅ All dummy data cleared')
}
