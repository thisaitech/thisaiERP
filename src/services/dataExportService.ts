// Complete Data Export Service for Client Migration & Backup
import * as XLSX from 'xlsx'
import { getInvoices } from './invoiceService'
import { getParties } from './partyService'
import { getItems } from './itemService'

/**
 * Export complete business data (all invoices, parties, items)
 * Perfect for client migration or full backup
 */
export const exportCompleteData = async (companyName: string = 'MyBusiness') => {
  try {
    // Get all data
    const invoices = await getInvoices()
    const parties = await getParties()
    const items = await getItems()

    // Create workbook
    const wb = XLSX.utils.book_new()

    // Sheet 1: Invoices
    const invoicesData = invoices.map(inv => ({
      'Invoice Number': inv.invoiceNumber,
      'Date': inv.invoiceDate,
      'Type': inv.type === 'sale' ? 'Sale' : 'Purchase',
      'Party Name': inv.partyName,
      'Party GSTIN': inv.partyGSTIN || '',
      'Subtotal': inv.subtotal,
      'CGST': inv.cgstAmount,
      'SGST': inv.sgstAmount,
      'IGST': inv.igstAmount,
      'Total Tax': inv.totalTaxAmount,
      'Grand Total': inv.grandTotal,
      'Payment Mode': inv.payment?.mode || '',
      'Payment Status': inv.payment?.status || '',
      'Paid Amount': inv.payment?.paidAmount || 0,
      'Due Amount': inv.payment?.dueAmount || 0,
      'Status': inv.status,
      'Created Date': inv.createdAt
    }))
    const invoicesSheet = XLSX.utils.json_to_sheet(invoicesData)
    XLSX.utils.book_append_sheet(wb, invoicesSheet, 'Invoices')

    // Sheet 2: Parties (Customers & Suppliers)
    const partiesData = parties.map(party => ({
      'Company Name': party.companyName || '',
      'Display Name': party.displayName || '',
      'Contact Person': party.contactPersonName || '',
      'Type': party.type || '',
      'Phone': party.phone || '',
      'Email': party.email || '',
      'GSTIN': party.gstDetails?.gstin || '',
      'PAN': party.panNumber || '',
      'Street': party.billingAddress?.street || '',
      'City': party.billingAddress?.city || '',
      'State': party.billingAddress?.state || '',
      'Pin Code': party.billingAddress?.pinCode || '',
      'Credit Limit': party.creditLimit || 0,
      'Credit Days': party.creditDays || 0,
      'Opening Balance': party.openingBalance || 0,
      'Current Balance': party.currentBalance || 0,
      'Bank Name': party.bankDetails?.bankName || '',
      'Account Number': party.bankDetails?.accountNumber || '',
      'IFSC Code': party.bankDetails?.ifscCode || '',
      'Is Active': party.isActive ? 'Yes' : 'No',
      'Created Date': party.createdAt || ''
    }))
    const partiesSheet = XLSX.utils.json_to_sheet(partiesData)
    XLSX.utils.book_append_sheet(wb, partiesSheet, 'Customers & Suppliers')

    // Sheet 3: Items/Inventory
    const itemsData = items.map(item => ({
      'Item Name': item.name || '',
      'Item Code': item.itemCode || '',
      'HSN Code': item.hsnCode || '',
      'SAC Code': item.sacCode || '',
      'Description': item.description || '',
      'Category': item.category || '',
      'Brand': item.brand || '',
      'Unit': item.unit || '',
      'Selling Price': item.sellingPrice || 0,
      'Purchase Price': item.purchasePrice || 0,
      'MRP': item.mrp || '',
      'Current Stock': item.stock || 0,
      'Min Stock': item.minStock || 0,
      'Max Stock': item.maxStock || 0,
      'Reorder Point': item.reorderPoint || 0,
      'Tax Preference': item.taxPreference || '',
      'CGST %': item.tax?.cgst || 0,
      'SGST %': item.tax?.sgst || 0,
      'IGST %': item.tax?.igst || 0,
      'Barcode': item.barcode || '',
      'SKU': item.sku || '',
      'Is Active': item.isActive ? 'Yes' : 'No',
      'Created Date': item.createdAt || ''
    }))
    const itemsSheet = XLSX.utils.json_to_sheet(itemsData)
    XLSX.utils.book_append_sheet(wb, itemsSheet, 'Inventory')

    // Sheet 4: Summary
    const summaryData = [
      { 'Metric': 'Total Invoices', 'Value': invoices.length },
      { 'Metric': 'Total Sales', 'Value': invoices.filter(i => i.type === 'sale').length },
      { 'Metric': 'Total Purchases', 'Value': invoices.filter(i => i.type === 'purchase').length },
      { 'Metric': 'Total Customers & Suppliers', 'Value': parties.length },
      { 'Metric': 'Total Items', 'Value': items.length },
      { 'Metric': 'Export Date', 'Value': new Date().toLocaleString('en-IN') },
      { 'Metric': 'Company Name', 'Value': companyName }
    ]
    const summarySheet = XLSX.utils.json_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary')

    // Save file
    const fileName = `${companyName.replace(/\s+/g, '_')}_Complete_Backup_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)

    return {
      success: true,
      invoices: invoices.length,
      parties: parties.length,
      items: items.length,
      fileName,
      totalRecords: invoices.length + parties.length + items.length
    }
  } catch (error) {
    console.error('Export failed:', error)
    throw new Error('Failed to export data')
  }
}

/**
 * Export invoices only
 */
export const exportInvoicesOnly = async () => {
  try {
    const invoices = await getInvoices()

    const data = invoices.map(inv => ({
      'Invoice Number': inv.invoiceNumber,
      'Date': inv.invoiceDate,
      'Type': inv.type === 'sale' ? 'Sale' : 'Purchase',
      'Party Name': inv.partyName,
      'Party GSTIN': inv.partyGSTIN || '',
      'Party Phone': inv.partyPhone,
      'Subtotal': inv.subtotal,
      'Discount %': inv.discountPercent,
      'Discount Amount': inv.discountAmount,
      'Taxable Amount': inv.taxableAmount,
      'CGST': inv.cgstAmount,
      'SGST': inv.sgstAmount,
      'IGST': inv.igstAmount,
      'Cess': inv.cessAmount,
      'Total Tax': inv.totalTaxAmount,
      'Shipping Charges': inv.shippingCharges,
      'Other Charges': inv.otherCharges,
      'Round Off': inv.roundOff,
      'Grand Total': inv.grandTotal,
      'Payment Mode': inv.payment?.mode || '',
      'Payment Status': inv.payment?.status || '',
      'Paid Amount': inv.payment?.paidAmount || 0,
      'Due Amount': inv.payment?.dueAmount || 0,
      'Due Date': inv.payment?.dueDate || '',
      'Status': inv.status,
      'Notes': inv.notes || '',
      'Created At': inv.createdAt,
      'Created By': inv.createdBy
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices')

    const fileName = `Invoices_Export_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)

    return {
      success: true,
      count: invoices.length,
      fileName
    }
  } catch (error) {
    console.error('Invoice export failed:', error)
    throw new Error('Failed to export invoices')
  }
}

/**
 * Export parties (customers & suppliers) only
 */
export const exportPartiesOnly = async () => {
  try {
    const parties = await getParties()

    const data = parties.map(party => ({
      'Company Name': party.companyName || '',
      'Display Name': party.displayName || '',
      'Contact Person': party.contactPersonName || '',
      'Type': party.type || '',
      'Phone': party.phone || '',
      'Email': party.email || '',
      'Website': party.website || '',
      'GSTIN': party.gstDetails?.gstin || '',
      'GST Type': party.gstDetails?.gstType || '',
      'PAN Number': party.panNumber || '',
      'TAN Number': party.tanNumber || '',
      'Billing Street': party.billingAddress?.street || '',
      'Billing Area': party.billingAddress?.area || '',
      'Billing City': party.billingAddress?.city || '',
      'Billing State': party.billingAddress?.state || '',
      'Billing Pin Code': party.billingAddress?.pinCode || '',
      'Billing Country': party.billingAddress?.country || '',
      'Credit Limit': party.creditLimit || 0,
      'Credit Days': party.creditDays || 0,
      'Payment Terms': party.paymentTerms || '',
      'Opening Balance': party.openingBalance || 0,
      'Current Balance': party.currentBalance || 0,
      'Bank Name': party.bankDetails?.bankName || '',
      'Account Number': party.bankDetails?.accountNumber || '',
      'IFSC Code': party.bankDetails?.ifscCode || '',
      'Account Type': party.bankDetails?.accountType || '',
      'Is Active': party.isActive ? 'Yes' : 'No',
      'Notes': party.notes || '',
      'Tags': party.tags?.join(', ') || '',
      'Created At': party.createdAt || '',
      'Created By': party.createdBy || ''
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Customers & Suppliers')

    const fileName = `Customers_Suppliers_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)

    return {
      success: true,
      count: parties.length,
      fileName
    }
  } catch (error) {
    console.error('Parties export failed:', error)
    throw new Error('Failed to export parties')
  }
}

/**
 * Export items/inventory only
 */
export const exportItemsOnly = async () => {
  try {
    const items = await getItems()

    const data = items.map(item => ({
      'Item Name': item.name || '',
      'Item Code': item.itemCode || '',
      'Description': item.description || '',
      'HSN Code': item.hsnCode || '',
      'SAC Code': item.sacCode || '',
      'Category': item.category || '',
      'Subcategory': item.subcategory || '',
      'Brand': item.brand || '',
      'Unit': item.unit || '',
      'Selling Price': item.sellingPrice || 0,
      'Purchase Price': item.purchasePrice || 0,
      'MRP': item.mrp || '',
      'Current Stock': item.stock || 0,
      'Min Stock': item.minStock || 0,
      'Max Stock': item.maxStock || 0,
      'Reorder Point': item.reorderPoint || 0,
      'Tax Preference': item.taxPreference || '',
      'CGST %': item.tax?.cgst || 0,
      'SGST %': item.tax?.sgst || 0,
      'IGST %': item.tax?.igst || 0,
      'Cess %': item.tax?.cess || 0,
      'Total Tax %': (item.tax?.cgst || 0) + (item.tax?.sgst || 0) + (item.tax?.igst || 0),
      'Barcode': item.barcode || '',
      'SKU': item.sku || '',
      'Image URL': item.imageUrl || '',
      'Is Active': item.isActive ? 'Yes' : 'No',
      'Created At': item.createdAt || '',
      'Updated At': item.updatedAt || ''
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory')

    const fileName = `Inventory_Export_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)

    return {
      success: true,
      count: items.length,
      fileName
    }
  } catch (error) {
    console.error('Items export failed:', error)
    throw new Error('Failed to export items')
  }
}

/**
 * Create backup JSON (alternative format for exact restore)
 */
export const createBackupJSON = async () => {
  try {
    const invoices = await getInvoices()
    const parties = await getParties()
    const items = await getItems()

    const backup = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      data: {
        invoices,
        parties,
        items
      },
      metadata: {
        totalInvoices: invoices.length,
        totalParties: parties.length,
        totalItems: items.length,
        application: 'ThisAI ERP'
      }
    }

    const dataStr = JSON.stringify(backup, null, 2)
    // Force download instead of opening JSON in a new tab
    const dataBlob = new Blob([dataStr], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(dataBlob)

    const link = document.createElement('a')
    link.href = url
    const filename = `Backup_${new Date().toISOString().split('T')[0]}.json`
    link.href = url
    link.download = filename
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 150)

    return {
      success: true,
      totalRecords: invoices.length + parties.length + items.length,
      fileName: link.download
    }
  } catch (error) {
    console.error('Backup failed:', error)
    throw new Error('Failed to create backup')
  }
}
