/**
 * Input Validation Utilities
 * Validates and sanitizes user input for different field types
 */

/**
 * Customer / Party Name Validation
 * - Allow Alphabets: Yes
 * - Allow Numbers: No
 * - Allow Special Characters: Only . ' - and space
 */
export const validateCustomerName = (value: string): string => {
  // Allow only letters, spaces, and . ' -
  return value.replace(/[^a-zA-Z\s.'\-]/g, '')
}

/**
 * Business / Shop / Company Name Validation
 * - Allow Alphabets: Yes
 * - Allow Numbers: Yes
 * - Allow Special Characters: Limited (. ' - & , @ # and space)
 */
export const validateBusinessName = (value: string): string => {
  // Allow letters, numbers, spaces, and limited special chars
  return value.replace(/[^a-zA-Z0-9\s.'\-&,@#()]/g, '')
}

/**
 * Item / Product Name Validation
 * - Allow Alphabets: Yes
 * - Allow Numbers: Yes
 * - Allow Special Characters: Limited (. ' - & , / # () and space)
 */
export const validateItemName = (value: string): string => {
  // Allow letters, numbers, spaces, and limited special chars
  return value.replace(/[^a-zA-Z0-9\s.'\-&,/#()]/g, '')
}

/**
 * Phone Number Validation
 * - Allow + at the beginning for international codes
 * - Allow only digits after +
 * - Max 15 characters total (international standard)
 */
export const validatePhoneNumber = (value: string): string => {
  // Allow + only at the start, then only digits
  const hasPlus = value.startsWith('+')
  const digits = value.replace(/\D/g, '').slice(0, 15)
  return hasPlus ? '+' + digits : digits
}

/**
 * GSTIN Validation
 * - Allow alphanumeric only
 * - Max 15 characters
 * - Uppercase
 */
export const validateGSTIN = (value: string): string => {
  // Allow only alphanumeric, uppercase, max 15 chars
  return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 15)
}

/**
 * Email Validation Helper
 * Just sanitizes - doesn't validate format
 */
export const sanitizeEmail = (value: string): string => {
  // Remove spaces and invalid chars, lowercase
  return value.replace(/\s/g, '').toLowerCase()
}

/**
 * HSN Code Validation
 * - Allow only digits
 * - Max 8 digits
 */
export const validateHSNCode = (value: string): string => {
  return value.replace(/\D/g, '').slice(0, 8)
}

/**
 * Barcode Validation
 * - Allow alphanumeric and hyphens
 */
export const validateBarcode = (value: string): string => {
  return value.replace(/[^a-zA-Z0-9\-]/g, '')
}

/**
 * Pincode Validation (Indian)
 * - Allow only digits
 * - Max 6 digits
 */
export const validatePincode = (value: string): string => {
  return value.replace(/\D/g, '').slice(0, 6)
}

/**
 * Notes / Description Validation
 * - Allow most characters but filter out potentially harmful ones
 */
export const validateNotes = (value: string): string => {
  // Allow most chars but remove < > to prevent XSS
  return value.replace(/[<>]/g, '')
}

/**
 * Check if customer name is valid (has at least 2 letters)
 */
export const isValidCustomerName = (value: string): boolean => {
  const cleaned = validateCustomerName(value).trim()
  const letterCount = (cleaned.match(/[a-zA-Z]/g) || []).length
  return letterCount >= 2
}

/**
 * Check if business name is valid (has at least 2 characters)
 */
export const isValidBusinessName = (value: string): boolean => {
  const cleaned = validateBusinessName(value).trim()
  return cleaned.length >= 2
}

/**
 * Check if item name is valid (has at least 2 characters)
 */
export const isValidItemName = (value: string): boolean => {
  const cleaned = validateItemName(value).trim()
  return cleaned.length >= 2
}
