import nodemailer from "nodemailer";

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendPasswordResetEmail(toEmail: string, code: string): Promise<void> {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@c3dmanager.com";
  const transport = createTransport();

  const subject = "Recuperação de senha — C3D Manager";
  const body = `Olá,

Recebemos uma solicitação para redefinir a senha da sua conta.

Seu código de recuperação é:

${code}

Esse código expira em 15 minutos.

Se você não solicitou a redefinição de senha, ignore este email.

Atenciosamente,
Equipe C3D Manager`;

  if (!transport) {
    console.log("=== [EMAIL] Sem SMTP configurado — exibindo código no console ===");
    console.log(`Para: ${toEmail}`);
    console.log(`Assunto: ${subject}`);
    console.log(`Código de recuperação: ${code}`);
    console.log("=================================================================");
    return;
  }

  await transport.sendMail({ from, to: toEmail, subject, text: body });
}
