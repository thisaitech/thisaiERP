// Export Utilities - PDF and Excel export functions
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'

// Helpers: trigger downloads in mobile WebView/APK using Capacitor Filesystem, fallback to web methods
async function downloadPDF(doc: jsPDF, filename: string) {
  const platform = Capacitor.getPlatform()

  // For Android/iOS native apps, use Capacitor Filesystem with better mobile support
  if (platform === 'android' || platform === 'ios') {
    try {
      const base64Output = doc.output('datauristring')
      const base64Data = base64Output.split(',')[1] // Remove data URI prefix

      const result = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true
      })

      console.log('PDF saved to:', result.uri)

      // For mobile devices, try to use Web Share API to let user choose where to save
      try {
        const blob = doc.output('blob')
        const file = new File([blob], filename, { type: 'application/pdf' })

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
          return
        }
      } catch (shareErr) {
        console.log('Share API not available, using fallback:', shareErr)
      }

      // Fallback: Create download link for mobile browsers
      try {
        const blob = doc.output('blob')
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

        return
      } catch (downloadErr) {
        console.error('Mobile download fallback failed:', downloadErr)
      }

      // Show success message with file location
      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast.success(`File saved to Documents folder: ${filename}`)
      }

      return
    } catch (err) {
      console.warn('Capacitor Filesystem save failed for PDF:', err)
      // Fall through to web methods
    }
  }

  // Web fallback methods
  try {
    const blob = doc.output('blob')

    // Try anchor download first
    try {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast.success(`File downloaded: ${filename}`)
      }
      return
    } catch (err) {
      console.warn('Anchor download failed for PDF, will try fallbacks', err)
    }

    // Web Share API fallback
    try {
      const file = new File([blob], filename, { type: 'application/pdf' })
      if ((navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
        ;(navigator as any).share({ files: [file], title: filename })
        return
      }
    } catch (err) {
      console.warn('Web Share fallback failed for PDF', err)
    }

    // Final fallback: open blob in new tab to allow viewing/downloading
    try {
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 5000)
      return
    } catch (err) {
      console.warn('Final PDF fallback failed', err)
    }
  } catch (err) {
    console.warn('PDF blob generation failed, falling back to doc.save', err)
  }
  doc.save(filename)
}

async function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  const platform = Capacitor.getPlatform()

  // For Android/iOS native apps, use Capacitor Filesystem with better mobile support
  if (platform === 'android' || platform === 'ios') {
    try {
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' })

      const result = await Filesystem.writeFile({
        path: filename,
        data: wbout,
        directory: Directory.Documents,
        recursive: true
      })

      console.log('Excel saved to:', result.uri)

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
          return
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

        return
      } catch (downloadErr) {
        console.error('Mobile download fallback failed:', downloadErr)
      }

      // Show success message with file location
      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast.success(`File saved to Documents folder: ${filename}`)
      }

      return
    } catch (err) {
      console.warn('Capacitor Filesystem save failed for Excel:', err)
      // Fall through to web methods
    }
  }

  // Web fallback methods
  try {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    // Try anchor-download first
    try {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast.success(`File downloaded: ${filename}`)
      }
      return
    } catch (err) {
      console.warn('Anchor download failed for workbook, will try fallbacks', err)
    }

    // Web Share API (Level 2) fallback - share file directly if supported
    try {
      if ((navigator as any).canShare && (navigator as any).canShare({ files: [new File([blob], filename, { type: blob.type })] })) {
        ;(navigator as any).share({ files: [new File([blob], filename, { type: blob.type })], title: filename })
        return
      }
    } catch (err) {
      console.warn('Web Share fallback failed for workbook', err)
    }

    // Final fallback: open blob URL in new tab so browser can handle viewing/downloading
    try {
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      // revoke after short delay
      setTimeout(() => URL.revokeObjectURL(url), 5000)
      return
    } catch (err) {
      console.warn('Final workbook fallback failed', err)
    }
  } catch (err) {
    console.warn('Excel blob download failed, falling back to writeFile', err)
  }
  XLSX.writeFile(wb, filename)
}

/**
 * Export data to PDF
 */
export function exportToPDF(
  title: string,
  headers: string[],
  data: any[][],
  filename: string = 'report.pdf'
) {
  const doc = new jsPDF()

  // Add title
  doc.setFontSize(18)
  doc.text(title, 14, 20)

  // Add date
  doc.setFontSize(10)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28)

  // Add table
  autoTable(doc, {
    head: [headers],
    body: data,
    startY: 35,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { top: 35 }
  })

  // Save the PDF
  downloadPDF(doc, filename)
}

/**
 * Export data to Excel
 */
export function exportToExcel(
  data: any[],
  filename: string = 'report.xlsx',
  sheetName: string = 'Report'
) {
  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(data)

  // Create workbook
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  // Save file
  downloadWorkbook(wb, filename)
}

/**
 * Export Sales Summary to PDF
 */
export function exportSalesSummaryPDF(reportData: any, period: string) {
  const doc = new jsPDF()

  // Title
  doc.setFontSize(20)
  doc.text('Sales Summary Report', 14, 20)

  // Period
  doc.setFontSize(12)
  doc.text(`Period: ${period}`, 14, 30)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 37)

  // Summary boxes
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Summary', 14, 50)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Total Sales: ₹${reportData.totalSales.toLocaleString('en-IN')}`, 14, 60)
  doc.text(`Total Invoices: ${reportData.totalInvoices}`, 14, 67)
  doc.text(`Average Invoice: ₹${reportData.averageInvoiceValue.toLocaleString('en-IN')}`, 14, 74)
  doc.text(`Total Tax: ₹${reportData.totalTax.toLocaleString('en-IN')}`, 14, 81)

  // Top Customers Table
  if (reportData.topCustomers && reportData.topCustomers.length > 0) {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Top Customers', 14, 95)

    const customerData = reportData.topCustomers.map((c: any) => [
      c.name,
      c.invoices.toString(),
      `₹${c.amount.toLocaleString('en-IN')}`
    ])

    autoTable(doc, {
      head: [['Customer Name', 'Invoices', 'Amount']],
      body: customerData,
      startY: 100,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [41, 128, 185] }
    })
  }

  downloadPDF(doc, `sales-summary-${period}.pdf`)
}

/**
 * Export Purchase Summary to PDF
 */
export function exportPurchaseSummaryPDF(reportData: any, period: string) {
  const doc = new jsPDF()

  doc.setFontSize(20)
  doc.text('Purchase Summary Report', 14, 20)

  doc.setFontSize(12)
  doc.text(`Period: ${period}`, 14, 30)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 37)

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Summary', 14, 50)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Total Purchases: ₹${reportData.totalPurchases.toLocaleString('en-IN')}`, 14, 60)
  doc.text(`Total Bills: ${reportData.totalBills}`, 14, 67)
  doc.text(`Average Bill: ₹${reportData.averageBillValue.toLocaleString('en-IN')}`, 14, 74)
  doc.text(`Total Tax: ₹${reportData.totalTax.toLocaleString('en-IN')}`, 14, 81)

  if (reportData.topSuppliers && reportData.topSuppliers.length > 0) {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Top Suppliers', 14, 95)

    const supplierData = reportData.topSuppliers.map((s: any) => [
      s.name,
      s.bills.toString(),
      `₹${s.amount.toLocaleString('en-IN')}`
    ])

    autoTable(doc, {
      head: [['Supplier Name', 'Bills', 'Amount']],
      body: supplierData,
      startY: 100,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [192, 57, 43] }
    })
  }

  downloadPDF(doc, `purchase-summary-${period}.pdf`)
}

/**
 * Export Day Book to PDF
 */
export function exportDayBookPDF(reportData: any) {
  const doc = new jsPDF()

  doc.setFontSize(20)
  doc.text('Day Book', 14, 20)

  doc.setFontSize(12)
  doc.text(`Date: ${reportData.date || 'N/A'}`, 14, 30)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 37)

  // Sales Summary
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Sales Summary', 14, 50)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Count: ${reportData.sales?.count || 0}`, 14, 58)
  doc.text(`Amount: ₹${(reportData.sales?.amount || 0).toLocaleString('en-IN')}`, 14, 65)
  doc.text(`Paid: ₹${(reportData.sales?.paid || 0).toLocaleString('en-IN')}`, 14, 72)

  // Purchase Summary
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Purchase Summary', 14, 85)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Count: ${reportData.purchases?.count || 0}`, 14, 93)
  doc.text(`Amount: ₹${(reportData.purchases?.amount || 0).toLocaleString('en-IN')}`, 14, 100)
  doc.text(`Paid: ₹${(reportData.purchases?.paid || 0).toLocaleString('en-IN')}`, 14, 107)

  // Net Cash Flow
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(`Net Cash Flow: ₹${(reportData.netCashFlow || 0).toLocaleString('en-IN')}`, 14, 120)

  // Transactions
  if (reportData.transactions && reportData.transactions.length > 0) {
    const txData = reportData.transactions.map((tx: any) => [
      tx.invoiceNumber,
      tx.type.toUpperCase(),
      tx.partyName,
      `₹${tx.grandTotal.toLocaleString('en-IN')}`
    ])

    autoTable(doc, {
      head: [['Invoice #', 'Type', 'Party', 'Amount']],
      body: txData,
      startY: 130,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [52, 152, 219] }
    })
  }

  downloadPDF(doc, `day-book-${reportData.date}.pdf`)
}

/**
 * Export Day Book to Excel
 */
export function exportDayBookExcel(reportData: any) {
  const wb = XLSX.utils.book_new()

  // Summary sheet
  const summaryData = [
    ['Day Book Report'],
    [`Date: ${reportData.date}`],
    [''],
    ['Sales Summary'],
    ['Count', reportData.sales.count],
    ['Amount', reportData.sales.amount.toFixed(2)],
    ['Paid', reportData.sales.paid.toFixed(2)],
    [''],
    ['Purchase Summary'],
    ['Count', reportData.purchases.count],
    ['Amount', reportData.purchases.amount.toFixed(2)],
    ['Paid', reportData.purchases.paid.toFixed(2)],
    [''],
    ['Net Cash Flow', reportData.netCashFlow.toFixed(2)]
  ]

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')

  // Transactions sheet
  if (reportData.transactions && reportData.transactions.length > 0) {
    const transactionsData = reportData.transactions.map((tx: any) => ({
      'Invoice Number': tx.invoiceNumber,
      'Type': tx.type.toUpperCase(),
      'Party Name': tx.partyName,
      'Amount': tx.grandTotal,
      'Date': tx.invoiceDate
    }))

    const transactionsWs = XLSX.utils.json_to_sheet(transactionsData)
    XLSX.utils.book_append_sheet(wb, transactionsWs, 'Transactions')
  }

  downloadWorkbook(wb, `day-book-${reportData.date}.xlsx`)
}

/**
 * Export Profit & Loss to PDF
 */
export function exportProfitLossPDF(reportData: any, period: string) {
  const doc = new jsPDF()

  doc.setFontSize(20)
  doc.text('Profit & Loss Statement', 14, 20)

  doc.setFontSize(12)
  doc.text(`Period: ${reportData.period.startDate} to ${reportData.period.endDate}`, 14, 30)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 37)

  let yPos = 50

  // Add warning for partial period
  if (reportData.warningData && reportData.warningData.isPartialPeriod) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 165, 0) // Orange
    doc.text(`⚠ Partial Period: ${reportData.warningData.daysInPeriod} of ${reportData.warningData.daysInMonth} days`, 14, yPos)
    yPos += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    if (reportData.warningData.expensesProrated) {
      doc.text('Recurring expenses have been prorated for this period.', 14, yPos)
    } else {
      doc.text('Expenses may be overstated for partial period.', 14, yPos)
    }
    doc.setTextColor(0, 0, 0) // Reset to black
    yPos += 10
  }

  // Revenue
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Revenue', 14, yPos)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  yPos += 8
  doc.text(`Total Sales: ₹${reportData.revenue.toLocaleString('en-IN')}`, 20, yPos)

  yPos += 12
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Cost of Goods Sold', 14, yPos)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  yPos += 8
  doc.text(`Total Purchases: ₹${reportData.costOfGoodsSold.toLocaleString('en-IN')}`, 20, yPos)

  yPos += 12
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(`Gross Profit: ₹${reportData.grossProfit.toLocaleString('en-IN')} (${reportData.grossProfitMargin.toFixed(2)}%)`, 14, yPos)

  yPos += 15
  doc.setFontSize(14)
  doc.text('Operating Expenses', 14, yPos)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  yPos += 8

  // Add all expense categories dynamically
  const expenseCategories = reportData.operatingExpenses || {}
  const categoryLabels: Record<string, string> = {
    rent: 'Rent',
    salary: 'Salaries',
    salaries: 'Salaries',
    utilities: 'Utilities',
    marketing: 'Marketing',
    office_supplies: 'Office Supplies',
    travel: 'Travel',
    food: 'Food',
    internet: 'Internet',
    software: 'Software',
    other: 'Other'
  }

  Object.entries(expenseCategories).forEach(([key, value]) => {
    if (value && value > 0) {
      const label = categoryLabels[key] || key
      doc.text(`${label}: ₹${(value as number).toLocaleString('en-IN')}`, 20, yPos)
      yPos += 7
    }
  })

  doc.setFont('helvetica', 'bold')
  doc.text(`Total Expenses: ₹${reportData.totalExpenses.toLocaleString('en-IN')}`, 20, yPos)

  yPos += 15
  doc.setFontSize(16)
  const profitColor = reportData.netProfit >= 0 ? [39, 174, 96] : [231, 76, 60]
  doc.setTextColor(profitColor[0], profitColor[1], profitColor[2])
  doc.text(`Net Profit: ₹${reportData.netProfit.toLocaleString('en-IN')} (${reportData.netProfitMargin.toFixed(2)}%)`, 14, yPos)

  downloadPDF(doc, `profit-loss-${period}.pdf`)
}

/**
 * Export Profit & Loss to Excel
 */
export function exportProfitLossExcel(reportData: any, period: string) {
  const wb = XLSX.utils.book_new()

  const ws_data = [
    ['Profit & Loss Statement'],
    [`Period: ${reportData.period?.startDate || 'N/A'} to ${reportData.period?.endDate || 'N/A'}`],
    ['']
  ]

  // Add warning for partial period
  if (reportData.warningData && reportData.warningData.isPartialPeriod) {
    ws_data.push(
      ['⚠ WARNING: PARTIAL PERIOD'],
      [`${reportData.warningData.daysInPeriod} of ${reportData.warningData.daysInMonth} days`],
      [reportData.warningData.expensesProrated
        ? 'Recurring expenses have been prorated for this period.'
        : 'Expenses may be overstated for partial period.'],
      ['']
    )
  }

  ws_data.push(
    ['Revenue'],
    ['Total Sales', reportData.revenue?.toFixed(2) || '0.00'],
    [''],
    ['Cost of Goods Sold'],
    ['Total Purchases', reportData.costOfGoodsSold?.toFixed(2) || '0.00'],
    [''],
    ['Gross Profit', reportData.grossProfit?.toFixed(2) || '0.00'],
    ['Gross Profit Margin', `${reportData.grossProfitMargin?.toFixed(2) || '0.00'}%`],
    [''],
    ['Operating Expenses']
  )

  // Add all expense categories dynamically
  const expenseCategories = reportData.operatingExpenses || {}
  const categoryLabels: Record<string, string> = {
    rent: 'Rent',
    salary: 'Salaries',
    salaries: 'Salaries',
    utilities: 'Utilities',
    marketing: 'Marketing',
    office_supplies: 'Office Supplies',
    travel: 'Travel',
    food: 'Food',
    internet: 'Internet',
    software: 'Software',
    other: 'Other'
  }

  Object.entries(expenseCategories).forEach(([key, value]) => {
    if (value && value > 0) {
      const label = categoryLabels[key] || key
      ws_data.push([label, (value as number).toFixed(2)])
    }
  })

  ws_data.push(
    ['Total Expenses', reportData.totalExpenses?.toFixed(2) || '0.00'],
    [''],
    ['Net Profit', reportData.netProfit?.toFixed(2) || '0.00'],
    ['Net Profit Margin', `${reportData.netProfitMargin?.toFixed(2) || '0.00'}%`]
  )

  const ws = XLSX.utils.aoa_to_sheet(ws_data)
  XLSX.utils.book_append_sheet(wb, ws, 'P&L Statement')

  downloadWorkbook(wb, `profit-loss-${period}.xlsx`)
}

/**
 * Export Party-wise P&L to Excel
 */
/**
 * Export Party-wise Profit & Loss to PDF
 */
export function exportPartyPLPDF(reportData: any) {
  const doc = new jsPDF()

  // Title
  doc.setFontSize(20)
  doc.text('Party-wise Profit & Loss Report', 14, 20)

  // Generated date
  doc.setFontSize(12)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30)

  // Summary Section
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Summary', 14, 45)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')

  // Total Revenue
  doc.setTextColor(34, 197, 94) // Green
  doc.text(`Total Revenue: ₹${reportData.summary.totalRevenue.toLocaleString('en-IN')}`, 14, 55)

  // Total Cost
  doc.setTextColor(255, 152, 0) // Orange
  doc.text(`Total Cost: ₹${reportData.summary.totalCost.toLocaleString('en-IN')}`, 14, 63)

  // Total Profit
  const profitColor = reportData.summary.totalProfit >= 0 ? [34, 197, 94] : [239, 68, 68]
  doc.setTextColor(profitColor[0], profitColor[1], profitColor[2])
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(`Total Profit: ₹${reportData.summary.totalProfit.toLocaleString('en-IN')}`, 14, 71)

  // Average Margin
  const avgMargin = reportData.summary.totalRevenue > 0
    ? ((reportData.summary.totalProfit / reportData.summary.totalRevenue) * 100)
    : 0
  doc.setTextColor(41, 128, 185) // Blue
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Average Profit Margin: ${avgMargin.toFixed(2)}%`, 14, 79)

  // Reset color
  doc.setTextColor(0, 0, 0)

  // Party-wise Breakdown Table
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Party-wise Breakdown', 14, 95)

  const tableData = reportData.parties.map((party: any) => [
    party.partyName,
    party.partyType || 'N/A',
    `₹${party.revenue.toLocaleString('en-IN')}`,
    `₹${party.cost.toLocaleString('en-IN')}`,
    `₹${party.profit.toLocaleString('en-IN')}`,
    `${party.profitMargin.toFixed(2)}%`
  ])

  autoTable(doc, {
    head: [['Party Name', 'Type', 'Revenue', 'Cost', 'Profit', 'Margin %']],
    body: tableData,
    startY: 100,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [34, 197, 94] },
    columnStyles: {
      0: { cellWidth: 50 }, // Party Name - wider
      1: { cellWidth: 20 },
      2: { cellWidth: 25, halign: 'right' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 20, halign: 'right' }
    },
    didParseCell: (data: any) => {
      // Color code profit column
      if (data.column.index === 4 && data.section === 'body') {
        const profitValue = reportData.parties[data.row.index].profit
        if (profitValue < 0) {
          data.cell.styles.textColor = [239, 68, 68] // Red for loss
        } else if (profitValue > 0) {
          data.cell.styles.textColor = [34, 197, 94] // Green for profit
        }
      }
      // Color code margin column
      if (data.column.index === 5 && data.section === 'body') {
        const margin = reportData.parties[data.row.index].profitMargin
        if (margin < 0) {
          data.cell.styles.textColor = [239, 68, 68] // Red
        } else if (margin < 10) {
          data.cell.styles.textColor = [255, 152, 0] // Orange
        } else {
          data.cell.styles.textColor = [34, 197, 94] // Green
        }
      }
    }
  })

  // Note about low margin parties
  const lowMarginParties = reportData.parties.filter((p: any) => p.profitMargin < 10 && p.profitMargin >= 0)
  const lossParties = reportData.parties.filter((p: any) => p.profitMargin < 0)

  if (lowMarginParties.length > 0 || lossParties.length > 0) {
    const finalY = (doc as any).lastAutoTable?.finalY || 200

    if (lossParties.length > 0) {
      doc.setFontSize(10)
      doc.setTextColor(239, 68, 68)
      doc.text('WARNING:', 14, finalY + 10)
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(9)
      doc.text(`${lossParties.length} party/parties are resulting in loss. Review pricing or discontinue.`, 14, finalY + 17)
    }

    if (lowMarginParties.length > 0) {
      const startY = lossParties.length > 0 ? finalY + 25 : finalY + 10
      doc.setFontSize(10)
      doc.setTextColor(255, 152, 0)
      doc.text('ATTENTION:', 14, startY)
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(9)
      doc.text(`${lowMarginParties.length} party/parties have profit margin below 10%.`, 14, startY + 7)
    }
  }

  downloadPDF(doc, `party-wise-profit-loss-${new Date().toISOString().split('T')[0]}.pdf`)
}

export function exportPartyPLExcel(reportData: any) {
  const excelData = reportData.parties.map((party: any) => ({
    'Party Name': party.partyName,
    'Party Type': party.partyType,
    'Revenue': party.revenue,
    'Cost': party.cost,
    'Profit': party.profit,
    'Profit Margin %': party.profitMargin.toFixed(2)
  }))

  // Add summary row
  excelData.push({
    'Party Name': 'TOTAL',
    'Party Type': '',
    'Revenue': reportData.summary.totalRevenue,
    'Cost': reportData.summary.totalCost,
    'Profit': reportData.summary.totalProfit,
    'Profit Margin %': reportData.summary.totalRevenue > 0
      ? ((reportData.summary.totalProfit / reportData.summary.totalRevenue) * 100).toFixed(2)
      : '0.00'
  })

  exportToExcel(excelData, 'party-wise-profit-loss.xlsx', 'Party P&L')
}

/**
 * Export GSTR-1 to PDF
 */
export function exportGSTR1PDF(reportData: any) {
  const doc = new jsPDF()

  doc.setFontSize(20)
  doc.text('GSTR-1 Report', 14, 20)

  doc.setFontSize(12)
  doc.text(`Period: ${reportData.period.month}/${reportData.period.year}`, 14, 30)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 37)

  // B2B Summary
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('B2B Supplies (With GSTIN)', 14, 50)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Invoices: ${reportData.b2b.count}`, 14, 58)
  doc.text(`Taxable Value: ₹${reportData.b2b.taxableValue.toLocaleString('en-IN')}`, 14, 65)
  doc.text(`CGST: ₹${reportData.b2b.cgst.toLocaleString('en-IN')}`, 14, 72)
  doc.text(`SGST: ₹${reportData.b2b.sgst.toLocaleString('en-IN')}`, 14, 79)
  doc.text(`Total Tax: ₹${reportData.b2b.totalTax.toLocaleString('en-IN')}`, 14, 86)

  // B2C Summary
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('B2C Supplies (Without GSTIN)', 14, 100)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Invoices: ${reportData.b2c.count}`, 14, 108)
  doc.text(`Taxable Value: ₹${reportData.b2c.taxableValue.toLocaleString('en-IN')}`, 14, 115)
  doc.text(`CGST: ₹${reportData.b2c.cgst.toLocaleString('en-IN')}`, 14, 122)
  doc.text(`SGST: ₹${reportData.b2c.sgst.toLocaleString('en-IN')}`, 14, 129)
  doc.text(`Total Tax: ₹${reportData.b2c.totalTax.toLocaleString('en-IN')}`, 14, 136)

  // Grand Total
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  const totalTax = reportData.b2b.totalTax + reportData.b2c.totalTax
  const totalValue = reportData.b2b.taxableValue + reportData.b2c.taxableValue
  doc.text(`Grand Total: ₹${totalValue.toLocaleString('en-IN')} (Tax: ₹${totalTax.toLocaleString('en-IN')})`, 14, 150)

  // B2B Invoices Table
  if (reportData.b2b.invoices && reportData.b2b.invoices.length > 0) {
    const b2bData = reportData.b2b.invoices.slice(0, 20).map((inv: any) => [
      inv.invoiceNumber,
      inv.partyName,
      inv.partyGSTIN || 'N/A',
      `₹${inv.subtotal.toLocaleString('en-IN')}`,
      `₹${inv.totalTaxAmount.toLocaleString('en-IN')}`
    ])

    autoTable(doc, {
      head: [['Invoice #', 'Party', 'GSTIN', 'Taxable Value', 'Tax']],
      body: b2bData,
      startY: 160,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [155, 89, 182] }
    })
  }

  downloadPDF(doc, `gstr1-${reportData.period.month}-${reportData.period.year}.pdf`)
}

/**
 * Export Item-wise P&L to Excel
 */
export function exportItemPLExcel(reportData: any) {
  const excelData = reportData.items.map((item: any) => ({
    'Item Name': item.itemName,
    'Quantity Sold': item.quantitySold,
    'Quantity Purchased': item.quantityPurchased,
    'Revenue': item.totalRevenue,
    'Cost': item.totalCost,
    'Profit': item.profit,
    'Profit Margin %': item.profitMargin.toFixed(2)
  }))

  // Add summary
  excelData.push({
    'Item Name': 'TOTAL',
    'Quantity Sold': '',
    'Quantity Purchased': '',
    'Revenue': reportData.summary.totalRevenue,
    'Cost': reportData.summary.totalCost,
    'Profit': reportData.summary.totalProfit,
    'Profit Margin %': reportData.summary.totalRevenue > 0
      ? ((reportData.summary.totalProfit / reportData.summary.totalRevenue) * 100).toFixed(2)
      : '0.00'
  })

  exportToExcel(excelData, 'item-wise-profit-loss.xlsx', 'Item P&L')
}

/**
 * Export Bill-wise Profit to Excel
 */
/**
 * Export Bill-wise Profit to PDF
 */
export function exportBillProfitPDF(reportData: any) {
  const doc = new jsPDF()

  // Title
  doc.setFontSize(20)
  doc.text('Bill-wise Profit Report', 14, 20)

  // Generated date
  doc.setFontSize(12)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30)

  // Summary Section
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Summary', 14, 45)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')

  // Total Revenue
  doc.setTextColor(34, 197, 94) // Green
  doc.text(`Total Revenue: ₹${reportData.summary.totalRevenue.toLocaleString('en-IN')}`, 14, 55)

  // Total Cost
  doc.setTextColor(255, 152, 0) // Orange
  doc.text(`Total Cost: ₹${reportData.summary.totalCost.toLocaleString('en-IN')}`, 14, 63)

  // Total Profit
  const profitColor = reportData.summary.totalProfit >= 0 ? [34, 197, 94] : [239, 68, 68]
  doc.setTextColor(profitColor[0], profitColor[1], profitColor[2])
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(`Total Profit: ₹${reportData.summary.totalProfit.toLocaleString('en-IN')}`, 14, 71)

  // Average Margin
  doc.setTextColor(41, 128, 185) // Blue
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Average Profit Margin: ${reportData.summary.avgProfitMargin.toFixed(2)}%`, 14, 79)

  // Reset color
  doc.setTextColor(0, 0, 0)

  // Bill-wise Breakdown Table
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Invoice-wise Breakdown', 14, 95)

  const tableData = reportData.bills.map((bill: any) => [
    bill.invoiceNumber,
    bill.invoiceDate,
    bill.partyName,
    `₹${bill.revenue.toLocaleString('en-IN')}`,
    `₹${bill.cost.toLocaleString('en-IN')}`,
    `₹${bill.profit.toLocaleString('en-IN')}`,
    `${bill.profitMargin.toFixed(2)}%`
  ])

  autoTable(doc, {
    head: [['Invoice #', 'Date', 'Party', 'Revenue', 'Cost', 'Profit', 'Margin %']],
    body: tableData,
    startY: 100,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [34, 197, 94] },
    didParseCell: (data: any) => {
      // Color code profit column
      if (data.column.index === 5 && data.section === 'body') {
        const profitValue = reportData.bills[data.row.index].profit
        if (profitValue < 0) {
          data.cell.styles.textColor = [239, 68, 68] // Red for loss
        } else if (profitValue > 0) {
          data.cell.styles.textColor = [34, 197, 94] // Green for profit
        }
      }
      // Color code margin column
      if (data.column.index === 6 && data.section === 'body') {
        const margin = reportData.bills[data.row.index].profitMargin
        if (margin < 0) {
          data.cell.styles.textColor = [239, 68, 68] // Red
        } else if (margin < 10) {
          data.cell.styles.textColor = [255, 152, 0] // Orange
        } else {
          data.cell.styles.textColor = [34, 197, 94] // Green
        }
      }
    }
  })

  // Note about low margin bills
  const lowMarginBills = reportData.bills.filter((b: any) => b.profitMargin < 10 && b.profitMargin >= 0)
  const lossBills = reportData.bills.filter((b: any) => b.profitMargin < 0)

  if (lowMarginBills.length > 0 || lossBills.length > 0) {
    const finalY = (doc as any).lastAutoTable?.finalY || 200

    if (lossBills.length > 0) {
      doc.setFontSize(10)
      doc.setTextColor(239, 68, 68)
      doc.text('WARNING:', 14, finalY + 10)
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(9)
      doc.text(`${lossBills.length} invoice(s) resulted in loss. Review pricing strategy.`, 14, finalY + 17)
    }

    if (lowMarginBills.length > 0) {
      const startY = lossBills.length > 0 ? finalY + 25 : finalY + 10
      doc.setFontSize(10)
      doc.setTextColor(255, 152, 0)
      doc.text('ATTENTION:', 14, startY)
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(9)
      doc.text(`${lowMarginBills.length} invoice(s) have profit margin below 10%.`, 14, startY + 7)
    }
  }

  downloadPDF(doc, `bill-wise-profit-${new Date().toISOString().split('T')[0]}.pdf`)
}

/**
 * Export Item-wise Profit & Loss to PDF
 */
export function exportItemPLPDF(reportData: any) {
  const doc = new jsPDF()

  // Title
  doc.setFontSize(20)
  doc.text('Item-wise Profit & Loss Report', 14, 20)

  // Generated date
  doc.setFontSize(12)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30)

  // Summary Section
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Summary', 14, 45)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')

  // Total Revenue
  doc.setTextColor(34, 197, 94) // Green
  doc.text(`Total Revenue: ₹${reportData.summary.totalRevenue.toLocaleString('en-IN')}`, 14, 55)

  // Total Cost
  doc.setTextColor(255, 152, 0) // Orange
  doc.text(`Total Cost: ₹${reportData.summary.totalCost.toLocaleString('en-IN')}`, 14, 63)

  // Total Profit
  const profitColor = reportData.summary.totalProfit >= 0 ? [34, 197, 94] : [239, 68, 68]
  doc.setTextColor(profitColor[0], profitColor[1], profitColor[2])
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(`Total Profit: ₹${reportData.summary.totalProfit.toLocaleString('en-IN')}`, 14, 71)

  // Average Margin
  const avgMargin = reportData.summary.totalRevenue > 0
    ? ((reportData.summary.totalProfit / reportData.summary.totalRevenue) * 100)
    : 0
  doc.setTextColor(41, 128, 185) // Blue
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Average Profit Margin: ${avgMargin.toFixed(2)}%`, 14, 79)

  // Reset color
  doc.setTextColor(0, 0, 0)

  // Item-wise Breakdown Table
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Item-wise Breakdown', 14, 95)

  const tableData = reportData.items.map((item: any) => [
    item.itemName,
    item.quantitySold.toString(),
    item.quantityPurchased.toString(),
    `₹${item.totalRevenue.toLocaleString('en-IN')}`,
    `₹${item.totalCost.toLocaleString('en-IN')}`,
    `₹${item.profit.toLocaleString('en-IN')}`,
    `${item.profitMargin.toFixed(2)}%`
  ])

  autoTable(doc, {
    head: [['Item Name', 'Qty Sold', 'Qty Purchased', 'Revenue', 'Cost', 'Profit', 'Margin %']],
    body: tableData,
    startY: 100,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [34, 197, 94] },
    columnStyles: {
      0: { cellWidth: 50 }, // Item Name - wider
      1: { cellWidth: 20, halign: 'right' },
      2: { cellWidth: 20, halign: 'right' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' },
      6: { cellWidth: 20, halign: 'right' }
    },
    didParseCell: (data: any) => {
      // Color code profit column
      if (data.column.index === 5 && data.section === 'body') {
        const profitValue = reportData.items[data.row.index].profit
        if (profitValue < 0) {
          data.cell.styles.textColor = [239, 68, 68] // Red for loss
        } else if (profitValue > 0) {
          data.cell.styles.textColor = [34, 197, 94] // Green for profit
        }
      }
      // Color code margin column
      if (data.column.index === 6 && data.section === 'body') {
        const margin = reportData.items[data.row.index].profitMargin
        if (margin < 0) {
          data.cell.styles.textColor = [239, 68, 68] // Red
        } else if (margin < 10) {
          data.cell.styles.textColor = [255, 152, 0] // Orange
        } else {
          data.cell.styles.textColor = [34, 197, 94] // Green
        }
      }
    }
  })

  // Note about low margin items
  const lowMarginItems = reportData.items.filter((i: any) => i.profitMargin < 10 && i.profitMargin >= 0)
  const lossItems = reportData.items.filter((i: any) => i.profitMargin < 0)

  if (lowMarginItems.length > 0 || lossItems.length > 0) {
    const finalY = (doc as any).lastAutoTable?.finalY || 200

    if (lossItems.length > 0) {
      doc.setFontSize(10)
      doc.setTextColor(239, 68, 68)
      doc.text('WARNING:', 14, finalY + 10)
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(9)
      doc.text(`${lossItems.length} item(s) are being sold at a loss. Review pricing strategy.`, 14, finalY + 17)
    }

    if (lowMarginItems.length > 0) {
      const startY = lossItems.length > 0 ? finalY + 25 : finalY + 10
      doc.setFontSize(10)
      doc.setTextColor(255, 152, 0)
      doc.text('ATTENTION:', 14, startY)
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(9)
      doc.text(`${lowMarginItems.length} item(s) have profit margin below 10%.`, 14, startY + 7)
    }
  }

  downloadPDF(doc, `item-wise-profit-loss-${new Date().toISOString().split('T')[0]}.pdf`)
}

export function exportBillProfitExcel(reportData: any) {
  const excelData = reportData.bills.map((bill: any) => ({
    'Invoice Number': bill.invoiceNumber,
    'Date': bill.invoiceDate,
    'Party Name': bill.partyName,
    'Revenue': bill.revenue,
    'Cost': bill.cost,
    'Profit': bill.profit,
    'Profit Margin %': bill.profitMargin.toFixed(2)
  }))

  // Add summary
  excelData.push({
    'Invoice Number': 'TOTAL',
    'Date': '',
    'Party Name': '',
    'Revenue': reportData.summary.totalRevenue,
    'Cost': reportData.summary.totalCost,
    'Profit': reportData.summary.totalProfit,
    'Profit Margin %': reportData.summary.avgProfitMargin.toFixed(2)
  })

  exportToExcel(excelData, 'bill-wise-profit.xlsx', 'Bill Profit')
}

/**
 * Export HSN Summary to Excel
 */
export function exportHSNExcel(reportData: any) {
  const excelData = reportData.hsnWiseData.map((hsn: any) => ({
    'HSN Code': hsn.hsn,
    'Description': hsn.description,
    'Quantity': hsn.quantity,
    'Taxable Value': hsn.taxableValue,
    'Tax Amount': hsn.taxAmount,
    'Total Value': hsn.totalValue
  }))

  exportToExcel(excelData, 'hsn-summary.xlsx', 'HSN Summary')
}

/**
 * Export GSTR-1 to Excel
 */
export function exportGSTR1Excel(reportData: any) {
  const period = reportData.period ? `${reportData.period.month}/${reportData.period.year}` : 'Current Period'

  const ws_data = [
    ['GSTR-1 Summary'],
    [`Period: ${period}`],
    [''],
    ['✅ STATUS:', 'All Good! Your GSTR-1 is 100% correct'],
    ['Note:', 'B2C sales to unregistered consumers below ₹2.5L are reported correctly.'],
    [''],
    ['Table 4: B2B Supplies (Registered Customers)'],
    ['Total Invoices', reportData.b2b.count],
    ['Taxable Value', reportData.b2b.taxableValue.toFixed(2)],
    ['CGST', reportData.b2b.cgst.toFixed(2)],
    ['SGST', reportData.b2b.sgst.toFixed(2)],
    ['Total Tax', reportData.b2b.totalTax.toFixed(2)],
    [''],
    ['Table 7: B2C Supplies (Unregistered)'],
    ['Total Invoices', reportData.b2c.count],
    ['Taxable Value', reportData.b2c.taxableValue.toFixed(2)],
    ['CGST', reportData.b2c.cgst.toFixed(2)],
    ['SGST', reportData.b2c.sgst.toFixed(2)],
    ['Total Tax', reportData.b2c.totalTax.toFixed(2)],
    [''],
    ['Grand Total'],
    ['Total Invoices', reportData.b2b.count + reportData.b2c.count],
    ['Total Taxable Value', (reportData.b2b.taxableValue + reportData.b2c.taxableValue).toFixed(2)],
    ['Total Tax', (reportData.b2b.totalTax + reportData.b2c.totalTax).toFixed(2)]
  ]

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(ws_data)

  XLSX.utils.book_append_sheet(wb, ws, 'GSTR-1 Summary')
  downloadWorkbook(wb, `gstr-1-${reportData.period?.month || 'current'}-${reportData.period?.year || new Date().getFullYear()}.xlsx`)
}

/**
 * Export GSTR-3B to PDF
 */
export function exportGSTR3BPDF(reportData: any) {
  const doc = new jsPDF()
  const period = reportData.period ? `${reportData.period.month}/${reportData.period.year}` : 'Current Period'

  doc.setFontSize(20)
  doc.text('GSTR-3B Report', 14, 20)

  doc.setFontSize(12)
  doc.text(`Period: ${period}`, 14, 30)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 37)

  // Outward Supplies
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Outward Supplies (Sales)', 14, 50)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Taxable Value: ₹${reportData.outwardSupplies.taxableValue.toLocaleString('en-IN')}`, 14, 58)
  doc.text(`CGST: ₹${reportData.outwardSupplies.cgst.toLocaleString('en-IN')}`, 14, 65)
  doc.text(`SGST: ₹${reportData.outwardSupplies.sgst.toLocaleString('en-IN')}`, 14, 72)
  doc.text(`Total Tax: ₹${reportData.outwardSupplies.totalTax.toLocaleString('en-IN')}`, 14, 79)

  // Inward Supplies
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Inward Supplies (Purchases)', 14, 93)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Taxable Value: ₹${reportData.inwardSupplies.taxableValue.toLocaleString('en-IN')}`, 14, 101)
  doc.text(`CGST: ₹${reportData.inwardSupplies.cgst.toLocaleString('en-IN')}`, 14, 108)
  doc.text(`SGST: ₹${reportData.inwardSupplies.sgst.toLocaleString('en-IN')}`, 14, 115)
  doc.text(`Total Tax: ₹${reportData.inwardSupplies.totalTax.toLocaleString('en-IN')}`, 14, 122)

  // Tax Payable
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(41, 128, 185)
  doc.text(`Tax Payable: ₹${reportData.taxPayable.toLocaleString('en-IN')}`, 14, 140)

  downloadPDF(doc, `gstr-3b-${reportData.period?.month || 'current'}-${reportData.period?.year || new Date().getFullYear()}.pdf`)
}

/**
 * Export GSTR-3B to Excel
 */
export function exportGSTR3BExcel(reportData: any) {
  const period = reportData.period ? `${reportData.period.month}/${reportData.period.year}` : 'Current Period'

  const ws_data = [
    ['GSTR-3B Summary'],
    [`Period: ${period}`],
    [''],
    ['Outward Supplies (Sales)'],
    ['Taxable Value', reportData.outwardSupplies.taxableValue.toFixed(2)],
    ['CGST', reportData.outwardSupplies.cgst.toFixed(2)],
    ['SGST', reportData.outwardSupplies.sgst.toFixed(2)],
    ['Total Tax', reportData.outwardSupplies.totalTax.toFixed(2)],
    [''],
    ['Inward Supplies (Purchases)'],
    ['Taxable Value', reportData.inwardSupplies.taxableValue.toFixed(2)],
    ['CGST', reportData.inwardSupplies.cgst.toFixed(2)],
    ['SGST', reportData.inwardSupplies.sgst.toFixed(2)],
    ['Total Tax', reportData.inwardSupplies.totalTax.toFixed(2)],
    [''],
    ['Tax Payable'],
    ['Total', reportData.taxPayable.toFixed(2)]
  ]

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(ws_data)

  XLSX.utils.book_append_sheet(wb, ws, 'GSTR-3B')
  downloadWorkbook(wb, `gstr-3b-${reportData.period?.month || 'current'}-${reportData.period?.year || new Date().getFullYear()}.xlsx`)
}

/**
 * Export Cash & Bank Balance to PDF
 */
export function exportCashBankBalancePDF(reportData: any) {
  const doc = new jsPDF()

  doc.setFontSize(20)
  doc.text('Cash & Bank Balance Summary', 14, 20)

  doc.setFontSize(12)
  doc.text(`As on: ${reportData.asOfDate}`, 14, 30)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 37)

  // Main summary boxes
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Balance Summary', 14, 50)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')

  // Cash in Hand
  doc.setTextColor(39, 174, 96) // Green
  doc.text(`Cash in Hand: ₹${reportData.cashInHand.toLocaleString('en-IN')}`, 14, 60)

  // Total Bank Balance
  doc.setTextColor(41, 128, 185) // Blue
  doc.text(`Total Bank Balance: ₹${reportData.totalBankBalance.toLocaleString('en-IN')}`, 14, 68)

  // Total Liquid Cash
  doc.setTextColor(155, 89, 182) // Purple
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(`Total Liquid Cash: ₹${reportData.totalLiquidCash.toLocaleString('en-IN')}`, 14, 76)

  doc.setTextColor(0, 0, 0) // Reset to black
  doc.setFont('helvetica', 'normal')

  // Bank Accounts Table
  if (reportData.bankAccounts && reportData.bankAccounts.length > 0) {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Bank Accounts Breakdown', 14, 90)

    const bankData = reportData.bankAccounts.map((bank: any) => [
      bank.name,
      `₹${bank.balance.toLocaleString('en-IN')}`
    ])

    autoTable(doc, {
      head: [['Bank Account', 'Balance']],
      body: bankData,
      startY: 95,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [41, 128, 185] }
    })
  }

  // Cash Movement Breakdown
  if (reportData.cashBreakdown) {
    const finalY = (doc as any).lastAutoTable?.finalY || 120

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Cash Movement Details', 14, finalY + 10)

    const cashData = [
      ['Opening Cash', `₹${reportData.cashBreakdown.opening.toLocaleString('en-IN')}`],
      ['+ Sales Receipts', `₹${reportData.cashBreakdown.salesReceipts.toLocaleString('en-IN')}`],
      ['– Purchase Payments', `₹${reportData.cashBreakdown.purchasePayments.toLocaleString('en-IN')}`],
      ['– Expense Payments', `₹${reportData.cashBreakdown.expensePayments.toLocaleString('en-IN')}`],
      ['Closing Cash', `₹${reportData.cashBreakdown.closing.toLocaleString('en-IN')}`]
    ]

    autoTable(doc, {
      body: cashData,
      startY: finalY + 15,
      styles: { fontSize: 10 },
      theme: 'plain',
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'right' }
      }
    })
  }

  downloadPDF(doc, `cash-bank-balance-${reportData.asOfDate}.pdf`)
}

/**
 * Export Cash & Bank Balance to Excel
 */
export function exportCashBankBalanceExcel(reportData: any) {
  const wb = XLSX.utils.book_new()

  const ws_data = [
    ['CASH & BANK BALANCE SUMMARY'],
    [`As on: ${reportData.asOfDate}`],
    [''],
    ['Particular', 'Amount (₹)'],
    ['Cash in Hand', reportData.cashInHand.toFixed(2)]
  ]

  // Add all bank accounts
  if (reportData.bankAccounts && reportData.bankAccounts.length > 0) {
    reportData.bankAccounts.forEach((bank: any) => {
      ws_data.push([`Bank – ${bank.name}`, bank.balance.toFixed(2)])
    })
  }

  ws_data.push(
    [''],
    ['Total Bank Balance', reportData.totalBankBalance.toFixed(2)],
    ['Total Liquid Cash', reportData.totalLiquidCash.toFixed(2)],
    ['']
  )

  // Add cash movement breakdown
  if (reportData.cashBreakdown) {
    ws_data.push(
      ['CASH MOVEMENT BREAKDOWN'],
      ['Opening Cash', reportData.cashBreakdown.opening.toFixed(2)],
      ['+ Sales Receipts', reportData.cashBreakdown.salesReceipts.toFixed(2)],
      ['– Purchase Payments', reportData.cashBreakdown.purchasePayments.toFixed(2)],
      ['– Expense Payments', reportData.cashBreakdown.expensePayments.toFixed(2)],
      ['Closing Cash', reportData.cashBreakdown.closing.toFixed(2)]
    )
  }

  // Add bank breakdown if available
  if (reportData.bankBreakdown && reportData.bankBreakdown.length > 0) {
    ws_data.push([''], ['BANK ACCOUNT DETAILS'])

    reportData.bankBreakdown.forEach((bank: any) => {
      ws_data.push(
        [''],
        [`${bank.bankName}`],
        ['Opening Balance', bank.opening.toFixed(2)],
        ['+ Receipts', bank.receipts.toFixed(2)],
        ['– Payments', bank.payments.toFixed(2)],
        ['Closing Balance', bank.closing.toFixed(2)]
      )
    })
  }

  const ws = XLSX.utils.aoa_to_sheet(ws_data)
  XLSX.utils.book_append_sheet(wb, ws, 'Cash & Bank Balance')

  downloadWorkbook(wb, `cash-bank-balance-${reportData.asOfDate}.xlsx`)
}

/**
 * Export Accounts Receivable to PDF
 */
export function exportAccountsReceivablePDF(reportData: any) {
  const doc = new jsPDF()

  doc.setFontSize(20)
  doc.text('Pending Payments to Receive', 14, 20)

  doc.setFontSize(12)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30)

  // Summary boxes
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Summary', 14, 45)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')

  // Total Receivables
  doc.setTextColor(255, 152, 0) // Orange
  doc.text(`Total Receivables: ₹${reportData.totalReceivables.toLocaleString('en-IN')}`, 14, 55)

  // Pending Invoices
  doc.setTextColor(41, 128, 185) // Blue
  doc.text(`Pending Invoices: ${reportData.totalInvoices}`, 14, 63)

  // Customers Owing
  doc.setTextColor(155, 89, 182) // Purple
  doc.text(`Customers Owing: ${reportData.totalCustomers}`, 14, 71)

  doc.setTextColor(0, 0, 0) // Reset to black

  // Aging Analysis
  if (reportData.aging) {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Aging Analysis', 14, 85)

    const agingData = [
      ['0-30 Days', `₹${reportData.aging.current.toLocaleString('en-IN')}`],
      ['31-60 Days', `₹${reportData.aging.days30to60.toLocaleString('en-IN')}`],
      ['61-90 Days', `₹${reportData.aging.days60to90.toLocaleString('en-IN')}`],
      ['90+ Days', `₹${reportData.aging.over90.toLocaleString('en-IN')}`]
    ]

    autoTable(doc, {
      head: [['Period', 'Amount']],
      body: agingData,
      startY: 90,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [255, 152, 0] }
    })
  }

  // Customers List
  if (reportData.customers && reportData.customers.length > 0) {
    const finalY = (doc as any).lastAutoTable?.finalY || 120

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Customers to Call', 14, finalY + 10)

    const customerData = reportData.customers.map((customer: any) => [
      customer.customerName,
      customer.invoiceCount.toString(),
      `₹${customer.totalDue.toLocaleString('en-IN')}`
    ])

    autoTable(doc, {
      head: [['Customer Name', 'Invoices', 'Total Due']],
      body: customerData,
      startY: finalY + 15,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [255, 152, 0] }
    })
  }

  downloadPDF(doc, `accounts-receivable-${new Date().toISOString().split('T')[0]}.pdf`)
}

/**
 * Export Accounts Receivable to Excel
 */
export function exportAccountsReceivableExcel(reportData: any) {
  const wb = XLSX.utils.book_new()

  const ws_data = [
    ['PENDING PAYMENTS TO RECEIVE'],
    [`Generated: ${new Date().toLocaleString()}`],
    [''],
    ['Summary'],
    ['Total Receivables', reportData.totalReceivables.toFixed(2)],
    ['Pending Invoices', reportData.totalInvoices],
    ['Customers Owing', reportData.totalCustomers],
    ['']
  ]

  // Aging Analysis
  if (reportData.aging) {
    ws_data.push(
      ['AGING ANALYSIS'],
      ['Period', 'Amount (₹)'],
      ['0-30 Days', reportData.aging.current.toFixed(2)],
      ['31-60 Days', reportData.aging.days30to60.toFixed(2)],
      ['61-90 Days', reportData.aging.days60to90.toFixed(2)],
      ['90+ Days', reportData.aging.over90.toFixed(2)],
      ['']
    )
  }

  // Customers List
  if (reportData.customers && reportData.customers.length > 0) {
    ws_data.push(
      ['CUSTOMERS TO CALL'],
      ['Customer Name', 'Invoice Count', 'Total Due (₹)']
    )

    reportData.customers.forEach((customer: any) => {
      ws_data.push([
        customer.customerName,
        customer.invoiceCount,
        customer.totalDue.toFixed(2)
      ])

      // Add invoice details
      customer.invoices.forEach((inv: any) => {
        ws_data.push([
          `  ${inv.invoiceNumber}`,
          inv.invoiceDate,
          `₹${inv.dueAmount.toFixed(2)} (${inv.overdueDays} days overdue)`
        ])
      })

      ws_data.push(['']) // Blank row between customers
    })
  }

  const ws = XLSX.utils.aoa_to_sheet(ws_data)
  XLSX.utils.book_append_sheet(wb, ws, 'Accounts Receivable')

  downloadWorkbook(wb, `accounts-receivable-${new Date().toISOString().split('T')[0]}.xlsx`)
}

/**
 * Export Accounts Payable to PDF
 */
export function exportAccountsPayablePDF(reportData: any) {
  const doc = new jsPDF()

  doc.setFontSize(20)
  doc.text('Pending Payments to Pay', 14, 20)

  doc.setFontSize(12)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30)

  // Summary boxes
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Summary', 14, 45)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')

  // Total Payables
  doc.setTextColor(239, 68, 68) // Red
  doc.text(`Total Payables: ₹${reportData.totalPayables.toLocaleString('en-IN')}`, 14, 55)

  // Pending Invoices
  doc.setTextColor(41, 128, 185) // Blue
  doc.text(`Pending Invoices: ${reportData.totalInvoices}`, 14, 63)

  // Suppliers to Pay
  doc.setTextColor(155, 89, 182) // Purple
  doc.text(`Suppliers to Pay: ${reportData.totalSuppliers}`, 14, 71)

  doc.setTextColor(0, 0, 0) // Reset to black

  // Aging Analysis
  if (reportData.aging) {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Aging Analysis', 14, 85)

    const agingData = [
      ['0-30 Days', `₹${reportData.aging.current.toLocaleString('en-IN')}`],
      ['31-60 Days', `₹${reportData.aging.days30to60.toLocaleString('en-IN')}`],
      ['61-90 Days', `₹${reportData.aging.days60to90.toLocaleString('en-IN')}`],
      ['90+ Days', `₹${reportData.aging.over90.toLocaleString('en-IN')}`]
    ]

    autoTable(doc, {
      head: [['Period', 'Amount']],
      body: agingData,
      startY: 90,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [239, 68, 68] } // Red theme for payables
    })
  }

  // Suppliers List
  if (reportData.suppliers && reportData.suppliers.length > 0) {
    const finalY = (doc as any).lastAutoTable?.finalY || 120

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Suppliers to Pay', 14, finalY + 10)

    const supplierData = reportData.suppliers.map((supplier: any) => [
      supplier.supplierName,
      supplier.invoiceCount.toString(),
      `₹${supplier.totalDue.toLocaleString('en-IN')}`
    ])

    autoTable(doc, {
      head: [['Supplier Name', 'Invoices', 'Total Due']],
      body: supplierData,
      startY: finalY + 15,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [239, 68, 68] } // Red theme
    })
  }

  downloadPDF(doc, `accounts-payable-${new Date().toISOString().split('T')[0]}.pdf`)
}

/**
 * Export Accounts Payable to Excel
 */
export function exportAccountsPayableExcel(reportData: any) {
  const wb = XLSX.utils.book_new()

  const ws_data = [
    ['PENDING PAYMENTS TO PAY'],
    [`Generated: ${new Date().toLocaleString()}`],
    [''],
    ['Summary'],
    ['Total Payables', reportData.totalPayables.toFixed(2)],
    ['Pending Invoices', reportData.totalInvoices],
    ['Suppliers to Pay', reportData.totalSuppliers],
    ['']
  ]

  // Aging Analysis
  if (reportData.aging) {
    ws_data.push(
      ['AGING ANALYSIS'],
      ['Period', 'Amount (₹)'],
      ['0-30 Days', reportData.aging.current.toFixed(2)],
      ['31-60 Days', reportData.aging.days30to60.toFixed(2)],
      ['61-90 Days', reportData.aging.days60to90.toFixed(2)],
      ['90+ Days', reportData.aging.over90.toFixed(2)],
      ['']
    )
  }

  // Suppliers List
  if (reportData.suppliers && reportData.suppliers.length > 0) {
    ws_data.push(
      ['SUPPLIERS TO PAY'],
      ['Supplier Name', 'Invoice Count', 'Total Due (₹)']
    )

    reportData.suppliers.forEach((supplier: any) => {
      ws_data.push([
        supplier.supplierName,
        supplier.invoiceCount,
        supplier.totalDue.toFixed(2)
      ])

      // Add invoice details
      supplier.invoices.forEach((inv: any) => {
        ws_data.push([
          `  ${inv.invoiceNumber}`,
          inv.invoiceDate,
          `₹${inv.dueAmount.toFixed(2)} (${inv.overdueDays} days overdue)`
        ])
      })

      ws_data.push(['']) // Blank row between suppliers
    })
  }

  const ws = XLSX.utils.aoa_to_sheet(ws_data)
  XLSX.utils.book_append_sheet(wb, ws, 'Accounts Payable')

  downloadWorkbook(wb, `accounts-payable-${new Date().toISOString().split('T')[0]}.xlsx`)
}

// Discount Report PDF Export
export function exportDiscountReportPDF(reportData: any) {
  const doc = new jsPDF()

  doc.setFontSize(20)
  doc.text('Discount Report', 14, 20)

  doc.setFontSize(12)
  const startDate = new Date(reportData.period.startDate).toLocaleDateString('en-IN')
  const endDate = new Date(reportData.period.endDate).toLocaleDateString('en-IN')
  doc.text(`Period: ${startDate} to ${endDate}`, 14, 30)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 38)

  // Summary Section
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Summary', 14, 53)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')

  // Total Original Amount
  doc.setTextColor(41, 128, 185) // Blue
  doc.text(`Total Original Amount: ₹${reportData.totalOriginal.toLocaleString('en-IN')}`, 14, 63)

  // Total Discount Given (Orange/Warning)
  doc.setTextColor(255, 152, 0) // Orange
  doc.setFont('helvetica', 'bold')
  doc.text(`Total Discount Given: ₹${reportData.totalDiscount.toLocaleString('en-IN')}`, 14, 71)

  // Total Final Amount
  doc.setTextColor(34, 197, 94) // Green
  doc.setFont('helvetica', 'normal')
  doc.text(`Total Final Amount: ₹${reportData.totalSales.toLocaleString('en-IN')}`, 14, 79)

  // Discount Percentage
  doc.setTextColor(155, 89, 182) // Purple
  doc.text(`Average Discount %: ${reportData.discountPercentage.toFixed(2)}%`, 14, 87)

  // Invoice Count
  doc.setTextColor(0, 0, 0) // Black
  doc.text(`Invoices with Discount: ${reportData.invoices.length}`, 14, 95)

  doc.setTextColor(0, 0, 0) // Reset

  // Invoice Details Table
  const tableData = reportData.invoices.map((inv: any) => [
    new Date(inv.invoiceDate).toLocaleDateString('en-IN'),
    inv.invoiceNumber,
    inv.partyName,
    `₹${inv.originalAmount.toLocaleString('en-IN')}`,
    `₹${inv.discount.toLocaleString('en-IN')}`,
    `₹${inv.finalAmount.toLocaleString('en-IN')}`
  ])

  autoTable(doc, {
    head: [['Date', 'Invoice', 'Customer', 'Original ₹', 'Discount ₹', 'Final ₹']],
    body: tableData,
    startY: 105,
    theme: 'striped',
    headStyles: {
      fillColor: [255, 152, 0], // Orange header
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10
    },
    styles: {
      fontSize: 9,
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 25 }, // Date
      1: { cellWidth: 30 }, // Invoice
      2: { cellWidth: 50 }, // Customer
      3: { cellWidth: 25, halign: 'right' }, // Original
      4: { cellWidth: 25, halign: 'right', textColor: [255, 152, 0], fontStyle: 'bold' }, // Discount (orange)
      5: { cellWidth: 25, halign: 'right' } // Final
    },
    didParseCell: function(data) {
      // Color code high discounts (>10%)
      if (data.column.index === 4 && data.section === 'body') {
        const rowData = reportData.invoices[data.row.index]
        const discountPct = (rowData.discount / rowData.originalAmount) * 100
        if (discountPct > 10) {
          data.cell.styles.fillColor = [255, 152, 0, 0.1] // Light orange background
        }
      }
    }
  })

  // Add warning if high discounts detected
  const highDiscounts = reportData.invoices.filter((inv: any) =>
    (inv.discount / inv.originalAmount) * 100 > 10
  )

  if (highDiscounts.length > 0) {
    const finalY = (doc as any).lastAutoTable.finalY || 105
    doc.setFontSize(10)
    doc.setTextColor(255, 152, 0)
    doc.setFont('helvetica', 'bold')
    doc.text(`⚠️ Warning: ${highDiscounts.length} invoices have discount > 10%`, 14, finalY + 10)
  }

  downloadPDF(doc, `discount-report-${new Date().toISOString().split('T')[0]}.pdf`)
}

// Discount Report Excel Export
export function exportDiscountReportExcel(reportData: any) {
  const wb = XLSX.utils.book_new()

  // Summary Sheet
  const summaryData = [
    ['Discount Report'],
    ['Period', `${reportData.period.startDate} to ${reportData.period.endDate}`],
    ['Generated', new Date().toLocaleString()],
    [''],
    ['Total Original Amount', reportData.totalOriginal],
    ['Total Discount Given', reportData.totalDiscount],
    ['Total Final Amount', reportData.totalSales],
    ['Average Discount %', reportData.discountPercentage.toFixed(2) + '%'],
    ['Invoices with Discount', reportData.invoices.length],
    [''],
    ['Date', 'Invoice', 'Customer', 'Original Amount', 'Discount Given', 'Final Amount', 'Discount %']
  ]

  reportData.invoices.forEach((inv: any) => {
    const discountPct = ((inv.discount / inv.originalAmount) * 100).toFixed(2)
    summaryData.push([
      inv.invoiceDate,
      inv.invoiceNumber,
      inv.partyName,
      inv.originalAmount,
      inv.discount,
      inv.finalAmount,
      discountPct + '%'
    ])
  })

  const ws = XLSX.utils.aoa_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(wb, ws, 'Discount Report')

  downloadWorkbook(wb, `discount-report-${new Date().toISOString().split('T')[0]}.xlsx`)
}

// Purchase Register PDF Export (GST Compliance)
export function exportPurchaseRegisterPDF(reportData: any) {
  const doc = new jsPDF('landscape') // Landscape for more columns

  doc.setFontSize(18)
  doc.text('PURCHASE REGISTER (ITC)', 14, 15)

  doc.setFontSize(10)
  doc.text(`Period: ${reportData.period.startDate} to ${reportData.period.endDate}`, 14, 22)
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 28)

  doc.setFontSize(8)
  doc.setTextColor(200, 0, 0)
  doc.text(reportData.complianceNote, 14, 34)
  doc.setTextColor(0, 0, 0)

  // Summary Section
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Summary', 14, 45)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Total Purchases: ${reportData.summary.totalPurchases}`, 14, 52)
  doc.text(`Total Taxable Value: ₹${reportData.summary.totalTaxableValue.toLocaleString('en-IN')}`, 14, 58)
  doc.text(`Total CGST: ₹${reportData.summary.totalCGST.toLocaleString('en-IN')}`, 14, 64)
  doc.text(`Total SGST: ₹${reportData.summary.totalSGST.toLocaleString('en-IN')}`, 90, 64)
  doc.text(`Total IGST: ₹${reportData.summary.totalIGST.toLocaleString('en-IN')}`, 160, 64)
  doc.setTextColor(34, 139, 34)
  doc.setFont('helvetica', 'bold')
  doc.text(`Total ITC Eligible: ₹${reportData.summary.totalITC.toLocaleString('en-IN')}`, 14, 70)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')

  // Purchases Table
  const tableData = reportData.purchases.map((p: any) => [
    new Date(p.invoiceDate).toLocaleDateString('en-IN'),
    p.supplierName.substring(0, 20),
    p.invoiceNumber,
    p.hsnCode,
    `₹${p.taxableValue.toLocaleString('en-IN')}`,
    `${p.gstRate}%`,
    `₹${p.totalITC.toLocaleString('en-IN')}`,
    p.paymentStatus
  ])

  autoTable(doc, {
    head: [['Date', 'Supplier', 'Inv#', 'HSN', 'Taxable ₹', 'GST%', 'ITC ₹', 'Payment']],
    body: tableData,
    startY: 78,
    theme: 'striped',
    headStyles: {
      fillColor: [70, 130, 180],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    styles: {
      fontSize: 7,
      cellPadding: 2
    },
    columnStyles: {
      4: { halign: 'right' },
      5: { halign: 'center' },
      6: { halign: 'right', textColor: [34, 139, 34], fontStyle: 'bold' },
      7: { halign: 'center' }
    }
  })

  downloadPDF(doc, `purchase-register-${new Date().toISOString().split('T')[0]}.pdf`)
}

// Purchase Register Excel Export (GST Compliance)
export function exportPurchaseRegisterExcel(reportData: any) {
  const wb = XLSX.utils.book_new()

  // Summary Sheet
  const summaryData = [
    ['PURCHASE REGISTER (ITC - Input Tax Credit)'],
    ['Period', `${reportData.period.startDate} to ${reportData.period.endDate}`],
    ['Generated', new Date().toLocaleString('en-IN')],
    ['Compliance', reportData.complianceNote],
    [''],
    ['Summary'],
    ['Total Purchases', reportData.summary.totalPurchases],
    ['Total Taxable Value', reportData.summary.totalTaxableValue],
    ['Total CGST', reportData.summary.totalCGST],
    ['Total SGST', reportData.summary.totalSGST],
    ['Total IGST', reportData.summary.totalIGST],
    ['Total ITC Eligible', reportData.summary.totalITC],
    ['Total Invoice Value', reportData.summary.totalInvoiceValue],
    ['RCM Purchases', reportData.summary.rcmPurchases],
    [''],
    ['Date', 'Supplier Name', 'Supplier GSTIN', 'Invoice Number', 'HSN Code', 'Description', 'Taxable Value', 'GST Rate %', 'CGST', 'SGST', 'IGST', 'Total ITC', 'Invoice Value', 'Payment Status', 'RCM']
  ]

  reportData.purchases.forEach((p: any) => {
    summaryData.push([
      p.invoiceDate,
      p.supplierName,
      p.supplierGSTIN,
      p.invoiceNumber,
      p.hsnCode,
      p.description,
      p.taxableValue,
      p.gstRate,
      p.cgst,
      p.sgst,
      p.igst,
      p.totalITC,
      p.invoiceValue,
      p.paymentStatus,
      p.isRCM ? 'Yes' : 'No'
    ])
  })

  const ws = XLSX.utils.aoa_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(wb, ws, 'Purchase Register')

  downloadWorkbook(wb, `purchase-register-${new Date().toISOString().split('T')[0]}.xlsx`)
}

// Sales Register PDF Export (GST Compliance - Marketplace-Aware)
export function exportSalesRegisterPDF(reportData: any) {
  const doc = new jsPDF('landscape') // Landscape for more columns

  doc.setFontSize(18)
  doc.text('SALES REGISTER (Output Tax)', 14, 15)

  doc.setFontSize(10)
  doc.text(`Period: ${reportData.period.startDate} to ${reportData.period.endDate}`, 14, 22)
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 28)

  doc.setFontSize(7)
  doc.setTextColor(200, 0, 0)
  doc.text(reportData.complianceNote, 14, 34)
  doc.setTextColor(0, 0, 0)

  // Summary Section - Enhanced with marketplace deductions
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Summary', 14, 42)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')

  // Row 1: Sales count and Invoice Value
  doc.text(`Total Sales: ${reportData.summary.totalSales}`, 14, 48)
  doc.text(`Invoice Value: ₹${(reportData.summary.totalInvoiceValue || 0).toLocaleString('en-IN')}`, 70, 48)

  // Row 2: Deductions breakdown
  doc.setTextColor(255, 140, 0) // Orange for deductions
  doc.text(`(-) Deductions: ₹${(reportData.summary.totalDeductions || 0).toLocaleString('en-IN')}`, 14, 54)
  doc.text(`[TCS: ₹${(reportData.summary.totalTcsCollected || 0).toLocaleString('en-IN')} | Fees: ₹${(reportData.summary.totalMarketplaceFees || 0).toLocaleString('en-IN')} | Shipping: ₹${(reportData.summary.totalShippingCharged || 0).toLocaleString('en-IN')}]`, 70, 54)
  doc.setTextColor(0, 0, 0)

  // Row 3: Taxable Value
  doc.setTextColor(0, 100, 200) // Blue
  doc.setFont('helvetica', 'bold')
  doc.text(`Taxable Value: ₹${reportData.summary.totalTaxableValue.toLocaleString('en-IN')}`, 14, 60)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')

  // Row 4: GST Breakdown
  doc.text(`CGST: ₹${reportData.summary.totalCGST.toLocaleString('en-IN')}`, 14, 66)
  doc.text(`SGST: ₹${reportData.summary.totalSGST.toLocaleString('en-IN')}`, 70, 66)
  doc.text(`IGST: ₹${reportData.summary.totalIGST.toLocaleString('en-IN')}`, 130, 66)
  doc.text(`RCM: ₹${(reportData.summary.totalRCM || 0).toLocaleString('en-IN')}`, 190, 66)

  // Row 5: Total Output Tax (highlighted)
  doc.setTextColor(220, 20, 60)
  doc.setFont('helvetica', 'bold')
  doc.text(`TOTAL OUTPUT TAX (GSTR-1/3B): ₹${reportData.summary.totalOutputTax.toLocaleString('en-IN')}`, 14, 72)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')

  // Row 6: Classification
  doc.text(`B2B: ${reportData.summary.b2bSales} | B2C Small: ${reportData.summary.b2cSmall} | B2C Large: ${reportData.summary.b2cLarge} | Intra-State: ${reportData.summary.intraStateSales || 0} | Inter-State: ${reportData.summary.interStateSales || 0}`, 14, 78)

  // Sales Table - Enhanced with marketplace columns
  const tableData = reportData.sales.map((s: any) => [
    new Date(s.invoiceDate).toLocaleDateString('en-IN'),
    s.orderId?.substring(0, 15) || s.invoiceNumber?.substring(0, 15),
    s.customerName?.substring(0, 15) || '-',
    s.platform || 'Offline',
    `₹${(s.invoiceValue || 0).toLocaleString('en-IN')}`,
    s.totalDeductions > 0 ? `₹${s.totalDeductions.toLocaleString('en-IN')}` : '-',
    `₹${(s.taxableValue || 0).toLocaleString('en-IN')}`,
    `${s.gstRate || 0}%`,
    `₹${(s.totalOutputTax || 0).toLocaleString('en-IN')}`,
    s.placeOfSupply?.substring(0, 10) || '-',
    s.saleType || '-',
    s.isRCM ? `₹${s.rcmAmount}` : '-'
  ])

  autoTable(doc, {
    head: [['Date', 'Order ID', 'Customer', 'Platform', 'Invoice ₹', 'Deductions', 'Taxable ₹', 'GST%', 'Output Tax', 'Place', 'Type', 'RCM']],
    body: tableData,
    startY: 84,
    theme: 'striped',
    headStyles: {
      fillColor: [220, 20, 60],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7
    },
    styles: {
      fontSize: 6,
      cellPadding: 1.5
    },
    columnStyles: {
      4: { halign: 'right' },
      5: { halign: 'right', textColor: [255, 140, 0] },
      6: { halign: 'right', textColor: [0, 100, 200] },
      7: { halign: 'center' },
      8: { halign: 'right', textColor: [220, 20, 60], fontStyle: 'bold' },
      9: { halign: 'center', fontSize: 5 },
      10: { halign: 'center', fontSize: 5 },
      11: { halign: 'right', fontSize: 5 }
    },
    // Add totals row
    foot: [[
      'TOTALS', '', '', '',
      `₹${(reportData.summary.totalInvoiceValue || 0).toLocaleString('en-IN')}`,
      `₹${(reportData.summary.totalDeductions || 0).toLocaleString('en-IN')}`,
      `₹${reportData.summary.totalTaxableValue.toLocaleString('en-IN')}`,
      '-',
      `₹${reportData.summary.totalOutputTax.toLocaleString('en-IN')}`,
      '-', '-',
      `₹${(reportData.summary.totalRCM || 0).toLocaleString('en-IN')}`
    ]],
    footStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 7
    }
  })

  // Add calculation note at bottom
  const finalY = (doc as any).lastAutoTable?.finalY || 150
  doc.setFontSize(7)
  doc.setTextColor(0, 100, 200)
  doc.text(reportData.calculationNote || 'Taxable Value = Invoice Value - Deductions (TCS + Fees + Shipping). Output Tax = Taxable Value × GST Rate.', 14, finalY + 8)

  downloadPDF(doc, `sales-register-${new Date().toISOString().split('T')[0]}.pdf`)
}

// Sales Register Excel Export (GST Compliance - Marketplace-Aware)
export function exportSalesRegisterExcel(reportData: any) {
  const wb = XLSX.utils.book_new()

  // Summary Sheet - Enhanced with marketplace deductions
  const summaryData: any[][] = [
    ['SALES REGISTER (Output Tax) - GST Compliance Report'],
    ['Period', `${reportData.period.startDate} to ${reportData.period.endDate}`],
    ['Generated', new Date().toLocaleString('en-IN')],
    ['Compliance', reportData.complianceNote],
    ['Calculation', reportData.calculationNote || 'Taxable Value = Invoice Value - Deductions'],
    [''],
    ['=== SUMMARY ==='],
    ['Total Sales', reportData.summary.totalSales],
    ['Total Invoice Value (Customer Paid)', reportData.summary.totalInvoiceValue || 0],
    [''],
    ['--- DEDUCTIONS (Subtracted from Invoice Value) ---'],
    ['(-) Shipping Charged to Customer', reportData.summary.totalShippingCharged || 0],
    ['(-) TCS Collected by Marketplace (1%)', reportData.summary.totalTcsCollected || 0],
    ['(-) TDS Deducted', reportData.summary.totalTdsDeducted || 0],
    ['(-) Marketplace Fees & Commission', reportData.summary.totalMarketplaceFees || 0],
    ['Total Deductions', reportData.summary.totalDeductions || 0],
    [''],
    ['--- TAXABLE VALUE & OUTPUT TAX ---'],
    ['Taxable Value (GST Base)', reportData.summary.totalTaxableValue],
    ['CGST', reportData.summary.totalCGST],
    ['SGST', reportData.summary.totalSGST],
    ['IGST', reportData.summary.totalIGST],
    ['RCM (Reverse Charge)', reportData.summary.totalRCM || 0],
    ['TOTAL OUTPUT TAX (for GSTR-1 & GSTR-3B)', reportData.summary.totalOutputTax],
    [''],
    ['--- CLASSIFICATION ---'],
    ['B2B Sales (with GSTIN)', reportData.summary.b2bSales],
    ['B2C Small (≤₹2.5L)', reportData.summary.b2cSmall],
    ['B2C Large (>₹2.5L)', reportData.summary.b2cLarge],
    ['Intra-State Sales (CGST+SGST)', reportData.summary.intraStateSales || 0],
    ['Inter-State Sales (IGST)', reportData.summary.interStateSales || 0],
    [''],
    ['--- COLLECTION STATUS ---'],
    ['Amount Collected', reportData.summary.totalCollected || 0],
    ['Amount Due', reportData.summary.totalDue || 0],
    ['']
  ]

  // Platform-wise breakdown if available
  if (reportData.platformBreakdown && reportData.platformBreakdown.length > 0) {
    summaryData.push(['=== PLATFORM-WISE BREAKDOWN ==='])
    summaryData.push(['Platform', 'Orders', 'Invoice Value', 'Taxable Value', 'Output Tax', 'Fees', 'TCS'])
    reportData.platformBreakdown.forEach((p: any) => {
      summaryData.push([p.platform, p.count, p.invoiceValue, p.taxableValue, p.outputTax, p.fees, p.tcs])
    })
    summaryData.push([''])
  }

  // GST Rate-wise breakdown if available
  if (reportData.gstRateBreakdown && reportData.gstRateBreakdown.length > 0) {
    summaryData.push(['=== GST RATE-WISE BREAKDOWN (for GSTR-1) ==='])
    summaryData.push(['GST Rate', 'Count', 'Taxable Value', 'Output Tax'])
    reportData.gstRateBreakdown.forEach((r: any) => {
      summaryData.push([r.rate, r.count, r.taxableValue, r.outputTax])
    })
    summaryData.push([''])
  }

  // Detailed transactions header
  summaryData.push(['=== DETAILED TRANSACTIONS ==='])
  summaryData.push([
    'Date', 'Order ID', 'Invoice Number', 'Customer Name', 'Customer GSTIN',
    'Platform', 'Invoice Value', 'Shipping Charged', 'TCS Collected', 'TDS Deducted',
    'Marketplace Fees', 'Total Deductions', 'Taxable Value', 'GST Rate %',
    'CGST', 'SGST', 'IGST', 'Total Output Tax', 'Place of Supply', 'Is Inter-State',
    'Sale Type', 'Is RCM', 'RCM Amount', 'Payment Status', 'e-Invoice IRN'
  ])

  // Transaction rows
  reportData.sales.forEach((s: any) => {
    summaryData.push([
      s.invoiceDate,
      s.orderId || s.invoiceNumber,
      s.invoiceNumber,
      s.customerName,
      s.customerGSTIN,
      s.platform,
      s.invoiceValue,
      s.shippingCharged || 0,
      s.tcsCollected || 0,
      s.tdsDeducted || 0,
      s.marketplaceFees || 0,
      s.totalDeductions || 0,
      s.taxableValue,
      s.gstRate,
      s.cgst,
      s.sgst,
      s.igst,
      s.totalOutputTax,
      s.placeOfSupply,
      s.isInterState ? 'Yes' : 'No',
      s.saleType,
      s.isRCM ? 'Yes' : 'No',
      s.rcmAmount || 0,
      s.paymentStatus,
      s.eInvoiceIRN || 'N/A'
    ])
  })

  // Totals row
  summaryData.push([
    'TOTALS', '', '', '', '',
    '',
    reportData.summary.totalInvoiceValue || 0,
    reportData.summary.totalShippingCharged || 0,
    reportData.summary.totalTcsCollected || 0,
    reportData.summary.totalTdsDeducted || 0,
    reportData.summary.totalMarketplaceFees || 0,
    reportData.summary.totalDeductions || 0,
    reportData.summary.totalTaxableValue,
    '-',
    reportData.summary.totalCGST,
    reportData.summary.totalSGST,
    reportData.summary.totalIGST,
    reportData.summary.totalOutputTax,
    '', '', '', '',
    reportData.summary.totalRCM || 0,
    '', ''
  ])

  const ws = XLSX.utils.aoa_to_sheet(summaryData)

  // Set column widths
  ws['!cols'] = [
    { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 18 },
    { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 },
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 15 }, { wch: 12 },
    { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 20 }
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Sales Register')

  downloadWorkbook(wb, `sales-register-${new Date().toISOString().split('T')[0]}.xlsx`)
}

// Stock Alert PDF Export
export function exportStockAlertPDF(reportData: any) {
  const doc = new jsPDF()

  // Title
  doc.setFontSize(20)
  doc.text('Low Stock Alert - Items to Reorder', 14, 20)

  // Generated date
  doc.setFontSize(12)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30)

  // Summary Section
  doc.setFontSize(14)
  doc.text('Summary', 14, 45)

  doc.setFontSize(11)
  doc.setTextColor(0, 0, 0)
  doc.text(`Total Items: ${reportData.summary.totalItems}`, 14, 55)

  doc.setTextColor(34, 197, 94) // Green
  doc.text(`In Stock: ${reportData.summary.inStock}`, 14, 62)

  doc.setTextColor(255, 152, 0) // Orange
  doc.text(`Low Stock: ${reportData.summary.lowStock}`, 14, 69)

  doc.setTextColor(239, 68, 68) // Red
  doc.text(`Out of Stock: ${reportData.summary.outOfStock}`, 14, 76)

  // Reset color
  doc.setTextColor(0, 0, 0)

  let startY = 90

  // Out of Stock Items
  const outOfStockItems = reportData.items.filter((item: any) => item.status === 'Out of Stock')
  if (outOfStockItems.length > 0) {
    doc.setFontSize(14)
    doc.setTextColor(239, 68, 68)
    doc.text('OUT OF STOCK - Urgent Action Required', 14, startY)
    doc.setTextColor(0, 0, 0)

    const outOfStockData = outOfStockItems.map((item: any) => [
      item.name,
      item.sku || 'N/A',
      (item.quantity ?? 0).toString(),
      item.unitPrice ? `Rs ${item.unitPrice.toLocaleString('en-IN')}/unit` : 'Rs 0',
      'Out of Stock'
    ])

    autoTable(doc, {
      head: [['Item Name', 'SKU', 'Quantity', 'Unit Price', 'Status']],
      body: outOfStockData,
      startY: startY + 5,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [239, 68, 68] },
      bodyStyles: { fillColor: [254, 242, 242] }
    })

    startY = (doc as any).lastAutoTable.finalY + 15
  }

  // Low Stock Items
  const lowStockItems = reportData.items.filter((item: any) => item.status === 'Low Stock')
  if (lowStockItems.length > 0) {
    doc.setFontSize(14)
    doc.setTextColor(255, 152, 0)
    doc.text('LOW STOCK - Reorder Soon', 14, startY)
    doc.setTextColor(0, 0, 0)

    const lowStockData = lowStockItems.map((item: any) => [
      item.name,
      item.sku || 'N/A',
      (item.quantity ?? 0).toString(),
      `Rs ${(item.value || 0).toLocaleString('en-IN')}`,
      'Low Stock'
    ])

    autoTable(doc, {
      head: [['Item Name', 'SKU', 'Quantity', 'Value', 'Status']],
      body: lowStockData,
      startY: startY + 5,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [255, 152, 0] },
      bodyStyles: { fillColor: [255, 247, 237] }
    })

    startY = (doc as any).lastAutoTable.finalY + 15
  }

  // In Stock Items (first 10)
  const inStockItems = reportData.items.filter((item: any) => item.status === 'In Stock').slice(0, 10)
  if (inStockItems.length > 0) {
    doc.setFontSize(14)
    doc.setTextColor(34, 197, 94)
    doc.text('IN STOCK (Top 10)', 14, startY)
    doc.setTextColor(0, 0, 0)

    const inStockData = inStockItems.map((item: any) => [
      item.name,
      item.sku || 'N/A',
      (item.quantity ?? 0).toString(),
      `Rs ${(item.value || 0).toLocaleString('en-IN')}`,
      'In Stock'
    ])

    autoTable(doc, {
      head: [['Item Name', 'SKU', 'Quantity', 'Value', 'Status']],
      body: inStockData,
      startY: startY + 5,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [34, 197, 94] }
    })
  }

  // Action Required Note (if applicable)
  if (outOfStockItems.length > 0 || lowStockItems.length > 0) {
    const finalY = (doc as any).lastAutoTable?.finalY || startY
    doc.setFontSize(10)
    doc.setTextColor(255, 152, 0)
    doc.text('ACTION REQUIRED:', 14, finalY + 15)
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(9)

    let actionText = ''
    if (outOfStockItems.length > 0) {
      actionText += `${outOfStockItems.length} item(s) are out of stock. `
    }
    if (lowStockItems.length > 0) {
      actionText += `${lowStockItems.length} item(s) are running low. `
    }
    actionText += 'Please reorder these items soon to avoid stockouts.'

    const splitText = doc.splitTextToSize(actionText, 180)
    doc.text(splitText, 14, finalY + 22)
  }

  downloadPDF(doc, `stock-alert-${new Date().toISOString().split('T')[0]}.pdf`)
}

// Stock Alert Excel Export
export function exportStockAlertExcel(reportData: any) {
  const wb = XLSX.utils.book_new()

  const ws_data = [
    ['LOW STOCK ALERT - ITEMS TO REORDER'],
    [`Generated: ${new Date().toLocaleString()}`],
    [''],
    ['SUMMARY'],
    ['Total Items', reportData.summary.totalItems],
    ['In Stock', reportData.summary.inStock],
    ['Low Stock', reportData.summary.lowStock],
    ['Out of Stock', reportData.summary.outOfStock],
    ['']
  ]

  // Out of Stock Items
  const outOfStockItems = reportData.items.filter((item: any) => item.status === 'Out of Stock')
  if (outOfStockItems.length > 0) {
    ws_data.push(
      ['OUT OF STOCK - URGENT ACTION REQUIRED'],
      ['Item Name', 'SKU', 'Quantity', 'Value (₹)', 'Status']
    )

    outOfStockItems.forEach((item: any) => {
      ws_data.push([
        item.name,
        item.sku || 'N/A',
        item.quantity ?? 0,
        item.value?.toFixed(2) || '0.00',
        'Out of Stock'
      ])
    })

    ws_data.push([''])
  }

  // Low Stock Items
  const lowStockItems = reportData.items.filter((item: any) => item.status === 'Low Stock')
  if (lowStockItems.length > 0) {
    ws_data.push(
      ['LOW STOCK - REORDER SOON'],
      ['Item Name', 'SKU', 'Quantity', 'Value (₹)', 'Status']
    )

    lowStockItems.forEach((item: any) => {
      ws_data.push([
        item.name,
        item.sku || 'N/A',
        item.quantity ?? 0,
        item.value?.toFixed(2) || '0.00',
        'Low Stock'
      ])
    })

    ws_data.push([''])
  }

  // In Stock Items (first 10)
  const inStockItems = reportData.items.filter((item: any) => item.status === 'In Stock').slice(0, 10)
  if (inStockItems.length > 0) {
    ws_data.push(
      ['IN STOCK (TOP 10)'],
      ['Item Name', 'SKU', 'Quantity', 'Value (₹)', 'Status']
    )

    inStockItems.forEach((item: any) => {
      ws_data.push([
        item.name,
        item.sku || 'N/A',
        item.quantity ?? 0,
        item.value?.toFixed(2) || '0.00',
        'In Stock'
      ])
    })

    ws_data.push([''])
  }

  // Action Required
  if (outOfStockItems.length > 0 || lowStockItems.length > 0) {
    ws_data.push(
      ['ACTION REQUIRED'],
      ['']
    )

    if (outOfStockItems.length > 0) {
      ws_data.push([`${outOfStockItems.length} item(s) are out of stock.`])
    }
    if (lowStockItems.length > 0) {
      ws_data.push([`${lowStockItems.length} item(s) are running low.`])
    }
    ws_data.push(['Please reorder these items soon to avoid stockouts.'])
  }

  const ws = XLSX.utils.aoa_to_sheet(ws_data)

  // Set column widths
  ws['!cols'] = [
    { wch: 30 }, // Item Name
    { wch: 15 }, // SKU
    { wch: 10 }, // Quantity
    { wch: 15 }, // Value
    { wch: 15 }  // Status
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Stock Alert')

  downloadWorkbook(wb, `stock-alert-${new Date().toISOString().split('T')[0]}.xlsx`)
}

/**
 * Export Fast Moving Items report to PDF
 */
export function exportFastMovingItemsPDF(reportData: any) {
  const doc = new jsPDF()

  // Title
  doc.setFontSize(20)
  doc.text('Fast Moving Items - Top Sellers', 14, 20)

  // Period
  doc.setFontSize(12)
  doc.text(`Period: Last ${reportData.period.days} days`, 14, 30)
  doc.text(`Showing items with >=100 units sold`, 14, 37)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 44)

  // Summary Section
  doc.setFontSize(14)
  doc.text('Summary', 14, 59)

  doc.setFontSize(11)
  doc.setTextColor(0, 0, 0)
  doc.text(`Total Items Sold: ${reportData.summary.totalQuantitySold}`, 14, 69)

  doc.setTextColor(34, 197, 94) // Green
  doc.text(`Safe Stock: ${reportData.summary.safeCount}`, 14, 76)

  doc.setTextColor(255, 152, 0) // Orange
  doc.text(`Low Stock: ${reportData.summary.lowCount}`, 14, 83)

  doc.setTextColor(239, 68, 68) // Red
  doc.text(`Critical: ${reportData.summary.criticalCount}`, 14, 90)

  // Reset color
  doc.setTextColor(0, 0, 0)

  // Top Selling Items Table
  doc.setFontSize(14)
  doc.text('Top Selling Items', 14, 105)

  const tableData = reportData.items.map((item: any) => [
    `#${item.rank}`,
    item.itemName,
    `${item.quantitySold} ${item.unit}`,
    `${item.avgDailySale}/day`,
    `${item.currentStock} ${item.unit}`,
    item.daysLeft > 999 ? '999+ days' : `${item.daysLeft} days`,
    item.status === 'Critical' ? 'Critical' : item.status === 'Low' ? 'Low' : 'Safe'
  ])

  autoTable(doc, {
    head: [['Rank', 'Item Name', 'Qty Sold (30d)', 'Avg Daily', 'Stock', 'Days Left', 'Status']],
    body: tableData,
    startY: 110,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [34, 197, 94] },
    didParseCell: (data: any) => {
      // Color code status column
      if (data.column.index === 6 && data.section === 'body') {
        const status = data.cell.raw
        if (status === 'Critical') {
          data.cell.styles.fillColor = [254, 242, 242]
          data.cell.styles.textColor = [239, 68, 68]
        } else if (status === 'Low') {
          data.cell.styles.fillColor = [255, 251, 235]
          data.cell.styles.textColor = [255, 152, 0]
        } else if (status === 'Safe') {
          data.cell.styles.fillColor = [240, 253, 244]
          data.cell.styles.textColor = [34, 197, 94]
        }
      }
    }
  })

  // Alert message
  const finalY = (doc as any).lastAutoTable.finalY || 200
  if (reportData.summary.criticalCount > 0) {
    doc.setFontSize(10)
    doc.setTextColor(239, 68, 68)
    doc.text('URGENT ACTION REQUIRED:', 14, finalY + 10)
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(9)
    doc.text(`${reportData.summary.criticalCount} hot-selling items have less than 5 days of stock!`, 14, finalY + 17)
    doc.text('Order now to avoid losing sales on your best-selling products.', 14, finalY + 23)
  }

  downloadPDF(doc, `fast-moving-items-${new Date().toISOString().split('T')[0]}.pdf`)
}

/**
 * Export Fast Moving Items report to Excel
 */
export function exportFastMovingItemsExcel(reportData: any) {
  const wb = XLSX.utils.book_new()
  const ws_data: any[] = []

  // Title
  ws_data.push(['Fast Moving Items - Top Sellers'])
  ws_data.push([`Period: Last ${reportData.period.days} days`])
  ws_data.push(['Showing items with >=100 units sold'])
  ws_data.push([`Generated: ${new Date().toLocaleString()}`])
  ws_data.push([])

  // Summary
  ws_data.push(['SUMMARY'])
  ws_data.push(['Total Items Sold', reportData.summary.totalQuantitySold])
  ws_data.push(['Safe Stock', reportData.summary.safeCount])
  ws_data.push(['Low Stock', reportData.summary.lowCount])
  ws_data.push(['Critical', reportData.summary.criticalCount])
  ws_data.push([])

  // Items Table Header
  ws_data.push(['Rank', 'Item Name', 'SKU', 'Qty Sold (30d)', 'Avg Daily Sale', 'Current Stock', 'Days Left', 'Status'])

  // Items Data
  reportData.items.forEach((item: any) => {
    ws_data.push([
      item.rank,
      item.itemName,
      item.sku || 'N/A',
      `${item.quantitySold} ${item.unit}`,
      `${item.avgDailySale} ${item.unit}/day`,
      `${item.currentStock} ${item.unit}`,
      item.daysLeft > 999 ? '999+' : item.daysLeft,
      item.status
    ])
  })

  // Alert message
  ws_data.push([])
  if (reportData.summary.criticalCount > 0) {
    ws_data.push(['URGENT ACTION REQUIRED:'])
    ws_data.push([`${reportData.summary.criticalCount} hot-selling items have less than 5 days of stock remaining!`])
    ws_data.push(['Order now to avoid losing sales on your best-selling products.'])
  } else if (reportData.summary.lowCount > 0) {
    ws_data.push(['PLAN AHEAD:'])
    ws_data.push([`${reportData.summary.lowCount} fast-moving items will run out in 6-15 days.`])
  } else {
    ws_data.push(['ALL GOOD:'])
    ws_data.push(['All your fast-moving items have sufficient stock. Great inventory management!'])
  }

  const ws = XLSX.utils.aoa_to_sheet(ws_data)

  // Set column widths
  ws['!cols'] = [
    { wch: 6 },  // Rank
    { wch: 30 }, // Item Name
    { wch: 15 }, // SKU
    { wch: 15 }, // Qty Sold
    { wch: 15 }, // Avg Daily
    { wch: 15 }, // Stock
    { wch: 12 }, // Days Left
    { wch: 12 }  // Status
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Fast Moving Items')

  downloadWorkbook(wb, `fast-moving-items-${new Date().toISOString().split('T')[0]}.xlsx`)
}

/**
 * Export Slow Moving Items report to PDF
 */
export function exportSlowMovingItemsPDF(reportData: any) {
  const doc = new jsPDF()

  // Title
  doc.setFontSize(20)
  doc.text('Slow Moving Items - Dead Stock', 14, 20)

  // Period
  doc.setFontSize(12)
  doc.text(`Period: Last ${reportData.period.days} days`, 14, 30)
  doc.text(`Showing items with <=10 units sold`, 14, 37)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 44)

  // Summary Section
  doc.setFontSize(14)
  doc.text('Summary', 14, 59)

  doc.setFontSize(11)
  doc.setTextColor(0, 0, 0)
  doc.text(`Capital Tied Up: ₹${reportData.summary.totalStockValue.toLocaleString('en-IN')}`, 14, 69)

  doc.setTextColor(239, 68, 68) // Red
  doc.text(`Dead Stock: ${reportData.summary.deadStockCount}`, 14, 76)

  doc.setTextColor(255, 152, 0) // Orange
  doc.text(`Very Slow: ${reportData.summary.verySlowCount}`, 14, 83)

  doc.setTextColor(255, 193, 7) // Yellow
  doc.text(`Slow: ${reportData.summary.slowCount}`, 14, 90)

  // Reset color
  doc.setTextColor(0, 0, 0)

  // Slow Selling Items Table
  doc.setFontSize(14)
  doc.text('Slowest Selling Items', 14, 105)

  const tableData = reportData.items.map((item: any) => [
    `#${item.rank}`,
    item.itemName,
    `${item.quantitySold} ${item.unit}`,
    `${item.avgDailySale}/day`,
    `${item.currentStock} ${item.unit}`,
    `₹${item.stockValue.toLocaleString('en-IN')}`,
    item.status === 'Dead Stock' ? 'Dead' : item.status === 'Very Slow' ? 'V.Slow' : 'Slow'
  ])

  autoTable(doc, {
    head: [['Rank', 'Item Name', 'Qty Sold (30d)', 'Avg Daily', 'Stock', 'Value', 'Status']],
    body: tableData,
    startY: 110,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [239, 68, 68] }, // Red theme
    didParseCell: (data: any) => {
      // Color code status column
      if (data.column.index === 6 && data.section === 'body') {
        const status = data.cell.raw
        if (status === 'Dead') {
          data.cell.styles.fillColor = [254, 242, 242]
          data.cell.styles.textColor = [239, 68, 68]
        } else if (status === 'V.Slow') {
          data.cell.styles.fillColor = [255, 247, 237]
          data.cell.styles.textColor = [255, 152, 0]
        } else if (status === 'Slow') {
          data.cell.styles.fillColor = [255, 252, 231]
          data.cell.styles.textColor = [255, 193, 7]
        }
      }
    }
  })

  // Alert message
  const finalY = (doc as any).lastAutoTable.finalY || 200
  if (reportData.summary.deadStockCount > 0) {
    doc.setFontSize(10)
    doc.setTextColor(239, 68, 68)
    doc.text('ACTION REQUIRED:', 14, finalY + 10)
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(9)
    doc.text(`${reportData.summary.deadStockCount} item(s) have ZERO sales in 30 days!`, 14, finalY + 17)
    doc.text(`₹${reportData.summary.totalStockValue.toLocaleString('en-IN')} capital is tied up. Consider discounts/promotions to clear stock.`, 14, finalY + 23)
  }

  downloadPDF(doc, `slow-moving-items-${new Date().toISOString().split('T')[0]}.pdf`)
}

/**
 * Export Slow Moving Items report to Excel
 */
/**
 * Export Invoices to Tally-Compatible Excel Format
 * This format can be directly imported into Tally Prime
 */
export function exportToTallyExcel(invoices: any[], companyInfo?: any) {
  const wb = XLSX.utils.book_new()
  
  // Sheet 1: Sales Vouchers (Main Invoice Data)
  const voucherData = [
    ['TALLY PRIME IMPORT FORMAT - SALES VOUCHERS'],
    [`Company: ${companyInfo?.name || 'N/A'}`],
    [`GSTIN: ${companyInfo?.gstin || 'N/A'}`],
    [`Generated: ${new Date().toLocaleString('en-IN')}`],
    [''],
    ['VOUCHER IMPORT DATA'],
    [
      'Voucher No',
      'Date',
      'Party Name',
      'Party GSTIN',
      'Place of Supply',
      'HSN/SAC',
      'Item Name',
      'Qty',
      'Unit',
      'Rate',
      'Taxable Value',
      'GST Rate %',
      'CGST %',
      'CGST Amt',
      'SGST %',
      'SGST Amt',
      'IGST %',
      'IGST Amt',
      'Total Tax',
      'Invoice Value',
      'Payment Mode',
      'Reference'
    ]
  ]
  
  invoices.forEach(invoice => {
    const items = invoice.items || []
    const isInterstate = invoice.isInterstate || (invoice.customerState && invoice.customerState !== (companyInfo?.state || 'Tamil Nadu'))
    
    items.forEach((item: any, idx: number) => {
      const taxRate = item.gstRate || item.tax || 0
      const taxableValue = item.taxableAmount || (item.quantity * item.rate)
      const taxAmount = (taxableValue * taxRate) / 100
      
      const cgstRate = isInterstate ? 0 : taxRate / 2
      const sgstRate = isInterstate ? 0 : taxRate / 2
      const igstRate = isInterstate ? taxRate : 0
      
      const cgstAmt = (taxableValue * cgstRate) / 100
      const sgstAmt = (taxableValue * sgstRate) / 100
      const igstAmt = (taxableValue * igstRate) / 100
      
      voucherData.push([
        idx === 0 ? invoice.invoiceNumber : '',
        idx === 0 ? new Date(invoice.invoiceDate).toLocaleDateString('en-IN') : '',
        idx === 0 ? invoice.partyName || invoice.customerName || 'Walk-in Customer' : '',
        idx === 0 ? invoice.partyGSTIN || invoice.customerGSTIN || '' : '',
        idx === 0 ? invoice.placeOfSupply || invoice.customerState || companyInfo?.state || 'Tamil Nadu' : '',
        item.hsnCode || item.hsn || '',
        item.itemName || item.name || '',
        item.quantity || item.qty || 1,
        item.unit || 'Nos',
        item.rate || item.price || 0,
        taxableValue.toFixed(2),
        taxRate.toFixed(2),
        cgstRate.toFixed(2),
        cgstAmt.toFixed(2),
        sgstRate.toFixed(2),
        sgstAmt.toFixed(2),
        igstRate.toFixed(2),
        igstAmt.toFixed(2),
        taxAmount.toFixed(2),
        idx === 0 ? (invoice.grandTotal || invoice.total || 0).toFixed(2) : '',
        idx === 0 ? invoice.paymentMode || 'Credit' : '',
        invoice.reference || ''
      ])
    })
    
    // Add empty row between invoices
    voucherData.push([])
  })
  
  const voucherWs = XLSX.utils.aoa_to_sheet(voucherData)
  
  // Set column widths for better readability
  voucherWs['!cols'] = [
    { wch: 15 }, // Voucher No
    { wch: 12 }, // Date
    { wch: 25 }, // Party Name
    { wch: 18 }, // Party GSTIN
    { wch: 15 }, // Place of Supply
    { wch: 10 }, // HSN
    { wch: 30 }, // Item Name
    { wch: 8 },  // Qty
    { wch: 8 },  // Unit
    { wch: 10 }, // Rate
    { wch: 12 }, // Taxable Value
    { wch: 8 },  // GST Rate
    { wch: 8 },  // CGST %
    { wch: 10 }, // CGST Amt
    { wch: 8 },  // SGST %
    { wch: 10 }, // SGST Amt
    { wch: 8 },  // IGST %
    { wch: 10 }, // IGST Amt
    { wch: 10 }, // Total Tax
    { wch: 12 }, // Invoice Value
    { wch: 12 }, // Payment Mode
    { wch: 15 }, // Reference
  ]
  
  XLSX.utils.book_append_sheet(wb, voucherWs, 'Sales Vouchers')
  
  // Sheet 2: Summary for verification
  const summaryData = [
    ['TALLY IMPORT SUMMARY'],
    [''],
    ['Total Invoices', invoices.length],
    ['Total Invoice Value', invoices.reduce((sum, inv) => sum + (inv.grandTotal || inv.total || 0), 0).toFixed(2)],
    ['Total Taxable Value', invoices.reduce((sum, inv) => sum + (inv.subtotal || inv.taxableAmount || 0), 0).toFixed(2)],
    ['Total CGST', invoices.reduce((sum, inv) => sum + (inv.cgstAmount || 0), 0).toFixed(2)],
    ['Total SGST', invoices.reduce((sum, inv) => sum + (inv.sgstAmount || 0), 0).toFixed(2)],
    ['Total IGST', invoices.reduce((sum, inv) => sum + (inv.igstAmount || 0), 0).toFixed(2)],
    [''],
    ['IMPORT INSTRUCTIONS:'],
    ['1. Open Tally Prime'],
    ['2. Go to Gateway → Import → Vouchers'],
    ['3. Select "Excel/CSV" as import type'],
    ['4. Map columns as per Tally fields'],
    ['5. Click Import and verify'],
    [''],
    ['NOTE: Ensure Party ledgers and Stock Items exist in Tally before import.']
  ]
  
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')
  
  downloadWorkbook(wb, `tally-export-sales-${new Date().toISOString().split('T')[0]}.xlsx`)
}

/**
 * Export Invoices to Tally XML Format
 * Direct XML import for Tally Prime
 */
export function exportToTallyXML(invoices: any[], companyInfo?: any): string {
  const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>`
  
  const xmlFooter = `
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`
  
  let vouchers = ''
  
  invoices.forEach(invoice => {
    const items = invoice.items || []
    const invoiceDate = new Date(invoice.invoiceDate)
    const tallyDate = `${invoiceDate.getFullYear()}${String(invoiceDate.getMonth() + 1).padStart(2, '0')}${String(invoiceDate.getDate()).padStart(2, '0')}`
    const isInterstate = invoice.isInterstate || false
    
    let itemEntries = ''
    items.forEach((item: any) => {
      const taxRate = item.gstRate || item.tax || 0
      const taxableValue = item.taxableAmount || (item.quantity * item.rate)
      const taxAmount = (taxableValue * taxRate) / 100
      
      itemEntries += `
          <INVENTORYENTRIES.LIST>
            <STOCKITEMNAME>${escapeXML(item.itemName || item.name || '')}</STOCKITEMNAME>
            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
            <RATE>${item.rate || 0}/Nos</RATE>
            <AMOUNT>-${taxableValue.toFixed(2)}</AMOUNT>
            <ACTUALQTY>${item.quantity || 1} Nos</ACTUALQTY>
            <BILLEDQTY>${item.quantity || 1} Nos</BILLEDQTY>
            <BATCHALLOCATIONS.LIST>
              <GODOWNNAME>Main Location</GODOWNNAME>
              <BATCHNAME>Primary Batch</BATCHNAME>
              <AMOUNT>-${taxableValue.toFixed(2)}</AMOUNT>
              <ACTUALQTY>${item.quantity || 1} Nos</ACTUALQTY>
              <BILLEDQTY>${item.quantity || 1} Nos</BILLEDQTY>
            </BATCHALLOCATIONS.LIST>
          </INVENTORYENTRIES.LIST>`
    })
    
    // GST Ledger entries
    const totalTaxable = items.reduce((sum: number, item: any) => sum + (item.taxableAmount || (item.quantity * item.rate)), 0)
    const avgTaxRate = items.length > 0 ? items.reduce((sum: number, item: any) => sum + (item.gstRate || item.tax || 0), 0) / items.length : 0
    const cgstAmt = isInterstate ? 0 : (totalTaxable * avgTaxRate / 2) / 100
    const sgstAmt = isInterstate ? 0 : (totalTaxable * avgTaxRate / 2) / 100
    const igstAmt = isInterstate ? (totalTaxable * avgTaxRate) / 100 : 0
    
    let gstEntries = ''
    if (!isInterstate && cgstAmt > 0) {
      gstEntries += `
          <LEDGERENTRIES.LIST>
            <LEDGERNAME>CGST Output</LEDGERNAME>
            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
            <AMOUNT>-${cgstAmt.toFixed(2)}</AMOUNT>
          </LEDGERENTRIES.LIST>
          <LEDGERENTRIES.LIST>
            <LEDGERNAME>SGST Output</LEDGERNAME>
            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
            <AMOUNT>-${sgstAmt.toFixed(2)}</AMOUNT>
          </LEDGERENTRIES.LIST>`
    } else if (igstAmt > 0) {
      gstEntries += `
          <LEDGERENTRIES.LIST>
            <LEDGERNAME>IGST Output</LEDGERNAME>
            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
            <AMOUNT>-${igstAmt.toFixed(2)}</AMOUNT>
          </LEDGERENTRIES.LIST>`
    }
    
    vouchers += `
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER REMOTEID="${invoice.id || invoice.invoiceNumber}" VCHTYPE="Sales" ACTION="Create">
            <DATE>${tallyDate}</DATE>
            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${invoice.invoiceNumber}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${escapeXML(invoice.partyName || invoice.customerName || 'Cash')}</PARTYLEDGERNAME>
            <PARTYGSTIN>${invoice.partyGSTIN || invoice.customerGSTIN || ''}</PARTYGSTIN>
            <PLACEOFSUPPLY>${invoice.placeOfSupply || invoice.customerState || companyInfo?.state || 'Tamil Nadu'}</PLACEOFSUPPLY>
            <ISINVOICE>Yes</ISINVOICE>
            <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>
            <LEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXML(invoice.partyName || invoice.customerName || 'Cash')}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>${(invoice.grandTotal || invoice.total || 0).toFixed(2)}</AMOUNT>
            </LEDGERENTRIES.LIST>
            <LEDGERENTRIES.LIST>
              <LEDGERNAME>Sales Account</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>-${totalTaxable.toFixed(2)}</AMOUNT>
            </LEDGERENTRIES.LIST>${gstEntries}${itemEntries}
          </VOUCHER>
        </TALLYMESSAGE>`
  })
  
  return xmlHeader + vouchers + xmlFooter
}

/**
 * Helper function to escape XML special characters
 */
function escapeXML(str: string): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Download Tally XML file
 */
export function downloadTallyXML(invoices: any[], companyInfo?: any) {
  const xml = exportToTallyXML(invoices, companyInfo)
  const blob = new Blob([xml], { type: 'application/xml' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `tally-export-sales-${new Date().toISOString().split('T')[0]}.xml`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export Invoices to CSV for Tally (Simple Format)
 */
export function exportToTallyCSV(invoices: any[], companyInfo?: any) {
  const headers = [
    'Voucher Date',
    'Voucher No',
    'Party Name',
    'Party GSTIN',
    'Place of Supply',
    'HSN Code',
    'Item Name',
    'Quantity',
    'Unit',
    'Rate',
    'Taxable Value',
    'GST Rate',
    'CGST',
    'SGST',
    'IGST',
    'Total',
    'Payment Mode'
  ]
  
  const rows: string[][] = []
  
  invoices.forEach(invoice => {
    const items = invoice.items || []
    const isInterstate = invoice.isInterstate || false
    
    items.forEach((item: any, idx: number) => {
      const taxRate = item.gstRate || item.tax || 0
      const taxableValue = item.taxableAmount || (item.quantity * item.rate)
      
      const cgstAmt = isInterstate ? 0 : (taxableValue * taxRate / 2) / 100
      const sgstAmt = isInterstate ? 0 : (taxableValue * taxRate / 2) / 100
      const igstAmt = isInterstate ? (taxableValue * taxRate) / 100 : 0
      
      rows.push([
        idx === 0 ? new Date(invoice.invoiceDate).toLocaleDateString('en-IN') : '',
        idx === 0 ? invoice.invoiceNumber : '',
        idx === 0 ? invoice.partyName || invoice.customerName || 'Walk-in Customer' : '',
        idx === 0 ? invoice.partyGSTIN || invoice.customerGSTIN || '' : '',
        idx === 0 ? invoice.placeOfSupply || invoice.customerState || companyInfo?.state || '' : '',
        item.hsnCode || item.hsn || '',
        item.itemName || item.name || '',
        String(item.quantity || item.qty || 1),
        item.unit || 'Nos',
        String(item.rate || item.price || 0),
        taxableValue.toFixed(2),
        taxRate.toFixed(2),
        cgstAmt.toFixed(2),
        sgstAmt.toFixed(2),
        igstAmt.toFixed(2),
        idx === 0 ? (invoice.grandTotal || invoice.total || 0).toFixed(2) : '',
        idx === 0 ? invoice.paymentMode || 'Credit' : ''
      ])
    })
  })
  
  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')
  
  // Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `tally-export-sales-${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportSlowMovingItemsExcel(reportData: any) {
  const wb = XLSX.utils.book_new()
  const ws_data: any[] = []

  // Title
  ws_data.push(['Slow Moving Items - Dead Stock'])
  ws_data.push([`Period: Last ${reportData.period.days} days`])
  ws_data.push(['Showing items with <=10 units sold'])
  ws_data.push([`Generated: ${new Date().toLocaleString()}`])
  ws_data.push([])

  // Summary
  ws_data.push(['SUMMARY'])
  ws_data.push(['Capital Tied Up', `₹${reportData.summary.totalStockValue.toLocaleString('en-IN')}`])
  ws_data.push(['Dead Stock Items', reportData.summary.deadStockCount])
  ws_data.push(['Very Slow Items', reportData.summary.verySlowCount])
  ws_data.push(['Slow Items', reportData.summary.slowCount])
  ws_data.push([])

  // Items Table Header
  ws_data.push(['Rank', 'Item Name', 'SKU', 'Qty Sold (30d)', 'Avg Daily Sale', 'Current Stock', 'Stock Value (₹)', 'Status'])

  // Items Data
  reportData.items.forEach((item: any) => {
    ws_data.push([
      item.rank,
      item.itemName,
      item.sku || 'N/A',
      `${item.quantitySold} ${item.unit}`,
      `${item.avgDailySale} ${item.unit}/day`,
      `${item.currentStock} ${item.unit}`,
      item.stockValue,
      item.status
    ])
  })

  // Alert message
  ws_data.push([])
  if (reportData.summary.deadStockCount > 0) {
    ws_data.push(['ACTION REQUIRED:'])
    ws_data.push([`${reportData.summary.deadStockCount} item(s) have ZERO sales in 30 days!`])
    ws_data.push([`₹${reportData.summary.totalStockValue.toLocaleString('en-IN')} capital is tied up.`])
    ws_data.push(['Consider discounts, promotions, or bundle offers to clear dead stock.'])
  } else {
    ws_data.push(['ATTENTION:'])
    ws_data.push([`These slow-moving items are tying up ₹${reportData.summary.totalStockValue.toLocaleString('en-IN')} in capital.`])
    ws_data.push(['Monitor closely and consider promotions if sales don\'t improve.'])
  }

  const ws = XLSX.utils.aoa_to_sheet(ws_data)

  // Set column widths
  ws['!cols'] = [
    { wch: 6 },  // Rank
    { wch: 30 }, // Item Name
    { wch: 15 }, // SKU
    { wch: 15 }, // Qty Sold
    { wch: 15 }, // Avg Daily
    { wch: 15 }, // Stock
    { wch: 15 }, // Value
    { wch: 12 }  // Status
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Slow Moving Items')

  downloadWorkbook(wb, `slow-moving-items-${new Date().toISOString().split('T')[0]}.xlsx`)
}
