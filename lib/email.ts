import nodemailer from "nodemailer";

type VerificationPayload = {
  user: { email: string; name?: string };
  url: string;
  token?: string;
};

type DueReminderItem = {
  serviceName: string;
  dueDate: string;
  amount: number;
  daysUntilDue: number;
};

function createTransporterAndFrom() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT
    ? parseInt(process.env.SMTP_PORT, 10)
    : 587;
  const secure = process.env.SMTP_SECURE === "true";
  const authUser = process.env.SMTP_USER;
  const authPass = process.env.SMTP_PASS;

  if (!host || !authUser || !authPass) {
    console.error(
      "SMTP configuration is incomplete. Set SMTP_HOST, SMTP_USER, SMTP_PASS.",
    );
    throw new Error("SMTP not configured");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: authUser,
      pass: authPass,
    },
  });

  const from = process.env.FROM_EMAIL || authUser;
  return { transporter, from };
}

export async function sendVerificationEmail(payload: VerificationPayload) {
  const { user, url } = payload;
  // Reuse shared transporter creation helper
  const { transporter, from } = createTransporterAndFrom();

  const text = `Hi ${
    user.name ?? ""
  },\n\nPlease verify your email address by clicking the link below:\n\n${url}\n\nIf you didn't create an account, you can ignore this message.\n\nBest regards,\nThe Duey Team`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify your email</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa; line-height: 1.6;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 40px 20px;">
            <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
              <!-- Header -->
              <tr>
                <td style="padding: 40px 40px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                    Duey
                  </h1>
                  <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">
                    Never Miss a Payment Again
                  </p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px; font-weight: 600;">
                    Welcome${user.name ? `, ${user.name}` : ""}! 👋
                  </h2>
                  <p style="margin: 0 0 24px; color: #6b7280; font-size: 16px;">
                    Thanks for signing up! Please verify your email address to get started with Duey.
                  </p>
                  
                  <!-- CTA Button -->
                  <table role="presentation" style="margin: 32px 0;">
                    <tr>
                      <td style="border-radius: 8px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                        <a href="${url}" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;">
                          Verify Email Address
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                    Or copy and paste this URL into your browser:<br>
                    <a href="${url}" style="color: #667eea; text-decoration: none; word-break: break-all;">
                      ${url}
                    </a>
                  </p>
                  
                  <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #9ca3af; font-size: 13px;">
                      If you didn't create an account, you can safely ignore this email.
                    </p>
                  </div>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 24px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0; color: #6b7280; font-size: 13px; text-align: center;">
                    Best regards,<br>
                    <strong style="color: #1f2937;">The Duey Team</strong>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const info = await transporter.sendMail({
    from,
    to: user.email,
    subject: "Verify your email - Duey",
    text,
    html,
  });

  // For debugging in dev, log preview URL if available
  // nodemailer.getTestMessageUrl(info) works for ethereal accounts
  try {
    console.log(
      "Verification email sent:",
      info.messageId,
      nodemailer.getTestMessageUrl(info),
    );
  } catch (err) {
    // Log but don't throw if preview URL is not available
    console.error(err);
  }
}

export default sendVerificationEmail;

type ResetPayload = {
  user: { email: string; name?: string };
  url: string;
  token: string;
};

export async function sendResetEmail(payload: ResetPayload) {
  const { user, url } = payload;
  // Reuse shared transporter creation helper
  const { transporter, from } = createTransporterAndFrom();

  const text = `Hi ${
    user.name ?? ""
  },\n\nYou requested a password reset. Click the link below to choose a new password:\n\n${url}\n\nIf the link doesn't work, copy and paste the URL above into your browser.\n\nThis link will expire in 1 hour for security reasons.\n\nIf you didn't request this, you can ignore this message.\n\nBest regards,\nThe Duey Team`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset your password</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa; line-height: 1.6;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 40px 20px;">
            <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
              <!-- Header -->
              <tr>
                <td style="padding: 40px 40px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                    Duey
                  </h1>
                  <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">
                    Never Miss a Payment Again
                  </p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px; font-weight: 600;">
                    Reset Your Password 🔐
                  </h2>
                  <p style="margin: 0 0 8px; color: #1f2937; font-size: 16px;">
                    Hi${user.name ? ` ${user.name}` : ""},
                  </p>
                  <p style="margin: 0 0 24px; color: #6b7280; font-size: 16px;">
                    We received a request to reset your password. Click the button below to choose a new password.
                  </p>
                  
                  <!-- CTA Button -->
                  <table role="presentation" style="margin: 32px 0;">
                    <tr>
                      <td style="border-radius: 8px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                        <a href="${url}" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;" target="_blank" rel="noopener noreferrer">
                          Reset Password
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                    Or copy and paste this URL into your browser:<br>
                    <a href="${url}" style="color: #667eea; text-decoration: none; word-break: break-all;">
                      ${url}
                    </a>
                  </p>
                  
                  <!-- Security Notice -->
                  <div style="margin-top: 32px; padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                    <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 600;">
                      ⚠️ Security Notice
                    </p>
                    <p style="margin: 8px 0 0; color: #78350f; font-size: 13px; line-height: 1.5;">
                      This link will expire in <strong>1 hour</strong> for security reasons. If you didn't request a password reset, please ignore this email or contact support if you're concerned about your account security.
                    </p>
                  </div>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 24px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0; color: #6b7280; font-size: 13px; text-align: center;">
                    Best regards,<br>
                    <strong style="color: #1f2937;">The Duey Team</strong>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const info = await transporter.sendMail({
    from,
    to: user.email,
    subject: "Reset your password - Duey",
    text,
    html,
  });

  try {
    console.log(
      "Reset email sent:",
      info.messageId,
      nodemailer.getTestMessageUrl(info),
    );
  } catch (err) {
    console.error(err);
  }
}

export async function sendDueReminderEmail(payload: {
  user: { email: string; name?: string };
  reminders: DueReminderItem[];
}) {
  const { user, reminders } = payload;
  if (reminders.length === 0) return;

  const { transporter, from } = createTransporterAndFrom();

  const sorted = [...reminders].sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  const first = sorted[0];
  const subjectPrefix =
    first.daysUntilDue < 0
      ? "Overdue payment reminder"
      : first.daysUntilDue === 0
        ? "Payment due today"
        : "Upcoming payment reminder";

  const subject = `${subjectPrefix} - Duey`;

  const textRows = sorted.map((item) => {
    const when =
      item.daysUntilDue < 0
        ? `overdue by ${Math.abs(item.daysUntilDue)} day${Math.abs(item.daysUntilDue) === 1 ? "" : "s"}`
        : item.daysUntilDue === 0
          ? "due today"
          : `due in ${item.daysUntilDue} day${item.daysUntilDue === 1 ? "" : "s"}`;
    return `- ${item.serviceName}: $${item.amount.toFixed(2)} (Due ${item.dueDate}, ${when})`;
  });

  const text = `Hi ${user.name ?? ""},\n\nYou have ${sorted.length} billing reminder${sorted.length === 1 ? "" : "s"}:\n${textRows.join("\n")}\n\nReview your dashboard to stay ahead of due dates.\n\nBest regards,\nThe Duey Team`;

  const htmlRows = sorted
    .map((item) => {
      const when =
        item.daysUntilDue < 0
          ? `Overdue by ${Math.abs(item.daysUntilDue)} day${Math.abs(item.daysUntilDue) === 1 ? "" : "s"}`
          : item.daysUntilDue === 0
            ? "Due today"
            : `Due in ${item.daysUntilDue} day${item.daysUntilDue === 1 ? "" : "s"}`;
      return `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${item.serviceName}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">$${item.amount.toFixed(2)}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${item.dueDate}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${when}</td>
        </tr>
      `;
    })
    .join("");

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Billing reminder</title>
    </head>
    <body style="margin:0;padding:0;background:#f8f9fa;font-family:Arial,sans-serif;color:#111827;">
      <table role="presentation" style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:28px 16px;">
            <table role="presentation" style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
              <tr>
                <td style="padding:20px 24px;background:#111827;color:#ffffff;">
                  <h1 style="margin:0;font-size:20px;">Duey reminder</h1>
                  <p style="margin:8px 0 0;font-size:13px;opacity:0.9;">Upcoming subscription and bill due dates</p>
                </td>
              </tr>
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 14px;">Hi${user.name ? ` ${user.name}` : ""}, here are your current billing reminders:</p>
                  <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;">
                    <thead>
                      <tr>
                        <th align="left" style="padding:8px 12px;background:#f3f4f6;">Service</th>
                        <th align="left" style="padding:8px 12px;background:#f3f4f6;">Amount</th>
                        <th align="left" style="padding:8px 12px;background:#f3f4f6;">Due Date</th>
                        <th align="left" style="padding:8px 12px;background:#f3f4f6;">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${htmlRows}
                    </tbody>
                  </table>
                  <p style="margin:16px 0 0;font-size:13px;color:#6b7280;">Review your Duey dashboard to manage due dates and recurring spend.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from,
    to: user.email,
    subject,
    text,
    html,
  });
}
