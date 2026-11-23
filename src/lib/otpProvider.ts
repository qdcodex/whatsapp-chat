// Server-only 2Factor.in OTP client. 2Factor generates, sends and verifies the
// 6-digit code (verification is by phone number), so nothing is stored on our side.
// Without TWOFACTOR_API_KEY, development accepts the fixed code 123456 so the app
// still works locally; production refuses to run without real credentials.

const BASE_URL = 'https://2factor.in/API/V1';
export const OTP_LENGTH = 6;
const DEV_OTP = '123456';

export function isOtpDevMode(): boolean {
  return !process.env.TWOFACTOR_API_KEY && process.env.NODE_ENV !== 'production';
}

function getApiKey(): string {
  const key = process.env.TWOFACTOR_API_KEY;
  if (!key) throw new Error('OTP service is not configured (TWOFACTOR_API_KEY missing)');
  return key;
}

// mobile must include the country code, e.g. "919876543210"
export async function sendOtp(mobile: string): Promise<void> {
  if (isOtpDevMode()) return;
  const key = encodeURIComponent(getApiKey());
  // Optional named template from the 2Factor dashboard; otherwise 2Factor's default OTP text
  const template = process.env.TWOFACTOR_OTP_TEMPLATE;
  const url = `${BASE_URL}/${key}/SMS/${mobile}/AUTOGEN${template ? `/${encodeURIComponent(template)}` : ''}`;
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (data.Status !== 'Success') {
    throw new Error(data.Details || 'Failed to send OTP');
  }
}

export async function verifyOtp(mobile: string, otp: string): Promise<boolean> {
  if (isOtpDevMode()) return otp === DEV_OTP;
  const key = encodeURIComponent(getApiKey());
  const res = await fetch(`${BASE_URL}/${key}/SMS/VERIFY3/${mobile}/${encodeURIComponent(otp)}`);
  const data = await res.json().catch(() => ({}));
  return data.Status === 'Success';
}
