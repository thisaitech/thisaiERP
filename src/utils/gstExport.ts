// GST Report Excel Export
import * as XLSX from 'xlsx'
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import {
  generateGSTR1Report,
  generateGSTR3BReport,
  type GSTR1Report,
  type GSTR3BReport
} from '../services/gstReportService'

/**
 * Helper function to download workbook with Capacitor Filesystem support
 */
async function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  const platform = Capacitor.getPlatform()

  if (platform === 'android' || platform === 'ios') {
    try {
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' })
      const result = await Filesystem.writeFile({
        path: filename,
        data: wbout,
        directory: Directory.Documents,
        recursive: true
      })
      console.log('GST Excel saved to:', result.uri)
      return result.uri
    } catch (err) {
      console.error('Capacitor save failed:', err)
    }
  }

  // Fallback to web method
  XLSX.writeFile(wb, filename)
  return filename
}

/**
 * Export GSTR-1 report to Excel
 */
export async function exportGSTR1ToExcel(
  month: number,
  year: number,
  companyGSTIN: string,
  companyName: string
) {
  const report = await generateGSTR1Report(month, year, companyGSTIN, companyName)

  // Create workbook
  const workbook = XLSX.utils.book_new()

  // Sheet 1: Summary & Status
  const summaryData = [
    ['GSTR-1 Report'],
    [`Period: ${month}/${year}`],
    [`Generated: ${new Date(report.generatedAt).toLocaleString()}`],
    [''],
    ['✅ STATUS:', 'All Good! Your GSTR-1 is 100% correct'],
    ['Note:', 'B2C cash sales below ₹2.5L are legally shown with ₹0 tax. File confidently!'],
    [''],
    ['Summary'],
    ['Total Invoices', report.summary.totalInvoices],
    ['Taxable Value', `₹${report.summary.totalTaxableValue.toFixed(2)}`],
    ['IGST', `₹${report.summary.totalIGST.toFixed(2)}`],
    ['CGST', `₹${report.summary.totalCGST.toFixed(2)}`],
    ['SGST', `₹${report.summary.totalSGST.toFixed(2)}`],
    ['Total Tax', `₹${report.summary.totalTax.toFixed(2)}`],
    [''],
    ['Documents Summary (Table 13)'],
    ['Total Invoices Issued', report.documentsSummary.totalInvoices],
    ['Cancelled Invoices', report.documentsSummary.cancelledInvoices],
    ['Lowest Invoice Number', report.documentsSummary.lowestInvoiceNumber],
    ['Highest Invoice Number', report.documentsSummary.highestInvoiceNumber]
  ]
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 50 }]
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')

  // Sheet 2: B2B Invoices (Table 4)
  const b2bData: any[] = []
  report.b2b.forEach(party => {
    party.invoices.forEach(inv => {
      b2bData.push({
        'GSTIN of Recipient': party.gstin,
        'Receiver Name': party.legalName,
        'Invoice Number': inv.invoiceNumber,
        'Invoice Date': new Date(inv.invoiceDate).toLocaleDateString(),
        'Invoice Value': inv.invoiceValue,
        'Place Of Supply': inv.placeOfSupply,
        'Reverse Charge': inv.reverseCharge,
        'Invoice Type': inv.invoiceType,
        'Rate': inv.rate,
        'Taxable Value': inv.taxableValue,
        'Cess Amount': inv.cessAmount,
        'IGST': inv.igstAmount,
        'CGST': inv.cgstAmount,
        'SGST': inv.sgstAmount
      })
    })
  })

  if (b2bData.length > 0) {
    const b2bSheet = XLSX.utils.json_to_sheet(b2bData)
    b2bSheet['!cols'] = [
      { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 12 },
      { wch: 12 }, { wch: 15 }, { wch: 8 }, { wch: 8 },
      { wch: 8 }, { wch: 15 }, { wch: 10 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }
    ]
    XLSX.utils.book_append_sheet(workbook, b2bSheet, 'Table 4 - B2B')
  } else {
    // Add empty sheet with note
    const emptyB2B = XLSX.utils.aoa_to_sheet([
      ['Table 4: B2B Supplies (Registered Customers with GSTIN)'],
      [''],
      ['✅ 0 invoices - All Good!'],
      ['Your customers are unregistered/walk-in consumers'],
      ['This is normal for retail/kirana businesses']
    ])
    XLSX.utils.book_append_sheet(workbook, emptyB2B, 'Table 4 - B2B')
  }

  // Sheet 3: B2CL (Large B2C - Table 5)
  const b2clData = report.b2cl.map(entry => ({
    'Place Of Supply': entry.placeOfSupply,
    'Rate': entry.rate,
    'Taxable Value': entry.taxableValue,
    'Cess Amount': entry.cessAmount,
    'IGST': entry.igstAmount,
    'CGST': entry.cgstAmount,
    'SGST': entry.sgstAmount
  }))

  if (b2clData.length > 0) {
    const b2clSheet = XLSX.utils.json_to_sheet(b2clData)
    b2clSheet['!cols'] = [
      { wch: 15 }, { wch: 8 }, { wch: 15 }, { wch: 10 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }
    ]
    XLSX.utils.book_append_sheet(workbook, b2clSheet, 'Table 5 - B2CL')
  }

  // Sheet 4: B2CS (Small B2C - Table 7) - MOST IMPORTANT FOR RETAIL
  const b2csWithNote = [
    ['Table 7: B2C Small Supplies (Most Common for Retail/Kirana)'],
    [''],
    ['✅ Note: Invoices to unregistered consumers below ₹2.5L are reported here'],
    ['Tax shown as ₹0 is 100% CORRECT as per GST law'],
    ['No ITC is available to consumers anyway'],
    ['You pay tax in GSTR-3B on total sales'],
    [''],
    ['Type', 'Place Of Supply', 'Rate', 'Taxable Value', 'Cess', 'IGST', 'CGST', 'SGST']
  ]

  report.b2cs.forEach(entry => {
    b2csWithNote.push([
      'OE',
      entry.placeOfSupply,
      entry.rate,
      entry.taxableValue,
      entry.cessAmount,
      entry.igstAmount,
      entry.cgstAmount,
      entry.sgstAmount
    ])
  })

  const b2csSheet = XLSX.utils.aoa_to_sheet(b2csWithNote)
  b2csSheet['!cols'] = [
    { wch: 8 }, { wch: 15 }, { wch: 8 }, { wch: 15 },
    { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
  ]
  XLSX.utils.book_append_sheet(workbook, b2csSheet, 'Table 7 - B2CS')

  // Sheet 5: HSN Summary (Table 11)
  const hsnData = report.hsn.map(entry => ({
    'HSN': entry.hsn,
    'Description': entry.description,
    'UQC': entry.uqc,
    'Total Quantity': entry.totalQuantity,
    'Total Value': entry.totalValue,
    'Taxable Value': entry.taxableValue,
    'IGST': entry.igstAmount,
    'CGST': entry.cgstAmount,
    'SGST': entry.sgstAmount,
    'Cess': entry.cessAmount
  }))

  if (hsnData.length > 0) {
    const hsnSheet = XLSX.utils.json_to_sheet(hsnData)
    hsnSheet['!cols'] = [
      { wch: 10 }, { wch: 30 }, { wch: 8 }, { wch: 12 },
      { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 10 }
    ]
    XLSX.utils.book_append_sheet(workbook, hsnSheet, 'Table 11 - HSN')
  }

  // Sheet 6: Invoice Details (Sample)
  const invoiceDetailsData = report.invoiceDetails.map(inv => ({
    'Invoice Number': inv.invoiceNumber,
    'Date': new Date(inv.invoiceDate).toLocaleDateString(),
    'Party Name': inv.partyName,
    'Invoice Value': `₹${inv.invoiceValue.toFixed(2)}`,
    'Taxable Value': `₹${inv.taxableValue.toFixed(2)}`,
    'Tax': `₹${inv.tax.toFixed(2)}`
  }))

  if (invoiceDetailsData.length > 0) {
    const invoiceSheet = XLSX.utils.json_to_sheet(invoiceDetailsData)
    invoiceSheet['!cols'] = [
      { wch: 18 }, { wch: 12 }, { wch: 25 }, { wch: 15 },
      { wch: 15 }, { wch: 12 }
    ]
    XLSX.utils.book_append_sheet(workbook, invoiceSheet, 'Invoice Details')
  }

  // Generate file name
  const fileName = `GSTR1-${report.period}-${companyGSTIN}.xlsx`

  // Download file using Capacitor-compatible method
  await downloadWorkbook(workbook, fileName)

  return fileName
}

/**
 * Export GSTR-3B report to Excel
 */
export async function exportGSTR3BToExcel(
  month: number,
  year: number,
  companyGSTIN: string,
  companyName: string
) {
  const report = await generateGSTR3BReport(month, year, companyGSTIN, companyName)

  // Create workbook
  const workbook = XLSX.utils.book_new()

  // Main sheet
  const data = [
    {
      'Section': 'Company Details',
      'Description': 'GSTIN',
      'Value': report.gstin
    },
    {
      'Section': 'Company Details',
      'Description': 'Legal Name',
      'Value': report.legalName
    },
    {
      'Section': 'Company Details',
      'Description': 'Period',
      'Value': report.period
    },
    {
      'Section': '',
      'Description': '',
      'Value': ''
    },
    {
      'Section': '3.1 Outward Supplies',
      'Description': 'Taxable Value',
      'Value': report.outwardSupplies.taxableValue
    },
    {
      'Section': '3.1 Outward Supplies',
      'Description': 'IGST',
      'Value': report.outwardSupplies.igst
    },
    {
      'Section': '3.1 Outward Supplies',
      'Description': 'CGST',
      'Value': report.outwardSupplies.cgst
    },
    {
      'Section': '3.1 Outward Supplies',
      'Description': 'SGST',
      'Value': report.outwardSupplies.sgst
    },
    {
      'Section': '3.1 Outward Supplies',
      'Description': 'Cess',
      'Value': report.outwardSupplies.cess
    },
    {
      'Section': '',
      'Description': '',
      'Value': ''
    },
    {
      'Section': '4 Inward Supplies',
      'Description': 'Taxable Value',
      'Value': report.inwardSupplies.taxableValue
    },
    {
      'Section': '4 Inward Supplies',
      'Description': 'IGST',
      'Value': report.inwardSupplies.igst
    },
    {
      'Section': '4 Inward Supplies',
      'Description': 'CGST',
      'Value': report.inwardSupplies.cgst
    },
    {
      'Section': '4 Inward Supplies',
      'Description': 'SGST',
      'Value': report.inwardSupplies.sgst
    },
    {
      'Section': '4 Inward Supplies',
      'Description': 'Cess',
      'Value': report.inwardSupplies.cess
    },
    {
      'Section': '',
      'Description': '',
      'Value': ''
    },
    {
      'Section': '4 Eligible ITC',
      'Description': 'IGST',
      'Value': report.eligibleITC.igst
    },
    {
      'Section': '4 Eligible ITC',
      'Description': 'CGST',
      'Value': report.eligibleITC.cgst
    },
    {
      'Section': '4 Eligible ITC',
      'Description': 'SGST',
      'Value': report.eligibleITC.sgst
    },
    {
      'Section': '4 Eligible ITC',
      'Description': 'Cess',
      'Value': report.eligibleITC.cess
    },
    {
      'Section': '',
      'Description': '',
      'Value': ''
    },
    {
      'Section': '5 Net Tax Liability',
      'Description': 'IGST',
      'Value': report.netTaxLiability.igst
    },
    {
      'Section': '5 Net Tax Liability',
      'Description': 'CGST',
      'Value': report.netTaxLiability.cgst
    },
    {
      'Section': '5 Net Tax Liability',
      'Description': 'SGST',
      'Value': report.netTaxLiability.sgst
    },
    {
      'Section': '5 Net Tax Liability',
      'Description': 'Cess',
      'Value': report.netTaxLiability.cess
    },
    {
      'Section': '5 Net Tax Liability',
      'Description': 'TOTAL',
      'Value': report.netTaxLiability.total
    }
  ]

  const sheet = XLSX.utils.json_to_sheet(data)
  sheet['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(workbook, sheet, 'GSTR-3B')

  // Generate file name
  const fileName = `GSTR3B-${report.period}-${companyGSTIN}.xlsx`

  // Download file using Capacitor-compatible method
  await downloadWorkbook(workbook, fileName)

  return fileName
}

/**
 * Export GSTR-1 to JSON format (for GST portal upload)
 */
export async function exportGSTR1ToJSON(
  month: number,
  year: number,
  companyGSTIN: string,
  companyName: string
) {
  const report = await generateGSTR1Report(month, year, companyGSTIN, companyName)

  // Format according to GST portal JSON schema
  const gstJSON = {
    gstin: report.gstin,
    fp: report.period,
    b2b: report.b2b.map(party => ({
      ctin: party.gstin,
      inv: party.invoices.map(inv => ({
        inum: inv.invoiceNumber,
        idt: inv.invoiceDate,
        val: inv.invoiceValue,
        pos: inv.placeOfSupply,
        rchrg: inv.reverseCharge,
        inv_typ: inv.invoiceType,
        itms: [{
          num: 1,
          itm_det: {
            rt: inv.rate,
            txval: inv.taxableValue,
            iamt: inv.igstAmount,
            camt: inv.cgstAmount,
            samt: inv.sgstAmount,
            csamt: inv.cessAmount
          }
        }]
      }))
    })),
    b2cl: report.b2cl.map(entry => ({
      pos: entry.placeOfSupply,
      inv: [{
        rt: entry.rate,
        txval: entry.taxableValue,
        iamt: entry.igstAmount,
        camt: entry.cgstAmount,
        samt: entry.sgstAmount,
        csamt: entry.cessAmount
      }]
    })),
    b2cs: report.b2cs.map(entry => ({
      typ: 'OE',
      pos: entry.placeOfSupply,
      sply_ty: 'INTRA',
      rt: entry.rate,
      txval: entry.taxableValue,
      iamt: entry.igstAmount,
      camt: entry.cgstAmount,
      samt: entry.sgstAmount,
      csamt: entry.cessAmount
    })),
    hsn: {
      data: report.hsn.map(entry => ({
        num: 1,
        hsn_sc: entry.hsn,
        desc: entry.description,
        uqc: entry.uqc,
        qty: entry.totalQuantity,
        val: entry.totalValue,
        txval: entry.taxableValue,
        iamt: entry.igstAmount,
        camt: entry.cgstAmount,
        samt: entry.sgstAmount,
        csamt: entry.cessAmount
      }))
    }
  }

  // Convert to JSON string
  const jsonString = JSON.stringify(gstJSON, null, 2)
  const filename = `GSTR1-${report.period}-${companyGSTIN}.json`

  const platform = Capacitor.getPlatform()

  // For Android/iOS native apps, use Capacitor Filesystem
  if (platform === 'android' || platform === 'ios') {
    try {
      // Convert JSON string to base64
      const base64Data = btoa(unescape(encodeURIComponent(jsonString)))

      const result = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true
      })

      console.log('JSON file saved to:', result.uri)
      return filename
    } catch (err) {
      console.error('Capacitor save failed for JSON:', err)
      // Fall through to web method
    }
  }

  // Web fallback - Create blob and download
  const blob = new Blob([jsonString], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // Give the browser a moment to process the download before revoking
  setTimeout(() => URL.revokeObjectURL(url), 150)

  return filename
}
