import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || '',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

const FROM = process.env.SMTP_FROM || 'noreply@trusthomeservices.com';

export async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.SMTP_HOST) return; // skip if SMTP not configured
  try {
    await transporter.sendMail({ from: FROM, to, subject, html });
  } catch (err) {
    console.error('Email send failed:', err);
  }
}

export async function sendNotificationEmail(to: string, title: string, body: string) {
  await sendEmail(to, `Trust Home Services - ${title}`, `<div style="font-family:sans-serif;padding:20px;max-width:600px">
    <div style="background:#4f46e5;padding:15px;border-radius:10px 10px 0 0;text-align:center">
      <h2 style="color:white;margin:0">Trust Home Services</h2>
    </div>
    <div style="border:1px solid #e2e8f0;border-top:0;padding:20px;border-radius:0 0 10px 10px">
      <h3>${title}</h3>
      <p>${body}</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">
      <p style="color:#94a3b8;font-size:12px">This is an automated notification from Trust Home Services.</p>
    </div>
  </div>`);
}
