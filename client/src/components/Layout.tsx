import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { Calculator, Package, Users, History, Settings, LogOut, Menu, X, Maximize, Minimize, BadgeDollarSign } from "lucide-react";
import { useAppState } from "../context/AppState";
import { useAuth } from "../context/AuthContext";


export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { settings } = useAppState();
  const { isAdmin } = useAuth();
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

  const allNavItems = [
    { href: "/", label: "CALCULADORA", icon: Calculator, adminOnly: false },
    { href: "/inventory", label: "ESTOQUE", icon: Package, adminOnly: true },
    { href: "/clients", label: "CLIENTES", icon: Users, adminOnly: true },
    { href: "/history", label: "HISTÓRICO", icon: History, adminOnly: false },
    { href: "/commissions", label: "COMISSÕES", icon: BadgeDollarSign, adminOnly: false },
    { href: "/settings", label: "AJUSTES", icon: Settings, adminOnly: false },
  ];

  const navItems = useMemo(() => 
    allNavItems.filter(item => !item.adminOnly || isAdmin),
    [isAdmin]
  );

  return (
    <div className="flex h-[100dvh] bg-background text-foreground font-sans">
      <aside className="hidden md:flex w-64 bg-sidebar border-r border-sidebar-border flex-col transition-all duration-300">
        <div className="p-4 flex flex-col items-center justify-center border-b border-sidebar-border mb-4">
          {settings?.logoUrl ? (
            <div className="w-full aspect-square bg-transparent rounded-xl flex items-center justify-center overflow-hidden px-2">
              <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic py-4">Sua logo aqui</p>
          )}
        </div>
        
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <a
                  data-testid={`nav-${item.label.toLowerCase()}`}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive 
                      ? "bg-primary/10 text-primary font-semibold relative after:absolute after:left-0 after:top-2 after:bottom-2 after:w-1 after:bg-primary after:rounded-r-md" 
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-sm tracking-wide">{item.label}</span>
                </a>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-4 pt-2 border-t border-sidebar-border mt-2">
          <button
            data-testid="button-logout"
            onClick={() => {
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
            
            <nav className="flex-1 px-3 py-4 space-y-1">
              {navItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <a
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                        isActive 
                          ? "bg-primary/10 text-primary font-semibold" 
                          : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                      }`}
                    >
                      <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-sm tracking-wide">{item.label}</span>
                    </a>
                  </Link>
                );
              })}
            </nav>

            <div className="px-3 pb-4 pt-2 border-t border-sidebar-border mt-2">
              <button
                onClick={() => {
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
          <button
            data-testid="button-fullscreen"
            onClick={toggleFullscreen}
            className="p-2 rounded-lg hover:bg-white/5"
          >
            {isFullscreen ? <Minimize className="w-5 h-5 text-foreground" /> : <Maximize className="w-5 h-5 text-foreground" />}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative">
          <div className="max-w-[1400px] mx-auto w-full h-full flex flex-col">
            {children}
          </div>
        </main>

        <nav className="md:hidden flex items-center justify-around bg-sidebar border-t border-sidebar-border py-2 safe-bottom">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <a
                  data-testid={`nav-mobile-${item.label.toLowerCase()}`}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
                </a>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
