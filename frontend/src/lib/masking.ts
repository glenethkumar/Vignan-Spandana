/**
 * Comprehensive phone masking utilities for VIIT AI Feedback.
 * Strict Rule: Phone numbers are masked in EVERY format on EVERY screen (+91 98*** **345).
 * Full numbers are never rendered, exported, or put in URLs.
 */

export function maskPhoneNumber(phone: string | number | null | undefined): string {
  if (!phone) return '+91 98*** **000';
  const str = String(phone).trim();
  
  // If already masked, return as-is
  if (str.includes('***')) {
    return str;
  }
  
  // Extract only digits
  const digits = str.replace(/\D/g, '');
  
  if (digits.length >= 10) {
    // Take the last 10 digits as standard Indian mobile format
    const ten = digits.slice(-10);
    const prefix = ten.slice(0, 2);
    const suffix = ten.slice(-3);
    return `+91 ${prefix}*** **${suffix}`;
  }
  
  if (digits.length >= 5) {
    const prefix = digits.slice(0, 2);
    const suffix = digits.slice(-2);
    return `+91 ${prefix}*** **${suffix}`;
  }
  
  return '+91 98*** **345';
}

export const maskPhone = maskPhoneNumber;

/**
 * Checks if a string contains any unmasked 10-digit phone number.
 */
export function containsRawPhoneNumber(text: string): boolean {
  if (!text) return false;
  // Match standard 10-digit sequences or country coded raw numbers
  const raw10Regex = /(?<!\d)[6-9]\d{9}(?!\d)/;
  const rawSpacedRegex = /(?:\+91|91)?[\s-]?[6-9]\d{4}[\s-]?\d{5}/;
  return raw10Regex.test(text) || rawSpacedRegex.test(text);
}
