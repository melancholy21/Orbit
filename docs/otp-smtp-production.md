# OTP & Production SMTP Configuration

This guide details how Orbit sends OTP verification emails to new users and outlines troubleshooting steps for production environment setups.

## 1. How Email Sending Works
Email operations are managed by Nodemailer in: [sendEmail.js](file:///c:/Users/ANGELO/OneDrive/Desktop/Orbit/backend/utils/sendEmail.js)

- **Development Fallback**: If SMTP environment variables are not set, Nodemailer will output the email details and the OTP code to the local terminal/console log instead of attempting to send a real email.
- **Production Delivery**: When SMTP environment variables are defined, Nodemailer connects to the configured SMTP server (such as Gmail) to deliver real emails to users.

---

## 2. Production Configuration Checklists

To make email dispatching work in production, ensure the following environment variables are configured in your hosting platform dashboard (e.g. Render, Railway, Vercel, AWS):

| Environment Variable | Description / Value Example |
| :--- | :--- |
| `SMTP_HOST` | `smtp.gmail.com` (Gmail SMTP host) |
| `SMTP_PORT` | `465` (Secure port) or `587` (TLS port) |
| `SMTP_USER` | your email (e.g., `your-name@gmail.com`) |
| `SMTP_PASS` | your App Password (Gmail 16-digit app password, **not** your personal password) |
| `SMTP_FROM` | your sender email address (e.g., `your-name@gmail.com`) |

---

## 3. Production Troubleshooting

### A. Connection Failures & TLS Handshakes
Some production server containers restrict strict SSL/TLS handshake authentications.
- **Our Solution**: We configured the Nodemailer transporter with:
  ```javascript
  tls: {
    rejectUnauthorized: false
  }
  ```
  This prevents production containers from rejecting SMTP host connections due to self-signed or unverified SSL certificates.

### B. Outbound SMTP Port Blocking (Render/AWS/etc.)
Many cloud providers block outbound traffic on port `465` to combat email spam.
- **Symptom**: SMTP connection requests timeout or hang indefinitely in production logs.
- **Fix**: Switch the SMTP Port on your production environment dashboard to **`587`**. Port 587 uses STARTTLS and is commonly left open by cloud hosts.

### C. Google App Passwords
Google accounts with 2-Step Verification enabled require an **App Password** for SMTP connections.
- **Fix**: Go to Google Account Settings -> Security -> App Passwords. Generate a new password for "Mail" on your "Web App" and paste the 16-character code directly into your production `SMTP_PASS` variable.
