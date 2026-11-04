export function authErrorMessage(error: unknown): string {
  const record = error && typeof error === 'object' ? error as { code?: string; message?: string } : {};
  switch (record.code) {
    case 'invalid_credentials': return 'The email or password is incorrect.';
    case 'email_not_confirmed': return 'Confirm your email using the link in your inbox, then sign in.';
    case 'signup_disabled': return 'New account registration is currently disabled. Contact your workspace administrator.';
    case 'email_address_not_authorized': return 'Email delivery is not configured for this address. Contact your workspace administrator.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit': return 'Too many requests. Please wait a few minutes before trying again.';
    case 'weak_password': return 'Choose a stronger password with at least 10 characters.';
    case 'same_password': return 'Choose a password different from your current password.';
    case 'flow_state_expired':
    case 'flow_state_not_found':
    case 'bad_code_verifier':
    case 'pkce_verifier_missing': return 'This link has expired or belongs to another device. Request a new link and open it on this device.';
  }
  if (record.message && /secure|saved sign-in|sign-in data|storage key|invalid text/i.test(record.message)) return record.message;
  if (record.message && /email.*sending|sending.*email|smtp/i.test(record.message)) return 'The email could not be sent. Your workspace administrator may need to configure email delivery.';
  if (record.message && /network|fetch|connection|timeout/i.test(record.message)) return 'Could not connect to the sign-in service. Check your internet connection and try again.';
  return 'The sign-in request could not be completed. Please try again.';
}
