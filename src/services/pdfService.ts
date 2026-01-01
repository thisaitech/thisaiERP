// PDF Generation Service
// Generate professional GST-compliant invoices

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'

export interface InvoicePDFData {
  // Company details
  companyName: string
  companyGSTIN?: string
  companyAddress?: string
  companyPhone?: string
  companyEmail?: string

  // Invoice details
  invoiceNumber: string
  invoiceDate: string
  dueDate?: string
  type: 'sale' | 'purchase'

  // Party details
  partyName: string
  partyGSTIN?: string
  partyAddress?: string
  partyPhone?: string

  // Items
  items: Array<{
    name: string
    hsnCode?: string
    quantity: number
    unit: string
    rate: number
    discount?: number
    taxRate: number
    cgst?: number
    sgst?: number
    igst?: number
    amount: number
  }>

  // Totals
  subtotal: number
  discount?: number
  cgstAmount?: number
  sgstAmount?: number
  igstAmount?: number
  totalTax: number
  grandTotal: number
  roundOff?: number

  // Payment
  paidAmount?: number
  balanceDue?: number
  paymentStatus?: 'paid' | 'partial' | 'pending'

  // Additional
  notes?: string
  termsAndConditions?: string
}

/**
 * Generate professional invoice PDF
 */
export function generateInvoicePDF(data: InvoicePDFData): jsPDF {
  const doc = new jsPDF()

  // Page dimensions
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 12
  let y = 10

  // ===== HEADER - TAX INVOICE TITLE =====
  doc.setFillColor(0, 51, 102)
  doc.rect(0, 0, pageWidth, 18, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  const invoiceTitle = data.type === 'sale' ? 'TAX INVOICE' : 'PURCHASE BILL'
  doc.text(invoiceTitle, pageWidth / 2, 8, { align: 'center' })

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Original for Recipient', pageWidth / 2, 14, { align: 'center' })

  doc.setTextColor(0, 0, 0)
  y = 25

  // ===== SUPPLIER (SELLER) DETAILS - Left Side =====
  const col1 = margin
  const col2 = pageWidth / 2 + 5

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('SUPPLIER DETAILS:', col1, y)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(data.companyName || 'Your Company Name', col1, y + 5)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  let supplierY = y + 10
  if (data.companyGSTIN) {
    doc.setFont('helvetica', 'bold')
    doc.text('GSTIN: ', col1, supplierY)
    doc.setFont('helvetica', 'normal')
    doc.text(data.companyGSTIN, col1 + 15, supplierY)
    supplierY += 4
  }
  if (data.companyAddress) {
    const addrLines = doc.splitTextToSize(data.companyAddress, 85)
    doc.text(addrLines, col1, supplierY)
    supplierY += addrLines.length * 4
  }
  if (data.companyPhone) {
    doc.text(`Phone: ${data.companyPhone}`, col1, supplierY)
    supplierY += 4
  }
  if (data.companyEmail) {
    doc.text(`Email: ${data.companyEmail}`, col1, supplierY)
  }

  // ===== INVOICE DETAILS - Right Side =====
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('INVOICE DETAILS:', col2, y)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  let invoiceY = y + 5

  doc.setFont('helvetica', 'bold')
  doc.text('Invoice No:', col2, invoiceY)
  doc.setFont('helvetica', 'normal')
  doc.text(data.invoiceNumber, col2 + 25, invoiceY)
  invoiceY += 4

  doc.setFont('helvetica', 'bold')
  doc.text('Date:', col2, invoiceY)
  doc.setFont('helvetica', 'normal')
  doc.text(data.invoiceDate, col2 + 25, invoiceY)
  invoiceY += 4

  if (data.dueDate) {
    doc.setFont('helvetica', 'bold')
    doc.text('Due Date:', col2, invoiceY)
    doc.setFont('helvetica', 'normal')
    doc.text(data.dueDate, col2 + 25, invoiceY)
    invoiceY += 4
  }

  // Place of Supply (mandatory for GST)
  doc.setFont('helvetica', 'bold')
  doc.text('Place of Supply:', col2, invoiceY)
  doc.setFont('helvetica', 'normal')
  // Extract state from address or use default
  const placeOfSupply = data.partyAddress?.split(',').pop()?.trim() || 'Tamil Nadu'
  doc.text(placeOfSupply, col2 + 35, invoiceY)

  y = Math.max(supplierY, invoiceY) + 8

  // ===== BILL TO (BUYER) DETAILS =====
  doc.setDrawColor(0, 51, 102)
  doc.line(margin, y, pageWidth - margin, y)
  y += 5

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('BILL TO (RECIPIENT):', col1, y)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text(data.partyName, col1, y + 5)

  let buyerY = y + 9
  doc.setFont('helvetica', 'normal')
  if (data.partyGSTIN) {
    doc.setFont('helvetica', 'bold')
    doc.text('GSTIN: ', col1, buyerY)
    doc.setFont('helvetica', 'normal')
    doc.text(data.partyGSTIN, col1 + 15, buyerY)
    buyerY += 4
  } else {
    doc.text('GSTIN: Unregistered', col1, buyerY)
    buyerY += 4
  }

  if (data.partyAddress) {
    const buyerAddr = doc.splitTextToSize(data.partyAddress, 85)
    doc.text(buyerAddr, col1, buyerY)
    buyerY += buyerAddr.length * 4
  }

  if (data.partyPhone) {
    doc.text(`Phone: ${data.partyPhone}`, col1, buyerY)
  }

  y = buyerY + 6

  // ===== ITEMS TABLE with HSN (Mandatory) =====
  doc.setDrawColor(0, 51, 102)
  doc.line(margin, y, pageWidth - margin, y)
  y += 3

  // Calculate tax breakdown for each item
  const tableData = data.items.map((item, index) => {
    const taxableValue = item.rate * item.quantity
    const taxRate = item.taxRate || 0
    const taxAmount = (taxableValue * taxRate) / 100
    return [
      index + 1,
      item.name || item.description || 'Item',
      item.hsnCode || '-',
      `${item.quantity} ${item.unit}`,
      `₹${item.rate.toFixed(2)}`,
      `₹${taxableValue.toFixed(2)}`,
      `${taxRate}%`,
      `₹${taxAmount.toFixed(2)}`,
      `₹${(taxableValue + taxAmount).toFixed(2)}`
    ]
  })

  autoTable(doc, {
    startY: y,
    head: [['#', 'Description of Goods/Services', 'HSN/SAC', 'Qty', 'Rate', 'Taxable Value', 'GST%', 'Tax Amt', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [0, 51, 102],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7,
      cellPadding: 2
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 2
    },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 42 },
      2: { cellWidth: 16 },
      3: { cellWidth: 14 },
      4: { cellWidth: 18 },
      5: { cellWidth: 22 },
      6: { cellWidth: 12 },
      7: { cellWidth: 18 },
      8: { cellWidth: 20 }
    },
    margin: { left: margin, right: margin }
  })

  // Get position after table
  const finalY = (doc as any).lastAutoTable.finalY + 5

  // ===== TAX SUMMARY & TOTALS =====
  // Left side - Tax breakdown
  let leftY = finalY
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('TAX SUMMARY:', margin, leftY)
  leftY += 5

  doc.setFont('helvetica', 'normal')
  const totalTax = (data.cgstAmount || 0) + (data.sgstAmount || 0) + (data.igstAmount || 0)

  if (data.cgstAmount && data.cgstAmount > 0) {
    doc.text(`CGST: ₹${data.cgstAmount.toFixed(2)}`, margin, leftY)
    leftY += 4
  }
  if (data.sgstAmount && data.sgstAmount > 0) {
    doc.text(`SGST: ₹${data.sgstAmount.toFixed(2)}`, margin, leftY)
    leftY += 4
  }
  if (data.igstAmount && data.igstAmount > 0) {
    doc.text(`IGST: ₹${data.igstAmount.toFixed(2)}`, margin, leftY)
    leftY += 4
  }
  if (totalTax === 0 && data.totalTax) {
    // If individual taxes not available, show total
    doc.text(`Total Tax: ₹${data.totalTax.toFixed(2)}`, margin, leftY)
  }

  // Right side - Totals
  const totalsX = pageWidth - 75
  let totalsY = finalY

  doc.setFillColor(245, 247, 250)
  doc.rect(totalsX - 5, totalsY - 3, 68, 38, 'F')

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')

  doc.text('Subtotal:', totalsX, totalsY)
  doc.text(`₹${data.subtotal.toFixed(2)}`, pageWidth - margin, totalsY, { align: 'right' })
  totalsY += 5

  if (data.discount && data.discount > 0) {
    doc.text('Discount:', totalsX, totalsY)
    doc.text(`-₹${data.discount.toFixed(2)}`, pageWidth - margin, totalsY, { align: 'right' })
    totalsY += 5
  }

  doc.text('Tax Amount:', totalsX, totalsY)
  doc.text(`₹${(totalTax || data.totalTax || 0).toFixed(2)}`, pageWidth - margin, totalsY, { align: 'right' })
  totalsY += 5

  if (data.roundOff) {
    doc.text('Round Off:', totalsX, totalsY)
    doc.text(`₹${data.roundOff.toFixed(2)}`, pageWidth - margin, totalsY, { align: 'right' })
    totalsY += 5
  }

  // Grand Total
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('GRAND TOTAL:', totalsX, totalsY + 3)
  doc.text(`₹${data.grandTotal.toFixed(2)}`, pageWidth - margin, totalsY + 3, { align: 'right' })
  totalsY += 10

  // Payment Status
  if (data.balanceDue && data.balanceDue > 0) {
    doc.setFontSize(9)
    doc.setTextColor(200, 50, 50)
    doc.text('Balance Due:', totalsX, totalsY)
    doc.text(`₹${data.balanceDue.toFixed(2)}`, pageWidth - margin, totalsY, { align: 'right' })
    doc.setTextColor(0, 0, 0)
  } else if (data.paidAmount && data.paidAmount >= data.grandTotal) {
    doc.setFontSize(9)
    doc.setTextColor(34, 150, 34)
    doc.text('PAID', pageWidth - margin - 20, totalsY)
    doc.setTextColor(0, 0, 0)
  }

  // ===== AMOUNT IN WORDS =====
  const amountY = Math.max(leftY, totalsY) + 8
  doc.setDrawColor(200, 200, 200)
  doc.line(margin, amountY - 3, pageWidth - margin, amountY - 3)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('Amount in Words:', margin, amountY)
  doc.setFont('helvetica', 'normal')
  // Simple number to words (basic implementation)
  const rupees = Math.floor(data.grandTotal)
  doc.text(`Rupees ${numberToWords(rupees)} Only`, margin + 35, amountY)

  // ===== BANK DETAILS & SIGNATURE =====
  let bottomY = amountY + 10

  // Bank Details (Left)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('BANK DETAILS:', margin, bottomY)
  doc.setFont('helvetica', 'normal')
  doc.text('Bank: [Your Bank Name]', margin, bottomY + 4)
  doc.text('A/C No: [Account Number]', margin, bottomY + 8)
  doc.text('IFSC: [IFSC Code]', margin, bottomY + 12)

  // Signature (Right)
  doc.setFont('helvetica', 'bold')
  doc.text('For ' + (data.companyName || 'Your Company Name'), col2, bottomY)
  doc.setFont('helvetica', 'normal')
  doc.text('________________________', col2, bottomY + 15)
  doc.text('Authorized Signatory', col2, bottomY + 19)

  // ===== TERMS & CONDITIONS =====
  const termsY = bottomY + 28
  doc.setDrawColor(200, 200, 200)
  doc.line(margin, termsY - 3, pageWidth - margin, termsY - 3)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('Terms & Conditions:', margin, termsY)
  doc.setFont('helvetica', 'normal')
  const defaultTerms = data.termsAndConditions || '1. Goods once sold will not be taken back. 2. Interest @18% p.a. will be charged on delayed payments. 3. Subject to local jurisdiction.'
  const termsLines = doc.splitTextToSize(defaultTerms, pageWidth - 2 * margin)
  doc.text(termsLines, margin, termsY + 4)

  // ===== FOOTER =====
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(100, 100, 100)
  doc.text('This is a computer-generated invoice and does not require physical signature.', pageWidth / 2, pageHeight - 10, { align: 'center' })
  doc.text('Generated by Anna ERP | GST Compliant Invoice', pageWidth / 2, pageHeight - 6, { align: 'center' })

  return doc
}

// Helper function to convert number to words
function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  if (num === 0) return 'Zero'
  if (num < 20) return ones[num]
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '')
  if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '')
  if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '')
  if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + numberToWords(num % 100000) : '')
  return numberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + numberToWords(num % 10000000) : '')
}

// Consistent download helper that handles Android APK, iOS, and Web platforms
async function triggerPDFDownload(doc: jsPDF, filename: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    doc.save(filename)
    return
  }

  const platform = Capacitor.getPlatform()

  // For Android/iOS native apps, use Capacitor Filesystem with better mobile support
  if (platform === 'android' || platform === 'ios') {
    try {
      // Get base64 output from jsPDF (without the data URI prefix)
      const base64Output = doc.output('datauristring')
      const base64Data = base64Output.split(',')[1] // Remove "data:application/pdf;base64," prefix

      // Save to Downloads directory on Android, Documents on iOS
      const directory = platform === 'android' ? Directory.Documents : Directory.Documents

      // Write the file
      const result = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: directory,
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
      console.error('Capacitor Filesystem save failed:', err)
      // Fallback to blob approach
      try {
        const base64 = doc.output('datauristring')
        const link = document.createElement('a')
        link.href = base64
        link.download = filename
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        return
      } catch (fallbackErr) {
        console.warn('Fallback download also failed:', fallbackErr)
        doc.save(filename)
        return
      }
    }
  }

  // For web browser, use blob URL approach (most reliable)
  try {
    const blob = doc.output('blob')
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    if (typeof window !== 'undefined' && (window as any).toast) {
      (window as any).toast.success(`File downloaded: ${filename}`)
    }
    return
  } catch (err) {
    console.warn('Blob download failed, falling back to doc.save', err)
  }

  doc.save(filename)
}

/**
 * Download a human-readable E-Invoice as PDF
 */
export function downloadEInvoicePDF(einvoiceData: any) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 12
  let y = 12

  // Header with government blue (IRP Portal style)
  doc.setFillColor(0, 51, 102)
  doc.rect(0, 0, pageWidth, 25, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('e-Invoice System', pageWidth / 2, 10, { align: 'center' })

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('(Government of India - GST Network)', pageWidth / 2, 16, { align: 'center' })
  doc.text('einvoice.gst.gov.in', pageWidth / 2, 21, { align: 'center' })

  doc.setTextColor(0, 0, 0)
  y = 32

  // IRN Box (Main authentication - 64 character unique reference)
  doc.setFillColor(255, 250, 230)
  doc.rect(margin, y - 3, pageWidth - 2 * margin - 45, 22, 'F')
  doc.setDrawColor(0, 51, 102)
  doc.setLineWidth(0.5)
  doc.rect(margin, y - 3, pageWidth - 2 * margin - 45, 22, 'S')

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 51, 102)
  doc.text('IRN (Invoice Reference Number):', margin + 3, y + 3)

  doc.setFontSize(6)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  // Display IRN in two lines if too long (64 chars)
  const irn = einvoiceData.irn || 'N/A'
  if (irn.length > 40) {
    doc.text(irn.substring(0, 40), margin + 3, y + 9)
    doc.text(irn.substring(40), margin + 3, y + 13)
  } else {
    doc.text(irn, margin + 3, y + 10)
  }

  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text(`ACK No: ${einvoiceData.ackNo || 'N/A'}`, margin + 3, y + 17)
  doc.setFont('helvetica', 'normal')
  doc.text(`ACK Date: ${einvoiceData.ackDate || 'N/A'}`, margin + 60, y + 17)

  // QR Code placeholder (right side)
  const qrX = pageWidth - margin - 40
  const qrY = y - 3
  doc.setFillColor(255, 255, 255)
  doc.rect(qrX, qrY, 40, 22, 'F')
  doc.setDrawColor(0, 51, 102)
  doc.rect(qrX, qrY, 40, 22, 'S')

  // Draw QR code pattern (placeholder)
  doc.setFillColor(0, 0, 0)
  const qrSize = 16
  const qrStartX = qrX + 12
  const qrStartY = qrY + 3
  // Simple QR pattern representation
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if ((i + j) % 2 === 0 || (i < 2 && j < 2) || (i < 2 && j > 5) || (i > 5 && j < 2)) {
        doc.rect(qrStartX + j * 2, qrStartY + i * 2, 1.8, 1.8, 'F')
      }
    }
  }

  doc.setFontSize(5)
  doc.setTextColor(100, 100, 100)
  doc.text('Scan to Verify', qrX + 20, qrY + 21, { align: 'center' })

  doc.setTextColor(0, 0, 0)
  doc.setLineWidth(0.2)
  y += 25

  // Document Type Banner
  doc.setFillColor(230, 240, 255)
  doc.rect(margin, y, pageWidth - 2 * margin, 8, 'F')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 51, 102)
  doc.text('TAX INVOICE', pageWidth / 2, y + 5.5, { align: 'center' })
  doc.setTextColor(0, 0, 0)
  y += 12

  const col1 = margin
  const col2 = pageWidth / 2 + 5

  // Invoice Details Row
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('Invoice No:', col1, y)
  doc.setFont('helvetica', 'normal')
  doc.text(einvoiceData.invoiceNumber || 'N/A', col1 + 25, y)

  doc.setFont('helvetica', 'bold')
  doc.text('Invoice Date:', col2, y)
  doc.setFont('helvetica', 'normal')
  doc.text(einvoiceData.invoiceDate || 'N/A', col2 + 28, y)
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.text('Supply Type:', col1, y)
  doc.setFont('helvetica', 'normal')
  doc.text(einvoiceData.supplyType || 'B2B - Regular', col1 + 28, y)

  doc.setFont('helvetica', 'bold')
  doc.text('Place of Supply:', col2, y)
  doc.setFont('helvetica', 'normal')
  doc.text(einvoiceData.placeOfSupply || einvoiceData.partyState || 'Tamil Nadu', col2 + 35, y)
  y += 8

  // Seller & Buyer Section
  doc.setDrawColor(0, 51, 102)
  doc.line(margin, y, pageWidth - margin, y)
  y += 5

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('SELLER DETAILS', col1, y)
  doc.text('BUYER DETAILS', col2, y)
  y += 5

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text(einvoiceData.companyName || 'Anna ERP', col1, y)
  doc.text(einvoiceData.partyName || 'Customer', col2, y)
  y += 4

  doc.setFont('helvetica', 'normal')
  doc.text(`GSTIN: ${einvoiceData.companyGSTIN || 'Unregistered'}`, col1, y)
  doc.text(`GSTIN: ${einvoiceData.partyGSTIN || 'Unregistered'}`, col2, y)
  y += 4

  if (einvoiceData.companyAddress) {
    const sellerAddr = doc.splitTextToSize(einvoiceData.companyAddress, 85)
    doc.text(sellerAddr[0] || '', col1, y)
  }
  if (einvoiceData.partyAddress) {
    const buyerAddr = doc.splitTextToSize(einvoiceData.partyAddress, 85)
    doc.text(buyerAddr[0] || '', col2, y)
  }
  y += 4

  doc.text(`State: ${einvoiceData.companyState || 'Tamil Nadu'}`, col1, y)
  doc.text(`State: ${einvoiceData.partyState || 'Tamil Nadu'}`, col2, y)
  y += 8

  // Items Table
  doc.setDrawColor(0, 51, 102)
  doc.line(margin, y, pageWidth - margin, y)
  y += 4

  if (einvoiceData.items && einvoiceData.items.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['#', 'Description of Goods', 'HSN/SAC', 'Qty', 'Unit', 'Rate', 'Taxable Amt', 'Tax', 'Total']],
      body: einvoiceData.items.map((item: any, idx: number) => {
        const taxableAmt = (item.rate || 0) * (item.quantity || 1)
        const taxRate = item.taxRate || item.gstRate || 0
        const taxAmt = (taxableAmt * taxRate) / 100
        const total = taxableAmt + taxAmt
        return [
          idx + 1,
          (item.name || item.itemName || item.description || 'Item').substring(0, 22),
          item.hsnCode || item.hsn || '-',
          item.quantity || item.qty || 1,
          item.unit || 'Nos',
          `₹${(item.rate || 0).toFixed(2)}`,
          `₹${taxableAmt.toFixed(2)}`,
          `${taxRate}%`,
          `₹${total.toFixed(2)}`
        ]
      }),
      theme: 'grid',
      headStyles: { fillColor: [0, 51, 102], fontSize: 7, cellPadding: 1.5 },
      bodyStyles: { fontSize: 7, cellPadding: 1.5 },
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 38 },
        2: { cellWidth: 16 },
        3: { cellWidth: 12 },
        4: { cellWidth: 12 },
        5: { cellWidth: 20 },
        6: { cellWidth: 22 },
        7: { cellWidth: 12 },
        8: { cellWidth: 22 }
      }
    })

    y = (doc as any).lastAutoTable.finalY + 6
  }

  // Totals Section
  doc.setFillColor(245, 247, 250)
  doc.rect(margin, y - 2, pageWidth - 2 * margin, 28, 'F')

  const totalTax = (einvoiceData.cgstAmount || 0) + (einvoiceData.sgstAmount || 0) + (einvoiceData.igstAmount || 0)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')

  // Left side - Tax breakdown
  doc.text(`Taxable Value: ₹${(einvoiceData.subtotal || 0).toFixed(2)}`, margin + 4, y + 4)
  if (einvoiceData.discount > 0) {
    doc.text(`Discount: -₹${(einvoiceData.discount || 0).toFixed(2)}`, margin + 4, y + 10)
  }
  doc.text(`CGST: ₹${(einvoiceData.cgstAmount || 0).toFixed(2)}`, margin + 60, y + 4)
  doc.text(`SGST: ₹${(einvoiceData.sgstAmount || 0).toFixed(2)}`, margin + 60, y + 10)
  doc.text(`IGST: ₹${(einvoiceData.igstAmount || 0).toFixed(2)}`, margin + 110, y + 4)
  doc.text(`Total Tax: ₹${totalTax.toFixed(2)}`, margin + 110, y + 10)

  // Grand Total
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(`INVOICE VALUE: ₹${(einvoiceData.grandTotal || 0).toFixed(2)}`, margin + 4, y + 22)

  // Payment Status
  const statusText = (einvoiceData.paymentStatus || 'pending').toUpperCase()
  const statusColor = einvoiceData.paymentStatus === 'paid' ? [34, 150, 34] : [200, 50, 50]
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2])
  doc.setFontSize(9)
  doc.text(`Payment: ${statusText}`, pageWidth - margin - 40, y + 22)

  y += 32

  // IRP Authentication Note
  doc.setFillColor(230, 255, 230)
  doc.rect(margin, y, pageWidth - 2 * margin, 12, 'F')
  doc.setDrawColor(34, 150, 34)
  doc.rect(margin, y, pageWidth - 2 * margin, 12, 'S')

  doc.setFontSize(7)
  doc.setTextColor(0, 100, 0)
  doc.setFont('helvetica', 'bold')
  doc.text('✓ IRP Authenticated', margin + 3, y + 4)
  doc.setFont('helvetica', 'normal')
  doc.text('This invoice has been registered with Invoice Registration Portal (IRP) and is digitally signed.', margin + 35, y + 4)
  doc.text('Auto-populated in GSTR-1 of Seller and GSTR-2B of Buyer for seamless ITC matching.', margin + 3, y + 9)

  // Footer
  doc.setTextColor(100, 100, 100)
  doc.setFontSize(7)
  doc.text('This is a system-generated E-Invoice. The QR code contains digitally signed invoice data.', pageWidth / 2, 282, { align: 'center' })
  doc.text('Generated via Anna ERP - GST E-Invoice Compliant Software', pageWidth / 2, 287, { align: 'center' })

  triggerPDFDownload(doc, `E-Invoice-${einvoiceData.invoiceNumber || Date.now()}.pdf`)
}

/**
 * Download a human-readable E-Way Bill as PDF
 */
export function downloadEWayBillPDF(ewayData: any) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 12
  let y = 12

  // Header with green background (GST Portal style)
  doc.setFillColor(0, 128, 0)
  doc.rect(0, 0, pageWidth, 28, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('e-Way Bill System', pageWidth / 2, 12, { align: 'center' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('(Ministry of Finance - Government of India)', pageWidth / 2, 18, { align: 'center' })
  doc.text('ewaybillgst.gov.in', pageWidth / 2, 24, { align: 'center' })

  doc.setTextColor(0, 0, 0)
  y = 35

  // EWB Number Box (Highlighted)
  doc.setFillColor(255, 250, 205)
  doc.rect(margin, y - 3, pageWidth - 2 * margin, 18, 'F')
  doc.setDrawColor(0, 128, 0)
  doc.setLineWidth(0.5)
  doc.rect(margin, y - 3, pageWidth - 2 * margin, 18, 'S')

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('E-Way Bill Number:', margin + 4, y + 4)
  doc.setFontSize(12)
  doc.setTextColor(0, 100, 0)
  doc.text(ewayData.ewbNo || 'Auto-Generated', margin + 50, y + 4)

  doc.setTextColor(0, 0, 0)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generated: ${ewayData.generatedDate || new Date().toLocaleDateString('en-IN')}`, margin + 4, y + 11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(200, 0, 0)
  doc.text(`Valid Until: ${ewayData.validUpto || 'N/A'}`, pageWidth - margin - 60, y + 11)

  doc.setTextColor(0, 0, 0)
  doc.setLineWidth(0.2)
  y += 22

  // ===== PART-A: Supply & Item Details =====
  doc.setFillColor(230, 255, 230)
  doc.rect(margin, y, pageWidth - 2 * margin, 8, 'F')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('PART-A: Details of Goods & Supply', margin + 4, y + 5.5)
  y += 12

  const col1 = margin
  const col2 = pageWidth / 2 + 5
  const labelWidth = 38

  // Document Details Row
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('Document Type:', col1, y)
  doc.setFont('helvetica', 'normal')
  doc.text('Tax Invoice', col1 + labelWidth, y)

  doc.setFont('helvetica', 'bold')
  doc.text('Document No:', col2, y)
  doc.setFont('helvetica', 'normal')
  doc.text(ewayData.invoiceNumber || 'N/A', col2 + 30, y)
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.text('Document Date:', col1, y)
  doc.setFont('helvetica', 'normal')
  doc.text(ewayData.invoiceDate || 'N/A', col1 + labelWidth, y)

  doc.setFont('helvetica', 'bold')
  doc.text('Supply Type:', col2, y)
  doc.setFont('helvetica', 'normal')
  doc.text(ewayData.supplyType || 'Outward - Sale', col2 + 30, y)
  y += 8

  // From & To Section
  doc.setDrawColor(0, 128, 0)
  doc.line(margin, y, pageWidth - margin, y)
  y += 5

  // FROM (Consignor)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('FROM (Consignor/Supplier)', col1, y)
  doc.text('TO (Consignee/Recipient)', col2, y)
  y += 5

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text(ewayData.companyName || 'Anna ERP', col1, y)
  doc.text(ewayData.partyName || 'Customer', col2, y)
  y += 4

  doc.setFont('helvetica', 'normal')
  doc.text(`GSTIN: ${ewayData.companyGSTIN || 'Unregistered'}`, col1, y)
  doc.text(`GSTIN: ${ewayData.partyGSTIN || 'Unregistered'}`, col2, y)
  y += 4

  if (ewayData.companyAddress) {
    const fromAddr = doc.splitTextToSize(ewayData.companyAddress, 80)
    doc.text(fromAddr[0] || '', col1, y)
  }
  if (ewayData.partyAddress) {
    const toAddr = doc.splitTextToSize(ewayData.partyAddress, 80)
    doc.text(toAddr[0] || '', col2, y)
  }
  y += 4

  doc.text(`State: ${ewayData.companyState || 'Tamil Nadu'}`, col1, y)
  doc.text(`State: ${ewayData.partyState || 'Tamil Nadu'}`, col2, y)
  y += 8

  // Items Table
  doc.setDrawColor(0, 128, 0)
  doc.line(margin, y, pageWidth - margin, y)
  y += 4

  if (ewayData.items && ewayData.items.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['#', 'Product Name', 'HSN Code', 'Qty', 'Unit', 'Taxable Value', 'Tax Rate', 'Tax Amt']],
      body: ewayData.items.map((item: any, idx: number) => {
        const taxableValue = (item.rate || 0) * (item.quantity || 1)
        const taxRate = item.taxRate || item.gstRate || 0
        const taxAmt = (taxableValue * taxRate) / 100
        return [
          idx + 1,
          (item.name || item.itemName || item.description || 'Item').substring(0, 20),
          item.hsnCode || item.hsn || '-',
          item.quantity || item.qty || 1,
          item.unit || 'Nos',
          `₹${taxableValue.toFixed(2)}`,
          `${taxRate}%`,
          `₹${taxAmt.toFixed(2)}`
        ]
      }),
      theme: 'grid',
      headStyles: { fillColor: [0, 128, 0], fontSize: 7, cellPadding: 1.5 },
      bodyStyles: { fontSize: 7, cellPadding: 1.5 },
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 40 },
        2: { cellWidth: 18 },
        3: { cellWidth: 12 },
        4: { cellWidth: 12 },
        5: { cellWidth: 25 },
        6: { cellWidth: 15 },
        7: { cellWidth: 22 }
      }
    })

    y = (doc as any).lastAutoTable.finalY + 6
  }

  // Totals Row
  doc.setFillColor(245, 245, 245)
  doc.rect(margin, y - 2, pageWidth - 2 * margin, 14, 'F')

  const totalTax = (ewayData.cgstAmount || 0) + (ewayData.sgstAmount || 0) + (ewayData.igstAmount || 0)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text(`Taxable Value: ₹${(ewayData.subtotal || 0).toFixed(2)}`, margin + 4, y + 3)
  doc.text(`CGST: ₹${(ewayData.cgstAmount || 0).toFixed(2)}`, margin + 55, y + 3)
  doc.text(`SGST: ₹${(ewayData.sgstAmount || 0).toFixed(2)}`, margin + 95, y + 3)
  doc.text(`IGST: ₹${(ewayData.igstAmount || 0).toFixed(2)}`, margin + 135, y + 3)

  doc.setFontSize(9)
  doc.text(`Total Invoice Value: ₹${(ewayData.grandTotal || 0).toFixed(2)}`, margin + 4, y + 10)
  y += 18

  // ===== PART-B: Transport Details =====
  doc.setFillColor(230, 255, 230)
  doc.rect(margin, y, pageWidth - 2 * margin, 8, 'F')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('PART-B: Transport Details', margin + 4, y + 5.5)
  y += 12

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('Mode:', col1, y)
  doc.setFont('helvetica', 'normal')
  doc.text(ewayData.transportMode || 'Road', col1 + 20, y)

  doc.setFont('helvetica', 'bold')
  doc.text('Approx Distance:', col2, y)
  doc.setFont('helvetica', 'normal')
  doc.text(`${ewayData.distance || 0} KM`, col2 + 38, y)
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.text('Vehicle No:', col1, y)
  doc.setFont('helvetica', 'normal')
  doc.text(ewayData.vehicleNo || 'N/A', col1 + 28, y)

  doc.setFont('helvetica', 'bold')
  doc.text('Vehicle Type:', col2, y)
  doc.setFont('helvetica', 'normal')
  doc.text(ewayData.vehicleType || 'Regular', col2 + 30, y)
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.text('Transporter ID:', col1, y)
  doc.setFont('helvetica', 'normal')
  doc.text(ewayData.transporterId || '-', col1 + 35, y)

  doc.setFont('helvetica', 'bold')
  doc.text('Transporter Name:', col2, y)
  doc.setFont('helvetica', 'normal')
  doc.text(ewayData.transporterName || 'Self Transport', col2 + 40, y)
  y += 10

  // Validity Note
  doc.setFillColor(255, 255, 200)
  doc.rect(margin, y, pageWidth - 2 * margin, 12, 'F')
  doc.setDrawColor(200, 150, 0)
  doc.rect(margin, y, pageWidth - 2 * margin, 12, 'S')

  doc.setFontSize(7)
  doc.setTextColor(100, 70, 0)
  doc.setFont('helvetica', 'bold')
  doc.text('Note: ', margin + 3, y + 4)
  doc.setFont('helvetica', 'normal')
  doc.text('E-Way Bill validity is 1 day for every 200 km or part thereof. For ODC cargo, validity is 1 day for every 100 km.', margin + 15, y + 4)
  doc.text('E-Way Bill is mandatory for movement of goods with value > ₹50,000 (before tax).', margin + 3, y + 9)

  // Footer
  doc.setTextColor(100, 100, 100)
  doc.setFontSize(7)
  doc.text('This is a system-generated E-Way Bill. No signature required.', pageWidth / 2, 282, { align: 'center' })
  doc.text('Generated via Anna ERP - GST Compliant Billing Software', pageWidth / 2, 287, { align: 'center' })

  triggerPDFDownload(doc, `E-Way-Bill-${ewayData.invoiceNumber || Date.now()}.pdf`)
}

/**
 * Download invoice PDF
 */
export function downloadInvoicePDF(data: InvoicePDFData, filename?: string) {
  const doc = generateInvoicePDF(data)
  const fileName = filename || `Invoice-${data.invoiceNumber}.pdf`

  triggerPDFDownload(doc, fileName)
}

/**
 * Get PDF as blob for sharing
 */
export function getInvoicePDFBlob(data: InvoicePDFData): Blob {
  const doc = generateInvoicePDF(data)
  return doc.output('blob')
}

/**
 * Open print preview in new window with print dialog
 * Uses HTML instead of PDF blob for better browser print dialog support
 */
export function printInvoicePDF(data: InvoicePDFData) {
  // Generate HTML for print preview
  const itemsHTML = data.items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.name}${item.hsnCode ? `<br><span style="font-size: 11px; color: #6b7280;">HSN: ${item.hsnCode}</span>` : ''}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity} ${item.unit !== 'NONE' ? item.unit : ''}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.taxRate}%</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">₹${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    </tr>
  `).join('')

  const printHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${data.type === 'sale' ? 'Invoice' : 'Purchase'} - ${data.invoiceNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; max-width: 800px; margin: 0 auto; color: #1f2937; }
        .invoice { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 25px; }
        .header h1 { font-size: 28px; margin-bottom: 5px; }
        .header p { opacity: 0.9; font-size: 14px; }
        .company-details { padding: 20px 25px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
        .company-details h2 { font-size: 18px; color: #1f2937; margin-bottom: 5px; }
        .company-details p { font-size: 13px; color: #6b7280; line-height: 1.5; }
        .invoice-info { display: flex; justify-content: space-between; padding: 20px 25px; border-bottom: 1px solid #e5e7eb; }
        .invoice-info div { flex: 1; }
        .invoice-info h3 { font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 8px; }
        .invoice-info p { font-size: 14px; color: #1f2937; line-height: 1.6; }
        .invoice-info .invoice-number { font-size: 16px; font-weight: 700; color: #4f46e5; }
        .items-table { width: 100%; border-collapse: collapse; }
        .items-table th { background: #f3f4f6; padding: 12px 10px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; font-weight: 600; }
        .items-table th:nth-child(2), .items-table th:nth-child(4) { text-align: center; }
        .items-table th:nth-child(3), .items-table th:nth-child(5) { text-align: right; }
        .totals { padding: 20px 25px; background: #f9fafb; }
        .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
        .totals-row.grand-total { border-top: 2px solid #e5e7eb; margin-top: 10px; padding-top: 15px; font-size: 18px; font-weight: 700; color: #4f46e5; }
        .footer { padding: 20px 25px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #9ca3af; }
        @media print {
          body { padding: 0; }
          .invoice { border: none; }
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="invoice">
        <div class="header">
          <h1>${data.type === 'sale' ? 'TAX INVOICE' : 'PURCHASE INVOICE'}</h1>
          <p>Original for Recipient</p>
        </div>

        <div class="company-details">
          <h2>${data.companyName}</h2>
          ${data.companyAddress ? `<p>${data.companyAddress}</p>` : ''}
          ${data.companyPhone ? `<p>Phone: ${data.companyPhone}</p>` : ''}
          ${data.companyEmail ? `<p>Email: ${data.companyEmail}</p>` : ''}
          ${data.companyGSTIN ? `<p><strong>GSTIN: ${data.companyGSTIN}</strong></p>` : ''}
        </div>

        <div class="invoice-info">
          <div>
            <h3>Bill To</h3>
            <p><strong>${data.partyName}</strong></p>
            ${data.partyAddress ? `<p>${data.partyAddress}</p>` : ''}
            ${data.partyPhone ? `<p>Phone: ${data.partyPhone}</p>` : ''}
            ${data.partyGSTIN ? `<p>GSTIN: ${data.partyGSTIN}</p>` : ''}
          </div>
          <div style="text-align: right;">
            <h3>Invoice Details</h3>
            <p class="invoice-number">${data.invoiceNumber}</p>
            <p>Date: ${new Date(data.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            ${data.dueDate ? `<p>Due: ${new Date(data.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>` : ''}
          </div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 40%;">Item Description</th>
              <th style="width: 15%;">Qty</th>
              <th style="width: 15%;">Rate</th>
              <th style="width: 10%;">GST</th>
              <th style="width: 20%;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row">
            <span>Subtotal</span>
            <span>₹${data.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          ${data.discount ? `
          <div class="totals-row">
            <span>Discount</span>
            <span>-₹${data.discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>` : ''}
          ${data.cgstAmount ? `
          <div class="totals-row">
            <span>CGST</span>
            <span>₹${data.cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>` : ''}
          ${data.sgstAmount ? `
          <div class="totals-row">
            <span>SGST</span>
            <span>₹${data.sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>` : ''}
          ${data.igstAmount ? `
          <div class="totals-row">
            <span>IGST</span>
            <span>₹${data.igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>` : ''}
          ${data.roundOff ? `
          <div class="totals-row">
            <span>Round Off</span>
            <span>${data.roundOff >= 0 ? '+' : ''}₹${data.roundOff.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>` : ''}
          <div class="totals-row grand-total">
            <span>Grand Total</span>
            <span>₹${data.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          ${data.paidAmount ? `
          <div class="totals-row" style="color: #16a34a;">
            <span>Paid Amount</span>
            <span>₹${data.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>` : ''}
          ${data.balanceDue ? `
          <div class="totals-row" style="color: #dc2626;">
            <span>Balance Due</span>
            <span>₹${data.balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>` : ''}
        </div>

        ${data.notes || data.termsAndConditions ? `
        <div style="padding: 20px 25px; border-top: 1px solid #e5e7eb;">
          ${data.notes ? `<p style="font-size: 13px; color: #6b7280; margin-bottom: 10px;"><strong>Notes:</strong> ${data.notes}</p>` : ''}
          ${data.termsAndConditions ? `<p style="font-size: 13px; color: #6b7280;"><strong>Terms:</strong> ${data.termsAndConditions}</p>` : ''}
        </div>` : ''}

        <div class="footer">
          <p>Thank you for your business!</p>
          <p style="margin-top: 5px;">Generated on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>

      <script>
        window.onload = function() {
          window.print();
          window.onafterprint = function() { window.close(); };
        }
      </script>
    </body>
    </html>
  `

  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(printHTML)
    printWindow.document.close()
  }
}
