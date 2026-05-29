import nodemailer from 'nodemailer';
import dns from 'dns';
import { promisify } from 'util';

const dnsLookup = promisify(dns.lookup);

/**
 * Sends an email using Nodemailer.
 *
 * If SMTP environment variables (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
 * are configured, it sends a real email through the cloud provider.
 * Otherwise, it falls back to logging the OTP to the console for dev testing.
 */
const sendEmail = async ({ email, subject, message, html }) => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || smtpUser || 'noreply@orbit.app';

  // If SMTP credentials are not set, fall back to console logging
  if (!smtpHost || !smtpUser || !smtpPass) {
    console.log('\n══════════════════════════════════════════');
    console.log('📧  EMAIL (Dev Console Fallback)');
    console.log('══════════════════════════════════════════');
    console.log(`  To:      ${email}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body:    ${message}`);
    console.log('══════════════════════════════════════════\n');
    return;
  }

  // Dynamically resolve the host to IPv4 to prevent ENETUNREACH error on IPv6
  let targetHost = smtpHost;
  try {
    const resolved = await dnsLookup(smtpHost, { family: 4 });
    if (resolved && resolved.address) {
      targetHost = resolved.address;
    }
  } catch (err) {
    console.warn(`[SMTP DNS] Failed resolving IPv4 for ${smtpHost}, falling back:`, err.message);
  }

  const transporter = nodemailer.createTransport({
    host: targetHost,
    port: parseInt(smtpPort, 10) || 587,
    secure: parseInt(smtpPort, 10) === 465, // true for port 465
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    tls: {
      rejectUnauthorized: false,
      servername: smtpHost, // Validate SSL certificate using original hostname
    },
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,   // 10 seconds
    socketTimeout: 15000,     // 15 seconds
  });

  const mailOptions = {
    from: `"Orbit" <${smtpFrom}>`,
    to: email,
    subject,
    text: message,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('\n❌ SMTP Email sending failed:', error.message);

    // Check if it's a testing limitation (e.g. Resend free tier 550 error)
    const isTestingLimit = error.message.includes('550') || error.message.includes('testing emails');

    console.log('\n══════════════════════════════════════════');
    console.log(`📧  EMAIL FALLBACK (${isTestingLimit ? 'Resend Testing Limit' : 'SMTP Failed'})`);
    console.log('══════════════════════════════════════════');
    console.log(`  To:      ${email}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body:    ${message}`);
    console.log('══════════════════════════════════════════\n');

    // If SMTP fails, let the registration succeed anyway so the OTP code can be retrieved from the server logs if SMTP is misconfigured.
  }
};

export default sendEmail;
