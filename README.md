# CebuSafeTour

A tourism safety platform for Cebu, Philippines. Tourists explore attractions safely, receive real-time advisories, access emergency services, and plan trips. Admins manage everything through a web portal with live updates.

---

## Architecture

```
┌────────────────────────────┬──────────────────────────────────────┐
│   MOBILE APP (Tourists)    │       ADMIN PORTAL (Web)             │
│   Flutter — Android / iOS  │       React 19 + Vite + Tailwind     │
├────────────────────────────┴──────────────────────────────────────┤
│                    REST API  +  Socket.IO  +  SSE                 │
│              Node.js / Express 5  ·  mysql2  ·  gzip              │
├───────────────────────────────────────────────────────────────────┤
│   MySQL (Hostinger)  ·  OneSignal  ·  OpenAI  ·  SMTP            │
└───────────────────────────────────────────────────────────────────┘
```

The backend and admin portal are deployed together as a **single Express app** on Hostinger. Express serves the API under `/api/*` and the compiled React admin panel as static files under `/`.

---

## Project Structure

```
cebusafetour/
├── src/                        # Express API
│   ├── app.js                  # Entry — middleware stack, port, Socket.IO init
│   ├── config/
│   │   └── db.js               # mysql2 pool + camelCase helpers (findOne, findMany, run)
│   ├── controllers/            # auth, attractions, advisories, emergency,
│   │                           #   users, notifications, reports, reviews, meta
│   ├── jobs/
│   │   └── notificationScheduler.js  # node-cron: dispatches pending notifications every 30 s
│   ├── middleware/
│   │   ├── auth.js             # JWT verification + role guards
│   │   ├── cache.js            # Response cache middleware (in-memory, HIT/MISS headers)
│   │   ├── errorHandler.js     # Global error handler (ER_DUP_ENTRY → 409)
│   │   └── validate.js         # express-validator result handler
│   ├── routes/
│   │   ├── meta.js             # GET /api/meta — enum values (categories, severities, etc.)
│   │   └── events.js           # GET /api/events — SSE fallback stream
│   ├── services/
│   │   ├── socketService.js    # Socket.IO — JWT rooms + all emitter functions
│   │   ├── pushService.js      # OneSignal REST — channel routing + diagnostics
│   │   ├── aiService.js        # OpenAI + Google Places APIs
│   │   ├── emailService.js     # Nodemailer OTP / alerts (HTML templates)
│   │   └── placesService.js    # Google Places photo fetching (3-step resolve)
│   └── utils/
│       ├── cache.js            # NodeCache instance (maxKeys: 2000, 120 s prune)
│       └── logger.js           # Winston — error.log (2 MB), combined.log (5 MB)
├── prisma/
│   ├── schema.prisma           # Database schema reference (6 models, 23 enums)
│   ├── seed.js                 # Seed: 3 admins + 53 LGU staff sets + 6 tourists + data
│   └── seed.sql                # Raw SQL seed (idempotent INSERT IGNORE)
├── client/                     # React admin panel source
│   └── src/
│       ├── pages/              # Dashboard, Attractions, Advisories, Emergency,
│       │                       #   Reviews, Users, Notifications, Reports, Help, Profile
│       ├── components/         # Layout, Sidebar, Header, MapPicker, ErrorBoundary
│       ├── hooks/
│       │   ├── useRealtimeSync.js   # Socket.IO + SSE + debounced React Query invalidation
│       │   ├── useAdaptivePolling.js # Exponential backoff polling (base→max, pauses on hidden)
│       │   ├── usePageVisibility.js  # Visibility API wrapper
│       │   └── useMeta.js           # Enum cache (staleTime: Infinity)
│       ├── services/
│       │   ├── api.js          # Axios instance (15 s timeout, 401 → logout)
│       │   └── socket.js       # Socket.IO client wrapper
│       └── store/
│           ├── authStore.js    # Zustand + localStorage (user, token)
│           └── themeStore.js   # Zustand + localStorage (dark mode)
├── scripts/
│   └── build.js                # Install client deps → Vite build → copy to public/
├── uploads/
│   └── avatars/                # User profile pictures (served statically, 7-day cache)
├── mobile/                     # Flutter mobile app
│   └── lib/
│       ├── main.dart           # Bootstrap — NotificationService init, language load
│       ├── app.dart            # MaterialApp.router, lifecycle, toast listener
│       ├── models/             # UserModel, Attraction, Advisory, AppNotification,
│       │                       #   Review, TripPlan, AppMeta
│       ├── providers/          # auth, notifications, advisories, attractions,
│       │                       #   reviews, trip, favorites, realtime, language, meta
│       ├── screens/
│       │   ├── auth/           # Login, Register, OTP, ForgotPassword, ResetPassword
│       │   ├── home/           # HomeDashboard
│       │   ├── explore/        # ExploreScreen, AttractionDetail
│       │   ├── emergency/      # EmergencyScreen
│       │   ├── advisories/     # AdvisoriesScreen
│       │   ├── trip_planner/   # TripPlannerScreen
│       │   ├── profile/        # ProfileScreen
│       │   ├── notifications/  # NotificationsScreen
│       │   └── help/           # HelpFaqScreen
│       ├── services/
│       │   ├── api_service.dart         # Dio singleton — 20 s timeout, Bearer interceptor
│       │   ├── auth_service.dart        # Auth + profile API calls
│       │   ├── notification_service.dart # OneSignal init + 3 Android channels
│       │   └── socket_service.dart      # socket_io_client — WebSocket only, JWT auth
│       ├── widgets/
│       │   ├── notification_popup.dart  # EmergencyOverlay + NotificationBanner + Manager
│       │   ├── emergency_fab.dart       # SOS FAB → /emergency
│       │   ├── advisory_card.dart
│       │   ├── attraction_card.dart
│       │   ├── safety_badge.dart
│       │   └── language_picker_sheet.dart
│       ├── utils/
│       │   ├── router.dart     # GoRouter (15 routes, auth redirect, FutureProvider)
│       │   ├── theme.dart      # Material 3 — primary #0EA5E9, safety status colors
│       │   └── constants.dart  # API base URL, fallback emergency contacts (12), 16 languages
│       └── l10n/
│           └── app_localizations.dart   # 16 locales (en, fil, ceb, zh, ko, ja, ar, es, fr,
│                                        #   de, ru, hi, th, vi, id, ms), 70+ strings
├── ecosystem.config.js         # PM2 — fork mode, 256 MB limit, 10 s kill timeout
├── public/                     # Built React app (generated at deploy, gitignored)
├── package.json
├── .env                        # Production environment variables
├── .env.local                  # Local overrides (gitignored, takes precedence)
└── .nvmrc                      # Node 22
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Mobile App | Flutter 3.x — Dart SDK ≥3.2 (Android + iOS) |
| Admin Portal | React 19 + Vite 6 + Tailwind CSS 3 |
| Admin State / Data | Zustand 5 + TanStack React Query v5 |
| Backend API | Node.js 22 + Express 5 |
| Realtime | Socket.IO 4 (JWT rooms) + SSE fallback |
| Database Driver | mysql2 3.x — raw queries, camelCase helpers |
| Schema / Seed | Prisma schema + seed.sql (reference only) |
| Database | MySQL 8 (Hostinger) |
| In-Memory Cache | node-cache (maxKeys: 2000, 120 s prune) |
| Response Cache | Custom middleware (in-memory, HIT/MISS headers) |
| Scheduled Jobs | node-cron (notification dispatcher, every 30 s) |
| HTTP Compression | compression (gzip / deflate, threshold: 1 KB) |
| Security | helmet + express-rate-limit |
| Process Manager | PM2 (fork mode, 256 MB, exponential backoff) |
| Mobile State | flutter_riverpod 3.x (Notifier, AsyncNotifier, family) |
| Mobile Routing | go_router 17.x |
| Mobile HTTP | Dio 5.x + retrofit (20 s timeout, Bearer interceptor) |
| Mobile Realtime | socket_io_client 2.x (WebSocket, JWT handshake) |
| Auth | JWT + bcryptjs |
| Push Notifications | OneSignal 5.x (REST API — 3 Android channels) |
| Maps | Google Maps Flutter + Geolocator + Geocoding |
| AI / Vision | OpenAI GPT-4o-mini (REST, no SDK) |
| Email / OTP | Nodemailer 8.x (SMTP, HTML templates) |
| File Uploads | Multer 2.x (local disk, max 5 MB, image/* only) |
| Logging | Winston (error.log 2 MB, combined.log 5 MB) |
| Hosting | Hostinger Business Web Hosting (Node 22 preset) |

---

## 1. Prerequisites

- Node.js 22+
- MySQL 8+ (local) or Hostinger MySQL credentials
- Flutter SDK (Dart ≥3.2)
- OneSignal account (App ID + REST API key)
- Google Cloud project (Maps SDK, Places API, Geocoding API enabled)
- OpenAI API key

---

## 2. Backend + Admin Setup (Local Dev)

```bash
npm install
cd client && npm install && cd ..
```

Create `.env.local` at the repo root (takes precedence over `.env`):

| Variable | Description |
|---|---|
| `PORT` | API server port (default: `5000`) |
| `NODE_ENV` | `development` or `production` |
| `DATABASE_URL` | MySQL connection string |
| `JWT_SECRET` | Long random string |
| `JWT_EXPIRES_IN` | Token lifetime (default: `7d`) |
| `ONESIGNAL_APP_ID` | OneSignal App ID |
| `ONESIGNAL_REST_API_KEY` | OneSignal REST API key |
| `ONESIGNAL_ANDROID_CHANNEL_ID_EMERGENCY` | Android channel `cebusafetour_emergency` |
| `ONESIGNAL_ANDROID_CHANNEL_ID_ALERTS` | Android channel `cebusafetour_alerts` |
| `ONESIGNAL_ANDROID_CHANNEL_ID_INFO` | Android channel `cebusafetour_info` |
| `SMTP_HOST` | SMTP host (e.g. `smtp.hostinger.com`) |
| `SMTP_PORT` | `465` (SSL) or `587` (STARTTLS) |
| `SMTP_SECURE` | `true` for port 465, `false` for port 587 |
| `SMTP_USER` | SMTP email address |
| `SMTP_PASS` | SMTP app password |
| `EMAIL_FROM` | Sender address shown in emails |
| `GOOGLE_MAPS_API_KEY` | Used for Places, Geocoding, and photo fetch |
| `OPENAI_API_KEY` | OpenAI API key |
| `OPENAI_MODEL` | Model to use (default: `gpt-4o-mini`) |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `WS_MAX_CONNECTIONS` | Max Socket.IO connections (default: `60`) |
| `SSE_MAX_CONNECTIONS` | Max SSE connections (default: `20`) |

**DATABASE_URL format**

```
# Local
DATABASE_URL="mysql://root:@localhost:3306/cebusafetour_dev"

# Hostinger — add connection_limit and connect_timeout to prevent pool exhaustion
DATABASE_URL="mysql://USER:PASSWORD@127.0.0.1:3306/DATABASE?connection_limit=5&connect_timeout=10"
```

> Special characters in passwords must be URL-encoded (e.g. `@` → `%40`).

```bash
npm run dev              # API on :5000 (node --watch)
cd client && npm run dev # Admin panel on :5173 (proxies /api and /uploads to :5000)
```

**Rate limits (dev and prod):**
- Auth routes: 60 requests / 15 min window (skips successful requests)
- Global: 1500 requests / 15 min (excludes `/api/auth`)

---

## 3. Deployment (Hostinger)

| Setting | Value |
|---|---|
| Framework preset | **Express** |
| Node version | **22.x** |
| Entry file | `src/app.js` |
| Build command | `npm install && npm run build` |

`npm run build` installs client dependencies, runs `vite build`, and copies the output to `public/`.

Set in hPanel → Node.js → Environment Variables:

```
NODE_ENV=production
DATABASE_URL=mysql://USER:PASSWORD@127.0.0.1:3306/DATABASE?connection_limit=5&connect_timeout=10
JWT_SECRET=...
ONESIGNAL_APP_ID=...
ONESIGNAL_REST_API_KEY=...
ONESIGNAL_ANDROID_CHANNEL_ID_EMERGENCY=...
ONESIGNAL_ANDROID_CHANNEL_ID_ALERTS=...
ONESIGNAL_ANDROID_CHANNEL_ID_INFO=...
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

**PM2 (managed by Hostinger's Express preset):**
```bash
pm2 start ecosystem.config.js --env production
pm2 reload ecosystem.config.js --env production   # zero-downtime reload
pm2 save                                           # persist across reboots
```

**First-time database setup:**
1. Create database in hPanel → Databases → MySQL Databases
2. Import schema: `prisma/seed.sql`
3. Run seed: `npm run db:seed`

**Verify:** `GET https://cebusafetour.fun/health`

---

## 4. Mobile App Setup

```bash
cd mobile
flutter pub get
flutter run -d android
flutter build apk --release
```

**API base URL** is hardcoded in `mobile/lib/utils/constants.dart`:

```dart
static const String serverUrl = 'https://cebusafetour.fun';
```

For local development, change to your machine's IP:

```dart
static const String serverUrl = 'http://10.0.2.2:5000'; // Android emulator
static const String serverUrl = 'http://YOUR_LOCAL_IP:5000'; // Physical device
```

**Google Maps API key** is set in `android/app/src/main/AndroidManifest.xml` under `com.google.android.geo.API_KEY`. Restrict the key in Google Cloud Console to your app's SHA-1 fingerprint.

**OneSignal App ID** is hardcoded in `mobile/lib/services/notification_service.dart`. Update it to match your OneSignal project.

**Android permissions required:** `INTERNET`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `CALL_PHONE`, `CAMERA`, `READ_MEDIA_IMAGES` (Android 13+), `POST_NOTIFICATIONS`, `VIBRATE`, `USE_FULL_SCREEN_INTENT` (emergency lock-screen overlay).

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

**Seed also creates (via `seed.js`):**
- 53 municipal content managers — `content.<lgu-slug>@cebusafetour.ph`
- 53 main municipal emergency officers — `emergency.<lgu-slug>@cebusafetour.ph`
- 212 emergency sub-officers (4 per LGU: EMT, SAR Coordinator, Comms Officer, Fire Inspector)

All staff passwords: matching role password above. LGU accounts cover all 53 Cebu municipalities/cities.

**Seed data:** 10 attractions (Kawasan Falls, Magellan's Cross, Basilica del Sto. Niño, Osmeña Peak, Moalboal Beach, Temple of Leah, Tops Lookout, Fort San Pedro, Carbon Market, Mactan Shrine), 3 advisories, 3 incidents.

---

## API Endpoints

### Meta

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/meta` | Public | Enum values — categories, severities, statuses for all entities |

### Health

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | Public | DB latency, SMTP config, OneSignal config, JWT presence, uptime |

Returns `200` if DB + JWT are healthy; `503` if degraded. Response includes `version`, `nodeVersion`, `uptime`, and per-service check results.

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register tourist — sends OTP email |
| POST | `/api/auth/verify-otp` | Public | Verify email OTP |
| POST | `/api/auth/resend-otp` | Public | Resend OTP |
| POST | `/api/auth/login` | Public | Login — returns JWT |
| POST | `/api/auth/forgot-password` | Public | Send password reset OTP |
| POST | `/api/auth/reset-password` | Public | Reset password with OTP |
| POST | `/api/auth/verify-password` | Public | Verify password (sensitive action gate) |
| GET | `/api/auth/me` | Tourist | Current user info |

OTPs expire after 10 minutes. Expired OTPs are purged from memory every 5 minutes.

### Attractions

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/attractions` | Public | List (filters: `category`, `district`, `safetyStatus`, `search`, `status`) |
| GET | `/api/attractions/nearby?lat=&lng=` | Public | Nearest attractions by GPS |
| GET | `/api/attractions/autocomplete` | Admin | Google Places autocomplete (GPS-aware, Philippines only) |
| GET | `/api/attractions/place-detail` | Admin | Google Place details by `place_id` |
| GET | `/api/attractions/:id` | Public | Detail |
| POST | `/api/attractions/ai-suggest` | Admin | AI auto-fill from coordinates (Cebu boundary enforced) |
| POST | `/api/attractions/:id/refresh-photos` | Admin | Re-fetch photos from Google Places |
| POST | `/api/attractions` | Admin | Create |
| PUT | `/api/attractions/:id` | Admin | Update |
| DELETE | `/api/attractions/:id` | Super + Content | Archive (soft delete) |
| DELETE | `/api/attractions/:id/permanent` | Super Admin | Permanently delete |

### Advisories

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/advisories` | Public | List (filters: `status`, `severity`, `source`) |
| GET | `/api/advisories/:id` | Public | Detail |
| POST | `/api/advisories/ai-suggest` | Super + Emergency | AI generate advisory content from attraction context |
| POST | `/api/advisories` | Super + Emergency | Publish + push notify |
| POST | `/api/advisories/:id/acknowledge` | Tourist | Mark advisory as acknowledged |
| PUT | `/api/advisories/:id` | Admin | Update |
| PATCH | `/api/advisories/:id/resolve` | Super + Content | Set status → resolved |
| PATCH | `/api/advisories/:id/archive` | Super Admin | Set status → archived |
| PATCH | `/api/advisories/:id/unarchive` | Super Admin | Restore → resolved |
| DELETE | `/api/advisories/:id` | Super Admin | Permanently delete |

### Emergency

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/emergency/services` | Public | Cebu emergency contacts |
| POST | `/api/emergency/incidents` | Tourist | Report incident (with GPS + attachments) |
| GET | `/api/emergency/incidents/mine` | Tourist | My reported incidents |
| GET | `/api/emergency/incidents` | Super + Emergency | Active incidents |
| GET | `/api/emergency/incidents/archived` | Super + Emergency | Archived incidents |
| GET | `/api/emergency/incidents/:id` | Super + Emergency | Incident detail |
| PATCH | `/api/emergency/incidents/:id` | Super + Emergency | Update (status, notes, assignedTo) |
| PATCH | `/api/emergency/incidents/:id/archive` | Super Admin | Archive |
| PATCH | `/api/emergency/incidents/:id/unarchive` | Super Admin | Restore |
| DELETE | `/api/emergency/incidents/:id` | Super Admin | Permanently delete |

### Users

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/users/me` | Tourist | Own profile |
| PATCH | `/api/users/me` | Tourist | Update own profile |
| PATCH | `/api/users/me/password` | Tourist | Change password |
| POST | `/api/users/me/profile-picture` | Tourist | Upload avatar (multipart, field: `avatar`, max 5 MB) |
| GET | `/api/users/nationalities` | Admin | Nationalities of registered tourists |
| GET | `/api/users/stats` | Admin | Tourist count stats |
| GET | `/api/users/staff` | Super Admin | List all staff accounts |
| POST | `/api/users/staff` | Super Admin | Create staff account |
| PATCH | `/api/users/staff/:id` | Super Admin | Update staff |
| DELETE | `/api/users/staff/:id` | Super Admin | Delete staff |
| GET | `/api/users/my-team` | Emergency Manager | List own sub-officers |
| POST | `/api/users/my-team` | Emergency Manager | Create sub-officer |
| DELETE | `/api/users/my-team/:id` | Emergency Manager | Remove sub-officer |
| GET | `/api/users` | Admin | Tourist list (filters: `search`, `status`, `nationality`, `page`) |
| GET | `/api/users/:id` | Admin | User detail + incident history |
| PATCH | `/api/users/:id/status` | Super Admin | Change status (`active` / `suspended` / `banned`) |
| PATCH | `/api/users/:id` | Super Admin | Edit tourist profile |
| POST | `/api/users/:id/verify` | Admin | Manually verify email |
| DELETE | `/api/users/:id` | Super Admin | Permanently delete |
| POST | `/api/users/:id/verify-picture` | Admin | AI verify profile picture via vision |

### Notifications

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/notifications/public` | Tourist | Recent sent announcements (max 50) |
| POST | `/api/notifications/read` | Tourist | Mark all as read |
| PATCH | `/api/notifications/:id/read` | Tourist | Mark one as read |
| GET | `/api/notifications/delivery-diagnostics` | Admin | OneSignal config + last 20 push attempts |
| DELETE | `/api/notifications/delivery-diagnostics` | Admin | Clear push attempt history |
| GET | `/api/notifications` | Admin | Notification log (paginated, filterable by `status`/`type`) |
| POST | `/api/notifications` | Admin | Send / schedule push notification |
| DELETE | `/api/notifications/:id` | Admin | Delete notification |

### Reports

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/reports/summary` | Admin | Users, attractions, incidents, advisories counts |
| GET | `/api/reports/trends` | Admin | 6-month monthly counts (3 queries with GROUP BY) |
| GET | `/api/reports/incidents` | Admin | Filterable incident log + aggregation |
| GET | `/api/reports/advisories` | Admin | By severity/status + recent 15 |
| GET | `/api/reports/attractions` | Admin | By category/safety + top-50 by visits |
| GET | `/api/reports/users-summary` | Admin | Top-10 nationalities + verification breakdown |

### Reviews

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/reviews` | Admin | All reviews (filterable by `rating`, `attraction`, paginated) |
| DELETE | `/api/reviews/:id` | Admin | Delete any review |
| GET | `/api/attractions/:id/reviews` | Public | Reviews for an attraction (paginated, max 100/page) |
| POST | `/api/attractions/:id/reviews` | Tourist | Submit or update own review (upsert) |
| DELETE | `/api/attractions/:id/reviews/me` | Tourist | Delete own review |

---

## Real-Time (Socket.IO + SSE)

### Rooms

| Room | Members |
|---|---|
| `admins` | `admin_super`, `admin_content`, `admin_emergency` |
| `tourists` | All authenticated tourists |
| `guests` | Unauthenticated Socket.IO connections |
| `user:<id>` | Individual targeted messages |

### Events

| Event | Room | Trigger |
|---|---|---|
| `incident:new` | `admins` | Incident reported |
| `incident:updated` | `admins` | Status / notes changed |
| `incident:archived` | `admins` | Archived or restored |
| `advisory:new` | all | Advisory published |
| `advisory:updated` | all | Updated, resolved, archived, or restored |
| `advisory:deleted` | all | Permanently deleted |
| `advisory:acknowledged` | all | Tourist acknowledged advisory |
| `attraction:new` | all | Attraction created |
| `attraction:updated` | all | Attraction updated |
| `attraction:deleted` | all | Attraction archived |
| `review:new` | all | Review submitted |
| `review:deleted` | all | Review deleted |
| `notification:new` | `admins` | Push notification sent |
| `notification:deleted` | `admins` | Notification deleted |
| `user:updated` | `admins` | User status or profile changed |
| `user:profile-updated` | `admins` | User updated own profile |
| `user:verified` | `admins` | Email manually verified |
| `staff:created` | `admins` | Staff account created |
| `staff:updated` | `admins` | Staff account updated |
| `staff:deleted` | `admins` | Staff account deleted |

**Socket.IO configuration:** ping interval 30 s, ping timeout 10 s, max buffer 100 KB, per-message deflate disabled (saves CPU), transports: `websocket` + `polling`.

### SSE Fallback

`GET /api/events?token=<jwt>` — Server-Sent Events stream for clients where WebSocket cannot connect (e.g. restrictive proxies). Auth is via query-param token because `EventSource` does not support custom headers. Heartbeat comment-ping every 25 seconds prevents proxy timeouts.

The admin portal (`useRealtimeSync.js`) opens this stream only after Socket.IO fails to connect 3 consecutive times, and closes it as soon as WebSocket re-establishes. Debounced batch invalidation (200 ms window) coalesces rapid-fire events before invalidating React Query caches.

---

## Notification System

Admins send notifications from the admin portal. Each notification has a **type**, **priority**, and **target audience**.

### Notification Types

| Type | Sender | Mobile Display |
|---|---|---|
| `emergency` | Emergency / Super Admin | Full-screen red overlay, pulsing icon, haptic feedback. Must be dismissed. |
| `safety_alert` | Content / Super Admin | Orange slide-down banner, 8 s auto-dismiss |
| `advisory` | Content / Super Admin | Amber slide-down banner, 5 s auto-dismiss |
| `announcement` | Any admin | Blue slide-down banner, 5 s auto-dismiss |
| `trip_reminder` | Any admin | Teal slide-down banner, 5 s auto-dismiss |

### Priority Levels

| Priority | Behavior |
|---|---|
| `normal` | Standard delivery, respects device silent mode |
| `high` | Bypasses silent mode (Android `high`, iOS APNs priority 10), banner stays 8 s |

### Target Audience

| Target | Description |
|---|---|
| All Users | Broadcasts to every active user subscribed in OneSignal |
| By Nationality | Sends to users tagged with a specific nationality at login |
| Specific User | Sends to an individually selected user via `external_id` |

### Android Notification Channels

| Channel ID | Importance | Use |
|---|---|---|
| `cebusafetour_emergency` | MAX (heads-up floating card) | `emergency` type, `high` priority, or `critical` severity |
| `cebusafetour_alerts` | HIGH (status-bar banner) | `safety_alert`, `advisory`, or `warning` severity |
| `cebusafetour_info` | DEFAULT (drawer only, silent) | `announcement`, `trip_reminder` |

### Notification Delivery Flow

1. Admin composes notification (title, body, type, priority, target, optional `scheduled_at`)
2. Backend stores record; `pending` if scheduled, dispatched immediately otherwise
3. Scheduler (every 30 s) picks up due `pending` notifications and dispatches them
4. Backend calls OneSignal REST API, routing to the correct Android channel
5. **Foreground**: Custom overlay popup appears; notification list updates via Socket.IO/SSE
6. **Background / Terminated**: System tray notification; tap opens `/notifications`
7. Deduplication window: 20 seconds (prevents duplicate display on rapid re-delivery)

---

## AI Features

Requires `OPENAI_API_KEY`. Model configured via `OPENAI_MODEL` (default: `gpt-4o-mini`). All calls use the OpenAI REST API directly (no SDK). 30-second request timeout.

| Feature | Endpoint | Description |
|---|---|---|
| Attraction AI Suggest | POST `/api/attractions/ai-suggest` | Admin drops a pin — backend calls Google Places Nearby Search (150 m radius), falls back to Text Search (300 m) then Geocoding. ChatGPT fills missing category, description, entrance fee, safety tips. Coordinates outside Cebu are rejected before the AI call. |
| Photo Refresh | POST `/api/attractions/:id/refresh-photos` | Queries Google Places Text Search → Place Details → follows photo redirect URLs to CDN. Fetches up to 3 photos per attraction. |
| Advisory AI Suggest | POST `/api/advisories/ai-suggest` | Admin selects an attraction — ChatGPT generates title, severity, and recommended actions in JSON. |
| Profile Picture Verification | POST `/api/users/:id/verify-picture` | GPT-4o-mini vision API (detail: low) checks whether the uploaded photo is a real human face. Returns `{ isReal, reason }`. |

---

## Admin Portal

### Pages & Role Access

| Page | Route | Access |
|---|---|---|
| Login | `/login` | Public |
| Dashboard | `/dashboard` | All admins |
| Attractions | `/attractions` | Super + Content |
| Reviews | `/reviews` | Super + Content |
| Advisories | `/advisories` | All admins |
| Emergency & Incident Center | `/emergency` | Super + Emergency |
| Users | `/users` | Super Admin only |
| Notifications | `/notifications` | All admins |
| Reports | `/reports` | All admins |
| Help & FAQ | `/help` | All admins |
| Profile | `/profile` | All admins |

### Roles

| Role | Access |
|---|---|
| `admin_super` | Full access — all pages |
| `admin_content` | Dashboard, Attractions, Reviews, Advisories, Notifications, Reports, Help, Profile |
| `admin_emergency` | Dashboard, Advisories, Emergency Center, Notifications, Reports, Help, Profile |

Role home on login: `admin_emergency` → `/emergency`; all others → `/dashboard`.

### Reports Tabs by Role

| Tab | Super | Content | Emergency |
|---|---|---|---|
| Overview | Y | Y | Y |
| Users | Y | — | — |
| Incidents | Y | — | Y |
| Advisories | Y | Y | — |
| Attractions | Y | Y | — |

Reports include CSV export with timestamp.

### Dark Mode

Toggled via sidebar button. Preference persisted in `localStorage` via Zustand. Tailwind `darkMode: 'class'` applies `dark` to `<html>`.

### Incident Management Views

The Emergency page offers three views:
- **Tabs view** — new / in_progress / resolved tabs
- **Kanban view** — drag-free 3-column board (new → in_progress → resolved)
- **Archive view** — resolved incidents requiring password confirmation before archiving (Super Admin)

### Delivery Diagnostics

Notifications page includes a diagnostics panel showing OneSignal configuration status and the last 20 push delivery attempts (timestamp, target, title, success/error). Auto-refreshes every 15 seconds.

---

## Mobile App Screens

| Screen | Route | Description |
|---|---|---|
| Splash | `/splash` | Restores auth from secure storage; redirects to `/home` or `/auth/login` |
| Login | `/auth/login` | Email + password, language selector |
| Register | `/auth/register` | Name, email, password, nationality, contact |
| OTP Verify | `/auth/otp` | 6-digit code; 60 s resend countdown |
| Forgot Password | `/auth/forgot-password` | Email entry, sends OTP |
| Reset Password | `/auth/reset-password` | OTP + new password |
| Home Dashboard | `/home` | Quick actions (Explore, Advisories, Trip Planner, Emergency, Help), active advisories, SOS FAB |
| Explore | `/explore` | Search + filter attractions by category, safety status (debounced 400 ms) |
| Attraction Detail | `/explore/:id` | Photos, safety badge, crowd level, hours, directions, reviews (SliverList.builder) |
| Emergency | `/emergency` | Incident type + GPS capture + one-tap call to emergency services |
| Advisories | `/advisories` | Severity-sorted list; bottom sheet detail; acknowledge button |
| Trip Planner | `/trip-planner` | Date picker + attraction checklist + day assignment + entrance fee totals; saved locally |
| Profile | `/profile` | Avatar, verification badge, emergency contacts, language, password change, logout |
| Notifications | `/notifications` | Card-based notification history, type labels, priority badges, mark-all-read |
| Help & FAQ | `/help` | 3-tab: FAQ (searchable), Guide (step-by-step workflows), Contact (emergency numbers) |

**SOS FAB** is always visible on the home screen. Suspended/banned accounts see an "Account Restricted" banner at login and are force-logged out mid-session if suspended while active.

**Favorites** and **Trip Plans** are stored offline in `SharedPreferences` — no backend sync required.

**Connectivity handling:** `connectivity_plus` monitors network state. On reconnect, all major data providers are automatically invalidated and re-fetched.

**Localization:** 16 languages — English, Filipino, Cebuano, Chinese, Korean, Japanese, Arabic, Spanish, French, German, Russian, Hindi, Thai, Vietnamese, Indonesian, Malay. Language selected via flag icon on home screen, persisted in `SharedPreferences`. Cebuano remaps to `fil` for Flutter's Material localizations while keeping custom translations.

---

## Google Maps APIs Required

| API | Used In |
|---|---|
| Maps SDK for Android | Flutter mobile — Android map rendering |
| Maps SDK for iOS | Flutter mobile — iOS map rendering |
| Maps JavaScript API | Admin portal — incident map, attraction pin picker |
| Places API | Backend AI suggest (Nearby Search, Text Search, Place Details, Autocomplete) |
| Places Photos | Backend — photo CDN URL resolution |
| Geocoding API | Backend — reverse geocode for AI attraction suggest |

---

## Performance Optimizations

### HTTP Compression

Responses larger than 1 KB are gzip/deflate compressed (threshold: 1024 bytes) — reduces JSON payload sizes by 60–80%.

### Response Cache Middleware

`middleware/cache.js` intercepts `res.json()`, stores 2xx responses with configurable TTL, and sets `X-Cache: HIT` / `X-Cache: MISS` headers. Cache keys are normalized query-param-sorted strings. Applied selectively to read-heavy endpoints.

### Consolidated Report Queries

`/reports/summary` runs 4 queries (one per table using `SUM(condition)`) instead of 16. `/reports/trends` runs 3 queries with `GROUP BY month` instead of 18.

### In-Memory Auth Cache

Authenticated user records are cached in NodeCache with a 5-minute TTL (`auth_user:<userId>`). Invalidated on profile update and avatar upload. Avoids a DB round-trip on every authenticated request.

### Column Projection

List endpoints select only required columns — excludes heavy JSON blobs (`operating_hours`, `contact_info`, `accessibility_features`, `nearby_facilities`) from attraction list views.

### Pagination Guards

- Reviews: capped at 100/page (default 50)
- Incidents per user: capped at 100 rows
- All other lists: paginated (default 20)

### OTP Cleanup

Expired OTPs purged from in-memory Map every 5 minutes.

### Database Connection Pool

5 connections max, 30-second idle timeout, keepAlive enabled with 10-second initial delay.

### Database Indexes

Apply after first deploy:

```sql
-- prisma/migrations/20260323_add_performance_indexes/migration.sql
CREATE INDEX incidents_reported_by_idx ON incidents(reported_by);
CREATE INDEX users_nationality_idx ON users(nationality);
CREATE INDEX users_created_at_idx ON users(created_at DESC);
CREATE INDEX reviews_user_id_idx ON reviews(user_id);
CREATE INDEX advisories_created_at_idx ON advisories(created_at DESC);
```

### Admin Portal

- **Route-based code splitting** — all pages lazy-loaded with `React.lazy()` + `Suspense`
- **Adaptive polling** — `useAdaptivePolling` starts at a base interval (1–15 s depending on page) and exponentially backs off (×1.5 per poll) up to a configured max when data hasn't changed; resets on new data; pauses when tab is hidden
- **Debounced socket invalidations** — rapid-fire events coalesced within a 200 ms window before React Query cache invalidation
- **React Query global config** — `staleTime: 30 s`, `retry: 1`, `refetchOnWindowFocus: true`, no background refetch when tab hidden

### Mobile App

- **Search debounce** — explore screen waits 400 ms after the last keystroke
- **Selective provider watching** — `select()` on auth/notification providers rebuilds widgets only on specific field changes
- **Lazy review rendering** — `SliverList.builder` for attraction detail reviews
- **Immutable state** — notification `markAllRead` uses `copyWith` to prevent stale reference bugs
- **Smart splash** — navigates as soon as auth loads (minimum 800 ms branding display)
- **Connectivity recovery** — invalidates all providers on network reconnect

---

## Hostinger Process Limits

Hostinger Business Web Hosting enforces a **120 concurrent process** limit. Every persistent connection counts as a process.

| Component | Processes | How it's controlled |
|---|---|---|
| Node.js main | 1 | Always running |
| MySQL pool | 0 – 5 | `connection_limit=5` in DATABASE_URL, `idleTimeout: 30 s` |
| SMTP | 0 – 1 | Transient per email send |
| Socket.IO clients | 0 – 60 | Capped by `WS_MAX_CONNECTIONS` (default 60) |
| SSE clients | 0 – 20 | Capped by `SSE_MAX_CONNECTIONS` (default 20) |

**Typical load:** ~10 processes. **Peak (all services active):** ~26 processes — safely under the 120-process limit.

To adjust caps, set `WS_MAX_CONNECTIONS` or `SSE_MAX_CONNECTIONS` in environment variables. Connections beyond the limit receive an error response.

---

## License
CebuSafeTour Team
