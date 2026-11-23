// purpose 'login' makes the server check an account exists before sending an SMS.
// devMode is true when the server has no 2Factor API key and accepts 123456.
export async function requestOtp(phone: string, purpose: 'login' | 'join' = 'join'): Promise<{ devMode: boolean }> {
  const res = await fetch('/api/otp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, purpose }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
  return { devMode: !!data.devMode };
}
