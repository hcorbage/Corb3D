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