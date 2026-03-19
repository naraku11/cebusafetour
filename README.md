# CebuSafeTour

A tourism safety platform for Cebu, Philippines. Tourists explore attractions safely, receive real-time advisories, access emergency services, and plan trips. Admins manage everything through a web portal with live updates.

---

## Architecture

```
┌────────────────────────────┬──────────────────────────────────────┐
│   MOBILE APP (Tourists)    │       ADMIN PORTAL (Web)             │
│   Flutter — Android / iOS  │       React 18 + Vite + Tailwind     │
├────────────────────────────┴──────────────────────────────────────┤
│                    REST API  +  Socket.IO                         │
│              Node.js / Express 5  ·  mysql2                       │
├───────────────────────────────────────────────────────────────────┤
│   MySQL (Hostinger)  ·  Firebase (FCM)  ·  OpenAI  ·  SMTP       │
└───────────────────────────────────────────────────────────────────┘
```

The backend and admin portal are deployed together as a **single Express app** on Hostinger. Express serves the API under `/api/*` and the compiled React admin panel as static files under `/`.

---

## Project Structure

```
cebusafetour/
├── src/                        # Express API
│   ├── app.js                  # Entry point — HTTP server + Socket.IO init
│   ├── config/                 # db.js (mysql2 pool), firebase.js
│   ├── controllers/            # auth, attractions, advisories, emergency,
│   │                           #   users, notifications, reviews
│   ├── middleware/             # auth.js, errorHandler.js, validate.js
│   ├── routes/                 # Route files (mirrors controllers)
│   ├── services/
│   │   ├── socketService.js    # Socket.IO — JWT rooms (admins / tourists)
│   │   ├── aiService.js        # OpenAI ChatGPT + vision
│   │   ├── fcmService.js       # Firebase Cloud Messaging
│   │   ├── emailService.js     # Nodemailer OTP / alerts (branded HTML template)
│   │   └── placesService.js    # Google Places / geocoding
│   └── utils/
├── prisma/
│   ├── schema.prisma           # Database schema reference
│   ├── seed.js                 # Seed script
│   └── seed.sql                # Raw SQL seed (idempotent INSERT IGNORE)
├── client/                     # React admin panel source
│   ├── src/
│   │   ├── pages/              # Dashboard, Attractions, Advisories, Emergency,
│   │   │                       #   Users, Notifications, Reports
│   │   ├── components/
│   │   ├── hooks/
│   │   │   └── useRealtimeSync.js   # React Query invalidation via Socket.IO
│   │   ├── services/
│   │   │   └── socket.js       # Socket.IO client
│   │   └── store/
│   ├── .env.production         # VITE_API_URL=/api  (same-domain)
│   └── vite.config.js          # Dev proxy → localhost:5000
├── scripts/
│   └── build.js                # Build script: installs client → builds → copies to public/
├── uploads/
│   └── avatars/                # User profile pictures (served statically)
├── mobile/                     # Flutter mobile app
├── public/                     # Built React app (generated at deploy, gitignored)
├── package.json                # Root — Express dependencies + build/start scripts
├── .env                        # Production environment variables
├── .env.local                  # Local overrides (gitignored)
├── .npmrc                      # omit=dev for Hostinger
└── .nvmrc                      # Node 22
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Mobile App | Flutter 3.x (Android + iOS) |
| Admin Portal | React 18 + Vite + Tailwind CSS |
| Backend API | Node.js + Express 5 |
| Realtime | Socket.IO 4 (JWT-authenticated rooms) |
| Database Driver | mysql2 (pure JavaScript — no native binary) |
| Database | MySQL 8 (Hostinger) |
| Auth | JWT + bcryptjs |
| Push Notifications | Firebase Cloud Messaging (FCM) |
| Maps | Google Maps API |
| AI / Vision | OpenAI GPT-4o-mini |
| Weather | Open-Meteo (free, no API key) |
| Email / OTP | Nodemailer (SMTP) — branded HTML template |
| File Uploads | Multer (local disk, Express static) |
| Hosting | Hostinger Business Web Hosting (Express 22 preset) |

---

## 1. Prerequisites

- Node.js 22+
- MySQL 8+ (local) or Hostinger MySQL credentials
- Flutter 3.x SDK
- Firebase project (FCM enabled)
- Google Cloud project (Maps + Geocoding APIs enabled)
- OpenAI API key

---

## 2. Backend + Admin Setup (Local Dev)

### Install dependencies

```bash
npm install --include=dev
cd client && npm install && cd ..
```

### Configure environment

Create `.env.local` at the repo root:

| Variable | Description |
|---|---|
| `PORT` | API server port (default: `5000`) |
| `NODE_ENV` | `development` or `production` |
| `DATABASE_URL` | MySQL connection string |
| `JWT_SECRET` | Long random string |
| `JWT_EXPIRES_IN` | Token lifetime (default: `7d`) |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Service account client email |
| `FIREBASE_PRIVATE_KEY` | Service account private key — paste with literal `\n` |
| `SMTP_HOST` | SMTP host (e.g. `smtp.hostinger.com`) |
| `SMTP_PORT` | `465` for SSL, `587` for STARTTLS |
| `SMTP_SECURE` | `true` for port 465, `false` for port 587 |
| `SMTP_USER` | SMTP email address |
| `SMTP_PASS` | SMTP app password |
| `EMAIL_FROM` | Sender address shown in emails |
| `GOOGLE_MAPS_API_KEY` | Used for reverse geocoding |
| `OPENAI_API_KEY` | OpenAI API key |
| `OPENAI_MODEL` | Model to use (default: `gpt-4o-mini`) |
| `CORS_ORIGINS` | Comma-separated allowed origins |

#### DATABASE_URL format

Local:
```
DATABASE_URL="mysql://root:@localhost:3306/cebusafetour_dev"
```

Hostinger (production) — add `connection_limit` and `connect_timeout` to prevent pool exhaustion:
```
DATABASE_URL="mysql://USER:PASSWORD@127.0.0.1:3306/DATABASE?connection_limit=5&connect_timeout=10"
```

> Special characters in passwords must be URL-encoded (e.g. `@` → `%40`, `?` → `%3F`).

### Run locally

```bash
npm run dev              # API on port 5000
cd client && npm run dev # Admin panel on port 5173 (proxies /api/* to 5000)
```

---

## 3. Deployment (Hostinger)

### Hostinger deployment settings

| Setting | Value |
|---|---|
| Framework preset | **Express** |
| Node version | **22.x** |
| Entry file | `src/app.js` |
| Build command | `npm install && npm run build` |

### Environment variables on Hostinger

Set in hPanel → Node.js → Environment Variables:

```
NODE_ENV=production
DATABASE_URL=mysql://USER:PASSWORD@127.0.0.1:3306/DATABASE?connection_limit=5&connect_timeout=10
JWT_SECRET=...
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=...
SMTP_PASS=...
EMAIL_FROM=...
GOOGLE_MAPS_API_KEY=...
OPENAI_API_KEY=...
CORS_ORIGINS=https://cebusafetour.fun,https://www.cebusafetour.fun
```

> Use `127.0.0.1` (not `localhost`) for MySQL host on Hostinger.

### Hostinger-specific notes

**Server timeouts** — configured automatically in `src/app.js`:

| Setting | Value | Reason |
|---|---|---|
| `keepAliveTimeout` | 65 000 ms | Must exceed Hostinger's ~60 s proxy idle timeout |
| `headersTimeout` | 66 000 ms | Must be > `keepAliveTimeout` |
| `server.timeout` | 120 000 ms | Max time for a single long-running request |

**mysql2** — The database layer uses the pure-JavaScript `mysql2` driver (`src/config/db.js`). No native binary engine is required, which avoids the `PANIC: timer has gone away` crash caused by Hostinger's restricted Linux kernel blocking Rust/Tokio timer syscalls.

**Connection pool pre-warm** — The server acquires and immediately releases a connection before `server.listen()` to prevent cold-start latency on the first request.

### First-time database setup on Hostinger

1. Create the database in hPanel → Databases → MySQL Databases
2. Import the schema using `prisma/seed.sql` or run the Prisma schema as a reference to create tables manually
3. Run:
   ```bash
   npm run db:seed
   ```

### Verify deployment

```
GET https://cebusafetour.fun/health
```

---

## 4. Mobile App Setup

```bash
cd mobile
flutter pub get
```

Place Firebase config files:
- `mobile/android/app/google-services.json`
- `mobile/ios/Runner/GoogleService-Info.plist`

Configure API base URL in `mobile/lib/utils/constants.dart`:

```dart
// Android emulator:
static const String serverUrl = 'http://10.0.2.2:5000';

// Physical device (same Wi-Fi):
static const String serverUrl = 'http://YOUR_LOCAL_IP:5000';

// Production:
static const String serverUrl = 'https://cebusafetour.fun';
```

```bash
flutter run -d android
flutter build apk --release
```

### Flutter build errors — Kotlin incremental cache

If you get `Daemon compilation failed: this and base files have different roots` after moving the project to a different drive, delete the stale Kotlin caches:

```powershell
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\Pub\Cache\hosted\pub.dev\share_plus-*\android\build\kotlin"
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\Pub\Cache\hosted\pub.dev\shared_preferences_android-*\android\build\kotlin"
Remove-Item -Recurse -Force "mobile\build"
Remove-Item -Recurse -Force "mobile\android\.gradle"
```

---

## Seed Accounts

After running `npm run db:seed`:

### Admin accounts

| Role | Email | Password |
|---|---|---|
| Super Admin | `superadmin@cebusafetour.ph` | `SuperAdmin@123` |
| Content Manager | `content@cebusafetour.ph` | `Content@123` |
| Emergency Officer | `emergency@cebusafetour.ph` | `Emergency@123` |

### Tourist accounts (password: `Tourist@123`)

| Nationality | Email |
|---|---|
| Korean | `kim.jisoo@example.com` |
| Japanese | `tanaka.hiroshi@example.com` |
| Chinese | `wang.wei@example.com` |
| American | `sarah.johnson@example.com` |
| Filipino | `maria.santos@example.com` |
| German | `emma.muller@example.com` |

### Seed data included

- **10 attractions** — Kawasan Falls, Magellan's Cross, Basilica del Santo Niño, Osmeña Peak, Moalboal Beach, Temple of Leah, Tops Lookout, Fort San Pedro, Carbon Market, Mactan Shrine
- **3 advisories** — Typhoon alert (critical), Ocean current warning, Sinulog festival advisory
- **3 incidents** — Medical at Kawasan Falls, Theft at Carbon Market, Lost person at Osmeña Peak

---

## API Endpoints

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register tourist — sends OTP email; returns `emailSent: false` if SMTP fails (account still created) |
| POST | `/api/auth/verify-otp` | Public | Verify email OTP to activate account |
| POST | `/api/auth/resend-otp` | Public | Resend OTP |
| POST | `/api/auth/login` | Public | Login |
| POST | `/api/auth/forgot-password` | Public | Send password reset OTP to email |
| POST | `/api/auth/reset-password` | Public | Reset password with OTP |
| GET | `/api/auth/me` | Tourist | Current user info |
| PATCH | `/api/auth/fcm-token` | Tourist | Update FCM push token |

### Attractions

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/attractions` | Public | List attractions (filters: category, district, safetyStatus, search) |
| GET | `/api/attractions/nearby?lat=&lng=` | Public | Nearest attractions by GPS |
| GET | `/api/attractions/:id` | Public | Attraction detail |
| POST | `/api/attractions/ai-suggest` | Admin | AI auto-fill from coordinates |
| POST | `/api/attractions` | Admin | Create attraction |
| PUT | `/api/attractions/:id` | Admin | Update attraction |
| DELETE | `/api/attractions/:id` | Admin | Archive attraction (soft delete) |
| DELETE | `/api/attractions/:id/permanent` | Super Admin | Permanently delete |

### Advisories

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/advisories` | Public | List advisories (filters: status, severity) |
| GET | `/api/advisories/:id` | Public | Advisory detail |
| POST | `/api/advisories/ai-suggest` | Admin | AI generate advisory content |
| POST | `/api/advisories` | Admin | Publish advisory + push notify |
| PUT | `/api/advisories/:id` | Admin | Update advisory |
| PATCH | `/api/advisories/:id/resolve` | Super + Content | Set status → `resolved` |
| PATCH | `/api/advisories/:id/archive` | Super Admin | Set status → `archived` |
| PATCH | `/api/advisories/:id/unarchive` | Super Admin | Restore → `resolved` |

### Emergency

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/emergency/services` | Public | Cebu emergency contacts list |
| POST | `/api/emergency/incidents` | Tourist | Report incident (notifies admins via Socket.IO) |
| GET | `/api/emergency/incidents/mine` | Tourist | My reported incidents |
| GET | `/api/emergency/incidents` | Admin | Active incidents |
| GET | `/api/emergency/incidents/archived` | Super + Emergency | Archived incidents |
| GET | `/api/emergency/incidents/:id` | Admin | Incident detail |
| PATCH | `/api/emergency/incidents/:id` | Admin | Update incident (status, notes, assignedTo) |
| PATCH | `/api/emergency/incidents/:id/archive` | Super Admin | Archive incident |
| PATCH | `/api/emergency/incidents/:id/unarchive` | Super Admin | Restore archived incident |

### Users

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/users/me` | Tourist | Current user profile |
| PATCH | `/api/users/me` | Tourist | Update own profile |
| POST | `/api/users/me/profile-picture` | Tourist | Upload avatar (multipart, field: `avatar`, max 5 MB) |
| GET | `/api/users/stats` | Admin | Tourist count stats (total, active, suspended, banned) |
| GET | `/api/users/staff` | Super Admin | List staff accounts (Content Manager + Emergency Officer) |
| POST | `/api/users/staff` | Super Admin | Create staff account (name, email, password, role, contactNumber) |
| PATCH | `/api/users/staff/:id` | Super Admin | Update staff (name, email, role, contactNumber) |
| DELETE | `/api/users/staff/:id` | Super Admin | Delete staff account (cannot delete self) |
| GET | `/api/users` | Admin | Tourist list (filters: search, status, nationality, page) |
| GET | `/api/users/:id` | Admin | User detail + incident history |
| PATCH | `/api/users/:id/status` | Super Admin | Change status (active / suspended / banned / archived) |
| PATCH | `/api/users/:id` | Super Admin | Edit tourist (name, email, nationality, contactNumber, isVerified) |
| POST | `/api/users/:id/verify` | Admin | Manually mark email as verified |
| DELETE | `/api/users/:id` | Super Admin | Permanently delete tourist account |
| POST | `/api/users/:id/verify-picture` | Admin | AI verify profile picture via GPT-4o-mini |

### Notifications

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/notifications` | Admin | Send / schedule push notification |
| GET | `/api/notifications` | Admin | Notification log |

### Reports

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/reports/summary` | Admin | Full breakdown — users by status, attractions by safety, incidents active/resolved/today/this-month, advisories active/critical |
| GET | `/api/reports/trends` | Admin | 6-month monthly counts for incidents, advisories, and new users |
| GET | `/api/reports/incidents` | Admin | Filterable incident log (from, to, type, status, page) + byType/byStatus aggregation |
| GET | `/api/reports/advisories` | Admin | bySeverity + byStatus groupBy + recent 15 advisories |
| GET | `/api/reports/attractions` | Admin | byCategory + bySafety groupBy + top-50 by visits |
| GET | `/api/reports/users-summary` | Admin | Top-10 nationalities + email verification breakdown |

### Reviews

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/reviews` | Tourist | My reviews |
| POST | `/api/reviews` | Tourist | Submit review for an attraction |
| DELETE | `/api/reviews/:id` | Tourist | Delete own review |

---

## Real-Time (Socket.IO)

| Room | Members |
|---|---|
| `admins` | `admin_super`, `admin_content`, `admin_emergency` |
| `tourists` | All tourist accounts |
| `user:<id>` | Individual user (private messages) |

| Event | Room | Trigger |
|---|---|---|
| `incident:new` | `admins` | New incident reported |
| `incident:updated` | `admins` | Incident status / notes changed |
| `incident:archived` | `admins` | Incident archived or unarchived |
| `advisory:new` | all | Advisory published |
| `advisory:updated` | all | Advisory updated, resolved, archived, or restored |
| `notification:new` | `admins` | Push notification sent |

---

## AI Features

All AI features require `OPENAI_API_KEY`. Default model: `gpt-4o-mini`.

| Feature | Description |
|---|---|
| Attraction AI Suggest | Admin drops a pin — backend reverse-geocodes via Google Maps, then ChatGPT fills name, category, description, safety tips. Coordinates outside Cebu Province are rejected. |
| Advisory AI Suggest | Admin selects an attraction — ChatGPT generates a realistic safety advisory with title, severity, and recommended actions. |
| Profile Picture Verification | Admin clicks "Verify with AI" — GPT-4o-mini vision checks whether the photo is a real human face. Result saved as `profilePictureVerified` and shown as a badge on the avatar. |

---

## Admin Portal

### Pages

| Page | Route | Access |
|---|---|---|
| Login | `/login` | Public |
| Dashboard | `/dashboard` | All admins |
| Attractions | `/attractions` | Super + Content |
| Advisories | `/advisories` | Super + Content |
| Emergency & Incident Center | `/emergency` | Super + Emergency |
| Users | `/users` | Super Admin only |
| Notifications | `/notifications` | All admins |
| Reports | `/reports` | All admins |

### Roles

| Role | Sidebar + Access |
|---|---|
| `admin_super` | Full access — all pages including User Management |
| `admin_content` | Dashboard, Attractions, Advisories, Notifications, Reports |
| `admin_emergency` | Dashboard, Emergency Center, Notifications, Reports |

Each role has a colored pill badge in the header and a dot indicator in the sidebar.

### User Management

The Users page has two sections, toggled by large cards at the top:

#### Staff Accounts (Content Manager / Emergency Officer)

Super Admin can fully manage staff accounts:

| Action | Description |
|---|---|
| Create | Set name, email, role, initial password, contact number |
| Edit | Update name, email, role, contact number |
| Suspend | Temporarily disable login |
| Archive | Soft-disable — account kept for audit trail |
| Activate | Re-enable a suspended or archived account |
| Delete | Permanently delete (cannot delete own account) |

Stats cards: Total / Active / Suspended / Archived. Filter by status or search by name/email.

#### Tourist Accounts

| Tab | Shows |
|---|---|
| All Users | Every tourist account |
| Suspended | Temporarily suspended (count badge) |
| Banned | Permanently banned (count badge) |

Per-row and detail-modal actions:

| Action | Who | Notes |
|---|---|---|
| View | All admins | Detail modal with profile, picture verification, incident history |
| Edit | Super Admin | Name, email, nationality, contact, email-verified flag |
| Verify email | All admins | Manual email verification (unverified users only) |
| Activate / Suspend / Ban | Super Admin | Confirm dialog |
| Delete | Super Admin | Hard delete with warning; tourist-only |
| Verify picture with AI | All admins | GPT-4o-mini vision check in detail modal |

### Reports & Analytics

Role-based tabs — each role only sees data relevant to their function:

| Tab | Super Admin | Content Manager | Emergency Officer |
|---|---|---|---|
| Overview | ✅ | ✅ | ✅ |
| Users | ✅ | — | — |
| Incidents | ✅ | — | ✅ |
| Advisories | ✅ | ✅ | — |
| Attractions | ✅ | ✅ | — |

**Overview** — filtered stat cards, 6-month line trend chart, doughnut breakdowns per role
**Users** — status pie, verification doughnut, top-10 nationalities bar, new-this-month count
**Incidents** — by-type bar + by-status doughnut + filterable paginated log (date range, type, status) with CSV export
**Advisories** — by-severity doughnut + by-status bar + recent 15 advisories table with CSV export
**Attractions** — by-category bar + safety doughnut + top-5-visits horizontal bar + full table with CSV export

### Emergency & Incident Center

| Action | Who |
|---|---|
| Update status / notes | Super + Emergency |
| Edit a resolved incident | Super + Emergency (admin password required) |
| Archive an incident | Super Admin only |
| Archive a resolved incident | Super Admin (password required) |
| Restore archived incident | Super Admin |

Views: Tabs (by status) · Kanban · Archive (Super Admin only)

### Safety Advisories

| Action | Who |
|---|---|
| Create advisory | Super + Content |
| Edit an active advisory | Super + Content |
| Edit a resolved advisory | Super + Content (password required) |
| Resolve an advisory | Super + Content |
| Archive an advisory | Super Admin only |
| Restore archived advisory | Super Admin |

---

## Mobile App Screens

| Screen | Description |
|---|---|
| Splash | Auto-redirects based on stored auth token |
| Login | Email + password, language selector (12 languages), suspended-account banner |
| Register | Name, email, password, nationality, contact; duplicate-email shown inline |
| OTP Verify | 6-digit code sent to email; 60 s resend countdown; orange warning if SMTP delivery failed |
| Forgot Password | Email input → sends reset OTP |
| Reset Password | OTP + new password + confirm; 60 s resend countdown; redirects to login on success |
| Home Dashboard | Quick actions, active advisories, SOS FAB |
| Explore | Search + filter attractions by category and safety status |
| Attraction Detail | Photos, safety badge, crowd level, hours, directions |
| Emergency | Type selection + GPS capture + one-tap call to services |
| Advisories | Severity-sorted list with bottom sheet detail |
| Trip Planner | Date picker + attraction checklist + drag-to-reorder itinerary |
| Profile | Avatar, verification badge, emergency contacts, logout |

The red **SOS** floating action button is visible on every screen. Suspended/banned accounts see an "Account Restricted" banner at login.

### Registration & OTP flow

1. User fills register form → taps **Create Account**
2. Backend creates account, generates 6-digit OTP (valid 10 min), sends branded HTML email
3. Mobile navigates to OTP screen; 60 s resend countdown starts immediately
4. If SMTP fails, backend still returns `201` with `emailSent: false` — OTP screen shows orange warning with immediate resend
5. Correct code → account activated → auto login

### Forgot Password flow

1. User taps **Forgot Password** on login (email pre-filled if already typed)
2. Enters email → taps **Send Reset Code** → backend emails a 6-digit OTP
3. Reset Password screen: enter OTP + new password + confirm
4. On success → navigated to login with success snackbar

### Localization

12 languages: English, Chinese, Korean, Japanese, German, Spanish, French, Arabic, Hindi, Russian, Filipino, Indonesian.

Language selection is on the **login screen** (flag chip row + searchable full picker) and via the **flag button on the home dashboard**. Preference is persisted locally and never overridden on login.

---

## Google Maps APIs Required

| API | Used In |
|---|---|
| Maps SDK for Android | Flutter mobile — Android map rendering |
| Maps SDK for iOS | Flutter mobile — iOS map rendering |
| Maps JavaScript API | Admin portal — incident map, attraction pin picker |
| Geocoding API | Reverse geocode for AI attraction suggest |

---

## Firebase Services Required

| Service | Purpose |
|---|---|
| Cloud Messaging (FCM) | Push notifications to mobile app |

> If Firebase credentials are missing, the server starts normally but FCM push notifications are silently skipped — `/health` reports `firebase: { status: "missing" }`.

---

## License
CebuSafeTour Team
