import Brevo from '@getbrevo/brevo'; // importing brevo software development kit so now we can use it's API classes and methods

// Initialize API client once
const api = new Brevo.TransactionalEmailsApi(); // use to send emails one time for whole app lifetime

//purpose of this block: to set the API key for authentication if it exists in environment variables and To load your Brevo API Key from environment variables and attach it to the Brevo SDK client so it can send emails.

if (process.env.BREVO_API_KEY) {
  api.setApiKey(   //setApiKey is the SDK method that stores/attaches the API key so subsequent SDK calls include it for authentication.
    Brevo.TransactionalEmailsApiApiKeys.apiKey,  //meaning-->use the normal API key authentication method for transactional emails.
    process.env.BREVO_API_KEY
  );
}

//export a function that any file can call to send an email
export async function sendEmail({ to, subject, html, text, sender }) {
  if (!process.env.BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY is not set');
  }

  const senderEmail = sender?.email || process.env.EMAIL_FROM || process.env.ADMIN_EMAIL;
  const senderName = sender?.name || process.env.EMAIL_FROM_NAME || 'DocOp';
  if (!senderEmail) {
    throw new Error('Sender email is not configured. Set EMAIL_FROM (preferred) or ADMIN_EMAIL in .env');
  }


  //Create email payload object
  const payload = new Brevo.SendSmtpEmail();
  payload.subject = subject || '';
  if (html) payload.htmlContent = html;
  if (text) payload.textContent = text;
  payload.sender = { email: senderEmail, name: senderName };
  payload.to = (Array.isArray(to) ? to : [to]).map((item) =>
    typeof item === 'string' ? { email: item } : item
  );

  return api.sendTransacEmail(payload);  // Call Brevo SDK method to send the email with the constructed payload
}
