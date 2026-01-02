/**
 * Input Validation Utilities
 * Validates and sanitizes user input for different field types
 * Includes XSS protection and comprehensive validation
 */

// SECURITY: Enhanced XSS protection patterns
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
  /expression\s*\(/gi,
  /vbscript:/gi,
  /data:text\/html/gi
]

// SECURITY: Sanitize against XSS attacks
export const sanitizeXSS = (value: string): string => {
  if (!value) return value

  let sanitized = value
  XSS_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '')
  })

  // Additional HTML entity encoding for common dangerous characters
  return sanitized
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

// SECURITY: Validate email format more strictly
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  return emailRegex.test(email) && email.length <= 254 // RFC 5321 limit
}

// SECURITY: Enhanced SQL injection protection (for any potential backend usage)
export const sanitizeSQLInput = (value: string): string => {
  if (!value) return value

  // Remove or escape common SQL injection patterns
  return value
    .replace(/'/g, "''") // Escape single quotes
    .replace(/;/g, '') // Remove semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*.*?\*\//g, '') // Remove multi-line comments
}

// SECURITY: Validate file uploads (for future file upload features)
export const validateFileName = (fileName: string): boolean => {
  // Prevent directory traversal and dangerous file names
  const dangerousPatterns = [
    /\.\./, // Directory traversal
    /^[.-]/, // Hidden files or starting with dash
    /[<>:"\/\\|?*\x00-\x1f]/, // Invalid characters
    /\.(exe|bat|cmd|com|scr|pif|jar|js|vb|wsf|wsh)$/i // Dangerous extensions
  ]

  return !dangerousPatterns.some(pattern => pattern.test(fileName)) &&
         fileName.length > 0 &&
         fileName.length <= 255
}

/**
 * Customer / Party Name Validation
 * - Allow Alphabets: Yes
 * - Allow Numbers: No
 * - Allow Special Characters: Only . ' - and space
 */
export const validateCustomerName = (value: string): string => {
  // SECURITY: First sanitize against XSS
  const sanitized = sanitizeXSS(value)
  // Allow only letters, spaces, and . ' -
  // Note: Don't trim() here as it prevents typing spaces between words
  return sanitized.replace(/[^a-zA-Z\s.'\-]/g, '')
}

/**
 * Business / Shop / Company Name Validation
 * - Allow Alphabets: Yes
 * - Allow Numbers: Yes
 * - Allow Special Characters: Limited (. ' - & , @ # and space)
 */
export const validateBusinessName = (value: string): string => {
  // SECURITY: First sanitize against XSS
  const sanitized = sanitizeXSS(value)
  // Allow letters, numbers, spaces, and limited special chars
  return sanitized.replace(/[^a-zA-Z0-9\s.'\-&,@#()]/g, '').trim()
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
 * Sanitizes and validates email format
 */
export const sanitizeEmail = (value: string): string => {
  // Remove spaces and invalid chars, lowercase
  const sanitized = value.replace(/\s/g, '').toLowerCase()
  return sanitized.slice(0, 254) // RFC 5321 limit
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
  // SECURITY: Use comprehensive XSS sanitization
  return sanitizeXSS(value).trim()
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

/**
 * Password Strength Validation
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export const validatePasswordStrength = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate URL format (for future features)
 */
export const isValidURL = (url: string): boolean => {
  try {
    const urlObj = new URL(url)
    return ['http:', 'https:'].includes(urlObj.protocol)
  } catch {
    return false
  }
}

/**
 * Validate phone number format more strictly
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  const cleaned = validatePhoneNumber(phone)
  // Allow international format or Indian mobile numbers
  const internationalRegex = /^\+\d{1,4}\d{6,14}$/
  const indianMobileRegex = /^[6-9]\d{9}$/

  return internationalRegex.test(cleaned) || indianMobileRegex.test(cleaned.replace(/^\+91/, ''))
}
