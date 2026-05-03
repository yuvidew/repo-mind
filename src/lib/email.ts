import "server-only";

import { Resend } from "resend";

type SendPasswordResetEmailInput = {
  to: string;
  name?: string | null;
  url: string;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export const sendPasswordResetEmail = async ({
  to,
  name,
  url,
}: SendPasswordResetEmailInput) => {
  const from = process.env.RESEND_FROM_EMAIL;

  if (!process.env.RESEND_API_KEY || !from) {
    throw new Error("Missing Resend password reset email configuration.");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const displayName = name?.trim() || "there";
  const escapedName = escapeHtml(displayName);
  const escapedUrl = escapeHtml(url);

  await resend.emails.send({
    from,
    to,
    subject: "Reset your RepoMind password",
    text: [
      `Hi ${displayName},`,
      "",
      "We received a request to reset your RepoMind password.",
      "Use the link below to choose a new password:",
      "",
      url,
      "",
      "This link expires soon. If you did not request it, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <p>Hi ${escapedName},</p>
        <p>We received a request to reset your RepoMind password.</p>
        <p>
          <a href="${escapedUrl}" style="display: inline-block; padding: 10px 14px; border-radius: 6px; background: #111827; color: #ffffff; text-decoration: none;">
            Reset password
          </a>
        </p>
        <p>This link expires soon. If you did not request it, you can ignore this email.</p>
      </div>
    `,
  });
};
