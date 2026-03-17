# CebuSafeTour

A tourism safety platform for Cebu, Philippines. Helps tourists explore attractions safely, receive real-time advisories, access emergency services, and plan trips — with a full admin portal for government and tourism officers.

---

## System Architecture

```
┌──────────────────────────┬──────────────────────────────────────┐
│   MOBILE APP (Tourists)  │        WEB PORTAL (Admin)            │
│   Flutter — Android/iOS  │        React.js + Tailwind CSS       │
├──────────────────────────┴──────────────────────────────────────┤
│                    Backend REST API (Node.js)                    │
│  PostgreSQL │ Prisma │ Firebase │ FCM │ Open-Meteo │ OpenAI     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
cebusafetour/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema & models
│   │   ├── migrations/         # Prisma migration history
│   │   └── seed.js             # Seed data (accounts, attractions, etc.)
│   ├── src/
│   │   ├── config/             # prisma.js, firebase.js
│   │   ├── controllers/        # Auth, Attractions, Advisories, Emergency, Users, Notifications
│   │   ├── middleware/         # auth.js, errorHandler.js, validate.js
│   │   ├── routes/             # All API route files
│   │   ├── services/
│   │   │   ├── aiService.js    # OpenAI ChatGPT + vision integration
│   │   │   ├── fcmService.js   # Firebase Cloud Messaging
│   │   │   ├── emailService.js # Nodemailer OTP / notifications
│   │   │   └── weatherService.js
│   │   └── app.js              # Express entry point
│   ├── uploads/
│   │   └── avatars/            # User profile picture files (served statically)
│   └── .env.example
├── admin/                      # React.js + Tailwind Admin Portal
└── mobile/                     # Flutter Mobile App (Android + iOS)
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Mobile App | Flutter 3.x (Android + iOS) |
| Admin Portal | React 18 + Vite + Tailwind CSS |
| Backend API | Node.js + Express |
| ORM | Prisma 5 |
| Database | PostgreSQL 14+ |
| Realtime | Firebase Firestore |
| Auth | JWT |
| Push Notifications | Firebase Cloud Messaging (FCM) |
| Maps | Google Maps API |
| AI / Vision | OpenAI ChatGPT (GPT-4o-mini) |
| Weather | Open-Meteo (free, open-source, no API key) |
| Email / OTP | Nodemailer (SMTP / Gmail) |
| File Uploads | Multer (local disk, served via Express static) |

---

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Flutter 3.x SDK
- Firebase project (Firestore + Auth + FCM enabled)
- Google Cloud project (Maps SDK + Geocoding API enabled)
- OpenAI account with API key

---

## 1. Backend Setup

### Install dependencies
```bash
cd backend
npm install
```

### Configure environment
```bash
cp .env.example .env
```

Edit `.env` and fill in:

| Variable | Description |
|---|---|
| `PORT` | API server port (default: `5000`) |
| `NODE_ENV` | `development` or `production` |
| `JWT_SECRET` | Any long random string |
| `JWT_EXPIRES_IN` | Token lifetime (default: `7d`) |
| `DATABASE_URL` | PostgreSQL connection string (see format below) |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Service account client email |
| `FIREBASE_PRIVATE_KEY` | Service account private key — keep `\n` as literal |
| `FCM_SERVER_KEY` | Firebase Cloud Messaging server key |
| `SMTP_HOST` | SMTP host (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | SMTP port (e.g. `587`) |
| `SMTP_USER` | SMTP email address |
| `SMTP_PASS` | SMTP app password |
| `EMAIL_FROM` | Sender address |
| `GOOGLE_MAPS_API_KEY` | Google Maps API key (also used for reverse geocoding) |
| `OPENAI_API_KEY` | OpenAI API key — get one at [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| `OPENAI_MODEL` | Model to use (default: `gpt-4o-mini`) |
| `ADMIN_URL` | Admin portal URL for CORS (default: `http://localhost:5173`) |

> **Weather** uses Open-Meteo — no API key needed. `WEATHER_BASE_URL` and `WEATHER_TIMEZONE` are pre-filled.

#### DATABASE_URL format
```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
```
Example:
```
DATABASE_URL="postgresql://cebusafetour:cebusafetour_v1@localhost:5432/cebusafetour_db?schema=public"
```

### Get Firebase credentials
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. **Project Settings → Service accounts → Generate new private key**
3. Copy `project_id`, `client_email`, `private_key` from the downloaded JSON into `.env`

### Create the PostgreSQL database
```sql
CREATE DATABASE cebusafetour_db;
CREATE USER cebusafetour WITH PASSWORD 'cebusafetour_v1';
GRANT ALL PRIVILEGES ON DATABASE cebusafetour_db TO cebusafetour;
```

### Run Prisma migration & seed
```bash
# Generate Prisma client
npm run db:generate

# Apply schema to database (creates all tables)
npm run db:migrate

# Seed the database (accounts, attractions, advisories, incidents)
npm run db:seed
```

### Available database scripts

| Script | Command | Description |
|---|---|---|
| `npm run db:generate` | `prisma generate` | Regenerate Prisma client after schema changes |
| `npm run db:migrate` | `prisma migrate dev` | Apply migrations to the database |
| `npm run db:seed` | `prisma db seed` | Run the seed file |
| `npm run db:studio` | `prisma studio` | Open visual database browser at `localhost:5555` |
| `npm run db:reset` | `prisma migrate reset` | Drop all tables, re-migrate, and re-seed |

### Run the server
```bash
# Development (with hot reload)
npm run dev

# Production
npm start
```

API runs at `http://localhost:5000`
Health check: `GET http://localhost:5000/health`

---

## 2. Admin Portal Setup

### Install dependencies
```bash
cd admin
npm install
```

### Configure environment
```bash
# Create .env file
echo "VITE_GOOGLE_MAPS_KEY=your_maps_javascript_api_key" > .env
```

### Run
```bash
npm run dev
```

Portal runs at `http://localhost:5173`

> The admin portal proxies `/api/*` requests to `http://localhost:5000` automatically (configured in `vite.config.js`).

### Build for production
```bash
npm run build
# Output: admin/dist/
```

---

## 3. Mobile App Setup

### Prerequisites
```bash
flutter --version   # Should be 3.x+
flutter doctor      # Check for issues
```

### Install dependencies
```bash
cd mobile
flutter pub get
```

### Configure Firebase
1. Download `google-services.json` from Firebase Console → Project Settings → Android app
2. Place it at `mobile/android/app/google-services.json`
3. For iOS: download `GoogleService-Info.plist` → `mobile/ios/Runner/GoogleService-Info.plist`

### Configure API base URL
Edit `mobile/lib/utils/constants.dart`:
```dart
// Physical device on same network:
static const String baseUrl = 'http://YOUR_LOCAL_IP:5000/api';

// Android emulator:
static const String baseUrl = 'http://10.0.2.2:5000/api';

// Production:
static const String baseUrl = 'https://api.cebusafetour.ph/api';
```

### Run
```bash
flutter devices               # List available devices
flutter run -d android        # Run on Android
flutter run -d ios            # Run on iOS
flutter build apk --release   # Build release APK
```

---

## Seed Accounts

After running `npm run db:seed`, the following accounts are available:

### Admin Accounts

| Role | Email | Password |
|---|---|---|
| Super Admin | `superadmin@cebusafetour.ph` | `SuperAdmin@123` |
| Content Manager | `content@cebusafetour.ph` | `Content@123` |
| Emergency Officer | `emergency@cebusafetour.ph` | `Emergency@123` |

### Tourist Accounts (all use `Tourist@123`)

| Nationality | Email |
|---|---|
| Korean | `kim.jisoo@example.com` |
| Japanese | `tanaka.hiroshi@example.com` |
| Chinese | `wang.wei@example.com` |
| American | `sarah.johnson@example.com` |
| Filipino | `maria.santos@example.com` |
| German | `emma.muller@example.com` |

### Seed Data Included

- **10 attractions** — Kawasan Falls, Magellan's Cross, Basilica del Santo Niño, Osmeña Peak, Moalboal Beach, Temple of Leah, Tops Lookout, Fort San Pedro, Carbon Market, Mactan Shrine
- **3 advisories** — Typhoon alert (critical), Ocean current warning (warning), Sinulog festival advisory
- **3 incidents** — Medical at Kawasan Falls, Theft at Carbon Market, Lost person at Osmeña Peak

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new tourist |
| POST | `/api/auth/verify-otp` | Verify email OTP |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/forgot-password` | Request password reset OTP |
| POST | `/api/auth/reset-password` | Reset password with OTP |
| GET | `/api/auth/me` | Get current user |
| PATCH | `/api/auth/fcm-token` | Update FCM token |

### Attractions
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/attractions` | Public | List attractions (filters: category, district, safetyStatus, search) |
| GET | `/api/attractions/nearby?lat=&lng=` | Public | Nearby attractions by GPS |
| GET | `/api/attractions/:id` | Public | Attraction detail |
| POST | `/api/attractions/ai-suggest` | Admin | AI fill attraction details from `{ latitude, longitude }` using reverse geocoding + ChatGPT |
| POST | `/api/attractions` | Admin | Create attraction |
| PUT | `/api/attractions/:id` | Admin | Update attraction — safety change triggers push notification |
| DELETE | `/api/attractions/:id` | Admin | Archive attraction (soft delete) |
| DELETE | `/api/attractions/:id/permanent` | Super Admin | Permanently delete attraction |

### Advisories
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/advisories` | Public | List advisories (filters: status, severity) |
| GET | `/api/advisories/:id` | Public | Advisory detail |
| POST | `/api/advisories/ai-suggest` | Admin | AI generate advisory from `{ area }` attraction name using ChatGPT |
| POST | `/api/advisories` | Admin | Publish advisory + auto push notify |
| PUT | `/api/advisories/:id` | Admin | Update advisory |
| POST | `/api/advisories/:id/acknowledge` | Tourist | Acknowledge advisory |
| PATCH | `/api/advisories/:id/resolve` | Admin | Resolve advisory |

### Emergency
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/emergency/services` | Cebu emergency contacts list |
| POST | `/api/emergency/incidents` | Report incident (auto-notifies admins) |
| GET | `/api/emergency/incidents` | List incidents (admin) |
| GET | `/api/emergency/incidents/:id` | Incident detail (admin) |
| PATCH | `/api/emergency/incidents/:id` | Update incident status (admin) |

### Weather — Open-Meteo (no API key)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/weather/current?lat=&lng=` | Current weather conditions |
| GET | `/api/weather/forecast?lat=&lng=` | 7-day forecast |
| GET | `/api/weather/safety?lat=&lng=` | Safety assessment with warnings |

### Users
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/users/me` | Tourist | Current user profile |
| PATCH | `/api/users/me` | Tourist | Update profile (name, nationality, language, etc.) |
| POST | `/api/users/me/profile-picture` | Tourist | Upload profile picture (`multipart/form-data`, field: `avatar`, max 5 MB) |
| GET | `/api/users/stats` | Admin | User count stats |
| GET | `/api/users` | Admin | User list (filters: search, status, nationality) |
| GET | `/api/users/:id` | Admin | User detail + incident history |
| PATCH | `/api/users/:id/status` | Super Admin | Suspend / ban / activate user |
| POST | `/api/users/:id/verify-picture` | Admin | AI verify profile picture using OpenAI vision — sets `profilePictureVerified` |

### Notifications
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/notifications` | Send / schedule push notification (admin) |
| GET | `/api/notifications` | Notification log (admin) |

### Reports
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/reports/summary` | Dashboard stats (users, incidents, advisories) |
| GET | `/api/reports/incidents` | Filterable incident log |
| GET | `/api/reports/attractions` | Attraction analytics |

---

## AI Features (OpenAI ChatGPT)

All AI features require `OPENAI_API_KEY` in `backend/.env`. The default model is `gpt-4o-mini` (configurable via `OPENAI_MODEL`).

### Attraction AI Suggest
Admins drop a pin on the map in the Attractions admin page. The backend:
1. Calls **Google Maps Geocoding API** to reverse-geocode the coordinates into a real POI name
2. Sends the coordinates + place name to **ChatGPT** to fill in `name`, `category`, `district`, `address`, `description`, `entranceFee`, and `safetyTips`

> Coordinates outside Cebu Province bounds (`lat 9.4–11.5`, `lng 123.3–124.1`) are rejected.

### Advisory AI Suggest
In the Create Advisory modal, admins select an attraction from a dropdown (populated from the database). ChatGPT generates a realistic safety advisory with `title`, `description`, `severity`, and `recommendedActions` specific to that attraction.

### Profile Picture Verification
Admins can click **"Verify with AI"** on any user with a profile picture. The backend sends the image URL to **GPT-4o-mini vision** which checks whether it is a real human face photograph. The result (`profilePictureVerified: true/false`) is saved to the database and shown as a badge on the user's avatar.

---

## Profile Picture System

Users can upload a profile picture from the mobile app. The image is stored in `backend/uploads/avatars/` and served at `/uploads/avatars/<filename>`.

### Upload flow
1. Mobile app picks image from camera or gallery (`image_picker`)
2. Sends `multipart/form-data` POST to `/api/users/me/profile-picture` (field name: `avatar`)
3. Backend saves file with a UUID filename, updates `profilePicture` URL in the database, and resets `profilePictureVerified` to `null`
4. Admin can then run AI verification via the Users admin page

### Verification states

| `profilePictureVerified` | Meaning |
|---|---|
| `null` | Not yet verified |
| `true` | AI confirmed real human face |
| `false` | AI rejected (cartoon, logo, inappropriate, etc.) |

---

## Admin Portal — Pages

| Page | Route | Access |
|---|---|---|
| Login | `/login` | Public |
| Dashboard | `/dashboard` | All admins |
| Attractions | `/attractions` | Super + Content |
| Advisories | `/advisories` | Super + Content |
| Emergency Center | `/emergency` | Super + Emergency |
| Users | `/users` | All admins |
| Notifications | `/notifications` | All admins |
| Reports | `/reports` | All admins |

### Admin Roles

| Role | Permissions |
|---|---|
| `admin_super` | Full access — including permanent delete and user banning |
| `admin_content` | Attractions + Advisories only |
| `admin_emergency` | Emergency center + Incidents only |

### Key Admin UI Features

- **Attractions** — Map pin → AI auto-fill (reverse geocode + ChatGPT), archive/unarchive, permanent delete (super admin only)
- **Advisories** — AI generate advisory from attraction dropdown, severity badges, resolve workflow
- **Users** — Avatar with verification badge (green ✓ / red ✗), AI profile picture verification, suspend/ban/activate

---

## Mobile App — Screens

| Screen | Description |
|---|---|
| Splash | Auto-redirects based on stored auth token |
| Login / Register / OTP | Full authentication flow with email verification |
| Home Dashboard | Quick actions grid + active advisories + SOS FAB + tappable avatar |
| Explore | Search + filter attractions by category and safety status |
| Attraction Detail | Photos, safety badge, crowd level, operating hours, directions |
| Emergency | Type selection + GPS capture + one-tap call to services |
| Advisories | Severity-sorted list with bottom sheet detail view |
| Trip Planner | Date picker + attraction checklist + drag-to-reorder itinerary |
| Profile | Profile picture (tap to change via camera/gallery), verification badge, language preference, emergency contacts, logout |

> The red **SOS** floating action button is visible on every screen.

---

## Firebase Services Required

Enable in the Firebase Console:

| Service | Purpose |
|---|---|
| Authentication → Email/Password | Tourist and admin login |
| Firestore Database | Real-time incident feed on admin map |
| Cloud Messaging | Push notifications to mobile app |

---

## Google Maps APIs Required

Enable in Google Cloud Console:

| API | Used In |
|---|---|
| Maps SDK for Android | Flutter mobile — Android map rendering |
| Maps SDK for iOS | Flutter mobile — iOS map rendering |
| Maps JavaScript API | Admin portal — incident map, attraction pin picker |
| Places API | Nearby emergency services lookup |
| Geocoding API | Convert attraction address → coordinates; reverse geocode map pin for AI suggestions |

---

## License

MIT License — CebuSafeTour Team
