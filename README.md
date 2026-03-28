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
│        Node.js / Express 5  ·  mysql2  ·  node-cache  ·  gzip     │
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
├── tests/                      # Jest + Supertest integration tests
│   ├── helpers/
│   │   ├── app.js              # Express app loader with mocked dependencies
│   │   └── mocks.js            # DB, Firebase, FCM, email, AI mock setup
│   ├── auth.test.js
│   ├── attractions.test.js
│   ├── advisories.test.js
│   ├── emergency.test.js
│   ├── reviews.test.js
│   ├── middleware.test.js
│   └── setup.js
├── jest.config.js
├── prisma/
│   ├── schema.prisma           # Database schema reference
│   ├── seed.js                 # Seed script
│   └── seed.sql                # Raw SQL seed (idempotent INSERT IGNORE)
├── client/                     # React admin panel source
│   └── src/
│       ├── pages/              # Dashboard, Attractions, Reviews, Advisories,
│       │                       #   Emergency, Users, Notifications, Reports, Help
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
│   └── lib/
│       ├── main.dart           # Entry point — Firebase init
│       ├── app.dart            # MaterialApp, notification popup listener
│       ├── models/             # Data models (app_notification, advisory, etc.)
│       ├── providers/          # Riverpod state (auth, attractions, advisories,
│       │                       #   notifications, language, locale)
│       ├── screens/
│       │   ├── auth/           # Login, register, OTP, forgot/reset password
│       │   ├── home/           # Dashboard with quick actions
│       │   ├── explore/        # Attraction list + detail
│       │   ├── emergency/      # Emergency reporting
│       │   ├── advisories/     # Advisory list
│       │   ├── trip_planner/   # Trip planning
│       │   ├── profile/        # User profile + emergency contacts
│       │   ├── notifications/  # Notification history
│       │   └── help/           # Help & FAQ
│       ├── services/
│       │   ├── api_service.dart         # Dio HTTP + cache interceptor
│       │   ├── auth_service.dart        # Auth API calls
│       │   └── notification_service.dart # FCM init + foreground stream
│       ├── widgets/
│       │   ├── notification_popup.dart  # Rich popup overlay system
│       │   ├── emergency_fab.dart       # SOS floating button
│       │   └── ...
│       ├── utils/
│       │   ├── router.dart     # GoRouter route definitions
│       │   ├── theme.dart      # Material 3 theme + colors
│       │   └── constants.dart  # API base URL + config
│       └── l10n/
│           └── app_localizations.dart   # 55 languages, self-contained
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
| Database ORM | Prisma (schema-first, query builder) |
| Database Driver | mysql2 (pure JavaScript) |
| Database | MySQL 8 (Hostinger) |
| HTTP Compression | compression (gzip / deflate) |
| Server-side Cache | node-cache (in-memory, TTL-based) |
| Testing | Jest 29 + Supertest |
| Client-side Cache | dio_cache_interceptor (MemCacheStore, honours Cache-Control) |
| Mobile State | flutter_riverpod (StateNotifierProvider, AsyncNotifierProvider) |
| Mobile Routing | go_router |
| Mobile HTTP | Dio + auth interceptor |
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

| Endpoint / Layer | TTL | Cache key |
|---|---|---|
| `GET /api/advisories` | 2 min | `advisories:list:<query>` |
| `GET /api/advisories/:id` | 2 min | `advisories:detail:<id>` |
| Auth middleware (user lookup) | 5 min | `auth_user:<userId>` |

Every response includes `X-Cache: HIT` or `X-Cache: MISS` and `Cache-Control: public, max-age=<ttl>`. Cache keys are normalized (query params sorted) so `?a=1&b=2` and `?b=2&a=1` share the same entry. Cache stats (keys, hits, misses, hit rate) are visible at `GET /health`.

The auth middleware caches the authenticated user for 5 minutes after the first DB lookup, avoiding a `SELECT * FROM users` query on every authenticated request.

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
| Tourist (Korean) | `kim.jisoo@example.com` | `Tourist@123` |
| Tourist (Japanese) | `tanaka.hiroshi@example.com` | `Tourist@123` |
| Tourist (Chinese) | `wang.wei@example.com` | `Tourist@123` |
| Tourist (American) | `sarah.johnson@example.com` | `Tourist@123` |
| Tourist (Filipino) | `maria.santos@example.com` | `Tourist@123` |
| Tourist (German) | `emma.muller@example.com` | `Tourist@123` |

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
| GET | `/api/attractions` | Public | List (filters: category, district, safetyStatus, search) |
| GET | `/api/attractions/nearby?lat=&lng=` | Public | Nearest by GPS |
| GET | `/api/attractions/:id` | Public | Detail |
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
| GET | `/api/notifications` | Admin | Notification log (paginated, filterable by status/type) |
| GET | `/api/notifications/public` | Tourist | Recent sent announcements (max 50) |
| DELETE | `/api/notifications/:id` | Admin | Delete notification |

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
| GET | `/api/reviews` | Admin | All reviews (filterable, paginated) |
| DELETE | `/api/reviews/:id` | Admin | Delete any review |
| GET | `/api/attractions/:id/reviews` | Public | Reviews for an attraction (paginated, max 100/page) |
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

## Notification System

Admins send notifications from the admin portal. Each notification has a **type**, **priority**, and **target audience**. The mobile app displays notifications differently based on these properties.

### Notification Types

| Type | Sender | Mobile Display |
|---|---|---|
| `emergency` | Emergency Officer / Super Admin | Full-screen red overlay with pulsing icon and haptic feedback. Must be explicitly dismissed. |
| `safety_alert` | Content Manager / Super Admin | Prominent slide-down orange banner, stays 8 seconds, swipeable |
| `advisory` | Content Manager / Super Admin | Amber slide-down banner, 5 seconds auto-dismiss |
| `announcement` | Any admin | Blue slide-down banner, 5 seconds auto-dismiss |
| `trip_reminder` | Any admin | Teal slide-down banner, 5 seconds auto-dismiss |

### Priority Levels

| Priority | Behavior |
|---|---|
| `normal` | Standard delivery, respects device silent mode |
| `high` | Bypasses silent mode (Android `high` / iOS APNS priority `10`), banner stays 8 seconds |

### Target Audience

| Target | Description |
|---|---|
| All Users | Broadcasts to every active user with an FCM token |
| By Nationality | Sends to users matching a specific nationality |
| Specific User | Sends to an individually selected user |

### Flow

1. Admin composes notification in admin portal (title, body, type, priority, target)
2. Backend stores notification and dispatches via FCM
3. FCM delivers to mobile devices with `cebusafetour_alerts` channel
4. **Foreground**: Custom overlay popup appears based on type/priority
5. **Background/Terminated**: System notification tray; tapping opens the notifications screen

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
| Reviews | `/reviews` | Super + Content |
| Advisories | `/advisories` | Super + Content |
| Emergency & Incident Center | `/emergency` | Super + Emergency |
| Users | `/users` | Super Admin only |
| Notifications | `/notifications` | All admins |
| Reports | `/reports` | All admins |
| Help & FAQ | `/help` | All admins |

### Roles

| Role | Access |
|---|---|
| `admin_super` | Full access — all pages |
| `admin_content` | Dashboard, Attractions, Reviews, Advisories, Notifications, Reports, Help & FAQ |
| `admin_emergency` | Dashboard, Emergency Center, Notifications, Reports, Help & FAQ |

### Reports

| Tab | Super | Content | Emergency |
|---|---|---|---|
| Overview | Y | Y | Y |
| Users | Y | — | — |
| Incidents | Y | — | Y |
| Advisories | Y | Y | — |
| Attractions | Y | Y | — |

### Help & FAQ

The Help & FAQ page provides searchable documentation for admin users:

- **Quick-Start Guides** — Step-by-step workflows for managing attractions, handling emergencies, issuing advisories, and sending notifications
- **FAQ Sections** — 30+ questions across 9 categories: Getting Started, Attractions, Advisories, Emergency Center, Reviews, Users, Notifications, Reports, and Troubleshooting
- **Contact Support** — Email, phone, and technical support contacts
- **System Information** — Platform version and tech stack overview
- **Tips & Best Practices** — Operational guidance for admins

---

## Mobile App Screens

| Screen | Route | Description |
|---|---|---|
| Splash | `/splash` | Auto-redirects based on stored auth token |
| Login | `/auth/login` | Email + password, language selector |
| Register | `/auth/register` | Name, email, password, nationality, contact |
| OTP Verify | `/auth/otp` | 6-digit code; 60 s resend countdown |
| Forgot / Reset Password | `/auth/forgot-password` | OTP-based password reset flow |
| Home Dashboard | `/home` | Quick actions (Explore, Advisories, Trip Planner, Emergency, Help), active advisories, SOS FAB |
| Explore | `/explore` | Search + filter attractions by category and safety status |
| Attraction Detail | `/explore/:id` | Photos, safety badge, crowd level, hours, directions, reviews |
| Emergency | `/emergency` | Type selection + GPS capture + one-tap call to services |
| Advisories | `/advisories` | Severity-sorted list with bottom sheet detail |
| Trip Planner | `/trip-planner` | Date picker + attraction checklist + drag-to-reorder itinerary |
| Profile | `/profile` | Avatar, verification badge, emergency contacts, help link, logout |
| Notifications | `/notifications` | Card-based notification history with type labels and priority badges |
| Help & FAQ | `/help` | 3-tab help screen: FAQ (searchable), Guide (step-by-step), Contact (emergency numbers + safety tips) |

The red **SOS** floating action button is visible on the home screen. Suspended/banned accounts see an "Account Restricted" banner at login.

**Localization:** 55 languages — English, Chinese, Korean, Japanese, German, Spanish, French, Arabic, Hindi, Russian, Filipino, Indonesian, Thai, Vietnamese, Malay, Portuguese, Italian, Dutch, Turkish, Polish, Ukrainian, Swedish, Danish, Norwegian, Finnish, Greek, Hebrew, Bengali, Tamil, Romanian, Hungarian, Czech, Urdu, Burmese, Khmer, Lao, Mongolian, Swahili, Slovak, Croatian, Bulgarian, Serbian, Lithuanian, Latvian, Estonian, Slovenian, Afrikaans, Persian, Nepali, Sinhala, Georgian, Armenian, Azerbaijani, Kazakh, Uzbek. Language is selected on the home screen flag icon and persisted locally.

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

## Testing

Tests use **Jest** + **Supertest** with fully mocked external dependencies (MySQL, Firebase, FCM, SMTP, OpenAI, Google Places). No running database or services are required.

```bash
npm test              # Run all tests
npx jest --verbose    # Verbose output
npx jest auth         # Run a single suite
```

**Test suites (89 tests across 6 suites):**

| Suite | Tests | Covers |
|---|---|---|
| `auth.test.js` | 19 | Register, OTP verify, login, password reset, FCM token |
| `attractions.test.js` | 20 | CRUD, filtering, pagination, nearby, AI suggest, photo refresh |
| `advisories.test.js` | 16 | CRUD, resolve, archive/unarchive, AI suggest, permissions |
| `emergency.test.js` | 15 | Report incident, list/detail, update, archive, nearby services |
| `reviews.test.js` | 14 | Create/update (upsert), delete own, admin list/delete, ratings validation |
| `middleware.test.js` | 5 | JWT auth, role guards, suspended account handling |

---

## Performance Optimizations

### HTTP Compression

Responses larger than 1 KB are gzip/deflate compressed via `compression` middleware (threshold: 1024 bytes) — reduces JSON payload sizes by 60-80% while avoiding compression overhead on tiny responses.

### Consolidated Report Queries

Report endpoints use aggregated `SUM(condition)` expressions instead of individual COUNT queries. `/reports/summary` runs 4 queries (one per table) instead of 16, and `/reports/trends` runs 3 queries with `GROUP BY month` instead of 18.

### Parallel FCM Dispatch

Push notifications are sent in parallel batches (up to 3 concurrent batches of 500 tokens) instead of sequential one-at-a-time delivery.

### Column Projection

List endpoints select only required columns instead of `SELECT *`, reducing data transfer for attractions (excludes heavy JSON blobs like `operating_hours`, `contact_info`, `accessibility_features`, `nearby_facilities` on list views), incidents, and notifications.

### Pagination Guards

- Reviews list: capped at 100 per page (default 50)
- User incidents: capped at 100 rows
- All other list endpoints already paginated (default 20)

### OTP Cleanup

Expired OTPs are automatically purged from the in-memory Map every 5 minutes to prevent unbounded memory growth.

### Database Connection Pool

Default connection limit raised to 10 (from 5). Idle timeout set to 60 seconds for better connection reuse under sustained load.

### Database Indexes

Apply the performance indexes migration after deploying:

```sql
-- prisma/migrations/20260323_add_performance_indexes/migration.sql
CREATE INDEX incidents_reported_by_idx ON incidents(reported_by);
CREATE INDEX users_nationality_idx ON users(nationality);
CREATE INDEX users_created_at_idx ON users(created_at DESC);
CREATE INDEX reviews_user_id_idx ON reviews(user_id);
CREATE INDEX advisories_created_at_idx ON advisories(created_at DESC);
```

These cover frequently-queried columns that lacked indexes: user incidents lookups, nationality filtering, report date ranges, and review foreign key joins.

### Admin Portal

- **Route-based code splitting** — pages are lazy-loaded with `React.lazy()` + `Suspense`, reducing initial bundle size
- **Debounced socket invalidations** — rapid-fire Socket.IO events are coalesced within a 200ms window before invalidating React Query caches, preventing redundant refetches

### Mobile App

- **Search debounce** — explore screen waits 400ms after the last keystroke before triggering API calls
- **Selective provider watching** — dashboard uses `.select()` on auth/notification providers to only rebuild when specific fields change (name, picture, unread count), not on every state update
- **Lazy review loading** — attraction detail screen uses `SliverList.builder` for reviews instead of materializing all review widgets at once
- **Immutable state updates** — notification `markAllRead` uses `copyWith` instead of direct mutation to prevent stale reference bugs
- **Smart splash screen** — navigates as soon as auth loads (minimum 800ms branding display) instead of a fixed 2-second delay

---

## License
CebuSafeTour Team
