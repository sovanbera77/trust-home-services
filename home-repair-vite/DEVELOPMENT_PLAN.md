# Trust Home Services — Development Plan

## Overview
Full-stack home repair service platform (PWA + Capacitor Android).
Current state: client-side only with IndexedDB, backend-ready infrastructure,
7-language i18n, Razorpay payments, real-time sync, Capacitor mobile wrapper.

---

## Phase A — Backend Integration & Auth (2–3 weeks)

### A1. Node.js/Express Backend
- REST API mirroring all 9 service interfaces in `src/lib/api/services.ts`
- JWT auth (access + refresh tokens) — wire into `src/lib/api/auth.ts`
- MongoDB / PostgreSQL schema matching `src/lib/types.ts`
- Multer/S3 for photo uploads (docket photos, profile pics)

### A2. Toggle Backend Mode
- `VITE_USE_BACKEND=true` in `.env` activates API calls over IndexedDB
- Sync engine (`src/lib/sync.ts`) pushes/pulls deltas on reconnect
- Seamless fallback: API failure → IndexedDB + offline queue

### A3. Seed Data API
- `/api/seed` endpoint that populates demo users, dockets, inventory
- E2E tests can hit `/api/reset` for clean state between runs

---

## Phase B — Admin & Operations (2–3 weeks)

### B1. Role-Based Access Control (RBAC)
- `manager` role (type already added): assign dockets, view analytics, no user delete
- Permission matrix: `{ read, write, delete }` per resource per role
- Admin can create manager accounts from Users tab

### B2. Manager Dashboard
- Filtered view: only see dockets for their assigned region/team
- Approval workflow: employee completes → manager approves → revenue logged
- Team performance overview

### B3. Docket Timeline Integration
- Wire `addActivityLog` into all docket operations (create, assign, complete, reject, chat, payment)
- Display `DocketTimeline` component in docket detail modal (Admin/Employee/Customer)
- Activity logs persist via IndexedDB/API

### B4. Inventory Barcode Scanning
- Install `@capacitor-mlkit/barcode-scanning`
- Wire `lib/scanner.ts` into InventoryTab "Add Item" flow
- Scan SKU → auto-fill name/price from product database

---

## Phase C — Mobile & Offline (2 weeks)

### C1. Capacitor Push Notifications
- Configure FCM via `@capacitor/push-notifications` (already installed)
- Service worker listens for push events → show notification
- Notification payload: docket assigned, SOS alert, payment received

### C2. Camera Integration
- `takePhoto()` already in `lib/native.ts`
- Add camera button to: Employee job completion, Customer new request, Chat messages
- Photos stored as base64 in IndexedDB (and uploaded to S3 when backend active)

### C3. Offline-First Architecture
- `lib/offlineQueue.ts` already created — wire into API client
- Show offline indicator banner when `navigator.onLine === false`
- Cache critical pages in service worker (workbox already configured)
- Background sync for queued mutations

### C4. SOS Emergency Flow
- SOS button sends: push notification to all online employees + SMS to emergency contacts
- `lib/sms.ts` creates SOS message with Google Maps link
- Admin SOS dashboard: shows active SOS alerts with location + countdown

---

## Phase D — Customer Experience (2 weeks)

### D1. Multi-step Booking Wizard
- `ServiceWizard` already created — integrate it as the default "New Request" flow
- Step 1: Category → Sub-service selection
- Step 2: Address, description, preferred date
- Step 3: Review → submit → `addActivityLog` + notification

### D2. Referral & Loyalty Program
- `ReferralProgram` component already created — add to CustomerDashboard
- Show referral code + share button
- Loyalty points: 1 point = ₹10 earned, redeemable on next service
- Points history in a new tab

### D3. Follow-up Reminders
- `lib/reminders.ts` already created — run on app init
- Review reminder at 7 days (notifications tab)
- Service due reminder at 6 months
- Push notification when reminder triggers

### D4. Service History Dashboard
- Customer sees timeline of all past services
- Re-book button: clone previous docket with updated date
- Rating + review from history (not just completion)

---

## Phase E — Analytics & Intelligence (1–2 weeks)

### E1. Advanced Analytics
- Revenue forecasting: linear regression on monthly trends
- Employee utilisation: % of working hours with active jobs
- Peak service hour detection: which days/times get most bookings
- Churn prediction: customers with no activity in 90+ days

### E2. Route Optimisation
- `RouteOptimizer` component already created — add to EmployeeDashboard
- Show optimised stop order using nearest-neighbour algorithm
- Google Maps "directions" link per stop

### E3. AI Service Recommendations
- `lib/recommendations.ts` already created — show in CustomerDashboard
- "Based on your history" panel with 3–5 suggestions
- Score calculation: usage frequency × avg rating × price affinity

---

## Phase F — Production Hardening (1–2 weeks)

### F1. Comprehensive Testing
- Unit tests for all lib modules (currently 12 → target 40+)
- Component tests with Vitest + jsdom for all UI components
- E2E tests for new flows: wizard, referral, invoice, timeline
- Test coverage reporting: `vitest --coverage`

### F2. Error Monitoring
- Sentry/Rollbar integration (capture `logger.error` calls)
- Global error handler already in `lib/logger.ts`
- Error boundary with "Report" button that sends stack trace

### F3. Performance Budgets
- `lib/perfBudget.ts` already created — wire into CI pipeline
- `size-limit` package for bundle size enforcement
- Lighthouse CI for mobile perf scores (target: 80+)

### F4. Accessibility Audit
- WCAG 2.1 AA compliance
- Add `aria-*` attributes to all interactive elements
- Keyboard navigation for all modals/forms
- Screen reader testing with NVDA/VoiceOver

---

## Phase G — Deployment & DevOps (1 week)

### G1. CI/CD Pipeline
- GitHub Actions: lint → test → build → deploy
- Staging environment with Vercel/Netlify
- Production: `home-repair-app.com`

### G2. Android App Publishing
- `npx cap sync` → `npx cap open android`
- Generate signed APK/AAB with keystore
- Play Store listing: screenshots, description, privacy policy
- CodePush / app center for over-the-air updates

### G3. Docker Setup
- `Dockerfile` for backend
- `docker-compose.yml`: app + backend + MongoDB
- One-command local dev: `docker compose up`

---

## Phase H — Extended Future Vision (New Roadmap)

### ⚡ Phase 1: Customer Experience
- **Native Mobile App** — React Native or Flutter for Android/iOS (instead of just APK/Capacitor).
- **Multi-language** — Bengali + English + Hindi (i18n).
- **Real-time GPS Tracking** — Customers can see exactly where the technician is on a map.
- **Voice/Video Call** — In-app calling support via WebRTC or Twilio, alongside chat.
- **Smart Notification** — Omni-channel alerts (Email + SMS + WhatsApp + In-app push).

### 🤖 Phase 2: Automation & AI
- **Auto Dispatch** — Automatically assign tickets based on distance, rating, and workload.
- **Smart Scheduling** — ML-driven optimal route planning (advanced TSP solver).
- **Predictive Maintenance** — Alert AMC customers: "Your AC service is due soon".
- **AI Chatbot** — Answer general queries and automatically create support tickets.
- **Dynamic Pricing** — Adjust pricing based on job type, urgency, and location.

### 🏢 Phase 3: Business Growth
- **Multi-branch** — Support multiple locations with separate inventory and employees.
- **Vendor Management** — Manage spare parts suppliers natively.
- **HRMS Integration** — Payroll, leave management, and performance tracking (leveraging our HRMS folder).
- **Customer Loyalty** — Point system and discount coupons.
- **White-label** — Offer the platform to other businesses under their own branding.

### 🔐 Phase 4: Enterprise
- **Role-based Access Control** — Highly granular permissions matrix.
- **Audit Trail Complete** — Strict logging for all operational actions.
- **Data Export/Analytics** — PowerBI / Tableau integration via API.
- **Backup & DR** — Automated cloud backups and Disaster Recovery.
- **SLA Management** — Track and enforce Service Level Agreements.
