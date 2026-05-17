import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy');
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetLink = `${BASE_URL}/reset-password?token=${token}`;

  const { data, error } = await resend.emails.send({
    from: 'FromFram <onboarding@resend.dev>',
    to: email,
    subject: 'Reset Password - FromFram',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Reset Password</h2>
        <p>Anda menerima email ini karena ada permintaan untuk mereset password akun FromFram Anda.</p>
        <p>Klik tombol di bawah ini untuk mereset password Anda:</p>
        <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #1abb89; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
          Reset Password
        </a>
        <p style="margin-top: 20px;">Link ini akan kadaluarsa dalam 1 jam.</p>
        <p>Jika Anda tidak meminta reset password, abaikan email ini.</p>
      </div>
    `,
  });

  console.log('==========================================');
  console.log('RESET LINK:', resetLink);
  if (error) console.error('Resend API Error:', error);
  else console.log('Resend Success:', data);
  console.log('==========================================');

  return { data, error };
}