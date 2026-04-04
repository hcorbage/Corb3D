import { useState, useEffect, useMemo } from "react";
import { clearAuthToken } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import {
  Calculator, Package, Users, Users2, History, Settings, LogOut,
  Menu, X, Maximize, Minimize, BadgeDollarSign, BookOpen,
  BarChart2, DollarSign, Wallet, FileText, ChevronDown, ChevronRight,
  LayoutDashboard, Sun, Moon, Monitor, Clock, MessageCircle,
} from "lucide-react";
import { useAppState } from "../context/AppState";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { CashStatusAlert } from "./CashStatusAlert";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly: boolean;
  module: string;
};

type NavGroup = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly: boolean;
  module: string;
  children: NavItem[];
};

type NavEntry = NavItem | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

const FINANCIAL_HREFS = [
  "/financeiro",
  "/pedidos-financeiro",
  "/cashbook",
  "/caixa-diario",
  "/relatorio-clientes",
  "/relatorios",
  "/commissions",
];

const allNavEntries: NavEntry[] = [
  { href: "/", label: "CALCULADORA", icon: Calculator, adminOnly: false, module: "calculadora" },
  { href: "/inventory", label: "ESTOQUE", icon: Package, adminOnly: true, module: "estoque" },
  { href: "/clients", label: "CLIENTES", icon: Users, adminOnly: true, module: "clientes" },
  { href: "/history", label: "HISTÓRICO", icon: History, adminOnly: false, module: "historico" },
  {
    id: "financeiro",
    label: "FINANCEIRO",
    icon: BarChart2,
    adminOnly: false,
    module: "",
    children: [
      { href: "/caixa-diario", label: "Caixa", icon: Wallet, adminOnly: true, module: "caixa_diario" },
      { href: "/financeiro", label: "Visão Geral", icon: LayoutDashboard, adminOnly: true, module: "financeiro" },
      { href: "/pedidos-financeiro", label: "Financeiro por Pedido", icon: DollarSign, adminOnly: true, module: "pedidos_financeiro" },
      { href: "/commissions", label: "Comissões", icon: BadgeDollarSign, adminOnly: false, module: "comissoes" },
      { href: "/relatorio-clientes", label: "Rel. Clientes", icon: Users2, adminOnly: true, module: "relatorio_clientes" },
      { href: "/relatorios", label: "Relatórios", icon: FileText, adminOnly: true, module: "relatorios" },
      { href: "/cashbook", label: "Livro Caixa", icon: BookOpen, adminOnly: true, module: "livro_caixa" },
    ],
  },
  { href: "/settings", label: "AJUSTES", icon: Settings, adminOnly: false, module: "" },
];

function NavLink({
  item,
  location,
  indent = false,
  onClick,
}: {
  item: NavItem;
  location: string;
  indent?: boolean;
  onClick?: () => void;
}) {
  const isActive = location === item.href;
  return (
    <Link href={item.href}>
      <a
        data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
        onClick={onClick}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 relative ${
          indent ? "ml-5 pl-3" : ""
        } ${
          isActive
            ? "bg-primary/10 text-primary font-semibold after:absolute after:left-0 after:top-2 after:bottom-2 after:w-1 after:bg-primary after:rounded-r-md"
            : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
        }`}
      >
        <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
        <span className="text-sm tracking-wide">{item.label}</span>
      </a>
    </Link>
  );
}

function NavGroupItem({
  group,
  location,
  isAdmin,
  hasPermission,
  onChildClick,
}: {
  group: NavGroup;
  location: string;
  isAdmin: boolean;
  hasPermission: (module: string) => boolean;
  onChildClick?: () => void;
}) {
  const visibleChildren = group.children.filter(c => hasPermission(c.module));
  const isChildActive = visibleChildren.some(c => c.href === location);
  const [open, setOpen] = useState(isChildActive);

  useEffect(() => {
    if (isChildActive) setOpen(true);
  }, [location]);

  if (visibleChildren.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
          isChildActive
            ? "text-primary font-semibold bg-primary/5"
            : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
        }`}
      >
        <group.icon className={`w-5 h-5 flex-shrink-0 ${isChildActive ? "text-primary" : "text-muted-foreground"}`} />
        <span className="text-sm tracking-wide flex-1 text-left">{group.label}</span>
        {open
          ? <ChevronDown className="w-3.5 h-3.5 opacity-50" />
          : <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
      </button>

      {open && (
        <div className="mt-0.5 space-y-0.5 border-l border-sidebar-border ml-6 pl-2">
          {visibleChildren.map(child => (
            <NavLink
              key={child.href}
              item={child}
              location={location}
              onClick={onChildClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ThemeToggleButton({ className = "" }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const cycle = () => {
    const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
  };
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  const label = theme === "light" ? "Claro" : theme === "dark" ? "Escuro" : "Sistema";
  return (
    <button
      onClick={cycle}
      title={`Tema: ${label} — clique para alternar`}
      data-testid="button-theme-toggle"
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors text-xs font-medium ${className}`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span>{label}</span>
    </button>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { settings } = useAppState();
  const { isAdmin, hasPermission, trial, trialDaysRemaining, trialExpired } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const navEntries = useMemo(() =>
    allNavEntries.filter(entry => {
      if (isGroup(entry)) {
        return entry.children.some(c => hasPermission(c.module));
      }
      return hasPermission(entry.module);
    }),
    [hasPermission]
  );

  const isFinancialActive = FINANCIAL_HREFS.includes(location);

  const bottomNavItems: NavItem[] = useMemo(() => {
    const items: NavItem[] = [];
    for (const entry of allNavEntries) {
      if (isGroup(entry)) {
        const visibleChildren = entry.children.filter(c => hasPermission(c.module));
        if (visibleChildren.length === 0) continue;
        // Escolhe o primeiro filho visível como destino do ícone mobile
        const firstVisibleHref = visibleChildren[0].href;
        items.push({
          href: firstVisibleHref,
          label: "FINANCEIRO",
          icon: BarChart2,
          adminOnly: false,
          module: "",
        });
      } else {
        if (!hasPermission(entry.module)) continue;
        items.push(entry);
      }
    }
    return items;
  }, [hasPermission]);

  const renderSidebarNav = (closeFn?: () => void) => (
    <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
      {navEntries.map(entry => {
        if (isGroup(entry)) {
          return (
            <NavGroupItem
              key={entry.id}
              group={entry}
              location={location}
              isAdmin={isAdmin}
              hasPermission={hasPermission}
              onChildClick={closeFn}
            />
          );
        }
        return (
          <NavLink
            key={entry.href}
            item={entry}
            location={location}
            onClick={closeFn}
          />
        );
      })}
    </nav>
  );

  return (
    <div className="flex h-[100dvh] bg-background text-foreground font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-sidebar border-r border-sidebar-border flex-col transition-all duration-300">
        <div className="p-4 flex flex-col items-center justify-center border-b border-sidebar-border mb-2">
          {settings?.logoUrl ? (
            <div className="w-full aspect-square bg-transparent rounded-xl flex items-center justify-center overflow-hidden px-2">
              <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic py-4">Sua logo aqui</p>
          )}
        </div>

        {renderSidebarNav()}

        <div className="px-3 pb-4 pt-2 border-t border-sidebar-border mt-2 space-y-1">
          <ThemeToggleButton className="w-full justify-start" />
          <button
            data-testid="button-logout"
            onClick={() => {
              clearAuthToken();
              fetch('/api/auth/logout', { method: 'POST' }).then(() => {
                window.location.reload();
              });
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-muted-foreground hover:bg-red-50 hover:text-red-500 w-full"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm tracking-wide">SAIR</span>
          </button>
        </div>
      </aside>

      {/* Mobile Slide-In Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-sidebar border-r border-sidebar-border flex flex-col animate-in slide-in-from-left duration-200">
            <div className="p-4 flex items-center justify-between border-b border-sidebar-border">
              <div className="flex items-center gap-3">
                {settings?.logoUrl ? (
                  <div className="w-48 h-48 bg-transparent rounded-lg flex items-center justify-center overflow-hidden">
                    <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground italic">Sua logo aqui</span>
                )}
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-lg hover:bg-white/5">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 py-4 overflow-y-auto">
              {renderSidebarNav(() => setMobileMenuOpen(false))}
            </div>

            <div className="px-3 pb-4 pt-2 border-t border-sidebar-border space-y-1">
              <ThemeToggleButton className="w-full justify-start" />
              <button
                onClick={() => {
                  clearAuthToken();
                  fetch('/api/auth/logout', { method: 'POST' }).then(() => {
                    window.location.reload();
                  });
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-muted-foreground hover:bg-red-50 hover:text-red-500 w-full"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm tracking-wide">SAIR</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-sidebar border-b border-sidebar-border safe-top">
          <button
            data-testid="button-mobile-menu"
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-white/5"
          >
            <Menu className="w-6 h-6 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            {settings?.logoUrl && (
              <div className="w-10 h-10 bg-transparent rounded-lg flex items-center justify-center overflow-hidden">
                <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggleButton />
            <button
              data-testid="button-fullscreen"
              onClick={toggleFullscreen}
              className="p-2 rounded-lg hover:bg-white/5"
            >
              {isFullscreen ? <Minimize className="w-5 h-5 text-foreground" /> : <Maximize className="w-5 h-5 text-foreground" />}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative">
          <div className="max-w-[1400px] mx-auto w-full h-full flex flex-col">
            {trial && !trialExpired && trialDaysRemaining != null && (
              <div data-testid="trial-banner" className={`mb-4 flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
                (trialDaysRemaining ?? 8) <= 1
                  ? "bg-red-50 border-red-200 text-red-800"
                  : (trialDaysRemaining ?? 8) <= 3
                    ? "bg-amber-50 border-amber-200 text-amber-800"
                    : "bg-blue-50 border-blue-200 text-blue-800"
              }`}>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span>
                    {trialDaysRemaining === 0
                      ? "Seu período de teste expira hoje!"
                      : trialDaysRemaining === 1
                        ? "Último dia do seu período de teste!"
                        : `Período de teste: ${trialDaysRemaining} dias restantes`}
                  </span>
                </div>
                {settings.whatsappNumber ? (
                  <a
                    href={`https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent("Olá, quero contratar um plano do sistema.")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 underline underline-offset-2 hover:opacity-80 transition-opacity flex-shrink-0"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Contratar plano
                  </a>
                ) : (
                  <span className="flex items-center gap-1.5 opacity-50 flex-shrink-0">
                    <MessageCircle className="w-3.5 h-3.5" />
                    Contratar plano
                  </span>
                )}
              </div>
            )}
            <CashStatusAlert />
            {children}
          </div>
        </main>

        {/* Mobile Bottom Nav — shows grouped items flat */}
        <nav className="md:hidden flex items-center justify-around bg-sidebar border-t border-sidebar-border py-2 safe-bottom overflow-x-auto">
          {bottomNavItems.map((item) => {
            const isActive = isGroup({ ...item, id: "", children: [] } as any)
              ? false
              : item.href === "/financeiro"
                ? isFinancialActive
                : location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <a
                  data-testid={`nav-mobile-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors flex-shrink-0 ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-[9px] font-medium tracking-wide">{item.label}</span>
                </a>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
