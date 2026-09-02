// src/lib/email.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendWelcomeEmail = async (email: string, name: string, verificationUrl?: string) => {
  try {
    await resend.emails.send({
      from: "Nexus <onboarding@resend.dev>",
      to: email,
      subject: "Welcome to Nexus! 🎉",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h1 style="color: #10b981; font-size: 24px;">Welcome to Nexus, ${name}! 👋</h1>
          <p style="color: #475569; font-size: 16px; line-height: 1.6;">
            Your account has been successfully created. You're now part of a community where you can learn, grow, and connect with others.
          </p>
          <p style="color: #475569; font-size: 16px; line-height: 1.6;">
            Get started by exploring courses and joining communities that match your interests.
          </p>
          <a href="${verificationUrl || `${process.env.BETTER_AUTH_URL}/feed`}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 12px;">
            ${verificationUrl ? "Verify your email" : "Start Learning"}
          </a>
          <p style="color: #94a3b8; font-size: 14px; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
            If you didn't create this account, please ignore this email.
          </p>
        </div>
      `,
    });
    console.log(`Welcome email sent to ${email}`);
  } catch (error) {
    console.error("Failed to send welcome email:", error);
  }
};

export const sendPasswordResetEmail = async (email: string, url: string, name?: string) => {
  try {
    await resend.emails.send({
      from: "Nexus <onboarding@resend.dev>",
      to: email,
      subject: "Reset Your Password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h1 style="color: #10b981; font-size: 24px;">Reset Your Password</h1>
          <p style="color: #475569; font-size: 16px; line-height: 1.6;">
            We received a request to reset your password${name ? ` for ${name}` : ''}. Click the button below to set a new password:
          </p>
          <a href="${url}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0;">
            Reset Password
          </a>
          <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            Or copy and paste this link into your browser:<br />
            <span style="color: #10b981; word-break: break-all;">${url}</span>
          </p>
          <p style="color: #475569; font-size: 16px; line-height: 1.6;">
            This link will expire in 10 minutes.
          </p>
          <p style="color: #94a3b8; font-size: 14px; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
            If you didn't request a password reset, please ignore this email.
          </p>
        </div>
      `,
    });
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error("Failed to send password reset email:", error);
  }
};