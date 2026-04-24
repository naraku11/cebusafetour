import { useState } from 'react';
import {
  QuestionMarkCircleIcon, ChevronDownIcon, ChevronUpIcon,
  ShieldCheckIcon, MapPinIcon, BellAlertIcon, ExclamationTriangleIcon,
  UserGroupIcon, ChartBarIcon, StarIcon, Cog6ToothIcon,
  PhoneIcon, EnvelopeIcon, BookOpenIcon, LightBulbIcon,
  ArrowTopRightOnSquareIcon, ClipboardDocumentListIcon,
  WrenchScrewdriverIcon, ServerIcon,
} from '@heroicons/react/24/outline';

// ── FAQ Data ────────────────────────────────────────────────────────────────

const FAQ_SECTIONS = [
  {
    title: 'Getting Started',
    icon: BookOpenIcon,
    color: 'bg-blue-500',
    faqs: [
      {
        q: 'What is CebuSafeTour Admin Portal?',
        a: 'CebuSafeTour Admin Portal is the centralized management dashboard for the CebuSafeTour tourism safety platform. It allows authorized administrators to manage attractions, safety advisories, emergency incidents, user accounts, notifications, and view analytics reports — all aimed at ensuring a safe tourism experience across Cebu.',
      },
      {
        q: 'What are the different admin roles?',
        a: `There are three admin roles, each with specific permissions:\n\n• **Super Admin** — Full access to every module: Dashboard, Attractions, Reviews, Advisories, Emergency Center, Users, Notifications, and Reports. Can manage all admin accounts and system settings.\n\n• **Content Manager** — Manages tourism content: Attractions, Reviews, Advisories, Notifications, and Reports. Cannot access Emergency Center or Users management.\n\n• **Emergency Officer** — Focused on incident response: Emergency Center, Notifications, and Reports. Cannot manage Attractions, Reviews, or Users.`,
      },
      {
        q: 'How do I log in for the first time?',
        a: 'A Super Admin will create your account and assign your role. You will receive your credentials via email. Navigate to the login page, enter your email and password, and you will be directed to your role-specific dashboard. For security, change your password after first login.',
      },
      {
        q: 'I forgot my password. How do I reset it?',
        a: 'Click the "Forgot Password?" link on the login page. Enter your registered email address and you will receive an OTP (one-time password) code. Enter the OTP to verify your identity, then set a new password. The OTP expires after 10 minutes.',
      },
    ],
  },
  {
    title: 'Attractions Management',
    icon: MapPinIcon,
    color: 'bg-sky-500',
    faqs: [
      {
        q: 'How do I add a new attraction?',
        a: 'Navigate to the Attractions page and click "Add Attraction". Fill in the required details:\n\n1. **Basic Info** — Name, category (beach, mountain, heritage, museum, etc.), and description\n2. **Location** — Use the interactive map picker to set the exact coordinates, or enter the address and district manually\n3. **Safety Status** — Set as Safe, Caution, or Restricted\n4. **Details** — Operating hours, entrance fee, contact information, accessibility features, and nearby facilities\n5. **Photos** — Upload high-quality photos of the attraction\n\nYou can save as Draft to review later or Publish immediately.',
      },
      {
        q: 'What do the safety statuses mean?',
        a: '• **Safe (Green)** — The attraction is open and considered safe for tourists. No known hazards or restrictions.\n\n• **Caution (Yellow)** — Visitors should exercise caution. There may be minor risks, ongoing construction, or weather-related advisories. Additional precautions are recommended.\n\n• **Restricted (Red)** — The attraction is currently closed or off-limits due to safety concerns, natural disasters, or government orders. Tourists should avoid visiting until the status is updated.',
      },
      {
        q: 'How does the AI suggestion feature work?',
        a: 'The platform integrates with OpenAI to provide AI-powered safety tips and attraction recommendations. When editing an attraction, you can generate AI safety suggestions that analyze the attraction type, location, and current conditions to provide relevant safety advice for tourists. The AI can also analyze uploaded photos for potential safety concerns.',
      },
      {
        q: 'What is the crowd level indicator?',
        a: 'Crowd level helps tourists plan their visits:\n\n• **Low** — Few visitors, easy to explore\n• **Moderate** — Normal tourist activity, may have some waiting\n• **High** — Very busy, expect crowds and longer wait times\n\nUpdate this regularly based on real-time reports or seasonal patterns.',
      },
      {
        q: 'Can I bulk-update attraction statuses?',
        a: 'Currently, attraction statuses must be updated individually. This ensures each status change is deliberate and reviewed. During emergencies (e.g., typhoons), use the Advisories module to issue area-wide alerts that reference affected attractions.',
      },
    ],
  },
  {
    title: 'Safety Advisories',
    icon: ExclamationTriangleIcon,
    color: 'bg-amber-500',
    faqs: [
      {
        q: 'How do I create a safety advisory?',
        a: 'Go to Advisories and click "Create Advisory". Fill in:\n\n1. **Title & Description** — Clear, informative headline and detailed explanation\n2. **Severity** — Critical (immediate danger), Warning (significant risk), or Advisory (general caution)\n3. **Source** — Where the information came from: PAGASA, NDRRMC, LGU, CDRRMO, or Admin\n4. **Affected Area** — Define the geographic area impacted\n5. **Recommended Actions** — What tourists should do\n6. **Duration** — Set start and end dates\n\nYou can choose to send a push notification to all mobile app users immediately.',
      },
      {
        q: 'What is the difference between Critical, Warning, and Advisory severity?',
        a: '• **Critical (Red)** — Immediate and severe danger. Examples: active typhoon landfall, earthquake damage, flooding in tourist areas. Tourists should evacuate or shelter immediately.\n\n• **Warning (Orange)** — Significant risk that requires preparation. Examples: typhoon approaching within 48 hours, elevated sea conditions, road closures. Tourists should adjust plans.\n\n• **Advisory (Blue)** — General awareness information. Examples: minor weather changes, scheduled infrastructure work, temporary beach restrictions. Tourists should be aware but no urgent action needed.',
      },
      {
        q: 'Can advisories be automatically sourced?',
        a: 'The system supports multiple sources including PAGASA (Philippine Atmospheric, Geophysical, and Astronomical Services Administration) and NDRRMC (National Disaster Risk Reduction and Management Council). When creating advisories, select the appropriate source to maintain credibility and traceability. You can mark advisories as Resolved or Archived when they are no longer applicable.',
      },
      {
        q: 'How do I notify users about a new advisory?',
        a: 'When creating or updating an advisory, toggle the "Send Notification" option. This will push a real-time alert to all mobile app users via Firebase Cloud Messaging. Critical advisories are recommended to always send notifications. You can also use the Notifications module to send targeted alerts to specific user groups.',
      },
      {
        q: 'Will other admins see a notification when I publish an advisory?',
        a: 'Yes. All other admins currently logged in receive a real-time toast alert in the top-right corner of their browser the moment a new advisory is published. Critical advisories appear as a red alert; standard advisories use a yellow warning style. You will not see this toast for advisories you publish yourself — your confirmation comes from the save action. Admins who are offline will see the advisory when they next log in.',
      },
    ],
  },
  {
    title: 'Emergency Center',
    icon: ShieldCheckIcon,
    color: 'bg-red-500',
    faqs: [
      {
        q: 'How does the emergency incident system work?',
        a: 'Tourists can report emergencies directly from the mobile app. Reports include:\n\n• **Incident Type** — Medical, Fire, Crime, Natural Disaster, or Lost Person\n• **Description** — Details of the emergency\n• **Location** — GPS coordinates and nearest landmark\n• **Reporter Info** — Name and contact number\n• **Attachments** — Photos or evidence\n\nAdmins receive real-time Socket.IO alerts and can manage incident lifecycle from New → In Progress → Resolved → Archived.',
      },
      {
        q: 'What are the incident statuses?',
        a: '• **New** — Just reported, awaiting review and assignment\n• **In Progress** — An emergency officer has been assigned and is responding\n• **Resolved** — The incident has been handled and the situation is under control\n• **Archived** — Closed for record-keeping purposes\n\nAlways add responder notes when updating the status to maintain a clear audit trail.',
      },
      {
        q: 'How do I get notified of new incidents?',
        a: 'The system uses real-time Socket.IO connections. When an incident is reported:\n\n1. A toast alert appears instantly in the top-right corner of your screen showing the incident type (e.g. "New incident: Medical Emergency")\n2. The emergency counter on the sidebar updates in real-time\n3. A push notification is sent to assigned emergency officers\n4. The incident appears at the top of the Emergency Center list\n\nKeep the admin portal open in an active browser tab to receive instant toast alerts.',
      },
      {
        q: 'Can I assign incidents to specific officers?',
        a: 'Yes. When viewing an incident, use the "Assign To" field to designate a specific emergency officer. The assigned officer will receive a notification and the incident will be prioritized in their dashboard. Add responder notes to track communication and actions taken.',
      },
    ],
  },
  {
    title: 'Reviews & Ratings',
    icon: StarIcon,
    color: 'bg-yellow-500',
    faqs: [
      {
        q: 'How are reviews managed?',
        a: 'Tourists can leave star ratings (1-5) and written reviews for attractions through the mobile app. Each user can submit one review per attraction. In the admin portal, you can:\n\n• View all reviews across attractions\n• Filter by rating, date, or attraction\n• Monitor review trends and average ratings\n• Delete inappropriate or spam reviews\n\nReviews directly impact the attraction\'s average rating and total review count displayed to all users.',
      },
      {
        q: 'Can I respond to user reviews?',
        a: 'The current system allows administrators to monitor and moderate reviews. If a review contains inappropriate content, safety misinformation, or spam, you can delete it. The reviewer will see that their review has been removed.',
      },
    ],
  },
  {
    title: 'User Management',
    icon: UserGroupIcon,
    color: 'bg-violet-500',
    faqs: [
      {
        q: 'How do I create a new admin account?',
        a: 'Only Super Admins can manage users. Go to Users and click "Add User". Select the appropriate role (Super Admin, Content Manager, or Emergency Officer), fill in the user details, and set a temporary password. The new admin will receive a confirmation email.',
      },
      {
        q: 'What user statuses are available?',
        a: '• **Active** — User can log in and use the system normally\n• **Suspended** — Temporarily blocked from accessing the platform. Use for temporary restrictions or policy violations.\n• **Banned** — Permanently blocked from the platform. Use for serious violations.\n\nStatus changes take effect immediately. Suspended and banned users will be logged out of active sessions.',
      },
      {
        q: 'Can I see all registered tourists?',
        a: 'Yes. The Users page shows all registered users including tourists and admins. You can filter by role, status, and verification status. Tourist accounts are created through the mobile app registration process which includes email verification via OTP.',
      },
    ],
  },
  {
    title: 'Notifications',
    icon: BellAlertIcon,
    color: 'bg-teal-500',
    faqs: [
      {
        q: 'How do I send a notification to all users?',
        a: 'Navigate to Notifications and click "Create Notification". Configure:\n\n1. **Title & Body** — Clear, concise message content\n2. **Type** — Safety Alert, Advisory, Trip Reminder, Announcement, or Emergency\n3. **Priority** — Normal or High (high-priority notifications use prominent display)\n4. **Target** — All users, specific roles, or custom audience\n5. **Schedule** — Send immediately or schedule for a future time\n\nNotifications are delivered via Firebase Cloud Messaging to all mobile app users.',
      },
      {
        q: 'What notification types are available?',
        a: '• **Safety Alert** — Urgent safety-related messages\n• **Advisory** — Linked to safety advisories\n• **Trip Reminder** — Travel-related reminders\n• **Announcement** — General platform announcements\n• **Emergency** — Critical emergency broadcasts\n\nEach type is displayed differently in the mobile app to help users quickly identify the urgency.',
      },
    ],
  },
  {
    title: 'Reports & Analytics',
    icon: ChartBarIcon,
    color: 'bg-indigo-500',
    faqs: [
      {
        q: 'What reports are available?',
        a: 'The Reports module provides comprehensive analytics:\n\n• **User Statistics** — Total registrations, active users, growth trends\n• **Attraction Analytics** — Most visited, highest rated, safety status distribution\n• **Incident Reports** — Incident types, resolution times, geographic distribution\n• **Advisory History** — Advisory frequency, severity trends, source breakdown\n• **Engagement Metrics** — App usage, notification delivery rates, review activity',
      },
      {
        q: 'How often is the dashboard data updated?',
        a: 'Dashboard statistics query the database on every page load. Real-time incident and advisory counters update instantly via Socket.IO without requiring a page reload. For historical trends, use the date range filter in the Reports module.',
      },
    ],
  },
  {
    title: 'Technical & Troubleshooting',
    icon: WrenchScrewdriverIcon,
    color: 'bg-gray-600',
    faqs: [
      {
        q: 'What browsers are supported?',
        a: 'The admin portal is built with React and works best on modern browsers:\n\n• Google Chrome (recommended) — Latest 2 versions\n• Mozilla Firefox — Latest 2 versions\n• Microsoft Edge — Latest 2 versions\n• Safari — Latest version\n\nEnsure JavaScript is enabled and cookies are allowed for authentication.',
      },
      {
        q: 'Why am I seeing stale data?',
        a: 'All data is fetched directly from the database on every request. If something looks outdated:\n\n1. Hard-refresh the page (Ctrl+Shift+R / Cmd+Shift+R)\n2. Check your internet connection — a dropped connection can leave the page in a stale state\n3. Confirm the Socket.IO indicator in the footer shows "Connected"\n\nIf the issue persists, it may be a server-side problem — contact the Super Admin.',
      },
      {
        q: 'What does the health check monitor?',
        a: 'The system health check (available at the /health endpoint) monitors:\n\n• **Database** — MySQL connection pool status and latency\n• **SMTP** — Email service configuration\n• **Firebase** — Push notification service status\n• **JWT** — Authentication token system\n• **OpenAI** — AI service connectivity\n\nAll services should show "OK" or "configured" status. If any service is degraded, affected features may be temporarily unavailable.',
      },
      {
        q: 'How is the data secured?',
        a: 'CebuSafeTour implements multiple security layers:\n\n• **Authentication** — JWT tokens with expiration\n• **Password Security** — Bcrypt hashing with salt\n• **Rate Limiting** — Protection against brute-force attacks (60 requests/15min for auth endpoints)\n• **Security Headers** — Helmet.js for HTTP security headers\n• **CORS** — Cross-origin request protection\n• **Input Validation** — Express-validator for all API inputs\n• **Role-Based Access** — Strict permission enforcement per admin role',
      },
      {
        q: 'The map picker is not loading. What should I do?',
        a: 'The map uses Leaflet with OpenStreetMap tiles. If it is not loading:\n\n1. Check your internet connection\n2. Ensure no browser extensions are blocking map tile requests\n3. Try disabling ad blockers temporarily\n4. Clear browser cache and reload\n5. Check the browser console for errors (F12 → Console tab)',
      },
    ],
  },
];

// ── Help Guides ─────────────────────────────────────────────────────────────

const HELP_GUIDES = [
  {
    title: 'Managing Attractions',
    icon: MapPinIcon,
    color: 'text-sky-600 bg-sky-50',
    steps: [
      'Navigate to the Attractions page from the sidebar',
      'Click "Add Attraction" or select an existing one to edit',
      'Fill in all required fields including name, category, and location',
      'Use the map picker to set precise GPS coordinates',
      'Set the safety status based on current conditions',
      'Upload photos and add operating details',
      'Save as Draft or Publish directly',
    ],
  },
  {
    title: 'Handling Emergency Incidents',
    icon: ShieldCheckIcon,
    color: 'text-red-600 bg-red-50',
    steps: [
      'Monitor the Emergency Center for new incident reports',
      'Click on a new incident to review details and location',
      'Update status to "In Progress" and assign an emergency officer',
      'Add responder notes with actions being taken',
      'Coordinate with local emergency services if needed',
      'Update status to "Resolved" once the situation is handled',
      'Archive the incident for record-keeping',
    ],
  },
  {
    title: 'Issuing Safety Advisories',
    icon: ExclamationTriangleIcon,
    color: 'text-amber-600 bg-amber-50',
    steps: [
      'Go to Advisories and click "Create Advisory"',
      'Set the severity level: Critical, Warning, or Advisory',
      'Write a clear title and detailed description',
      'Select the information source (PAGASA, NDRRMC, LGU, CDRRMO, or Admin)',
      'Define the affected area and recommended actions',
      'Set the advisory start and end dates',
      'Enable push notification to alert mobile app users',
      'Monitor and update the advisory as conditions change',
    ],
  },
  {
    title: 'Sending Notifications',
    icon: BellAlertIcon,
    color: 'text-teal-600 bg-teal-50',
    steps: [
      'Navigate to the Notifications module',
      'Click "Create Notification" to compose a new message',
      'Choose the notification type and priority level',
      'Write a concise title and informative body',
      'Select the target audience (all users or specific roles)',
      'Send immediately or schedule for later',
      'Monitor delivery status in the notifications list',
    ],
  },
];

// ── Accordion Component ─────────────────────────────────────────────────────

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-medium text-gray-800 pr-4">{question}</span>
        {open
          ? <ChevronUpIcon className="w-4 h-4 text-gray-400 shrink-0" />
          : <ChevronDownIcon className="w-4 h-4 text-gray-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed whitespace-pre-line border-t border-gray-50">
          <div className="pt-3">{answer}</div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function Help() {
  const [search, setSearch] = useState('');
  const [activeSection, setActiveSection] = useState(null);

  const filteredSections = FAQ_SECTIONS.map(section => ({
    ...section,
    faqs: section.faqs.filter(
      faq =>
        faq.q.toLowerCase().includes(search.toLowerCase()) ||
        faq.a.toLowerCase().includes(search.toLowerCase()),
    ),
  })).filter(section => section.faqs.length > 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-primary-700 to-primary-500 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <QuestionMarkCircleIcon className="w-8 h-8" />
          <h1 className="text-2xl font-bold">Help & FAQ</h1>
        </div>
        <p className="text-primary-100 text-sm max-w-2xl">
          Find answers to common questions about managing the CebuSafeTour platform.
          Browse by category or search for specific topics.
        </p>

        {/* Search */}
        <div className="mt-4 relative max-w-lg">
          <input
            type="text"
            placeholder="Search FAQs... (e.g. 'advisory', 'emergency', 'attraction')"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 rounded-lg bg-white/15 backdrop-blur text-white placeholder-white/60 border border-white/20 focus:outline-none focus:border-white/50 text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white text-xs"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Quick-start Guides */}
      {!search && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <LightBulbIcon className="w-5 h-5 text-amber-500" />
            Quick-Start Guides
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {HELP_GUIDES.map(guide => (
              <div key={guide.title} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${guide.color}`}>
                    <guide.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-gray-900">{guide.title}</h3>
                </div>
                <ol className="space-y-1.5">
                  {guide.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs font-medium flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAQ Sections */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
          <ClipboardDocumentListIcon className="w-5 h-5 text-primary-600" />
          {search ? `Search Results (${filteredSections.reduce((s, sec) => s + sec.faqs.length, 0)} found)` : 'Frequently Asked Questions'}
        </h2>

        {filteredSections.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
            <QuestionMarkCircleIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No matching questions found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your search terms</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSections.map(section => {
              const isOpen = activeSection === section.title || !!search;
              return (
                <div key={section.title} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setActiveSection(isOpen && !search ? null : section.title)}
                    className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className={`p-1.5 rounded-lg ${section.color} shrink-0`}>
                      <section.icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-semibold text-gray-900 flex-1">{section.title}</span>
                    <span className="text-xs text-gray-400 mr-2">{section.faqs.length} questions</span>
                    {!search && (isOpen
                      ? <ChevronUpIcon className="w-4 h-4 text-gray-400" />
                      : <ChevronDownIcon className="w-4 h-4 text-gray-400" />)}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 space-y-2 border-t border-gray-50 pt-3">
                      {section.faqs.map(faq => (
                        <FaqItem key={faq.q} question={faq.q} answer={faq.a} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Contact & System Info */}
      {!search && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Contact Support */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <PhoneIcon className="w-5 h-5 text-green-500" />
              Contact Support
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                <EnvelopeIcon className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-gray-800">Email Support</p>
                  <p className="text-gray-500">support@cebusafetour.com</p>
                  <p className="text-gray-400 text-xs mt-0.5">Response time: within 24 hours</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                <PhoneIcon className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-gray-800">Emergency Hotline</p>
                  <p className="text-gray-500">+63 32 123 4567</p>
                  <p className="text-gray-400 text-xs mt-0.5">Available 24/7 for urgent system issues</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                <Cog6ToothIcon className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-gray-800">Technical Support</p>
                  <p className="text-gray-500">tech@cebusafetour.com</p>
                  <p className="text-gray-400 text-xs mt-0.5">For system bugs, API issues, and integrations</p>
                </div>
              </div>
            </div>
          </div>

          {/* System Information */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <ServerIcon className="w-5 h-5 text-indigo-500" />
              System Information
            </h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">Platform Version</span>
                <span className="font-medium text-gray-800">v1.0.0</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">Admin Portal</span>
                <span className="font-medium text-gray-800">React 18 + Vite</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">Mobile App</span>
                <span className="font-medium text-gray-800">Flutter (iOS & Android)</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">Backend</span>
                <span className="font-medium text-gray-800">Node.js + Express</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">Database</span>
                <span className="font-medium text-gray-800">MySQL 8</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">Real-time</span>
                <span className="font-medium text-gray-800">Socket.IO</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Push Notifications</span>
                <span className="font-medium text-gray-800">Firebase Cloud Messaging</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts */}
      {!search && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <LightBulbIcon className="w-5 h-5 text-amber-500" />
            Tips & Best Practices
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { title: 'Update safety statuses promptly', desc: 'Tourists rely on accurate real-time information. Review and update attraction safety statuses at least daily, especially during weather events.' },
              { title: 'Use specific advisory titles', desc: 'Write clear, descriptive advisory titles like "Typhoon Aghon — Bantayan Island Evacuation" instead of vague ones like "Weather Warning".' },
              { title: 'Respond to incidents quickly', desc: 'Aim to change new incidents to "In Progress" within 15 minutes. Fast response builds trust with tourists and local authorities.' },
              { title: 'Keep photos up to date', desc: 'Outdated photos can mislead tourists. Regularly review and refresh attraction photos, especially after renovations or natural events.' },
              { title: 'Monitor reviews regularly', desc: 'Reviews often contain early warnings about safety issues, infrastructure problems, or scam reports that may need official action.' },
              { title: 'Coordinate across roles', desc: 'Use the notification system to keep Content Managers and Emergency Officers aligned, especially during multi-day events.' },
            ].map((tip, i) => (
              <div key={i} className="p-3 rounded-lg bg-amber-50/50 border border-amber-100">
                <p className="font-medium text-gray-800 text-sm">{tip.title}</p>
                <p className="text-gray-500 text-xs mt-1 leading-relaxed">{tip.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
