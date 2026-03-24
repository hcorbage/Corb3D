import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "wouter";
import { AlertTriangle, Lock, Info, X, ChevronRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";

type DailyCash = {
  id: string; status: string;
  closedAt?: string | null; closeType?: string | null; closedByName?: string | null;
  openedAt?: string | null; openType?: string | null;
  reopenedByName?: string | null; reopenedAt?: string | null;
};

type CashStatus = {
  isOpen: boolean;
  todayCash: DailyCash | null;
  autoCloseEnabled: boolean;
  autoCloseTime: string | null;
};

function fmtTime(iso?: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const brt = new Date(d.getTime() - 3 * 60 * 60 * 1000);
    return `${brt.getUTCHours().toString().padStart(2, "0")}:${brt.getUTCMinutes().toString().padStart(2, "0")}`;
  } catch { return "—"; }
}

function getSecondsUntilClose(autoCloseTime: string): number {
  const nowMs = Date.now();
  const brt = new Date(nowMs - 3 * 60 * 60 * 1000);
  const [h, m] = autoCloseTime.split(":").map(Number);
  const closeUTC = Date.UTC(
    brt.getUTCFullYear(), brt.getUTCMonth(), brt.getUTCDate(),
    h + 3, m, 0
  );
  return Math.floor((closeUTC - nowMs) / 1000);
}

function formatCountdown(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const POLL_INTERVAL = 30_000;
const IMMINENT_SECS = 5 * 60;
const RECENT_CLOSE_SECS = 120;

type AlertKind = "imminent" | "just-closed" | "already-closed";

export function CashStatusAlert() {
  const { isAdmin } = useAuth();
  const [status, setStatus] = useState<CashStatus | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState<AlertKind | null>(null);
  const prevCashStatusRef = useRef<string | null>(null);
  const dismissedCashIdRef = useRef<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/daily-cash/status");
      if (!r.ok) return;
      const data: CashStatus = await r.json();
      const prevStatus = prevCashStatusRef.current;
      const newStatus = data.todayCash?.status || null;

      // When cash transitions open→closed, clear dismissal so new alert appears
      if (prevStatus === "aberto" && newStatus === "fechado") {
        setDismissed(null);
        dismissedCashIdRef.current = null;
      }
      // When a new day's cash appears, clear dismissal
      if (data.todayCash?.id && data.todayCash.id !== dismissedCashIdRef.current && dismissed !== null) {
        setDismissed(null);
        dismissedCashIdRef.current = null;
      }

      prevCashStatusRef.current = newStatus;
      setStatus(data);
    } catch {}
  }, [dismissed]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchStatus();
    const id = setInterval(fetchStatus, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [isAdmin, fetchStatus]);

  useEffect(() => {
    if (!isAdmin) return;
    const id = setInterval(() => {
      if (!status?.isOpen || !status.autoCloseEnabled || !status.autoCloseTime) {
        setSecondsLeft(null);
        return;
      }
      const secs = getSecondsUntilClose(status.autoCloseTime);
      setSecondsLeft(secs);
      if (secs <= 0 && secs > -15) fetchStatus();
    }, 1000);
    return () => clearInterval(id);
  }, [isAdmin, status, fetchStatus]);

  if (!isAdmin || !status) return null;

  const { isOpen, todayCash, autoCloseEnabled, autoCloseTime } = status;

  // Determine which alert kind should show (before checking dismissal)
  let alertKind: AlertKind | null = null;

  if (isOpen && autoCloseEnabled && autoCloseTime && secondsLeft !== null && secondsLeft >= 0 && secondsLeft <= IMMINENT_SECS) {
    alertKind = "imminent";
  } else if (!isOpen && todayCash) {
    const closedAgoSecs = todayCash.closedAt
      ? (Date.now() - new Date(todayCash.closedAt).getTime()) / 1000
      : Infinity;
    alertKind = closedAgoSecs < RECENT_CLOSE_SECS ? "just-closed" : "already-closed";
  }

  // Apply dismissal
  if (alertKind === dismissed) return null;
  if (alertKind === null) return null;

  // ── Imminent close ──────────────────────────────────────────────────────────
  if (alertKind === "imminent") {
    return (
      <div
        data-testid="alert-caixa-imminent"
        className="mb-4 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-start gap-3 shadow-sm animate-in fade-in duration-300"
      >
        <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0 animate-pulse" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800">
            ⚠️ Caixa será encerrado automaticamente em{" "}
            <span className="font-mono text-amber-600 text-base">{formatCountdown(secondsLeft!)}</span>
          </p>
          <p className="text-xs text-amber-600 mt-0.5">
            Horário de fechamento automático: {autoCloseTime}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/caixa-diario">
            <a
              data-testid="alert-caixa-imminent-link"
              className="text-xs font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1 border border-amber-300 rounded-lg px-2 py-1 bg-white hover:bg-amber-50 transition-colors whitespace-nowrap"
            >
              Ir ao Caixa <ChevronRight className="w-3 h-3" />
            </a>
          </Link>
          <button
            data-testid="alert-caixa-imminent-dismiss"
            onClick={() => setDismissed("imminent")}
            className="p-1 rounded hover:bg-amber-100 text-amber-400 hover:text-amber-600 transition-colors"
            title="Fechar alerta"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── Just closed (recent) ────────────────────────────────────────────────────
  if (alertKind === "just-closed") {
    const isAuto = todayCash!.closeType === "automatico";
    const msg = isAuto
      ? `Caixa encerrado automaticamente às ${fmtTime(todayCash!.closedAt)}`
      : `Caixa encerrado por ${todayCash!.closedByName || "usuário"} às ${fmtTime(todayCash!.closedAt)}`;
    return (
      <div
        data-testid="alert-caixa-just-closed"
        className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3 shadow-sm animate-in fade-in duration-300"
      >
        <Lock className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red-800">🔒 {msg}</p>
          <p className="text-xs text-red-500 mt-0.5">Clique em "Reabrir" para continuar operando.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/caixa-diario">
            <a
              data-testid="alert-caixa-just-closed-link"
              className="text-xs font-semibold text-red-700 hover:text-red-900 flex items-center gap-1 border border-red-200 rounded-lg px-2 py-1 bg-white hover:bg-red-50 transition-colors whitespace-nowrap"
            >
              Reabrir <ChevronRight className="w-3 h-3" />
            </a>
          </Link>
          <button
            data-testid="alert-caixa-just-closed-dismiss"
            onClick={() => {
              setDismissed("just-closed");
              dismissedCashIdRef.current = todayCash!.id;
            }}
            className="p-1 rounded hover:bg-red-100 text-red-300 hover:text-red-500 transition-colors"
            title="Fechar alerta"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── Already closed today ────────────────────────────────────────────────────
  if (alertKind === "already-closed") {
    return (
      <div
        data-testid="alert-caixa-already-closed"
        className="mb-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3 shadow-sm"
      >
        <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-blue-800">ℹ️ O caixa de hoje já foi encerrado.</p>
          <p className="text-xs text-blue-600 mt-0.5">Clique em "Reabrir" para continuar operando.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/caixa-diario">
            <a
              data-testid="alert-caixa-already-closed-link"
              className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 border border-blue-200 rounded-lg px-2 py-1 bg-white hover:bg-blue-50 transition-colors whitespace-nowrap"
            >
              Reabrir <ChevronRight className="w-3 h-3" />
            </a>
          </Link>
          <button
            data-testid="alert-caixa-already-closed-dismiss"
            onClick={() => {
              setDismissed("already-closed");
              dismissedCashIdRef.current = todayCash!.id;
            }}
            className="p-1 rounded hover:bg-blue-100 text-blue-300 hover:text-blue-500 transition-colors"
            title="Fechar alerta"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
