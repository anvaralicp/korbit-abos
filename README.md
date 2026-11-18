# KORBIT ABOS — Autonomous Business Operating System

> **Enterprise-Grade Multi-Tenant SaaS Platform for Distributed Hierarchies, Field Sales Automation, and Autonomous Revenue Operations.**

---

## 🚀 Executive Summary

**KORBIT ABOS** (Autonomous Business Operating System) is a multi-tenant enterprise operating system engineered for geographically distributed sales, field operations, and corporate hierarchies. It combines strict Indian statutory compliance (**Digital Personal Data Protection Act 2023**), autonomous approval escalation engines, hierarchical discount limits (DLD), voice-to-CRM artificial intelligence, and a centralized **Layer 00 SaaS Super Admin Control Plane**.

---

## 🏛️ System Architecture & Core Modules

### 1. 6-Layer Multi-Tenant Organizational Hierarchy
KORBIT enforces strict row-level security and data isolation across tenants using materialized organizational paths (`/tenant_id/zone/region/city/executive`):
- **Layer 00**: SaaS Platform Owner / Super Admin (`/super-admin`) — tenant governance, subscription enforcement, dynamic brand studio, payment audit logs, and marketing lead management.
- **Layer 01**: Tenant Super Administrator — full company configuration, department oversight, and master audit trails.
- **Layer 02**: C-Suite Department Heads (Sales Head, HR Head, Commercial Head).
- **Layer 03**: Zonal Business Managers (e.g., South Zone).
- **Layer 04**: Regional Sales Managers (e.g., Kerala Region).
- **Layer 05**: City / Branch Managers (e.g., Kochi City).
- **Layer 06**: Frontline Field Executives (e.g., Rahul Sharma - EMP0234).

### 2. Autonomous Business Modules (Modules 1–6)
1. **Module 1: Organizational Hierarchy & Dynamic DLD Matrix**  
   Configurable Discount Level Delegation (DLD) with automated SLA countdowns and hierarchical tier ceilings.
2. **Module 2: Client Management & Strict DPDP 2023 GPS Tracking**  
   Field executive tracking with explicit employee consent gates, battery-optimized geofencing, and an instantaneous privacy kill-switch.
3. **Module 3: Deals, Pipeline & Automated Multi-Tier Approvals**  
   Opportunity progression across 6 stages from lead qualification to won/closed.
4. **Module 4: Automated Indian GST Proposals & PDF Generation**  
   HSN/SAC-compliant invoices, automated CGST/SGST/IGST state splits, and client proposal downloads.
5. **Module 5: Autonomous SLA Auto-Escalation Engine**  
   Every pending discount approval has an expiring SLA; when a manager breaches SLA, the autonomous engine escalates it up the hierarchical chain.
6. **Module 6: Financial Reconciliation & Commission Settlement**  
   Automated ledger generation, DSO collection tracking, bad-debt risk flags, and manager commission payouts.

### 3. Public Funnel & Super Admin Control Plane (Phases 6–9)
- **Public Interactive Homepage & Solution Configurator**: Dynamic industry selector, ROI simulator, and lead capture pipeline.
- **Layer 00 Dynamic Branding Studio**: Live runtime theme customization (platform name, badge text, color palette, logo URL, typography) without redeploying code.
- **Tenant Support Widget**: In-app encrypted support ticketing system with priority escalation to Layer 00 Super Admin.
- **Transactional Email Notification System**: Automated 72-hour reset links, DPDP consent tracking, and resignation auto-disable.

---

## 🛠️ Technology Stack

| Component | Technology |
| :--- | :--- |
| **Framework** | Next.js 16 (Turbopack, App Router, React 19) |
| **Language** | TypeScript (Strict mode) |
| **Database & ORM** | PostgreSQL with Prisma ORM |
| **Styling & UI** | Tailwind CSS v4, Lucide React, Geist Fonts |
| **Authentication** | Node.js Crypto HMAC-SHA256 HTTP-only session cookies (Zero third-party vendor lock-in) |
| **AI Integration** | Google Gemini 2.5 Flash (Voice-to-CRM audio transcription & entity extraction) |
| **Payments** | Razorpay Node SDK (Order generation, signature verification, webhook handling) |
| **Cron Scheduling** | Vercel Cron / Linux Systemd Crontab / HTTP API Worker (`/api/cron/escalate-discounts`) |
| **Containerization** | Docker (Multi-stage Alpine Linux) & Docker Compose |

---

## 🔑 Pre-Seeded Demonstration Credentials

Run `npm run db:seed` to populate the database with our complete test environment:

### Layer 00 Platform Super Admin Control Plane
- **URL**: [`/super-admin/login`](http://localhost:3000/super-admin/login)
- **Email**: `superadmin@korbit.in`
- **Password**: `Korbit#SuperAdmin2026`

### Tenant User Accounts (KORBIT Enterprise Demo Pvt Ltd)
- **URL**: [`/login`](http://localhost:3000/login)
- **Default Password for All Tenant Users**: `Korbit#Demo2026`

| Role & Layer | Email | Department / Scope |
| :--- | :--- | :--- |
| **Layer 01: Admin** | `admin@korbit.in` | Tenant Super Administrator (All Divisions) |
| **Layer 02: Sales Head** | `saleshead@korbit.in` | National Sales Oversight |
| **Layer 02: Commercial Head** | `commercial@korbit.in` | Commercial & Financial Approvals |
| **Layer 02: HR Head** | `hr@korbit.in` | Human Resources & Personnel |
| **Layer 03: South Zone Manager** | `southzone@korbit.in` | South Zone Division |
| **Layer 04: Kerala Region Manager** | `kerala@korbit.in` | Kerala Regional Division |
| **Layer 05: Kochi City Manager** | `kochi@korbit.in` | Kochi Branch Operations |
| **Layer 06: Field Executive** | `rahul@korbit.in` | Field Operations (Kochi Hub) |

---

## 💻 Local Quickstart

### Prerequisites
- Node.js 20.x or 22.x LTS
- PostgreSQL 15+ running locally (or via Docker)
- Git

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/anvaralicp/korbit-abos.git
cd korbit-abos
npm install
```

### 2. Environment Configuration
Copy the template and adjust secrets as needed:
```bash
cp .env.example .env
```

Ensure `DATABASE_URL` points to your PostgreSQL instance:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/korbit_abos?schema=public"
AUTH_SECRET="your-32-character-random-secret"
CRON_SECRET="your-high-entropy-cron-secret"
```

### 3. Initialize & Seed Database
```bash
npm run db:push
npm run db:seed
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the public showcase, [/login](http://localhost:3000/login) for the tenant portal, or [/super-admin/login](http://localhost:3000/super-admin/login) for the platform owner control plane.

### 5. Run Automated End-to-End MVP Verification
Execute the test harness to verify DPDP consent validation, DLD matrix escalation, Indian GST calculations, and session security:
```bash
npm run verify:e2e
```

---

## ☁️ Deployment Instructions

### Option A: 1-Click Deploy on Vercel

1. **Connect Repository**: Import the repository on [Vercel](https://vercel.com).
2. **Environment Variables**: Add the following in Vercel Project Settings:
   - `DATABASE_URL`: Hosted Postgres connection string (e.g., Neon, Supabase, AWS RDS).
   - `AUTH_SECRET`: Strong secret key (min 32 chars).
   - `CRON_SECRET`: Random secret matching your automated trigger.
   - `NEXT_PUBLIC_APP_URL`: Your production domain (`https://abos.yourdomain.com`).
   - `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET`: Razorpay live or test credentials.
   - `GEMINI_API_KEY`: Google Gemini API key.
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`: Transactional mailer settings.
3. **Build Command**: Set to `npm run build` (or leave as default; `package.json` automatically runs `prisma generate && next build`).
4. **Automated Cron**: Vercel automatically registers `vercel.json` and runs the discount SLA auto-escalation engine every 15 minutes (`*/15 * * * *`).

### Option B: Deploy on Coolify / Self-Hosted Linux VPS (Docker)

KORBIT ABOS includes a production multi-stage `Dockerfile` and `docker-compose.yml` pre-configured for Coolify and Docker Swarm:

1. **Launch Stack**:
   ```bash
   docker compose up -d --build
   ```
2. **Execute Database Migration & Seed inside Container**:
   ```bash
   docker compose exec korbit-abos npx prisma db push
   docker compose exec korbit-abos npx tsx prisma/seed.ts
   ```
3. **Configure VPS System Cron (Optional if not using Vercel Cron)**:
   Add this entry to `/etc/crontab` to ping the SLA escalation endpoint every 15 minutes:
   ```cron
   */15 * * * * curl -X GET https://abos.yourdomain.com/api/cron/escalate-discounts?secret=YOUR_CRON_SECRET
   ```

---

## 🔒 Security & Statutory Compliance

- **DPDP 2023 Compliant**: The application mandates explicit digital consent before recording any GPS telematics. Field agents can exercise their right to disconnect via the one-tap GPS privacy kill-switch.
- **Tenant Isolation**: Every database query is tenant-scoped with explicit `tenantId` relational filters and HMAC-SHA256 signed session verification.
- **Tamper-Proof Audit Trail**: All discount escalation overrides, resignation events, and Layer 00 subscription modifications are immutably logged with timestamps and operator credentials.

---

## 📜 Available NPM Scripts

- `npm run dev`: Launch local Next.js development server with Turbopack.
- `npm run build`: Generate Prisma client and compile production Next.js bundle.
- `npm run start`: Start production server.
- `npm run lint`: Run ESLint checks across codebase.
- `npm run db:push`: Synchronize Prisma schema with database.
- `npm run db:seed`: Seed complete 6-layer demo tenant and Layer 00 Super Admin.
- `npm run verify:e2e`: Run full automated end-to-end verification suite.

---

## 📄 License
Proprietary & Confidential — © 2026 KORBIT Technologies. All rights reserved.
