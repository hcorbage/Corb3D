import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import type { User } from "@shared/schema";

export type PlanId = "basic" | "pro";

export interface PlanDefinition {
  id: PlanId;
  name: string;
  description: string;
  price: number;
  currency: string;
  durationDays: number;
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  basic: {
    id: "basic",
    name: "Plano Basic — C3D Manager",
    description: "Acesso completo ao C3D Manager por 30 dias.",
    price: 49.90,
    currency: "BRL",
    durationDays: 30,
  },
  pro: {
    id: "pro",
    name: "Plano Pro — C3D Manager",
    description: "Acesso completo ao C3D Manager com recursos avançados por 30 dias.",
    price: 89.90,
    currency: "BRL",
    durationDays: 30,
  },
};

function getMpClient(): MercadoPagoConfig {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) throw new Error("MERCADO_PAGO_ACCESS_TOKEN não configurado.");
  return new MercadoPagoConfig({ accessToken: token });
}

export interface CreatePreferenceResult {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint: string;
}

export async function createPaymentPreference(
  user: User,
  planId: PlanId,
  callbackBase: string
): Promise<CreatePreferenceResult> {
  const plan = PLANS[planId];
  if (!plan) throw new Error(`Plano inválido: ${planId}`);

  const client = getMpClient();
  const prefApi = new Preference(client);

  const response = await prefApi.create({
    body: {
      items: [
        {
          id: planId,
          title: plan.name,
          description: plan.description,
          quantity: 1,
          unit_price: plan.price,
          currency_id: plan.currency,
        },
      ],
      payer: {
        name: user.username,
        email: user.email ?? undefined,
      },
      back_urls: {
        success: `${callbackBase}/planos`,
        failure: `${callbackBase}/planos`,
        pending: `${callbackBase}/planos`,
      },
      ...(callbackBase.startsWith("https://") ? { auto_return: "approved" } : {}),
      external_reference: `user_${user.id}_plan_${planId}`,
      metadata: {
        userId: user.id,
        planId,
      },
      notification_url: `${callbackBase}/api/payments/webhook`,
    },
  });

  return {
    preferenceId: response.id ?? "",
    initPoint: response.init_point ?? "",
    sandboxInitPoint: response.sandbox_init_point ?? "",
  };
}

export interface PaymentDetails {
  id: string;
  status: string;
  externalReference: string | null;
  metadata: { userId?: string; planId?: string } | null;
  dateApproved: string | null;
}

export async function fetchPaymentById(paymentId: string): Promise<PaymentDetails> {
  const client = getMpClient();
  const paymentApi = new Payment(client);

  const response = await paymentApi.get({ id: paymentId });

  return {
    id: String(response.id),
    status: response.status ?? "unknown",
    externalReference: response.external_reference ?? null,
    metadata: (response.metadata as any) ?? null,
    dateApproved: response.date_approved ? String(response.date_approved) : null,
  };
}

export function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
