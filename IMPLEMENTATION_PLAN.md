# Complete Invoice System Implementation Plan

## Overview
This document outlines the implementation of a complete invoice management system with AI-powered receipt scanning, Firebase backend, and comprehensive GST compliance.

## Phase 1: Firebase Setup & Database Design ✅

### Firebase Collections Structure

```
/businesses/{businessId}
  - companyName, gstin, address, etc.

/parties/{partyId}
  - type, companyName, gstin, address, contacts, bankDetails, etc.

/items/{itemId}
  - name, hsnCode, price, stock, tax, etc.

/invoices/{invoiceId}
  - type (sale/purchase), invoiceNumber, party, items[], tax, totals, etc.

/settings/{businessId}
  - invoice prefixes, tax settings, defaults, etc.
```

## Phase 2: Enhanced AI Scanner

### What AI Scanner Will Extract:
1. **Seller Details**: Name, Address, GSTIN, State Code
2. **Buyer Details**: Name, Address, GSTIN, State Code
3. **Invoice Info**: Number, Date, Reference Numbers, Vehicle No
4. **Items**: Description, HSN, Quantity, Rate, Amount
5. **Tax**: CGST%, SGST%, Amounts, Round-off
6. **Totals**: Taxable Value, Total Tax, Grand Total

### Auto-Create Logic:
- If party GSTIN exists → Update party details
- If party GSTIN doesn't exist → Create new party
- If item HSN exists → Use existing item
- If item HSN doesn't exist → Create new item
- Auto-calculate all taxes and totals

## Phase 3: Enhanced Forms

### Parties Form (Customer/Supplier)
**Basic Info**:
- Company Name, Display Name, Type
- Contact Person, Phone, Email, Website

**Address**:
- Billing Address (Street, City, State, PIN)
- Shipping Address (with "Same as Billing" checkbox)

**GST & Tax**:
- GSTIN, State Code, PAN, TAN
- GST Type (Regular/Composition/Unregistered)

**Bank Details**:
- Account Name, Number, Bank, IFSC, Branch

**Business Terms**:
- Credit Limit, Credit Days, Payment Terms
- Opening Balance

### Items Form
**Basic**:
- Name, Code, HSN/SAC, Description
- Category, Brand, Unit

**Pricing**:
- Purchase Price, Selling Price, MRP

**Tax**:
- Tax Preference (Taxable/Non-taxable)
- CGST%, SGST%, IGST%, CESS%

**Inventory**:
- Current Stock, Min Stock, Reorder Point

### Invoice Form (Sales/Purchase)
**Party Section**:
- Select/Create Party
- Auto-fill: Address, GSTIN, Phone, Email

**Invoice Details**:
- Invoice No (Auto-generated), Date, Due Date
- Reference No, Buyer Order No, Delivery Note

**Items Section**:
- Add items from inventory OR scan receipt
- Columns: Item, HSN, Qty, Unit, Rate, Disc%, Tax%, Amount
- Auto-calculate taxes based on item tax settings

**Tax Summary**:
- Subtotal, Discount, Taxable Amount
- CGST, SGST, IGST breakdown
- Shipping Charges, Other Charges
- Round Off, Grand Total

**Payment**:
- Mode, Status, Paid Amount, Due Amount
- Transaction ID, Cheque Details

**Transport** (for GST compliance):
- Transporter Name, GSTIN, Vehicle No
- Dispatch Doc, Destination, Bill of Lading

**Terms**:
- Payment Terms, Delivery Terms, Notes

## Phase 4: Tax Calculations

### GST Logic:
```
1. If seller state == buyer state:
   - CGST = (taxable × cgst%) / 100
   - SGST = (taxable × sgst%) / 100
   - IGST = 0

2. If seller state != buyer state:
   - IGST = (taxable × igst%) / 100
   - CGST = 0
   - SGST = 0

3. Taxable Amount = (qty × rate) - discount
4. Total Tax = CGST + SGST + IGST + CESS
5. Item Total = Taxable Amount + Total Tax
6. Grand Total = Sum of all items + shipping - roundoff
```

## Phase 5: AI Integration

### Enhanced Receipt Scanner:
1. **Image Processing**: Use Google Vision API
2. **Data Extraction**: Parse all fields from invoice
3. **Validation**: Check GSTIN format, amounts, etc.
4. **Party Matching**: Find existing party by GSTIN
5. **Item Matching**: Find items by HSN code
6. **Auto-Create**: Create parties/items if not found
7. **Tax Calculation**: Auto-calculate based on state codes
8. **Form Population**: Fill all form fields

### Updated `receiptAI.ts`:
- Extract vendor GSTIN, address, state code
- Extract buyer GSTIN, address, state code
- Extract all invoice reference numbers
- Extract HSN codes for items
- Parse CGST/SGST/IGST percentages and amounts
- Calculate and verify totals

## Phase 6: Reports & Analytics

### GST Reports:
- GSTR-1 (Outward Supplies)
- GSTR-2 (Inward Supplies)
- GSTR-3B (Monthly Return)

### Business Reports:
- Sales Register
- Purchase Register
- Party Ledger
- Item-wise Profit
- Tax Summary

## Implementation Priority

**Phase 1 (Immediate):**
1. ✅ Create comprehensive type definitions
2. 🔄 Setup Firebase config and services
3. Create enhanced AI scanner for complete extraction
4. Update Invoice forms with all fields

**Phase 2 (Next):**
5. Implement auto-create/update logic for parties
6. Add tax calculation engine
7. Create party management with full details
8. Create item management with inventory

**Phase 3 (Final):**
9. Add reports and analytics
10. Implement e-invoice integration
11. Add export features (PDF, Excel)
12. Add backup and data export

## Files to Create/Update

### New Files:
- `/src/types/index.ts` - ✅ Created
- `/src/services/firebase.ts` - Firebase config
- `/src/services/database.ts` - Database operations
- `/src/services/taxCalculations.ts` - GST calculations
- `/src/services/partyService.ts` - Party CRUD
- `/src/services/itemService.ts` - Item CRUD
- `/src/services/invoiceService.ts` - Invoice CRUD
- `/src/components/PartyForm.tsx` - Complete party form
- `/src/components/ItemForm.tsx` - Complete item form
- `/src/components/InvoiceItemRow.tsx` - Item row with tax calc
- `/src/pages/PartyManagement.tsx` - Party list & management
- `/src/pages/ItemManagement.tsx` - Item/inventory management

### Update Files:
- `/src/services/receiptAI.ts` - Enhanced scanner
- `/src/pages/Sales.tsx` - Complete form with all fields
- `/src/pages/Purchases.tsx` - Complete form with all fields
- `/src/components/ReceiptScanner.tsx` - Enhanced UI

## Next Steps

1. User needs to create Firebase project and provide credentials
2. Implement Firebase services and database operations
3. Enhance AI scanner with complete field extraction
4. Update forms with all fields from invoice
5. Test with the sample invoice provided

## Firebase Setup Instructions for User

1. Go to https://console.firebase.google.com/
2. Create new project: "ThisAI CRM"
3. Enable Firestore Database
4. Enable Authentication (Email/Password)
5. Get Firebase config from Project Settings
6. Add config to `.env` file:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```

## Cost Estimate

### Firebase (Spark Plan - FREE):
- Firestore: 1GB storage + 50K reads/day + 20K writes/day
- Authentication: Unlimited
- **Cost**: FREE for small business

### Google Vision API:
- 1,000 scans/month FREE
- After that: $1.50 per 1,000 scans
- **Cost**: FREE to $10/month for most businesses
