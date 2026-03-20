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
│              Node.js / Express 5  ·  mysql2  ·  node-cache        │
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
│   ├── middleware/
│   │   ├── auth.js             # JWT verification, role guards
│   │   ├── cache.js            # cacheResponse(ttl, keyFn) — in-memory response cache
│   │   ├── errorHandler.js
│   │   └── validate.js
│   ├── routes/                 # Route files (mirrors controllers)
│   ├── services/
│   │   ├── socketService.js    # Socket.IO — JWT rooms (admins / tourists)
│   │   ├── aiService.js        # OpenAI ChatGPT + vision
│   │   ├── fcmService.js       # Firebase Cloud Messaging
│   │   ├── emailService.js     # Nodemailer OTP / alerts
│   │   └── placesService.js    # Google Places / geocoding
│   └── utils/
│       ├── cache.js            # node-cache singleton + invalidatePrefix()
│       └── logger.js
├── prisma/
│   ├── schema.prisma           # Database schema reference
│   ├── seed.js                 # Seed script
│   └── seed.sql                # Raw SQL seed (idempotent INSERT IGNORE)
├── client/                     # React admin panel source
│   └── src/
│       ├── pages/              # Dashboard, Attractions, Advisories, Emergency,
│       │                       #   Users, Notifications, Reports
│       ├── components/
│       ├── hooks/
│       │   └── useRealtimeSync.js   # React Query invalidation via Socket.IO
│       ├── services/
│       │   └── socket.js       # Socket.IO client
│       └── store/
├── scripts/
│   └── build.js                # Installs client → builds → copies to public/
├── uploads/
│   └── avatars/                # User profile pictures (served statically)
├── mobile/                     # Flutter mobile app
├── public/                     # Built React app (generated at deploy, gitignored)
├── package.json
├── .env                        # Production environment variables
├── .env.local                  # Local overrides (gitignored)
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
| Database Driver | mysql2 (pure JavaScript) |
| Database | MySQL 8 (Hostinger) |
| Server-side Cache | node-cache (in-memory, TTL-based) |
| Client-side Cache | dio_cache_interceptor (MemCacheStore, honours Cache-Control) |
| Auth | JWT + bcryptjs |
| Push Notifications | Firebase Cloud Messaging (FCM) |
| Maps | Google Maps API |
| AI / Vision | OpenAI GPT-4o-mini |
| Email / OTP | Nodemailer (SMTP) |
| File Uploads | Multer (local disk, Express static) |
| Hosting | Hostinger Business Web Hosting (Express 22 preset) |

---

## Caching

### Server-side (node-cache)

Read-heavy public endpoints are cached in memory. On any write, the relevant prefix is immediately invalidated so the next request fetches fresh data.

| Endpoint | TTL | Cache key |
|---|---|---|
| `GET /api/attractions` | 5 min | `attractions:list:<query>` |
| `GET /api/attractions/:id` | 5 min | `attractions:detail:<id>` |
| `GET /api/advisories` | 2 min | `advisories:list:<query>` |
| `GET /api/advisories/:id` | 2 min | `advisories:detail:<id>` |

Every response includes `X-Cache: HIT` or `X-Cache: MISS` and `Cache-Control: public, max-age=<ttl>`. Cache stats (keys, hits, misses, hit rate) are visible at `GET /health`.

`GET /api/attractions/nearby` is **not cached** — results are unique per GPS coordinate pair.

### Client-side (dio_cache_interceptor)

The Flutter app's `ApiService` adds a `DioCacheInterceptor` backed by `MemCacheStore`. It uses `CachePolicy.request`, which honours the `Cache-Control` header set by the server — so both sides automatically share the same TTL. The in-memory store is cleared when the app process is restarted.

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

```bash
npm install --include=dev
cd client && npm install && cd ..
```

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

**DATABASE_URL format**

```
# Local
DATABASE_URL="mysql://root:@localhost:3306/cebusafetour_dev"

# Hostinger — add connection_limit and connect_timeout to prevent pool exhaustion
DATABASE_URL="mysql://USER:PASSWORD@127.0.0.1:3306/DATABASE?connection_limit=5&connect_timeout=10"
```

> Special characters in passwords must be URL-encoded (e.g. `@` → `%40`).

```bash
npm run dev              # API on port 5000
cd client && npm run dev # Admin panel on port 5173 (proxies /api/* to 5000)
```

---

## 3. Deployment (Hostinger)

| Setting | Value |
|---|---|
| Framework preset | **Express** |
| Node version | **22.x** |
| Entry file | `src/app.js` |
| Build command | `npm install && npm run build` |

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

**First-time database setup:**
1. Create database in hPanel → Databases → MySQL Databases
2. Import schema using `prisma/seed.sql`
3. Run `npm run db:seed`

**Verify:** `GET https://cebusafetour.fun/health`

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

---

## Seed Accounts

After running `npm run db:seed`:

| Role | Email | Password |
|---|---|---|
| Super Admin | `superadmin@cebusafetour.ph` | `SuperAdmin@123` |
| Content Manager | `content@cebusafetour.ph` | `Content@123` |
| Emergency Officer | `emergency@cebusafetour.ph` | `Emergency@123` |

Tourist accounts (password: `Tourist@123`): `kim.jisoo@example.com`, `tanaka.hiroshi@example.com`, `wang.wei@example.com`, `sarah.johnson@example.com`, `maria.santos@example.com`, `emma.muller@example.com`

**Seed data:** 10 attractions, 3 advisories, 3 incidents.

---

## API Endpoints

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register tourist — sends OTP email |
| POST | `/api/auth/verify-otp` | Public | Verify email OTP |
| POST | `/api/auth/resend-otp` | Public | Resend OTP |
| POST | `/api/auth/login` | Public | Login |
| POST | `/api/auth/forgot-password` | Public | Send password reset OTP |
| POST | `/api/auth/reset-password` | Public | Reset password with OTP |
| GET | `/api/auth/me` | Tourist | Current user info |
| PATCH | `/api/auth/fcm-token` | Tourist | Update FCM push token |

### Attractions

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/attractions` | Public | List (filters: category, district, safetyStatus, search) — cached 5 min |
| GET | `/api/attractions/nearby?lat=&lng=` | Public | Nearest by GPS — not cached |
| GET | `/api/attractions/:id` | Public | Detail — cached 5 min |
| POST | `/api/attractions/ai-suggest` | Admin | AI auto-fill from coordinates |
| POST | `/api/attractions` | Admin | Create |
| PUT | `/api/attractions/:id` | Admin | Update |
| DELETE | `/api/attractions/:id` | Admin | Archive (soft delete) |
| DELETE | `/api/attractions/:id/permanent` | Super Admin | Permanently delete |

### Advisories

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/advisories` | Public | List (filters: status, severity) — cached 2 min |
| GET | `/api/advisories/:id` | Public | Detail — cached 2 min |
| POST | `/api/advisories/ai-suggest` | Admin | AI generate advisory content |
| POST | `/api/advisories` | Admin | Publish + push notify |
| PUT | `/api/advisories/:id` | Admin | Update |
| PATCH | `/api/advisories/:id/resolve` | Super + Content | Set status → resolved |
| PATCH | `/api/advisories/:id/archive` | Super Admin | Set status → archived |
| PATCH | `/api/advisories/:id/unarchive` | Super Admin | Restore → resolved |

### Emergency

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/emergency/services` | Public | Cebu emergency contacts |
| POST | `/api/emergency/incidents` | Tourist | Report incident |
| GET | `/api/emergency/incidents/mine` | Tourist | My reported incidents |
| GET | `/api/emergency/incidents` | Admin | Active incidents |
| GET | `/api/emergency/incidents/archived` | Super + Emergency | Archived incidents |
| GET | `/api/emergency/incidents/:id` | Admin | Incident detail |
| PATCH | `/api/emergency/incidents/:id` | Admin | Update (status, notes, assignedTo) |
| PATCH | `/api/emergency/incidents/:id/archive` | Super Admin | Archive |
| PATCH | `/api/emergency/incidents/:id/unarchive` | Super Admin | Restore |

### Users

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/users/me` | Tourist | Own profile |
| PATCH | `/api/users/me` | Tourist | Update own profile |
| POST | `/api/users/me/profile-picture` | Tourist | Upload avatar (multipart, field: `avatar`, max 5 MB) |
| GET | `/api/users/stats` | Admin | Tourist count stats |
| GET | `/api/users/staff` | Super Admin | List staff accounts |
| POST | `/api/users/staff` | Super Admin | Create staff account |
| PATCH | `/api/users/staff/:id` | Super Admin | Update staff |
| DELETE | `/api/users/staff/:id` | Super Admin | Delete staff |
| GET | `/api/users` | Admin | Tourist list (filters: search, status, nationality, page) |
| GET | `/api/users/:id` | Admin | User detail + incident history |
| PATCH | `/api/users/:id/status` | Super Admin | Change status (active / suspended / banned) |
| PATCH | `/api/users/:id` | Super Admin | Edit tourist profile |
| POST | `/api/users/:id/verify` | Admin | Manually verify email |
| DELETE | `/api/users/:id` | Super Admin | Permanently delete |
| POST | `/api/users/:id/verify-picture` | Admin | AI verify profile picture |

### Notifications

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/notifications` | Admin | Send / schedule push notification |
| GET | `/api/notifications` | Admin | Notification log |

### Reports

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/reports/summary` | Admin | Users, attractions, incidents, advisories breakdown |
| GET | `/api/reports/trends` | Admin | 6-month monthly counts |
| GET | `/api/reports/incidents` | Admin | Filterable incident log + aggregation |
| GET | `/api/reports/advisories` | Admin | By severity/status + recent 15 |
| GET | `/api/reports/attractions` | Admin | By category/safety + top-50 by visits |
| GET | `/api/reports/users-summary` | Admin | Top-10 nationalities + verification breakdown |

### Reviews

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/attractions/:id/reviews` | Public | Reviews for an attraction |
| POST | `/api/attractions/:id/reviews` | Tourist | Submit or update own review |
| DELETE | `/api/attractions/:id/reviews/me` | Tourist | Delete own review |

---

## Real-Time (Socket.IO)

| Room | Members |
|---|---|
| `admins` | `admin_super`, `admin_content`, `admin_emergency` |
| `tourists` | All tourist accounts |
| `user:<id>` | Individual user |

| Event | Room | Trigger |
|---|---|---|
| `incident:new` | `admins` | New incident reported |
| `incident:updated` | `admins` | Incident status / notes changed |
| `incident:archived` | `admins` | Incident archived or restored |
| `advisory:new` | all | Advisory published |
| `advisory:updated` | all | Advisory updated, resolved, archived, or restored |
| `notification:new` | `admins` | Push notification sent |

---

## AI Features

Requires `OPENAI_API_KEY`. Default model: `gpt-4o-mini`.

| Feature | Description |
|---|---|
| Attraction AI Suggest | Admin drops a pin — backend reverse-geocodes, ChatGPT fills name, category, description, safety tips. Coordinates outside Cebu are rejected. |
| Advisory AI Suggest | Admin selects an attraction — ChatGPT generates title, severity, and recommended actions. |
| Profile Picture Verification | GPT-4o-mini vision checks whether the photo is a real human face. |

---

## Admin Portal

### Pages & Role Access

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

| Role | Access |
|---|---|
| `admin_super` | Full access — all pages |
| `admin_content` | Dashboard, Attractions, Advisories, Notifications, Reports |
| `admin_emergency` | Dashboard, Emergency Center, Notifications, Reports |

### Reports

| Tab | Super | Content | Emergency |
|---|---|---|---|
| Overview | ✅ | ✅ | ✅ |
| Users | ✅ | — | — |
| Incidents | ✅ | — | ✅ |
| Advisories | ✅ | ✅ | — |
| Attractions | ✅ | ✅ | — |

---

## Mobile App Screens

| Screen | Description |
|---|---|
| Splash | Auto-redirects based on stored auth token |
| Login | Email + password, language selector (12 languages), suspended-account banner |
| Register | Name, email, password, nationality, contact |
| OTP Verify | 6-digit code; 60 s resend countdown |
| Forgot / Reset Password | OTP-based password reset flow |
| Home Dashboard | Quick actions, active advisories, SOS FAB |
| Explore | Search + filter attractions by category and safety status |
| Attraction Detail | Photos, safety badge, crowd level, hours, directions, reviews |
| Emergency | Type selection + GPS capture + one-tap call to services |
| Advisories | Severity-sorted list with bottom sheet detail |
| Trip Planner | Date picker + attraction checklist + drag-to-reorder itinerary |
| Profile | Avatar, verification badge, emergency contacts, logout |

The red **SOS** floating action button is visible on every screen. Suspended/banned accounts see an "Account Restricted" banner at login.

**Localization:** 12 languages — English, Chinese, Korean, Japanese, German, Spanish, French, Arabic, Hindi, Russian, Filipino, Indonesian. Language is selected on the login screen and persisted locally.

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

> If Firebase credentials are missing, the server starts normally — FCM is silently skipped and `/health` reports `firebase: { status: "missing" }`.

---

## License
CebuSafeTour Team
