// Excel Export Utility - Export data to Excel files
import * as XLSX from 'xlsx'
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import type { Invoice, InvoiceItem, Item, Party, LedgerEntry } from '../types'
import { getInvoices } from '../services/invoiceService'
import { getItems } from '../services/itemService'
import { getParties } from '../services/partyService'
import { getPartyLedger } from '../services/ledgerService'
import { getPartyName } from './partyUtils'

/**
 * Helper function to download workbook with Capacitor Filesystem support for Android/iOS APK
 */
async function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  const platform = Capacitor.getPlatform()

  // For Android/iOS native apps, use Capacitor Filesystem with better mobile support
  if (platform === 'android' || platform === 'ios') {
    try {
      // Generate base64 Excel data
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' })

      // Save to device storage (Documents folder)
      const result = await Filesystem.writeFile({
        path: filename,
        data: wbout,
        directory: Directory.Documents,
        recursive: true
      })

      console.log('Excel file saved successfully:', result.uri)

      // For mobile devices, try to use Web Share API to let user choose where to save
      try {
        const blob = new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        })

        const file = new File([blob], filename, {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        })

        // Check if Web Share API with files is supported (most modern mobile browsers)
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: filename,
            text: `Download ${filename}`
          })

          if (typeof window !== 'undefined' && (window as any).toast) {
            (window as any).toast.success(`File ready to download: ${filename}`)
          }
          return result.uri
        }
      } catch (shareErr) {
        console.log('Share API not available, using fallback:', shareErr)
      }

      // Fallback: Create download link for mobile browsers
      try {
        const blob = new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        })

        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.style.display = 'none'

        // Add to body, click, and remove
        document.body.appendChild(a)
        a.click()

        // Clean up
        setTimeout(() => {
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        }, 100)

        if (typeof window !== 'undefined' && (window as any).toast) {
          (window as any).toast.success(`File downloaded: ${filename}`)
        }

        return result.uri
      } catch (downloadErr) {
        console.error('Mobile download fallback failed:', downloadErr)
      }

      // Show success message with file location
      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast.success(`File saved to Documents folder: ${filename}`)
      }

      return result.uri
    } catch (err) {
      console.error('Capacitor Filesystem save failed for Excel:', err)
      // Fall through to web methods
      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast.error('Failed to save file. Trying alternative method...')
      }
    }
  }

  // Web browser fallback - use standard XLSX.writeFile
  try {
    XLSX.writeFile(wb, filename)
    if (typeof window !== 'undefined' && (window as any).toast) {
      (window as any).toast.success(`File downloaded: ${filename}`)
    }
    return filename
  } catch (err) {
    console.error('Excel download failed:', err)
    throw new Error('Failed to download Excel file')
  }
}

/**
 * Export invoices to Excel
 */
export async function exportInvoicesToExcel(type?: 'sale' | 'purchase') {
  const allInvoices = await getInvoices()
  const invoices = type
    ? allInvoices.filter(inv => inv.type === type)
    : allInvoices

  // Prepare data for Excel
  const data = invoices.map(inv => ({
    'Invoice Number': inv.invoiceNumber,
    'Type': inv.type === 'sale' ? 'Sales' : 'Purchase',
    'Date': new Date(inv.invoiceDate).toLocaleDateString(),
    'Party Name': inv.partyName,
    'Party GSTIN': inv.partyGSTIN || '-',
    'Subtotal': inv.subtotal,
    'Tax': inv.taxAmount,
    'Grand Total': inv.grandTotal,
    'Paid Amount': inv.payment?.paidAmount || 0,
    'Balance Due': inv.grandTotal - (inv.payment?.paidAmount || 0),
    'Status': inv.payment?.status || 'pending',
    'Created At': new Date(inv.createdAt).toLocaleDateString()
  }))

  // Create workbook
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoices')

  // Auto-size columns
  const maxWidth = data.reduce((acc, row) => {
    Object.keys(row).forEach((key, i) => {
      const value = String(row[key as keyof typeof row])
      acc[i] = Math.max(acc[i] || 10, key.length, value.length)
    })
    return acc
  }, [] as number[])

  worksheet['!cols'] = maxWidth.map(w => ({ wch: Math.min(w + 2, 50) }))

  // Generate file name
  const fileName = type
    ? `${type}-invoices-${new Date().toISOString().split('T')[0]}.xlsx`
    : `all-invoices-${new Date().toISOString().split('T')[0]}.xlsx`

  // Download file using Capacitor-compatible method
  await downloadWorkbook(workbook, fileName)

  return fileName
}

/**
 * Export inventory/stock to Excel
 */
export async function exportInventoryToExcel() {
  const items = await getItems()

  // Prepare data for Excel
  const data = items.map(item => ({
    'SKU': item.sku,
    'Item Name': item.name,
    'Description': item.description || '-',
    'HSN/SAC': item.hsn || '-',
    'Unit': item.unit,
    'Quantity': item.quantity,
    'Purchase Price': item.purchasePrice,
    'Sale Price': item.salePrice,
    'Tax Rate (%)': item.taxRate || 0,
    'Stock Value': item.quantity * item.salePrice,
    'Min Stock Level': item.minStockLevel || '-',
    'Status': item.quantity === 0 ? 'Out of Stock' :
              item.quantity <= (item.minStockLevel || 10) ? 'Low Stock' : 'In Stock',
    'Created At': new Date(item.createdAt).toLocaleDateString()
  }))

  // Create workbook
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory')

  // Auto-size columns
  const maxWidth = data.reduce((acc, row) => {
    Object.keys(row).forEach((key, i) => {
      const value = String(row[key as keyof typeof row])
      acc[i] = Math.max(acc[i] || 10, key.length, value.length)
    })
    return acc
  }, [] as number[])

  worksheet['!cols'] = maxWidth.map(w => ({ wch: Math.min(w + 2, 50) }))

  // Generate file name
  const fileName = `inventory-${new Date().toISOString().split('T')[0]}.xlsx`

  // Download file using Capacitor-compatible method
  await downloadWorkbook(workbook, fileName)

  return fileName
}

/**
 * Export parties (customers/suppliers) to Excel
 */
export async function exportPartiesToExcel(type?: 'customer' | 'supplier') {
  const allParties = await getParties()
  const parties = type
    ? allParties.filter(party => party.type === type)
    : allParties

  // Prepare data for Excel
  const data = parties.map(party => ({
    'Party Name': getPartyName(party),
    'Type': party.type === 'customer' ? 'Customer' : 'Supplier',
    'Contact Person': party.contactPerson || '-',
    'Email': party.email || '-',
    'Phone': party.phone || '-',
    'GSTIN': party.gstin || '-',
    'Address': party.address || '-',
    'City': party.city || '-',
    'State': party.state || '-',
    'PIN Code': party.pinCode || '-',
    'Opening Balance': party.openingBalance || 0,
    'Created At': new Date(party.createdAt).toLocaleDateString()
  }))

  // Create workbook
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Parties')

  // Auto-size columns
  const maxWidth = data.reduce((acc, row) => {
    Object.keys(row).forEach((key, i) => {
      const value = String(row[key as keyof typeof row])
      acc[i] = Math.max(acc[i] || 10, key.length, value.length)
    })
    return acc
  }, [] as number[])

  worksheet['!cols'] = maxWidth.map(w => ({ wch: Math.min(w + 2, 50) }))

  // Generate file name
  const fileName = type
    ? `${type}s-${new Date().toISOString().split('T')[0]}.xlsx`
    : `parties-${new Date().toISOString().split('T')[0]}.xlsx`

  // Download file using Capacitor-compatible method
  await downloadWorkbook(workbook, fileName)

  return fileName
}

/**
 * Export party ledger to Excel
 */
export async function exportPartyLedgerToExcel(partyId: string, partyName: string) {
  const ledgerEntries = await getPartyLedger(partyId)

  // Prepare data for Excel
  const data = ledgerEntries.map(entry => ({
    'Date': new Date(entry.date).toLocaleDateString(),
    'Type': entry.type === 'invoice' ? 'Invoice' : 'Payment',
    'Reference': entry.referenceNumber,
    'Description': entry.description,
    'Debit': entry.debit || 0,
    'Credit': entry.credit || 0,
    'Balance': entry.balance
  }))

  // Add summary row
  const totalDebit = ledgerEntries.reduce((sum, e) => sum + e.debit, 0)
  const totalCredit = ledgerEntries.reduce((sum, e) => sum + e.credit, 0)
  const finalBalance = ledgerEntries[ledgerEntries.length - 1]?.balance || 0

  data.push({
    'Date': '',
    'Type': '',
    'Reference': '',
    'Description': 'TOTAL',
    'Debit': totalDebit,
    'Credit': totalCredit,
    'Balance': finalBalance
  })

  // Create workbook
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Ledger')

  // Auto-size columns
  worksheet['!cols'] = [
    { wch: 12 }, // Date
    { wch: 10 }, // Type
    { wch: 15 }, // Reference
    { wch: 30 }, // Description
    { wch: 15 }, // Debit
    { wch: 15 }, // Credit
    { wch: 15 }  // Balance
  ]

  // Generate file name
  const fileName = `ledger-${partyName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`

  // Download file using Capacitor-compatible method
  await downloadWorkbook(workbook, fileName)

  return fileName
}

/**
 * Export complete sales report to Excel
 */
export async function exportSalesReportToExcel(startDate?: string, endDate?: string) {
  const allInvoices = await getInvoices()
  let salesInvoices = allInvoices.filter(inv => inv.type === 'sale')

  if (startDate) {
    salesInvoices = salesInvoices.filter(inv => inv.invoiceDate >= startDate)
  }
  if (endDate) {
    salesInvoices = salesInvoices.filter(inv => inv.invoiceDate <= endDate)
  }

  // Prepare detailed data
  const data: any[] = []

  salesInvoices.forEach(inv => {
    inv.items.forEach(item => {
      data.push({
        'Invoice Number': inv.invoiceNumber,
        'Date': new Date(inv.invoiceDate).toLocaleDateString(),
        'Customer': inv.partyName,
        'Item': item.description,
        'HSN': item.hsn || '-',
        'Quantity': item.quantity,
        'Unit': item.unit,
        'Rate': item.rate,
        'Amount': item.amount,
        'Tax Rate': item.taxRate || 0,
        'Tax Amount': item.tax || 0,
        'Total': item.amount + (item.tax || 0)
      })
    })
  })

  // Create workbook
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Report')

  // Auto-size columns
  worksheet['!cols'] = [
    { wch: 15 }, // Invoice Number
    { wch: 12 }, // Date
    { wch: 25 }, // Customer
    { wch: 30 }, // Item
    { wch: 10 }, // HSN
    { wch: 10 }, // Quantity
    { wch: 8 },  // Unit
    { wch: 12 }, // Rate
    { wch: 12 }, // Amount
    { wch: 10 }, // Tax Rate
    { wch: 12 }, // Tax Amount
    { wch: 12 }  // Total
  ]

  // Generate file name
  const fileName = `sales-report-${new Date().toISOString().split('T')[0]}.xlsx`

  // Download file using Capacitor-compatible method
  await downloadWorkbook(workbook, fileName)

  return fileName
}

/**
 * Export complete purchase report to Excel
 */
export async function exportPurchaseReportToExcel(startDate?: string, endDate?: string) {
  const allInvoices = await getInvoices()
  let purchaseInvoices = allInvoices.filter(inv => inv.type === 'purchase')

  if (startDate) {
    purchaseInvoices = purchaseInvoices.filter(inv => inv.invoiceDate >= startDate)
  }
  if (endDate) {
    purchaseInvoices = purchaseInvoices.filter(inv => inv.invoiceDate <= endDate)
  }

  // Prepare detailed data
  const data: any[] = []

  purchaseInvoices.forEach(inv => {
    inv.items.forEach(item => {
      data.push({
        'Bill Number': inv.invoiceNumber,
        'Date': new Date(inv.invoiceDate).toLocaleDateString(),
        'Supplier': inv.partyName,
        'Item': item.description,
        'HSN': item.hsn || '-',
        'Quantity': item.quantity,
        'Unit': item.unit,
        'Rate': item.rate,
        'Amount': item.amount,
        'Tax Rate': item.taxRate || 0,
        'Tax Amount': item.tax || 0,
        'Total': item.amount + (item.tax || 0)
      })
    })
  })

  // Create workbook
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchase Report')

  // Auto-size columns
  worksheet['!cols'] = [
    { wch: 15 }, // Bill Number
    { wch: 12 }, // Date
    { wch: 25 }, // Supplier
    { wch: 30 }, // Item
    { wch: 10 }, // HSN
    { wch: 10 }, // Quantity
    { wch: 8 },  // Unit
    { wch: 12 }, // Rate
    { wch: 12 }, // Amount
    { wch: 10 }, // Tax Rate
    { wch: 12 }, // Tax Amount
    { wch: 12 }  // Total
  ]

  // Generate file name
  const fileName = `purchase-report-${new Date().toISOString().split('T')[0]}.xlsx`

  // Download file using Capacitor-compatible method
  await downloadWorkbook(workbook, fileName)

  return fileName
}
