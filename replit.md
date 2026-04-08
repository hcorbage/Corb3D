# C3D Manager 1.0® - Sistema de Orçamentos para Impressão 3D

## Overview
C3D Manager 1.0® is a full-stack 3D printing quote management system designed for the Brazilian market. It calculates printing costs factoring in materials, time, electricity, printer depreciation, and desired profit margins. The system includes comprehensive modules for client management, material inventory, stock control, and a quote history with status tracking. A core feature is its multi-tenant architecture, ensuring each user has completely isolated data, enhancing privacy and data integrity. The project aims to provide a robust, user-friendly solution for 3D printing businesses to streamline their quoting and financial operations.

## User Preferences
- All UI in Portuguese (Brazilian)
- Light theme (white/gray backgrounds, dark text)
- Never modify formulas/calculations unless explicitly requested
- Data persistence across sessions (PostgreSQL)
- Deployment for online access
- Each user must have completely isolated data - no user sees another's data

## System Architecture
The system is built with a modern web stack:
- **Frontend**: React, Vite, TailwindCSS, and shadcn/ui provide a responsive and intuitive user interface.
- **Backend**: Express.js handles API requests, Drizzle ORM manages database interactions, and PostgreSQL serves as the primary data store.
- **State Management**: React Context (AppState.tsx) is used for global state management, heavily integrating with API calls for data synchronization.
- **Routing**: wouter is used for client-side navigation.
- **Multi-tenancy**: Achieved by including a `userId` column in all data tables and enforcing filtering at the storage layer, ensuring strict data isolation between users.
- **UI/UX**: Features a theme system (light/dark/system) with user preferences stored in localStorage. The UI prioritizes clarity and ease of use for managing complex financial and inventory data.
- **RBAC (Role-Based Access Control)**: Full SaaS multi-tenant RBAC with three roles: `super_admin` (hcorbage — master of the platform), `company_admin` (each business owner), and `employee` (linked to a company_admin via companyId). Permissions are stored in a `userPermissions` table with 11 modules. Backend enforces via `requirePermission(module)` middleware. Frontend hides nav items via `hasPermission(module)` from AuthContext. Company admins manage employee permissions via a UI modal in Settings.
- **Login Generation**: Both company_admin and employee logins are auto-generated as firstInitial + lastInitial + birthYear (e.g. "hc1990"). Collision-safe (adds _1, _2 suffix if needed).
- **Trial System**: New company_admin accounts get a 7-day free trial (`trial=true`, `trialEndsAt` set 7 days from creation, `mustChangePassword=true`). On first login, they see a welcome screen explaining the trial inside ForceChangePassword. While the trial is active, a dismissible banner shows days remaining (color-coded: blue→amber→red). When the trial expires (`trialExpired=true`), the entire app is replaced with a "Período de teste encerrado" screen with a WhatsApp contact link. Existing users and super_admin are never affected by trial logic.
- **Access Control System**: Each company_admin account has an `accessStatus` field: `"trial"` (active trial with countdown), `"full"` (unlimited access), or `"blocked"` (login works but all functionality is blocked). Managed manually by super_admin in Ajustes → "Controle de Acesso — Contas/Empresas". The panel shows each account's status badge, trial dates, days remaining, first-access indicator, and inline controls to change status + set trial end date. The backend exposes `PATCH /api/users/:id/access-status` (master_admin only). Startup migration sets `accessStatus = "trial"` for users where `trial = true`. The `computeAccessData()` helper in routes.ts is the single source of truth for access/trial data returned by login and /api/auth/me.
- **Email Password Recovery**: Token-based 2-step flow — user enters username or email, backend sends a 6-char code (SHA-256 hashed, 15-min expiry) via SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` env vars) or console fallback. Routes: `POST /api/auth/forgot-password` and `POST /api/auth/confirm-reset-password`. Token stored in `password_reset_tokens` table. Login page (Login.tsx) has 4-step reset UI: idle → request → confirm → success. Company_admin accounts have an optional `email` field set at creation (super_admin form) and used for recovery.
- **Audit Log System**: Critical destructive operations (reset_company, reset_system) are recorded in the `audit_logs` table. Each entry stores: executedByUserId, executedByUsername, action, targetUserId, targetUsername, details, createdAt. Populated via `storage.createAuditLog()` immediately after each reset. The table is append-only and never cleared by any reset operation.
- **Advanced Reset (super_admin only)**: Ajustes → "Avançado" section (hidden for all other roles) allows resetting operational data of one company or all companies. Protected by `requireMasterAdmin` middleware + bcrypt password verification + exact confirmation text ("RESETAR EMPRESA" / "RESETAR SISTEMA"). Super admin is identified exclusively by `role === "super_admin"` in the session (no username dependency at runtime).
- **Server-Side Backup System**: `server/backup.ts` generates `.json.gz` backups for all 13 company-scoped tables via `generateCompanyBackup(companyId, generatedBy)`. Auto-prunes to last 5 backups. Path traversal protected via `path.basename()` + `startsWith()`. Routes: `POST /api/backup/generate`, `GET /api/backup/list`, `GET /api/backup/download/:filename`. company_admin accesses only own scope; super_admin can target any company via `?companyId=`. Backup directory: `BACKUP_DIR` env var (defaults to `./backups/companies` in dev, `/var/backups/corb3dapp/companies` in production). UI section in Settings.tsx visible to all admins (isAdmin=true).
- **Restore Company Backup (super_admin only)**: New dedicated route `POST /api/backup/restore-company` — enforces `isMasterAdmin`, accepts `{ fileBase64, companyId }`, calls `restoreCompanyBackupFromBuffer()` (atomic transaction, pre-backup auto-generated), then logs to `audit_logs` with action `restore_company_backup`. UI in Settings.tsx "Avançado" block: company selector (usersList), file picker (.json.gz), modal confirmation with warning + file details, results panel showing per-table stats. Completely isolated from other companies' data.
- **Custom Printers System**: Users can register custom printers not in the preset list. Stored in `custom_printers` DB table (userId-scoped). Preset printers remain hardcoded in AppState.tsx; custom ones are fetched from `GET /api/printers` and merged. `Printer.isCustom` flag distinguishes them. In the select dropdown, presets appear under "Impressoras Padrão" optgroup and custom ones under "Minhas Impressoras". Settings.tsx has a "Minhas Impressoras" card with add-form (name, brand, model, marketValue, hourlyConsumption, depreciationPerHour) and list with delete.
- **Printer Market Value**: `printerMarketValue` (nullable double) added to settings table and `AppSettings` type. Auto-filled from selected preset's `marketPrice` on printer selection change. Editable field shown before "Valor de Compra Efetivo" in the printer config section. Displayed in the config summary panel.
- **Technical Implementations**: Includes robust financial modules for daily cash management, order financial tracking, and detailed client financial summaries. Inventory management supports stock movements, minimum quantity alerts, and integration with the calculator for availability checks. Role-based access control (RBAC) is implemented to differentiate between admin and employee functionalities, with specific access to modules like commissions and reports.
- **Feature Specifications**:
    - **Calculator**: Supports multi-item quotes, dynamic adjustments for loss margin and discounts, finishing costs, and includes employee/seller selection.
    - **Financials**: Comprehensive financial dashboard, per-order payment tracking, daily cash register with automatic opening/closing, and financial reports with PDF export.
    - **Inventory**: Detailed stock management with movement tracking (entrada/saída/ajuste), minimum quantity alerts, and brand management.
    - **Client Management**: Client cards with expandable financial summaries (total bought, paid, pending, due) and status badges.
    - **User Management**: Admin-controlled user and employee creation, self-service password reset, and role-based access.

## External Dependencies
- **PostgreSQL**: Primary database for all application data.
- **bcryptjs**: Used for hashing user passwords securely.
- **express-session**: Manages user sessions for authentication.
- **TailwindCSS**: Utility-first CSS framework for styling.
- **shadcn/ui**: UI component library built on TailwindCSS.
- **Drizzle ORM**: TypeScript ORM for interacting with the PostgreSQL database.
- **Vite**: Frontend build tool.
- **wouter**: A tiny React hook-based router.