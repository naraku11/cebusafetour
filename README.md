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
│              Node.js / Express 5  ·  Prisma ORM                   │
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
│   ├── config/                 # prisma.js, firebase.js
│   ├── controllers/            # auth, attractions, advisories, emergency,
│   │                           #   users, notifications, reviews
│   ├── middleware/             # auth.js, errorHandler.js, validate.js
│   ├── routes/                 # Route files (mirrors controllers)
│   ├── services/
│   │   ├── socketService.js    # Socket.IO — JWT rooms (admins / tourists)
│   │   ├── aiService.js        # OpenAI ChatGPT + vision
│   │   ├── fcmService.js       # Firebase Cloud Messaging
│   │   ├── emailService.js     # Nodemailer OTP / alerts
│   │   └── placesService.js    # Google Places / geocoding
│   └── utils/
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── migrations/             # Migration history
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
├── mobile/                     # Flutter mobile app (separate — see §4)
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
| ORM | Prisma 6 |
| Database | MySQL 8 (Hostinger) |
| Auth | JWT + bcryptjs |
| Push Notifications | Firebase Cloud Messaging (FCM) |
| Maps | Google Maps API |
| AI / Vision | OpenAI GPT-4o-mini |
| Weather | Open-Meteo (free, no API key) |
| Email / OTP | Nodemailer (SMTP) |
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
# Install backend dependencies (also runs prisma generate via postinstall)
npm install --include=dev

# Install admin panel dependencies
cd client && npm install && cd ..
```

### Configure environment

Create `.env.local` at the repo root (overrides `.env` for local dev):

```bash
cp .env.local.example .env.local
```

Key variables:

| Variable | Description |
|---|---|
| `PORT` | API server port (default: `5000`) |
| `NODE_ENV` | `development` or `production` |
| `DATABASE_URL` | MySQL connection string (see format below) |
| `JWT_SECRET` | Long random string |
| `JWT_EXPIRES_IN` | Token lifetime (default: `7d`) |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Service account client email |
| `FIREBASE_PRIVATE_KEY` | Service account private key — paste with literal `\n` |
| `SMTP_HOST` | SMTP host (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | SMTP port (e.g. `587`) |
| `SMTP_USER` | SMTP email address |
| `SMTP_PASS` | SMTP app password |
| `EMAIL_FROM` | Sender address |
| `GOOGLE_MAPS_API_KEY` | Used for reverse geocoding (AI suggest) |
| `OPENAI_API_KEY` | OpenAI API key |
| `OPENAI_MODEL` | Model to use (default: `gpt-4o-mini`) |
| `CORS_ORIGINS` | Comma-separated allowed origins |

#### DATABASE_URL format (MySQL)

```
mysql://USER:PASSWORD@HOST:3306/DATABASE
```

For local MySQL:
```
DATABASE_URL="mysql://root:@localhost:3306/cebusafetour_dev"
```

For Hostinger remote MySQL (enable Remote MySQL in hPanel first):
```
DATABASE_URL="mysql://u856082912_cebusafetour:PASSWORD@HOST:3306/u856082912_cebusafetourdb"
```

> Special characters in passwords must be URL-encoded (e.g. `@` → `%40`, `?` → `%3F`). Use a password without special characters to avoid this.

### Get Firebase credentials

1. [console.firebase.google.com](https://console.firebase.google.com) → Project Settings → Service accounts → Generate new private key
2. Copy `project_id`, `client_email`, `private_key` from the downloaded JSON into `.env.local`

### Run database migrations

```bash
# Apply schema to database (creates all tables)
npm run db:migrate

# Seed the database (admin accounts, attractions, advisories, incidents)
npm run db:seed
```

### Database scripts

| Script | Description |
|---|---|
| `npm run db:generate` | Regenerate Prisma client after schema changes |
| `npm run db:migrate` | Apply migrations (dev) |
| `npm run db:deploy` | Apply migrations (production — no prompts) |
| `npm run db:seed` | Run seed script |
| `npm run db:studio` | Open Prisma Studio at `localhost:5555` |
| `npm run db:reset` | Drop all tables, re-migrate, re-seed |

### Run locally

```bash
# Start API server (port 5000)
npm run dev

# In a separate terminal — start admin panel dev server (port 5173)
cd client && npm run dev
```

- API: `http://localhost:5000`
- Admin portal: `http://localhost:5173` (proxies `/api/*` to port 5000)
- Health check: `GET http://localhost:5000/health`

---

## 3. Deployment (Hostinger)

### Hostinger deployment settings

| Setting | Value |
|---|---|
| Framework preset | **Express** |
| Node version | **22.x** |
| Root directory | *(leave empty)* |
| Entry file | `src/app.js` |
| Build command | `npm install && npm run build` |

The build command:
1. Installs backend dependencies (`npm install` → also runs `prisma generate` via postinstall)
2. Runs `scripts/build.js` which installs `client/` deps, builds Vite, and copies `client/dist/` → `public/`

Express then serves `public/` as static files and the React SPA handles all frontend routing.

### Environment variables on Hostinger

Set these in hPanel → Node.js → Environment Variables:

```
NODE_ENV=production
DATABASE_URL=mysql://u856082912_cebusafetour:PASSWORD@127.0.0.1:3306/u856082912_cebusafetourdb
JWT_SECRET=...
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...    ← paste full key manually (do not use quotes)
SMTP_HOST=...
SMTP_USER=...
SMTP_PASS=...
EMAIL_FROM=...
GOOGLE_MAPS_API_KEY=...
OPENAI_API_KEY=...
CORS_ORIGINS=https://cebusafetour.fun,https://www.cebusafetour.fun
```

> Use `127.0.0.1` (not `localhost`) for the MySQL host on Hostinger to force TCP connection.

### First-time database setup on Hostinger

1. Create the database in hPanel → Databases → MySQL Databases
2. Import `prisma/seed.sql` via phpMyAdmin to create tables and seed data, **or** run:
   ```bash
   npm run db:deploy   # applies all migrations
   npm run db:seed     # seeds admin accounts + sample data
   ```

### Verify deployment

```
GET https://cebusafetour.fun/health
```

Returns:
```json
{
  "status": "ok",
  "checks": {
    "database":  { "status": "ok", "latencyMs": 4 },
    "smtp":      { "status": "configured" },
    "firebase":  { "status": "configured" },
    "openai":    { "status": "configured", "keyPrefix": "sk-proj-abcd..." },
    "jwt":       { "status": "configured" }
  },
  "uptime": "120s"
}
```

`openai.keyPrefix` shows the first 12 characters of the loaded API key — use this to confirm the correct key is deployed without exposing the full secret.

---

## 4. Mobile App Setup

### Install dependencies

```bash
cd mobile
flutter pub get
```

### Configure Firebase

1. Download `google-services.json` from Firebase Console → Project Settings → Android app
2. Place at `mobile/android/app/google-services.json`
3. iOS: download `GoogleService-Info.plist` → `mobile/ios/Runner/GoogleService-Info.plist`

### Configure API base URL

Edit `mobile/lib/utils/constants.dart`:

```dart
// Android emulator (10.0.2.2 maps to host machine localhost):
static const String serverUrl = 'http://10.0.2.2:5000';

// Physical device on the same Wi-Fi — replace with your machine's local IP:
static const String serverUrl = 'http://YOUR_LOCAL_IP:5000';

// Production:
static const String serverUrl = 'https://cebusafetour.fun';
```

### Run

```bash
flutter devices                     # list available devices
flutter run -d android              # run on Android
flutter run -d ios                  # run on iOS
flutter build apk --release         # release APK
flutter build appbundle --release   # Play Store bundle
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

### Tourist accounts (all use `Tourist@123`)

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
- **3 advisories** — Typhoon alert (critical), Ocean current warning (warning), Sinulog festival advisory
- **3 incidents** — Medical at Kawasan Falls, Theft at Carbon Market, Lost person at Osmeña Peak

---

## API Endpoints

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register new tourist |
| POST | `/api/auth/verify-otp` | Public | Verify email OTP |
| POST | `/api/auth/login` | Public | Login |
| POST | `/api/auth/forgot-password` | Public | Request password reset OTP |
| POST | `/api/auth/reset-password` | Public | Reset password with OTP |
| GET | `/api/auth/me` | Tourist | Current user info |
| PATCH | `/api/auth/fcm-token` | Tourist | Update FCM push token |

### Attractions

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/attractions` | Public | List attractions (filters: category, district, safetyStatus, search) |
| GET | `/api/attractions/nearby?lat=&lng=` | Public | Nearest attractions by GPS |
| GET | `/api/attractions/:id` | Public | Attraction detail |
| POST | `/api/attractions/ai-suggest` | Admin | AI auto-fill from `{ latitude, longitude }` — reverse geocode + ChatGPT |
| POST | `/api/attractions` | Admin | Create attraction |
| PUT | `/api/attractions/:id` | Admin | Update attraction (safety change triggers push notification) |
| DELETE | `/api/attractions/:id` | Admin | Archive attraction (soft delete) |
| DELETE | `/api/attractions/:id/permanent` | Super Admin | Permanently delete |

### Advisories

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/advisories` | Public | List advisories (filters: `status`, `severity`) |
| GET | `/api/advisories/:id` | Public | Advisory detail |
| POST | `/api/advisories/ai-suggest` | Admin | AI generate advisory from attraction name |
| POST | `/api/advisories` | Admin | Publish advisory + auto push notify |
| PUT | `/api/advisories/:id` | Admin | Update advisory |
| PATCH | `/api/advisories/:id/resolve` | Admin (super, content) | Set status → `resolved` |
| PATCH | `/api/advisories/:id/archive` | Admin (super, content) | Set status → `archived` |
| PATCH | `/api/advisories/:id/unarchive` | Super Admin | Restore archived → `resolved` |

### Emergency

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/emergency/services` | Public | Cebu emergency contacts list |
| POST | `/api/emergency/incidents` | Tourist | Report incident (notifies admins via Socket.IO) |
| GET | `/api/emergency/incidents/mine` | Tourist | My reported incidents |
| GET | `/api/emergency/incidents` | Admin | List active incidents (excludes archived) |
| GET | `/api/emergency/incidents/archived` | Admin (super, emergency) | List archived incidents |
| GET | `/api/emergency/incidents/:id` | Admin | Incident detail |
| PATCH | `/api/emergency/incidents/:id` | Admin | Update incident (status, responder notes, assignedTo) |
| PATCH | `/api/emergency/incidents/:id/archive` | Super Admin | Archive incident |
| PATCH | `/api/emergency/incidents/:id/unarchive` | Super Admin | Restore archived incident → `resolved` |

### Weather (Open-Meteo — no API key)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/weather/current?lat=&lng=` | Current conditions |
| GET | `/api/weather/forecast?lat=&lng=` | 7-day forecast |
| GET | `/api/weather/safety?lat=&lng=` | Safety assessment with warnings |

### Users

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/users/me` | Tourist | Current user profile |
| PATCH | `/api/users/me` | Tourist | Update profile |
| POST | `/api/users/me/profile-picture` | Tourist | Upload avatar (`multipart/form-data`, field: `avatar`, max 5 MB) |
| GET | `/api/users/stats` | Admin | User count stats |
| GET | `/api/users` | Admin | User list (filters: search, status, nationality) |
| GET | `/api/users/:id` | Admin | User detail + incident history |
| PATCH | `/api/users/:id/status` | Super Admin | Suspend / ban / activate user |
| POST | `/api/users/:id/verify-picture` | Admin | AI verify profile picture via GPT-4o-mini vision |

### Notifications

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/notifications` | Admin | Send / schedule push notification |
| GET | `/api/notifications` | Admin | Notification log |

### Reports

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/reports/summary` | Admin | Dashboard stats (users, incidents, advisories) |
| GET | `/api/reports/incidents` | Admin | Filterable incident log |
| GET | `/api/reports/attractions` | Admin | Attraction analytics |

### Reviews

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/reviews` | Tourist | My reviews |
| POST | `/api/reviews` | Tourist | Submit review for an attraction |
| DELETE | `/api/reviews/:id` | Tourist | Delete own review |

---

## Real-Time (Socket.IO)

The admin portal connects via Socket.IO using the logged-in JWT. Sockets are placed into rooms based on role — `admins` or `tourists`. The backend emits events on every significant database write; the admin panel listens and automatically invalidates React Query caches.

### Rooms

| Room | Members |
|---|---|
| `admins` | `admin_super`, `admin_content`, `admin_emergency` |
| `tourists` | All tourist accounts |
| `user:<id>` | Individual user (private messages) |

### Events emitted by the server

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

All AI features require `OPENAI_API_KEY`. Default model: `gpt-4o-mini` (override with `OPENAI_MODEL`).

### Attraction AI Suggest
Admin drops a pin on the map. The backend reverse-geocodes the coordinates via Google Maps, then sends the location to ChatGPT to fill in `name`, `category`, `district`, `address`, `description`, `entranceFee`, and `safetyTips`. Coordinates outside Cebu Province (`lat 9.4–11.5`, `lng 123.3–124.1`) are rejected.

### Advisory AI Suggest
Admin selects an attraction from a dropdown. ChatGPT generates a realistic safety advisory with `title`, `description`, `severity`, and `recommendedActions` for that attraction.

### Profile Picture Verification
Admin clicks "Verify with AI" on a user. The backend sends the image to GPT-4o-mini vision which checks whether it is a real human face photograph. Result (`profilePictureVerified: true/false`) is saved and shown as a badge on the user's avatar.

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
| Users | `/users` | All admins |
| Notifications | `/notifications` | All admins |
| Reports | `/reports` | All admins |

### Roles

| Role | Permissions |
|---|---|
| `admin_super` | Full access — including archive/unarchive incidents & advisories, user banning |
| `admin_content` | Attractions + Advisories (create, edit, resolve, archive) |
| `admin_emergency` | Emergency center — view and update incidents |

### Emergency & Incident Center

Incidents are never hard-deleted. The workflow:

| Action | Who | Password required? |
|---|---|---|
| Update status / notes | Admin (super, emergency) | No |
| Edit a **resolved** incident | Admin (super, emergency) | Yes — admin password via `/auth/login` |
| Archive an **active/in-progress** incident | Super Admin | No |
| Archive a **resolved** incident | Super Admin | Yes |
| Restore (unarchive) archived incident | Super Admin | Yes |

Views: **Tabs** (by status) · **Kanban** · **📦 Archive**

### Safety Advisories

| Action | Who | Password required? |
|---|---|---|
| Edit an **active** advisory | Admin (super, content) | No |
| Edit a **resolved** advisory | Admin (super, content) | Yes |
| Archive an **active** advisory | Admin (super, content) | No |
| Archive a **resolved** advisory | Admin (super, content) | Yes |
| Restore (unarchive) archived advisory | Super Admin | Yes |

---

## Mobile App Screens

| Screen | Description |
|---|---|
| Splash | Auto-redirects based on stored auth token |
| Login / Register / OTP | Full email-verified auth flow with language selector (12 languages) |
| Home Dashboard | Quick actions, active advisories, language flag button, SOS FAB |
| Explore | Search + filter attractions by category and safety status |
| Attraction Detail | Photos, safety badge, crowd level, hours, directions |
| Emergency | Type selection + GPS capture + one-tap call to services |
| Advisories | Severity-sorted list with bottom sheet detail |
| Trip Planner | Date picker + attraction checklist + drag-to-reorder itinerary |
| Profile | Avatar (tap to change), verification badge, emergency contacts, logout |

The red **SOS** floating action button is visible on every screen. Suspended/banned accounts receive an "Account Restricted" banner at login.

### Localization

12 languages supported: English, Chinese, Korean, Japanese, German, Spanish, French, Arabic, Hindi, Russian, Filipino, Indonesian.

Language selection is available on the **login screen** (flag chip row + searchable full picker) and via the **flag button on the home dashboard header**. The selected language is persisted locally (SharedPreferences) and is **not** automatically overridden when a tourist logs in — the user's language preference is always under their control.

---

## Google Maps APIs Required

Enable in Google Cloud Console:

| API | Used In |
|---|---|
| Maps SDK for Android | Flutter mobile — Android map rendering |
| Maps SDK for iOS | Flutter mobile — iOS map rendering |
| Maps JavaScript API | Admin portal — incident map, attraction pin picker |
| Geocoding API | Reverse geocode map pin for AI attraction suggest |

---

## Firebase Services Required

Enable in Firebase Console:

| Service | Purpose |
|---|---|
| Cloud Messaging (FCM) | Push notifications to mobile app |
| Authentication (Email/Password) | Optional — JWT handles auth; Firebase used for FCM only |

> Firebase credentials (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) must be set as environment variables. If they are missing, the server starts normally but FCM push notifications and Firestore writes are silently skipped — the `/health` endpoint will report `firebase: { status: "missing" }`.

---

## License
CebuSafeTour Team
