# Corb3D Manager 1.0 - Sistema de Orçamentos para Impressão 3D

## Overview
Full-stack 3D printing quote management system in Portuguese (Brazilian). Calculates printing costs based on materials, time, electricity, printer depreciation, and desired profit margin. Includes modules for client management, material inventory, stock control, quote history with status tracking, and comprehensive settings. Multi-tenant: each user has completely isolated data.

## Recent Changes
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

## Database Tables
- `users` - User accounts (bcryptjs hashed passwords, isAdmin boolean)
- `clients` - Client registry (userId-scoped)
- `materials` - Material types (71 defaults seeded per user, userId-scoped)
- `stock_items` - Stock inventory with brand/color/quantity (userId-scoped)
- `employees` - Employee registry with commission rate (userId-scoped)
- `calculations` - Quote history with details JSON, employeeId/employeeName (userId-scoped)
- `settings` - System configuration per user (userId-scoped, id=userId)

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
