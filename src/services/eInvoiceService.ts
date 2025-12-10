// E-Invoice Service - IRN Generation and E-Invoice Integration
// Integrates with NIC/GSP APIs for e-invoice generation

export interface EInvoiceConfig {
  gspProvider: 'NIC' | 'ClearTax' | 'MasterGST' | 'Sandbox'
  apiKey: string
  username: string
  password: string
  gstin: string
  sandboxMode: boolean
}

export interface IRNResponse {
  success: boolean
  irn?: string
  ackNo?: string
  ackDate?: string
  signedInvoice?: string
  signedQRCode?: string
  error?: string
  errorCode?: string
}

export interface EInvoiceData {
  // Transaction Details
  supplyType: 'B2B' | 'B2C' | 'SEZWP' | 'SEZWOP' | 'EXPWP' | 'EXPWOP'
  documentType: 'INV' | 'CRN' | 'DBN'
  documentNumber: string
  documentDate: string

  // Seller Details
  sellerGSTIN: string
  sellerLegalName: string
  sellerTradeName: string
  sellerAddress1: string
  sellerAddress2?: string
  sellerLocation: string
  sellerPincode: number
  sellerStateCode: string

  // Buyer Details
  buyerGSTIN?: string
  buyerLegalName: string
  buyerTradeName?: string
  buyerAddress1: string
  buyerAddress2?: string
  buyerLocation: string
  buyerPincode: number
  buyerStateCode: string
  buyerPhone?: string
  buyerEmail?: string

  // Dispatch Details (if different from seller)
  dispatchFromGSTIN?: string
  dispatchFromName?: string
  dispatchFromAddress1?: string
  dispatchFromLocation?: string
  dispatchFromPincode?: number
  dispatchFromStateCode?: string

  // Ship To Details (if different from buyer)
  shipToGSTIN?: string
  shipToLegalName?: string
  shipToAddress1?: string
  shipToLocation?: string
  shipToPincode?: number
  shipToStateCode?: string

  // Items
  items: Array<{
    itemNumber: number
    productName: string
    productDescription: string
    hsn: string
    quantity: number
    unit: string
    unitPrice: number
    totalAmount: number
    discount: number
    taxableValue: number
    gstRate: number
    igstAmount: number
    cgstAmount: number
    sgstAmount: number
    cessRate?: number
    cessAmount?: number
    totalItemValue: number
  }>

  // Invoice Totals
  totalAssessableValue: number
  totalCGST: number
  totalSGST: number
  totalIGST: number
  totalCess: number
  totalInvoiceValue: number
  roundOffAmount?: number

  // Additional Details
  reverseCharge: 'Y' | 'N'
  placeOfSupply: string
  transportMode?: string
  transportDistance?: number
  transporterId?: string
  transporterName?: string
  vehicleNumber?: string
  vehicleType?: 'R' | 'O' // Regular or ODC
}

/**
 * Generate IRN (Invoice Reference Number) for e-invoice
 * This is a MOCK implementation for demonstration
 * In production, this will call actual NIC/GSP API
 */
export async function generateIRN(
  config: EInvoiceConfig,
  invoiceData: EInvoiceData
): Promise<IRNResponse> {
  // In sandbox/demo mode, generate mock IRN
  if (config.sandboxMode || config.gspProvider === 'Sandbox') {
    return generateMockIRN(invoiceData)
  }

  // Production implementation would go here
  try {
    // Step 1: Authenticate with GSP
    const authToken = await authenticateWithGSP(config)

    // Step 2: Prepare JSON payload
    const payload = prepareEInvoicePayload(invoiceData)

    // Step 3: Call IRN generation API
    const response = await callGSPAPI(config, authToken, payload)

    // Step 4: Parse and return response
    return parseIRNResponse(response)
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      errorCode: error.code
    }
  }
}

/**
 * Mock IRN generation for testing/sandbox
 */
function generateMockIRN(invoiceData: EInvoiceData): IRNResponse {
  // Generate mock IRN (64-character hash)
  const irn = generateMockHash()

  // Generate mock acknowledgement number
  const ackNo = `ACK${Date.now()}`

  // Generate mock signed QR code
  const qrData = `${invoiceData.sellerGSTIN}|${invoiceData.buyerGSTIN || ''}|${invoiceData.documentNumber}|${invoiceData.documentDate}|${invoiceData.totalInvoiceValue}|${irn}`
  const signedQRCode = btoa(qrData) // Base64 encode

  return {
    success: true,
    irn: irn,
    ackNo: ackNo,
    ackDate: new Date().toISOString(),
    signedInvoice: JSON.stringify(invoiceData),
    signedQRCode: signedQRCode
  }
}

/**
 * Generate mock 64-character hash for IRN
 */
function generateMockHash(): string {
  const chars = '0123456789abcdef'
  let hash = ''
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)]
  }
  return hash
}

/**
 * Authenticate with GSP (Actual API call in production)
 */
async function authenticateWithGSP(config: EInvoiceConfig): Promise<string> {
  // This would make actual API call to GSP
  // For now, return mock token
  return 'mock_auth_token_' + Date.now()
}

/**
 * Prepare e-invoice JSON payload according to NIC schema
 */
function prepareEInvoicePayload(invoiceData: EInvoiceData): any {
  return {
    Version: '1.1',
    TranDtls: {
      TaxSch: 'GST',
      SupTyp: invoiceData.supplyType,
      RegRev: 'N',
      EcmGstin: null,
      IgstOnIntra: 'N'
    },
    DocDtls: {
      Typ: invoiceData.documentType,
      No: invoiceData.documentNumber,
      Dt: invoiceData.documentDate.split('T')[0].replace(/-/g, '/')
    },
    SellerDtls: {
      Gstin: invoiceData.sellerGSTIN,
      LglNm: invoiceData.sellerLegalName,
      TrdNm: invoiceData.sellerTradeName,
      Addr1: invoiceData.sellerAddress1,
      Addr2: invoiceData.sellerAddress2 || '',
      Loc: invoiceData.sellerLocation,
      Pin: invoiceData.sellerPincode,
      Stcd: invoiceData.sellerStateCode
    },
    BuyerDtls: {
      Gstin: invoiceData.buyerGSTIN || 'URP',
      LglNm: invoiceData.buyerLegalName,
      TrdNm: invoiceData.buyerTradeName || invoiceData.buyerLegalName,
      Pos: invoiceData.buyerStateCode,
      Addr1: invoiceData.buyerAddress1,
      Addr2: invoiceData.buyerAddress2 || '',
      Loc: invoiceData.buyerLocation,
      Pin: invoiceData.buyerPincode,
      Stcd: invoiceData.buyerStateCode,
      Ph: invoiceData.buyerPhone,
      Em: invoiceData.buyerEmail
    },
    ItemList: invoiceData.items.map(item => ({
      SlNo: String(item.itemNumber),
      PrdDesc: item.productDescription,
      IsServc: 'N',
      HsnCd: item.hsn,
      Qty: item.quantity,
      Unit: item.unit,
      UnitPrice: item.unitPrice,
      TotAmt: item.totalAmount,
      Discount: item.discount,
      AssAmt: item.taxableValue,
      GstRt: item.gstRate,
      IgstAmt: item.igstAmount,
      CgstAmt: item.cgstAmount,
      SgstAmt: item.sgstAmount,
      CesRt: item.cessRate || 0,
      CesAmt: item.cessAmount || 0,
      CesNonAdvlAmt: 0,
      StateCesRt: 0,
      StateCesAmt: 0,
      StateCesNonAdvlAmt: 0,
      OthChrg: 0,
      TotItemVal: item.totalItemValue
    })),
    ValDtls: {
      AssVal: invoiceData.totalAssessableValue,
      CgstVal: invoiceData.totalCGST,
      SgstVal: invoiceData.totalSGST,
      IgstVal: invoiceData.totalIGST,
      CesVal: invoiceData.totalCess,
      StCesVal: 0,
      Discount: 0,
      OthChrg: 0,
      RndOffAmt: invoiceData.roundOffAmount || 0,
      TotInvVal: invoiceData.totalInvoiceValue,
      TotInvValFc: invoiceData.totalInvoiceValue
    }
  }
}

/**
 * Call GSP API to generate IRN (Actual API call in production)
 */
async function callGSPAPI(
  config: EInvoiceConfig,
  authToken: string,
  payload: any
): Promise<any> {
  // This would make actual HTTP request to GSP
  // Different GSPs have different endpoints:
  // - NIC: https://einv-apisandbox.nic.in/
  // - ClearTax: https://einvoicing.internal.cleartax.co/
  // - MasterGST: https://api.mastergst.com/

  throw new Error('Production API not implemented. Use sandbox mode for testing.')
}

/**
 * Parse IRN response from GSP
 */
function parseIRNResponse(response: any): IRNResponse {
  if (response.status === 'Success') {
    return {
      success: true,
      irn: response.Irn,
      ackNo: response.AckNo,
      ackDate: response.AckDt,
      signedInvoice: response.SignedInvoice,
      signedQRCode: response.SignedQRCode
    }
  } else {
    return {
      success: false,
      error: response.ErrorMsg,
      errorCode: response.ErrorCode
    }
  }
}

/**
 * Cancel IRN
 */
export async function cancelIRN(
  config: EInvoiceConfig,
  irn: string,
  reason: string,
  remarks: string
): Promise<{ success: boolean; message: string }> {
  if (config.sandboxMode) {
    return {
      success: true,
      message: `IRN ${irn} cancelled successfully (SANDBOX)`
    }
  }

  // Production implementation would call actual API
  throw new Error('Production API not implemented. Use sandbox mode for testing.')
}

/**
 * Get IRN details
 */
export async function getIRNDetails(
  config: EInvoiceConfig,
  irn: string
): Promise<any> {
  if (config.sandboxMode) {
    return {
      success: true,
      irn: irn,
      status: 'Active',
      message: 'Mock IRN details (SANDBOX)'
    }
  }

  // Production implementation would call actual API
  throw new Error('Production API not implemented. Use sandbox mode for testing.')
}

/**
 * Convert invoice data to e-invoice format
 */
export function convertToEInvoiceData(invoice: any, companyDetails: any): EInvoiceData {
  const isInterstate = invoice.partyStateCode !== invoice.billingStateCode

  return {
    supplyType: invoice.partyGSTIN ? 'B2B' : 'B2C',
    documentType: 'INV',
    documentNumber: invoice.invoiceNumber,
    documentDate: invoice.invoiceDate,

    // Seller
    sellerGSTIN: companyDetails.gstin,
    sellerLegalName: companyDetails.legalName,
    sellerTradeName: companyDetails.tradeName || companyDetails.legalName,
    sellerAddress1: companyDetails.address,
    sellerLocation: companyDetails.city,
    sellerPincode: parseInt(companyDetails.pincode),
    sellerStateCode: companyDetails.stateCode,

    // Buyer
    buyerGSTIN: invoice.partyGSTIN,
    buyerLegalName: invoice.partyName,
    buyerAddress1: invoice.shippingAddress || invoice.billingAddress,
    buyerLocation: invoice.shippingCity || invoice.billingCity,
    buyerPincode: parseInt(invoice.shippingPinCode || invoice.billingPinCode || '000000'),
    buyerStateCode: invoice.partyStateCode || invoice.billingStateCode,
    buyerPhone: invoice.partyPhone,
    buyerEmail: invoice.partyEmail,

    // Items
    items: invoice.items.map((item: any, index: number) => {
      const taxAmount = item.tax || 0
      return {
        itemNumber: index + 1,
        productName: item.description,
        productDescription: item.description,
        hsn: item.hsn || '000000',
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.rate,
        totalAmount: item.amount,
        discount: item.discount || 0,
        taxableValue: item.amount,
        gstRate: item.taxRate || 18,
        igstAmount: isInterstate ? taxAmount : 0,
        cgstAmount: isInterstate ? 0 : taxAmount / 2,
        sgstAmount: isInterstate ? 0 : taxAmount / 2,
        cessAmount: 0,
        totalItemValue: item.amount + taxAmount
      }
    }),

    // Totals
    totalAssessableValue: invoice.subtotal,
    totalCGST: isInterstate ? 0 : invoice.taxAmount / 2,
    totalSGST: isInterstate ? 0 : invoice.taxAmount / 2,
    totalIGST: isInterstate ? invoice.taxAmount : 0,
    totalCess: 0,
    totalInvoiceValue: invoice.grandTotal,
    roundOffAmount: invoice.roundOff || 0,

    // Additional
    reverseCharge: 'N',
    placeOfSupply: invoice.partyStateCode || invoice.billingStateCode
  }
}
