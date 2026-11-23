// Phone helpers. The app's users are in India, so numbers are compared on their
// last 10 digits: "+91 98765 43210", "098765 43210" and "9876543210" all match.

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export function isValidIndianMobile(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(normalizePhone(phone));
}

// Country-code form used by SMS/WhatsApp APIs, e.g. "919876543210"
export function toIndianInternational(phone: string): string {
  return '91' + normalizePhone(phone);
}
