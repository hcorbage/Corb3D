# C3D Manager 1.0® - Sistema de Orçamentos para Impressão 3D

## Overview
Full-stack 3D printing quote management system in Portuguese (Brazilian). Calculates printing costs based on materials, time, electricity, printer depreciation, and desired profit margin. Includes modules for client management, material inventory, stock control, quote history with status tracking, and comprehensive settings. Multi-tenant: each user has completely isolated data.

## Recent Changes
- 2026-03-31: Client financial summary in each Client card (expandable panel with total comprado/pago/pendente/a_faturar + status badge); fetchs from new GET /api/client-financials endpoint; status: Em dia / A Faturar / Pendente / Inadimplente
- 2026-03-31: New "Relatório por Cliente" page (/relatorio-clientes): full table with filters (status, search), sort by column, summary cards, top-3 ranking, PDF export; uses same /api/client-financials endpoint
- 2026-03-31: Backend getClientFinancialsSummary() aggregates orderFinancials by clientName with SQL: qtdPedidos, totalComprado, totalPago, aFaturar, pendenteNaoFaturar, temVencido (overdue detection via CURRENT_DATE)
- 2026-03-31: Added birthdate column to employees table (schema + db:push); login generation already used initials+year (hc1990); birthdate is now properly stored in DB
- 2026-03-24: Caixa automático completo: openType (automatico/manual/reabertura) + closeType (automatico/manual) + reopenedByName/reopenedAt on dailyCash; auto-open without user name when automatic; reopen endpoint (POST /api/daily-cash/:id/reopen) for admins; auto-close scheduler (setInterval 60s) runs server-side; Settings has auto-close toggle+time picker (default 19:00); CaixaDiario shows distinct badges for each event type in history; Reabrir button shown when cash is closed today
- 2026-03-24: Caixa Diário rules complete: auto-open at configurable time (settings toggle+time picker); only admin can open/close; openedByName+closedByUserId+closedByName+closedAt recorded on dailyCash; Calculator shows CAIXA badge (green dot=open, red=closed); employees blocked from cash screen; all entries show sellerName column in CaixaDiario table
- 2026-03-24: Cash register rules: when daily cash is open, all sales/receipts (from any user/employee) are linked to the cash owner's userId automatically; sellerUserId+sellerName stored to track who made the sale; displayed in CaixaDiario + PedidosFinanceiro tables
- 2026-03-24: Comprehensive Financial Module: FinanceiroDashboard, PedidosFinanceiro, CaixaDiario, Relatorios pages; orderFinancials, orderPayments, dailyCash DB tables; API routes for all new features; 4 new nav items (admin only)
- 2026-03-24: CashBook: added type (entrada/saída) and category fields to entry form and table; summary cards now show entradas/saídas/saldo separately; History confirmation now creates orderFinancial + orderPayment records (which auto-create cash entries)
- 2026-03-24: Livro Caixa module: cashEntries + cashClosings tables; full CRUD backend; CashBook.tsx page with entries list, filters, payment method summary, period closing (Fechar Caixa), print balance; nav item in Layout (admin only)
- 2026-03-24: History page: confirming a quote now opens payment modal (amount + payment method selector); creates order financial record + payment automatically on confirmation
- 2026-03-24: Settings: credentials modal differentiates "Usuário Cadastrado!" vs "Funcionário Cadastrado!" based on creation type
- 2026-03-20: Calculator: loss margin slider (0-30%) increases material cost to cover print failures; discount slider (0 to maxDiscount%) reduces final price; both excluded from saving to history; discount only appears in PDF/WhatsApp when applied
- 2026-03-20: Settings: maxDiscount field (admin only) sets maximum authorized discount % for calculator; 0 = disabled
- 2026-03-10: Calculator: finishing (acabamento) fields per item - text description, currency value, and activation checkbox; value added to grand total but excluded from profit margin calculation
- 2026-03-09: Brands management: brands table in database (multi-tenant), seeded with default brands including F3d, Masterprint, Triade
- 2026-03-09: Inventory page uses database brands instead of hardcoded list; "+" button to add new brands inline
- 2026-03-09: Inventory sorting: clickable sort buttons on Brand and Color columns (A-Z / Z-A toggle)
- 2026-02-24: Multi-admin architecture: every registered user is independent admin with isolated data; only "hcorbage" is master admin
- 2026-02-24: Self-registration removed from login page; only master admin creates new users via Settings
- 2026-02-24: User creation form in Settings includes CPF/birthdate fields; /api/auth/register disabled
- 2026-02-24: Master admin (isMasterAdmin) controls user management and employee CRUD; requireMasterAdmin middleware
- 2026-02-24: Settings page hides Employees and User Management sections for non-master admins
- 2026-02-24: Admin History page shows Custo (cost) and Lucro (profit) columns; view modal shows detailed cost/venda/lucro breakdown
- 2026-02-24: Profit margin preserved on old calculations - editing a saved quote uses the original margin, not the current one
- 2026-02-24: Calculator saves profitMarginUsed in details JSON; overrideMargin state used when editing historical quotes
- 2026-02-23: Employee registration now uses full form (like clients), auto-generates username/password, sends credentials via WhatsApp
- 2026-02-23: Admin password reset requires CPF + birthdate verification; CPF/birthdate collected during initial setup
- 2026-02-23: Self-service password reset - employees can generate temporary password; forced to create new password on next login
- 2026-02-23: Role-based access control - admin sees all pages; non-admin (employees) only see Calculator, History (own), Commissions (without % rate), and password change
- 2026-02-23: Password hint system - users can set a hint during registration/password change; login page has "forgot password" hint button
- 2026-02-23: Login page has show/hide password toggle (eye icon)
- 2026-02-23: Added Employees & Commissions module (employees table, employee CRUD, commission reports page)
- 2026-02-23: Calculator now has employee/seller selector; calculations store employeeId/employeeName
- 2026-02-23: Commissions page shows monthly sales summary per employee with detailed breakdown
- 2026-02-23: Renamed system from "Solid3DCALC" to "Corb3D Manager 1.0" across all files
- 2026-02-22: Multi-tenant data isolation - each user has separate clients, materials, stock, calculations, settings
- 2026-02-22: userId column added to all data tables; all queries filter by userId
- 2026-02-22: Materials seeded per user on registration/first login (71 types)
- 2026-02-22: User deletion cascades all user data (clients, materials, stock, calculations, settings)
- 2026-02-22: Security: stripUserId function prevents cross-tenant data injection via API
- 2026-02-22: Mobile-responsive user management layout with stacked form fields
- 2026-02-21: Converted from frontend-only prototype to full-stack with PostgreSQL database
- 2026-02-21: Added authentication system (users table, bcryptjs hashing, express-session)
- 2026-02-21: Login page with first-user setup flow; registration locked after first user

## User Preferences
- All UI in Portuguese (Brazilian)
- Light theme (white/gray backgrounds, dark text)
- Never modify formulas/calculations unless explicitly requested
- Data persistence across sessions (PostgreSQL)
- Deployment for online access
- Each user must have completely isolated data - no user sees another's data

## Project Architecture
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui
- **Backend**: Express.js + Drizzle ORM + PostgreSQL
- **State Management**: React Context (AppState.tsx) with API calls
- **Routing**: wouter
- **Multi-tenancy**: userId column on all data tables, enforced at storage layer
- **Key Features**: Calculator with multi-item support, PDF export, WhatsApp integration, CEP auto-fill, Excel backup/import

## Key Files
- `shared/schema.ts` - Database schema (Drizzle ORM) with userId on all data tables
- `server/storage.ts` - CRUD operations interface with userId filtering
- `server/routes.ts` - API endpoints + auth routes + stripUserId security
- `server/db.ts` - Database connection
- `client/src/context/AppState.tsx` - Frontend state management (API-connected)
- `client/src/App.tsx` - Root component with auth gate
- `client/src/pages/Login.tsx` - Login/register page
- `client/src/pages/Calculator.tsx` - Main calculator page
- `client/src/pages/History.tsx` - Quote history with status tracking
- `client/src/pages/Clients.tsx` - Client management
- `client/src/pages/Inventory.tsx` - Stock control
- `client/src/pages/Settings.tsx` - System settings + backup + user management
- `client/src/pages/Commissions.tsx` - Employee commissions report page
- `client/src/pages/FinanceiroDashboard.tsx` - Financial dashboard with charts and summary cards
- `client/src/pages/PedidosFinanceiro.tsx` - Per-order payment tracking (orderFinancials/orderPayments)
- `client/src/pages/CaixaDiario.tsx` - Daily cash register open/close with reconciliation
- `client/src/pages/Relatorios.tsx` - Financial reports with filters and PDF export

## Database Tables
- `users` - User accounts (bcryptjs hashed passwords, isAdmin boolean)
- `clients` - Client registry (userId-scoped)
- `materials` - Material types (71 defaults seeded per user, userId-scoped)
- `stock_items` - Stock inventory with brand/color/quantity (userId-scoped)
- `employees` - Employee registry with commission rate (userId-scoped)
- `calculations` - Quote history with details JSON, employeeId/employeeName (userId-scoped)
- `brands` - Brand names for stock items (userId-scoped, seeded with defaults)
- `settings` - System configuration per user (userId-scoped, id=userId)
- `cashEntries` - Cash book entries with type (entrada/saída), category, status, effectiveDate (userId-scoped)
- `cashClosings` - Period closings for cash book (userId-scoped)
- `orderFinancials` - Per-order financial tracking: totalAmount, amountPaid, amountPending, status (pendente/parcial/pago) (userId-scoped)
- `orderPayments` - Individual payment records for orders, linked to orderFinancials (userId-scoped)
- `dailyCash` - Daily cash register: open/close with opening/closing balances, reconciliation, paymentSummary JSONB (userId-scoped)

## Authentication & Authorization
- First access shows setup mode to create initial admin account (isAdmin=true)
- Registration locked after first user; only admin can create new accounts
- express-session with 7-day cookies (stores userId, username, isAdmin)
- All /api/* routes (except auth) protected with requireAuth middleware
- User management routes (GET/POST/DELETE /api/users) restricted to admin via requireAdmin middleware
- Password change: self requires current password; admin can reset others without it
- Password hint system: users set hints during registration/password change; login page shows hints via /api/auth/password-hint
- Login page has show/hide password toggle (eye icon)
- Role-based access: admin sees all pages; non-admin sees only Calculator, History, Commissions (without % rate), and Settings (password change only)
- Frontend: AuthContext provides isAdmin to all components; AdminRoute redirects non-admin away from restricted pages
- Frontend: Layout filters navigation items based on isAdmin (hides Estoque, Clientes for non-admin)

## Multi-Tenant Data Isolation
- Every data table has userId column; all storage queries filter by userId
- Routes extract userId from session and pass to storage; stripUserId() removes userId from request bodies
- Materials seeded per user on registration and first login via seedMaterialsForUser()
- Settings use userId as primary key (one settings row per user)
- User deletion cascades: deletes all clients, materials, stock, calculations, settings for that user
- No user can see, modify, or access another user's data (including admin)

## Notes
- Printers list is static in frontend (not in database)
- Calculator draft saved to localStorage for tab persistence
- Edit button in History loads calculation into Calculator
