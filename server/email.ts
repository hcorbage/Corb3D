import nodemailer from "nodemailer";

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  console.log("[EMAIL] Config SMTP — host:", host || "(não definido)", "| port:", port, "| user:", user || "(não definido)");

  if (!host || !user || !pass) {
    console.log("[EMAIL] SMTP não configurado — SMTP_HOST, SMTP_USER ou SMTP_PASS ausentes.");
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendEmailVerificationCode(toEmail: string, code: string): Promise<void> {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@c3dmanager.com";
  console.log("[EMAIL] sendEmailVerificationCode — para:", toEmail);

  const transport = createTransport();

  const subject = "Código de verificação — C3D Manager";
  const body = `Olá,

Recebemos sua solicitação de cadastro no C3D Manager.

Seu código de verificação é:

${code}

Esse código expira em 15 minutos. Não compartilhe com ninguém.

Se você não realizou esse cadastro, ignore este email.

Atenciosamente,
Equipe C3D Manager`;

  if (!transport) {
    console.log("╔══════════════════════════════════════════════════════╗");
    console.log("║  [EMAIL] SMTP não configurado — CÓDIGO NO CONSOLE    ║");
    console.log("╠══════════════════════════════════════════════════════╣");
    console.log(`║  Para:    ${toEmail}`);
    console.log(`║  Assunto: ${subject}`);
    console.log(`║  CÓDIGO:  ${code}`);
    console.log("╚══════════════════════════════════════════════════════╝");
    return;
  }

  try {
    const info = await transport.sendMail({ from, to: toEmail, subject, text: body });
    console.log("[EMAIL] Verificação enviada. MessageId:", info.messageId);
  } catch (e: any) {
    console.error("[EMAIL] ERRO ao enviar código de verificação:", e?.message || e);
    throw e;
  }
}

export async function sendPasswordResetEmail(toEmail: string, code: string): Promise<void> {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@c3dmanager.com";
  console.log("[EMAIL] sendPasswordResetEmail chamado — para:", toEmail);

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
    console.log("╔══════════════════════════════════════════════════════╗");
    console.log("║  [EMAIL] SMTP não configurado — CÓDIGO NO CONSOLE    ║");
    console.log("╠══════════════════════════════════════════════════════╣");
    console.log(`║  Para:    ${toEmail}`);
    console.log(`║  Assunto: ${subject}`);
    console.log(`║  CÓDIGO:  ${code}`);
    console.log("╚══════════════════════════════════════════════════════╝");
    return;
  }

  try {
    console.log("[EMAIL] Tentando enviar via SMTP para:", toEmail);
    const info = await transport.sendMail({ from, to: toEmail, subject, text: body });
    console.log("[EMAIL] Email enviado com sucesso. MessageId:", info.messageId);
  } catch (e: any) {
    console.error("[EMAIL] ERRO ao enviar email via SMTP:", e?.message || e);
    console.error("[EMAIL] Stack:", e?.stack);
    throw e;
  }
}
