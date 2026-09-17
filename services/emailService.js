const nodemailer = require('nodemailer');

function createTransporter() {
  const requiredVariables = [
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASSWORD',
  ];

  const missing = requiredVariables.filter((key) => {
    return !process.env[key] || process.env[key].trim() === '';
  });

  if (missing.length > 0) {
    throw new Error(
      `Brakuje konfiguracji SMTP: ${missing.join(', ')}`
    );
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure:
      String(process.env.SMTP_SECURE).toLowerCase() === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

async function sendVerificationEmail(email, token) {
  const transporter = createTransporter();

  const frontendUrl =
    process.env.FRONTEND_URL || 'http://localhost:3001';

  const verificationUrl =
    `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;

  await transporter.sendMail({
    from:
      process.env.SMTP_FROM ||
      process.env.SMTP_USER,

    to: email,

    subject: 'Potwierdź adres e-mail — Kolorowanka',

    text:
      `Witaj!\n\n` +
      `Aby potwierdzić adres e-mail, otwórz poniższy link:\n\n` +
      `${verificationUrl}\n\n` +
      `Link jest ważny przez 24 godziny.\n\n` +
      `Jeżeli nie zakładałeś konta, zignoruj tę wiadomość.`,

    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Potwierdź adres e-mail</h2>

        <p>
          Dziękujemy za rejestrację w Kolorowance.
        </p>

        <p>
          Kliknij poniższy przycisk, aby potwierdzić
          swój adres e-mail:
        </p>

        <p>
          <a
            href="${verificationUrl}"
            style="
              display: inline-block;
              padding: 12px 20px;
              background: #526b59;
              color: white;
              text-decoration: none;
              border-radius: 8px;
            "
          >
            Potwierdź e-mail
          </a>
        </p>

        <p>
          Link jest ważny przez 24 godziny.
        </p>

        <p>
          Jeżeli nie zakładałeś konta, zignoruj tę wiadomość.
        </p>
      </div>
    `,
  });
}

module.exports = {
  sendVerificationEmail,
};