# CRM Application - Test Scenarios Checklist

## How to Use This Document
- Go through each section and test the scenarios listed
- Mark with [x] for PASS, [ ] for FAIL
- Note any issues in the "Issues Found" section at the bottom

---

## 1. AUTHENTICATION & LOGIN

### 1.1 Login Page
- [ ] Login page loads correctly
- [ ] Email field accepts valid email format
- [ ] Password field masks input
- [ ] "Show password" toggle works (if available)
- [ ] Login with valid credentials - redirects to Dashboard
- [ ] Login with invalid credentials - shows error message
- [ ] Login with empty fields - shows validation error
- [ ] "Forgot Password" link works (if available)
- [ ] Session persists after page refresh
- [ ] Logout functionality works correctly

### 1.2 Role-Based Access
- [ ] Admin can access all pages
- [ ] Manager cannot access Settings page
- [ ] Staff cannot access Purchases, Expenses, Parties, Inventory, Reports, Banking, Utilities
- [ ] Unauthorized access redirects to Dashboard or shows error

---

## 2. DASHBOARD

### 2.1 Overview Display
- [ ] Dashboard loads without errors
- [ ] Today's sales amount displays correctly
- [ ] Today's purchases amount displays correctly
- [ ] Total receivables/payables show
- [ ] Recent transactions list loads
- [ ] Charts/graphs render properly
- [ ] Date filter works (if available)

### 2.2 Quick Actions
- [ ] Quick action buttons work (New Sale, New Purchase, etc.)
- [ ] Navigation to other modules works

### 2.3 Mobile Responsiveness
- [ ] Dashboard displays correctly on mobile
- [ ] Cards stack properly
- [ ] Touch interactions work

---

## 3. SALES MODULE

### 3.1 View Sales
- [ ] Sales list loads correctly
- [ ] Pagination works (if applicable)
- [ ] Search by invoice number works
- [ ] Search by party name works
- [ ] Date filter works
- [ ] Payment status filter works (Paid/Unpaid/Partial)

### 3.2 Create New Sale
- [ ] "New Sale" button opens form/modal
- [ ] Party dropdown loads existing parties
- [ ] Can add new party inline
- [ ] Invoice number auto-generates
- [ ] Invoice date defaults to today
- [ ] Due date can be set
- [ ] Item search works (by name)
- [ ] Item search works (by barcode)
- [ ] Barcode scanner works (if using camera)
- [ ] Adding item populates price, tax
- [ ] Quantity field accepts numbers
- [ ] Unit dropdown works
- [ ] Tax mode toggle (With GST/Without GST) works
- [ ] MRP/Price field editable
- [ ] Discount % applies correctly
- [ ] GST % applies correctly
- [ ] Tax amount calculates correctly
- [ ] Total calculates correctly (Qty x Price - Discount + Tax)
- [ ] Can add multiple items
- [ ] Can remove items
- [ ] Subtotal shows sum of all items
- [ ] Bill-level discount works
- [ ] Round off works
- [ ] Grand total is correct
- [ ] Payment type selection works (Cash/Card/UPI/Credit/Bank/Cheque)
- [ ] Multiple payment methods (split payment) works
- [ ] Amount paid field works
- [ ] Balance due shows correctly
- [ ] Notes field works
- [ ] Save button creates invoice
- [ ] Success message shows
- [ ] Invoice appears in list

### 3.3 Edit Sale
- [ ] Edit button opens existing invoice
- [ ] All fields are populated correctly
- [ ] Can modify items, quantities, prices
- [ ] Can add new items to existing invoice
- [ ] Save updates the invoice
- [ ] Changes reflect in the list

### 3.4 Delete Sale
- [ ] Delete button shows confirmation
- [ ] Confirming deletes the invoice
- [ ] Invoice removed from list

### 3.5 Print/Export
- [ ] Print invoice works
- [ ] PDF download works
- [ ] Share via WhatsApp works (if available)
- [ ] Invoice preview looks correct

### 3.6 Quick Edit Modal
- [ ] Quick edit opens for existing invoice
- [ ] Can modify basic fields
- [ ] Save works correctly

### 3.7 Sales Return
- [ ] Return option available on invoices
- [ ] Can select items to return
- [ ] Return quantity validation (not more than original)
- [ ] Return amount calculates correctly
- [ ] Original invoice updates after return
- [ ] Returned indicator shows on invoice card

---

## 4. PURCHASES MODULE

### 4.1 View Purchases
- [ ] Purchase list loads correctly
- [ ] Search by bill number works
- [ ] Search by supplier name works
- [ ] Date filter works
- [ ] Payment status filter works

### 4.2 Create New Purchase
- [ ] "New Purchase" button opens form
- [ ] Supplier dropdown loads
- [ ] Can add new supplier inline
- [ ] Bill number field works
- [ ] Bill date can be set
- [ ] Item search works
- [ ] Barcode scanner works
- [ ] Adding items works correctly
- [ ] Tax calculations are correct
- [ ] Multiple items can be added
- [ ] Totals calculate correctly
- [ ] Payment method selection works
- [ ] Save creates purchase bill
- [ ] Stock updates automatically (if linked to inventory)

### 4.3 Edit Purchase
- [ ] Edit opens existing purchase
- [ ] Can modify all fields
- [ ] Save updates correctly

### 4.4 Delete Purchase
- [ ] Delete confirmation shows
- [ ] Purchase is removed

### 4.5 Purchase Return (Debit Note)
- [ ] Return option works
- [ ] Can select return quantities
- [ ] Original bill amount reduces
- [ ] Return history tracked
- [ ] "Returned" indicator shows on card

### 4.6 Quick Edit Modal
- [ ] Quick edit opens
- [ ] Can add new items
- [ ] Can modify existing items
- [ ] Save works

---

## 5. QUOTATIONS MODULE

### 5.1 View Quotations
- [ ] List loads correctly
- [ ] Search works
- [ ] Date filter works
- [ ] Status filter works (if available)

### 5.2 Create Quotation
- [ ] New quotation form opens
- [ ] Party selection works
- [ ] Items can be added
- [ ] Totals calculate correctly
- [ ] Validity date can be set
- [ ] Terms & conditions field works
- [ ] Save creates quotation

### 5.3 Convert to Invoice
- [ ] Convert to Sale option works
- [ ] Data transfers correctly to Sales

### 5.4 Edit/Delete
- [ ] Edit works
- [ ] Delete works

### 5.5 Print/Share
- [ ] Print works
- [ ] PDF download works
- [ ] WhatsApp share works

---

## 6. PARTIES (Customers/Suppliers)

### 6.1 View Parties
- [ ] Party list loads
- [ ] Tab switching (Customers/Suppliers/All) works
- [ ] Search by name works
- [ ] Search by phone works
- [ ] Filter by balance (receivable/payable) works

### 6.2 Create Party
- [ ] Add party form opens
- [ ] Name field required
- [ ] Phone number validation
- [ ] Email validation
- [ ] GSTIN validation (if applicable)
- [ ] Address fields work
- [ ] Opening balance can be set
- [ ] Party type (Customer/Supplier/Both) works
- [ ] Save creates party

### 6.3 Edit Party
- [ ] Edit opens existing party
- [ ] All fields editable
- [ ] Save updates party

### 6.4 Delete Party
- [ ] Delete confirmation shows
- [ ] Party is removed
- [ ] Check if party with transactions can be deleted (should warn)

### 6.5 Party Statement
- [ ] View statement button works
- [ ] Transaction history shows
- [ ] Balance is correct
- [ ] Date filter works
- [ ] Print statement works

### 6.6 Payment In/Out
- [ ] Receive payment from customer works
- [ ] Make payment to supplier works
- [ ] Balance updates correctly

---

## 7. INVENTORY MODULE

### 7.1 View Items
- [ ] Item list loads
- [ ] Search by name works
- [ ] Search by barcode/SKU works
- [ ] Category filter works
- [ ] Stock status filter (low stock, out of stock) works

### 7.2 Create Item
- [ ] Add item form opens
- [ ] Name field required
- [ ] SKU/Barcode field works
- [ ] HSN code field works
- [ ] Category dropdown works
- [ ] Unit selection works
- [ ] Purchase price field works
- [ ] Sale price field works
- [ ] MRP field works
- [ ] GST rate selection works
- [ ] Opening stock can be set
- [ ] Low stock alert level works
- [ ] Save creates item

### 7.3 Edit Item
- [ ] Edit opens existing item
- [ ] All fields editable
- [ ] Save updates item

### 7.4 Delete Item
- [ ] Delete confirmation shows
- [ ] Item is removed

### 7.5 Stock Adjustment
- [ ] Stock adjustment option available
- [ ] Can increase/decrease stock
- [ ] Reason can be noted
- [ ] Stock history updates

### 7.6 Barcode
- [ ] Barcode print works (if available)
- [ ] Barcode scanning adds item (in Sales/Purchases)

---

## 8. EXPENSES MODULE

### 8.1 View Expenses
- [ ] Expense list loads
- [ ] Date filter works
- [ ] Category filter works
- [ ] Search works

### 8.2 Create Expense
- [ ] Add expense form opens
- [ ] Date field works
- [ ] Category dropdown works
- [ ] Amount field works
- [ ] Payment method works
- [ ] Notes field works
- [ ] Attachment upload works (if available)
- [ ] Save creates expense

### 8.3 Edit/Delete
- [ ] Edit works
- [ ] Delete works

### 8.4 Expense Categories
- [ ] Can add new categories
- [ ] Categories appear in dropdown

---

## 9. BANKING MODULE

### 9.1 View Bank Accounts
- [ ] Bank account list loads
- [ ] Balance shows correctly

### 9.2 Add Bank Account
- [ ] Add account form opens
- [ ] Bank name field works
- [ ] Account number field works
- [ ] IFSC code field works
- [ ] Opening balance works
- [ ] Save creates account

### 9.3 Transactions
- [ ] Transaction list loads for account
- [ ] Deposit works
- [ ] Withdrawal works
- [ ] Transfer between accounts works
- [ ] Balance updates correctly

### 9.4 Bank Reconciliation
- [ ] Reconciliation feature works (if available)

---

## 10. REPORTS MODULE

### 10.1 Sales Reports
- [ ] Sales report loads
- [ ] Date range filter works
- [ ] Party filter works
- [ ] Export to Excel/PDF works
- [ ] Totals are correct

### 10.2 Purchase Reports
- [ ] Purchase report loads
- [ ] Filters work
- [ ] Export works

### 10.3 Profit & Loss
- [ ] P&L report loads
- [ ] Calculations are correct
- [ ] Date range filter works

### 10.4 GST Reports
- [ ] GSTR-1 data loads
- [ ] GSTR-3B summary works
- [ ] HSN summary works
- [ ] Export for filing works

### 10.5 Stock Reports
- [ ] Stock summary loads
- [ ] Stock valuation correct
- [ ] Low stock items highlighted

### 10.6 Party Reports
- [ ] Outstanding receivables report works
- [ ] Outstanding payables report works
- [ ] Aging report works (if available)

### 10.7 Day Book
- [ ] Day book shows all transactions
- [ ] Date filter works

---

## 11. UTILITIES MODULE

### 11.1 Data Import
- [ ] Import from Excel works
- [ ] Import from Tally works (if available)
- [ ] Field mapping works
- [ ] Preview before import works
- [ ] Import completes without errors

### 11.2 Data Export
- [ ] Export to Excel works
- [ ] Export to Tally format works
- [ ] All data included

### 11.3 Backup
- [ ] Backup creation works
- [ ] Backup download works
- [ ] Restore from backup works

---

## 12. SETTINGS MODULE

### 12.1 Business Profile
- [ ] Business name editable
- [ ] Address editable
- [ ] Phone/Email editable
- [ ] GSTIN editable
- [ ] Logo upload works
- [ ] Save updates profile

### 12.2 Invoice Settings
- [ ] Invoice prefix editable
- [ ] Starting number editable
- [ ] Invoice template selection works
- [ ] Terms & conditions editable
- [ ] Show/hide fields toggle works

### 12.3 Tax Settings
- [ ] GST rates configurable
- [ ] Tax calculation mode works

### 12.4 User Management
- [ ] User list loads
- [ ] Add new user works
- [ ] Role assignment works (Admin/Manager/Staff)
- [ ] Edit user works
- [ ] Deactivate user works
- [ ] Password reset works

### 12.5 Payment/Subscription
- [ ] Current plan shows
- [ ] Upgrade option works
- [ ] Payment history shows

### 12.6 Language Settings
- [ ] Language switch works (English/Tamil)
- [ ] All text translates correctly

### 12.7 Theme Settings
- [ ] Theme color selection works
- [ ] Dark/Light mode works (if available)

---

## 13. GENERAL UI/UX

### 13.1 Navigation
- [ ] Sidebar navigation works
- [ ] All menu items clickable
- [ ] Active state shows correctly
- [ ] Mobile bottom navigation works

### 13.2 Responsiveness
- [ ] Desktop view works (1920px)
- [ ] Tablet view works (768px)
- [ ] Mobile view works (375px)
- [ ] No horizontal scroll on mobile
- [ ] Touch interactions smooth

### 13.3 Loading States
- [ ] Loading spinners show during API calls
- [ ] Skeleton loaders work (if used)
- [ ] No blank screens during loading

### 13.4 Error Handling
- [ ] API errors show user-friendly messages
- [ ] Network offline shows indicator
- [ ] Form validation errors clear and visible

### 13.5 Toasts/Notifications
- [ ] Success messages appear
- [ ] Error messages appear
- [ ] Toast auto-dismisses
- [ ] Toast can be manually dismissed

---

## 14. OFFLINE FUNCTIONALITY

### 14.1 Offline Mode
- [ ] App works offline
- [ ] Offline indicator shows
- [ ] Can create sales/purchases offline
- [ ] Data syncs when online

### 14.2 Sync
- [ ] Sync status indicator works
- [ ] Manual sync button works
- [ ] No data loss during sync

---

## 15. PERFORMANCE

### 15.1 Page Load
- [ ] Dashboard loads < 3 seconds
- [ ] Lists load < 2 seconds
- [ ] No JavaScript errors in console

### 15.2 Forms
- [ ] No lag when typing
- [ ] Dropdowns open quickly
- [ ] Save operations < 2 seconds

---

## 16. SECURITY

### 16.1 Authentication
- [ ] Protected routes require login
- [ ] Token expires after inactivity
- [ ] No sensitive data in localStorage (check browser)

### 16.2 Authorization
- [ ] Role-based access enforced
- [ ] Cannot access other user's data via URL manipulation

---

## ISSUES FOUND

| # | Module | Issue Description | Severity | Status |
|---|--------|-------------------|----------|--------|
| 1 |        |                   |          |        |
| 2 |        |                   |          |        |
| 3 |        |                   |          |        |
| 4 |        |                   |          |        |
| 5 |        |                   |          |        |

### Severity Levels:
- **Critical**: App crashes, data loss, security issue
- **High**: Feature not working, major UX issue
- **Medium**: Feature works but with issues
- **Low**: Minor UI/cosmetic issues

---

## TEST SUMMARY

| Module | Total Tests | Passed | Failed | Not Tested |
|--------|-------------|--------|--------|------------|
| Authentication | | | | |
| Dashboard | | | | |
| Sales | | | | |
| Purchases | | | | |
| Quotations | | | | |
| Parties | | | | |
| Inventory | | | | |
| Expenses | | | | |
| Banking | | | | |
| Reports | | | | |
| Utilities | | | | |
| Settings | | | | |
| General UI | | | | |
| Offline | | | | |
| Performance | | | | |
| Security | | | | |
| **TOTAL** | | | | |

---

## SIGN-OFF

**Tested By:** _____________________

**Date:** _____________________

**Overall Status:** [ ] Ready for Production  [ ] Needs Fixes

**Notes:**
