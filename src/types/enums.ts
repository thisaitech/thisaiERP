
// This file contains all the enums used in the application's types.

export enum PartyType {
  CUSTOMER = 'customer',
  SUPPLIER = 'supplier',
  BOTH = 'both',
}

export enum GSTType {
  REGULAR = 'Regular',
  COMPOSITION = 'Composition',
  UNREGISTERED = 'Unregistered',
}

export enum AccountType {
  SAVINGS = 'Savings',
  CURRENT = 'Current',
}

export enum ItemTaxPreference {
  TAXABLE = 'taxable',
  NON_TAXABLE = 'non-taxable',
}

export enum TaxMode {
  INCLUSIVE = 'inclusive',
  EXCLUSIVE = 'exclusive',
}

export enum ItemUnit {
  NONE = 'NONE',
  KGS = 'KGS',
  PCS = 'PCS',
  LTRS = 'LTRS',
  MTR = 'MTR',
  SET = 'SET',
  BOX = 'BOX',
  PACK = 'PACK',
}

export enum PaymentMode {
  CASH = 'cash',
  CARD = 'card',
  UPI = 'upi',
  BANK = 'bank',
  CHEQUE = 'cheque',
  CREDIT = 'credit',
}

export enum PaymentInfoStatus {
  PAID = 'paid',
  PARTIAL = 'partial',
  UNPAID = 'unpaid',
}

export enum InvoiceType {
  SALE = 'sale',
  CREDIT = 'credit',
}

export enum InvoiceSource {
  POS = 'pos',
  INVOICE = 'invoice',
  AI = 'ai',
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  APPROVED = 'approved',
  SENT = 'sent',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

export enum Platform {
  AMAZON = 'amazon',
  FLIPKART = 'flipkart',
  MEESHO = 'meesho',
  SHOPIFY = 'shopify',
  WEBSITE = 'website',
  OFFLINE = 'offline',
  OTHER = 'other',
}

export enum PaymentStatus {
  PAID = 'paid',
  PARTIAL = 'partial',
  PENDING = 'pending',
  OVERDUE = 'overdue',
  RETURNED = 'returned',
}

export enum CreditNoteType {
    CREDIT = 'credit',
    DEBIT = 'debit'
}

export enum CreditNoteReason {
    RETURN = 'return',
    DISCOUNT = 'discount',
    ERROR_CORRECTION = 'error_correction',
    DAMAGE = 'damage',
    OTHER = 'other'
}

export enum CreditNoteAdjustmentType {
    REFUND = 'refund',
    ADJUST_BALANCE = 'adjust_balance',
    REPLACE = 'replace'
}

export enum RefundMode {
    CASH = 'cash',
    BANK = 'bank',
    UPI = 'upi',
    CARD = 'card'
}

export enum CreditNoteStatus {
    DRAFT = 'draft',
    APPROVED = 'approved',
    CANCELLED = 'cancelled'
}

export enum SalesReturnReason {
    DEFECTIVE = 'defective',
    WRONG_ITEM = 'wrong_item',
    CUSTOMER_REQUEST = 'customer_request',
    DAMAGED = 'damaged',
    OTHER = 'other'
}

export enum SalesReturnAction {
    REFUND = 'refund',
    REPLACEMENT = 'replacement',
    STORE_CREDIT = 'store_credit'
}

export enum SalesReturnStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    COMPLETED = 'completed',
    REJECTED = 'rejected'
}

export enum PlanTypeEnum {
    SILVER = 'silver',
    GOLD = 'gold'
}

export enum InvoiceTabType {
    SALE = 'sale',
    CREDIT = 'credit'
}

export enum InvoiceTabMode {
    INVOICE = 'invoice',
    POS = 'pos'
}
