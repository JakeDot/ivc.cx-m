import { getAccessToken } from './firebase';

export async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('Not authenticated');
  }

  // Construct RFC 2822 message
  const messageParts = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    body,
  ];
  
  const rawMessage = messageParts.join('\r\n');

  // Convert to base64url
  const bytes = new TextEncoder().encode(rawMessage);
  const binString = Array.from(bytes).map(byte => String.fromCodePoint(byte)).join('');
  const base64Message = btoa(binString)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: base64Message,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Failed to send email:', errorData);
    throw new Error('Failed to send email');
  }

  return true;
}
