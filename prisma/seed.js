// CebuSafeTour — Prisma Seed
// Run: npx prisma db seed
//  or: node prisma/seed.js

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const hash = (pw) => bcrypt.hash(pw, 12);

// ─── SEED DATA ────────────────────────────────────────────────────────────────

const adminAccounts = [
  {
    name: 'Super Administrator',
    email: 'superadmin@cebusafetour.ph',
    password: 'SuperAdmin@123',
    role: 'admin_super',
    nationality: 'Filipino',
    contactNumber: '+63-32-255-0001',
    isVerified: true,
    language: 'en',
  },
  {
    name: 'Content Manager',
    email: 'content@cebusafetour.ph',
    password: 'Content@123',
    role: 'admin_content',
    nationality: 'Filipino',
    contactNumber: '+63-32-255-0002',
    isVerified: true,
    language: 'en',
  },
  {
    name: 'Emergency Officer',
    email: 'emergency@cebusafetour.ph',
    password: 'Emergency@123',
    role: 'admin_emergency',
    nationality: 'Filipino',
    contactNumber: '+63-32-255-0003',
    isVerified: true,
    language: 'en',
  },
];

const touristAccounts = [
  {
    name: 'Kim Jisoo',
    email: 'kim.jisoo@example.com',
    password: 'Tourist@123',
    nationality: 'Korean',
    contactNumber: '+82-10-1234-5678',
    language: 'ko',
    isVerified: true,
    emergencyContacts: [
      { name: 'Kim Minsu', relationship: 'Spouse', phone: '+82-10-9876-5432' },
    ],
  },
  {
    name: 'Tanaka Hiroshi',
    email: 'tanaka.hiroshi@example.com',
    password: 'Tourist@123',
    nationality: 'Japanese',
    contactNumber: '+81-90-1234-5678',
    language: 'ja',
    isVerified: true,
    emergencyContacts: [
      { name: 'Tanaka Yuki', relationship: 'Wife', phone: '+81-90-8765-4321' },
    ],
  },
  {
    name: 'Wang Wei',
    email: 'wang.wei@example.com',
    password: 'Tourist@123',
    nationality: 'Chinese',
    contactNumber: '+86-138-1234-5678',
    language: 'zh',
    isVerified: true,
    emergencyContacts: [
      { name: 'Wang Fang', relationship: 'Sister', phone: '+86-138-8765-4321' },
    ],
  },
  {
    name: 'Sarah Johnson',
    email: 'sarah.johnson@example.com',
    password: 'Tourist@123',
    nationality: 'American',
    contactNumber: '+1-310-555-0199',
    language: 'en',
    isVerified: true,
    emergencyContacts: [
      { name: 'Mark Johnson', relationship: 'Husband', phone: '+1-310-555-0188' },
    ],
  },
  {
    name: 'Maria Santos',
    email: 'maria.santos@example.com',
    password: 'Tourist@123',
    nationality: 'Filipino',
    contactNumber: '+63-917-123-4567',
    language: 'fil',
    isVerified: true,
    emergencyContacts: [
      { name: 'Jose Santos', relationship: 'Father', phone: '+63-917-765-4321' },
    ],
  },
  {
    name: 'Emma Müller',
    email: 'emma.muller@example.com',
    password: 'Tourist@123',
    nationality: 'German',
    contactNumber: '+49-151-12345678',
    language: 'en',
    isVerified: false,
    emergencyContacts: [],
  },
];

const Q = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=80`;

const attractions = [
  {
    name: "Kawasan Falls",
    category: 'waterfall',
    description: "One of the most beautiful waterfalls in the Philippines, Kawasan Falls in Badian features stunning turquoise blue waters set amidst lush tropical rainforest. It is a popular destination for canyoneering, swimming, and nature trekking.",
    district: 'Badian',
    address: 'Matutinao, Badian, Cebu',
    latitude: 9.8167,
    longitude: 123.3833,
    entranceFee: 100,
    safetyStatus: 'safe',
    crowdLevel: 'high',
    status: 'published',
    averageRating: 4.8,
    totalReviews: 1240,
    totalVisits: 8500,
    totalSaves: 3200,
    photos: [
      Q('1586348943529-beaae6c28db9'),
      Q('1544551763-46a013bb70d5'),
      Q('1501854140801-50d01698950b'),
    ],
    operatingHours: { mon: '6:00 AM - 5:00 PM', tue: '6:00 AM - 5:00 PM', wed: '6:00 AM - 5:00 PM', thu: '6:00 AM - 5:00 PM', fri: '6:00 AM - 5:00 PM', sat: '6:00 AM - 5:00 PM', sun: '6:00 AM - 5:00 PM' },
    contactInfo: { phone: '+63-32-474-8013', website: '' },
    nearbyFacilities: {
      hospitals: [{ name: 'Badian District Hospital', phone: '+63-32-474-8000', distance: '5km' }],
      police: [{ name: 'Badian Police Station', phone: '+63-32-474-8010', distance: '4km' }],
      fire: [{ name: 'Badian Fire Station', phone: '(032) 474-8012', distance: '4km' }],
    },
  },
  {
    name: "Magellan's Cross",
    category: 'heritage',
    description: "Magellan's Cross is a Christian cross planted by Portuguese and Spanish explorers upon their arrival in Cebu on April 14, 1521. It is housed in a chapel right next to the Basilica Minore del Santo Niño.",
    district: 'Cebu City',
    address: 'Magallanes St, Cebu City',
    latitude: 10.2929,
    longitude: 123.9019,
    entranceFee: 0,
    safetyStatus: 'safe',
    crowdLevel: 'moderate',
    status: 'published',
    averageRating: 4.6,
    totalReviews: 2100,
    totalVisits: 15000,
    totalSaves: 5000,
    photos: [
      Q('1523413307857-ef24a91f8c3d'),
      Q('1548611635-a2d5df3a79e3'),
    ],
    operatingHours: { mon: '8:00 AM - 6:00 PM', tue: '8:00 AM - 6:00 PM', wed: '8:00 AM - 6:00 PM', thu: '8:00 AM - 6:00 PM', fri: '8:00 AM - 6:00 PM', sat: '8:00 AM - 6:00 PM', sun: '8:00 AM - 6:00 PM' },
    contactInfo: { phone: '+63-32-255-7400' },
    nearbyFacilities: {
      hospitals: [{ name: 'Vicente Sotto Memorial Medical Center', phone: '(032) 253-9891', distance: '1.5km' }],
      police: [{ name: 'Cebu City Police Station 1', phone: '(032) 416-0460', distance: '0.5km' }],
      fire: [{ name: 'Cebu City Fire Station', phone: '(032) 255-0911', distance: '0.8km' }],
    },
  },
  {
    name: "Basilica Minore del Santo Niño",
    category: 'church',
    description: "The oldest Roman Catholic church in the Philippines, the Basilica Minore del Santo Niño houses the image of the Santo Niño de Cebu, the oldest religious relic in the Philippines given by Ferdinand Magellan in 1521.",
    district: 'Cebu City',
    address: 'Osmena Blvd, Cebu City',
    latitude: 10.2928,
    longitude: 123.9018,
    entranceFee: 0,
    safetyStatus: 'safe',
    crowdLevel: 'high',
    status: 'published',
    averageRating: 4.9,
    totalReviews: 3400,
    totalVisits: 22000,
    totalSaves: 7800,
    photos: [
      Q('1568585219612-af3dc82fb265'),
      Q('1506905891970-14f4a614edca'),
      Q('1531259683007-c1196787d4d1'),
    ],
    operatingHours: { mon: '7:00 AM - 8:00 PM', tue: '7:00 AM - 8:00 PM', wed: '7:00 AM - 8:00 PM', thu: '7:00 AM - 8:00 PM', fri: '7:00 AM - 8:00 PM', sat: '7:00 AM - 9:00 PM', sun: '6:00 AM - 9:00 PM' },
    contactInfo: { phone: '+63-32-255-7400', website: 'https://santoninobasilica.com' },
    nearbyFacilities: {
      hospitals: [{ name: 'Cebu Doctors University Hospital', phone: '(032) 255-5555', distance: '1km' }],
      police: [{ name: 'Cebu City Police Station 1', phone: '(032) 416-0460', distance: '0.3km' }],
      fire: [{ name: 'Cebu City Fire Station', phone: '(032) 255-0911', distance: '0.6km' }],
    },
  },
  {
    name: "Osmeña Peak",
    category: 'mountain',
    description: "Osmeña Peak is the highest point in Cebu at 1,013 meters above sea level, located in the town of Dalaguete. It offers a breathtaking 360-degree panoramic view of the surrounding mountains and the sea.",
    district: 'Dalaguete',
    address: 'Mantalungon, Dalaguete, Cebu',
    latitude: 9.7647,
    longitude: 123.5469,
    entranceFee: 50,
    safetyStatus: 'caution',
    crowdLevel: 'moderate',
    status: 'published',
    averageRating: 4.7,
    totalReviews: 980,
    totalVisits: 6200,
    totalSaves: 2900,
    photos: [
      Q('1576511779378-f8f5a77e2f41'),
      Q('1464822759023-fed622ff2c3b'),
      Q('1519003722824-194d4455a60c'),
    ],
    operatingHours: { mon: '5:00 AM - 5:00 PM', tue: '5:00 AM - 5:00 PM', wed: '5:00 AM - 5:00 PM', thu: '5:00 AM - 5:00 PM', fri: '5:00 AM - 5:00 PM', sat: '5:00 AM - 5:00 PM', sun: '5:00 AM - 5:00 PM' },
    contactInfo: { phone: '+63-32-484-8001' },
    nearbyFacilities: {
      hospitals: [{ name: 'Dalaguete Community Hospital', phone: '+63-32-484-8005', distance: '8km' }],
      police: [{ name: 'Dalaguete Police Station', phone: '+63-32-484-8010', distance: '7km' }],
      fire: [],
    },
  },
  {
    name: "Moalboal Beach",
    category: 'beach',
    description: "Moalboal is a world-class dive destination on the southwest coast of Cebu, famous for its sardine run — millions of sardines swirling in an underwater tornado. The beach also offers stunning coral reefs and sea turtle sightings.",
    district: 'Moalboal',
    address: 'Panagsama Beach, Moalboal, Cebu',
    latitude: 9.9403,
    longitude: 123.3926,
    entranceFee: 0,
    safetyStatus: 'safe',
    crowdLevel: 'moderate',
    status: 'published',
    averageRating: 4.7,
    totalReviews: 1560,
    totalVisits: 9800,
    totalSaves: 4100,
    photos: [
      Q('1507525428034-b723cf961d3e'),
      Q('1544550581-1bcf2a88c21d'),
      Q('1559494800-f47b87a6d4d4'),
    ],
    operatingHours: { mon: 'Open 24 hours', tue: 'Open 24 hours', wed: 'Open 24 hours', thu: 'Open 24 hours', fri: 'Open 24 hours', sat: 'Open 24 hours', sun: 'Open 24 hours' },
    contactInfo: { phone: '+63-32-474-0001' },
    nearbyFacilities: {
      hospitals: [{ name: 'Moalboal District Hospital', phone: '+63-32-474-8100', distance: '3km' }],
      police: [{ name: 'Moalboal Police Station', phone: '+63-32-474-8102', distance: '2km' }],
      fire: [{ name: 'Moalboal BFP Station', phone: '(032) 474-8103', distance: '2.5km' }],
    },
  },
  {
    name: "Temple of Leah",
    category: 'heritage',
    description: "Often called the Taj Mahal of Cebu, the Temple of Leah is a Roman-inspired temple built by Teodorico Adarna for his late wife Leah. Located in Busay Hills, it offers a stunning view of Cebu City.",
    district: 'Busay',
    address: 'Nivel Hills, Busay, Cebu City',
    latitude: 10.3575,
    longitude: 123.8958,
    entranceFee: 50,
    safetyStatus: 'safe',
    crowdLevel: 'moderate',
    status: 'published',
    averageRating: 4.5,
    totalReviews: 1820,
    totalVisits: 11000,
    totalSaves: 4500,
    photos: [
      Q('1555636222-cae831e670b3'),
      Q('1569132232985-acd4b53b2b21'),
      Q('1558618666-fcd25c85cd64'),
    ],
    operatingHours: { mon: '8:00 AM - 8:00 PM', tue: '8:00 AM - 8:00 PM', wed: '8:00 AM - 8:00 PM', thu: '8:00 AM - 8:00 PM', fri: '8:00 AM - 8:00 PM', sat: '8:00 AM - 9:00 PM', sun: '8:00 AM - 9:00 PM' },
    contactInfo: { phone: '+63-32-232-5050' },
    nearbyFacilities: {
      hospitals: [{ name: 'Chong Hua Hospital', phone: '(032) 255-8000', distance: '4km' }],
      police: [{ name: 'Busay Police Sub-station', phone: '(032) 232-5060', distance: '1km' }],
      fire: [],
    },
  },
  {
    name: "Tops Lookout",
    category: 'park',
    description: "Tops Lookout at Busay Hill offers one of the most spectacular panoramic views of Cebu City and its neighboring islands. Best visited during sunrise and sunset, it is a favorite spot for couples and photography enthusiasts.",
    district: 'Busay',
    address: 'Busay, Cebu City',
    latitude: 10.3611,
    longitude: 123.8889,
    entranceFee: 100,
    safetyStatus: 'safe',
    crowdLevel: 'low',
    status: 'published',
    averageRating: 4.6,
    totalReviews: 760,
    totalVisits: 5400,
    totalSaves: 2100,
    photos: [
      Q('1527769929518-b5fd0e2a0ff8'),
      Q('1477959858617-67f85cf4f1df'),
      Q('1506905891970-14f4a614edca'),
    ],
    operatingHours: { mon: '5:00 AM - 10:00 PM', tue: '5:00 AM - 10:00 PM', wed: '5:00 AM - 10:00 PM', thu: '5:00 AM - 10:00 PM', fri: '5:00 AM - 12:00 AM', sat: '5:00 AM - 12:00 AM', sun: '5:00 AM - 10:00 PM' },
    contactInfo: { phone: '+63-32-232-6000' },
    nearbyFacilities: {
      hospitals: [{ name: 'Chong Hua Hospital', phone: '(032) 255-8000', distance: '5km' }],
      police: [{ name: 'Busay Police Sub-station', phone: '(032) 232-5060', distance: '0.5km' }],
      fire: [],
    },
  },
  {
    name: "Fort San Pedro",
    category: 'heritage',
    description: "Fort San Pedro is the smallest and oldest triangular fort in the Philippines, built by Miguel López de Legazpi in 1565 using the labor of indigenous workers under the supervision of Spanish colonizers.",
    district: 'Cebu City',
    address: 'A. Pigafetta St, Cebu City',
    latitude: 10.2897,
    longitude: 123.9041,
    entranceFee: 30,
    safetyStatus: 'safe',
    crowdLevel: 'low',
    status: 'published',
    averageRating: 4.4,
    totalReviews: 890,
    totalVisits: 7100,
    totalSaves: 2300,
    photos: [
      Q('1548013641-f79f2b39e1e3'),
      Q('1534430480872-b59d0b32acea'),
      Q('1541963463532-d68292c34b19'),
    ],
    operatingHours: { mon: '8:00 AM - 7:00 PM', tue: '8:00 AM - 7:00 PM', wed: '8:00 AM - 7:00 PM', thu: '8:00 AM - 7:00 PM', fri: '8:00 AM - 7:00 PM', sat: '8:00 AM - 7:00 PM', sun: '8:00 AM - 7:00 PM' },
    contactInfo: { phone: '+63-32-255-6467' },
    nearbyFacilities: {
      hospitals: [{ name: 'Vicente Sotto Memorial Medical Center', phone: '(032) 253-9891', distance: '1km' }],
      police: [{ name: 'Port Area Police Station', phone: '(032) 255-7777', distance: '0.3km' }],
      fire: [{ name: 'Cebu City Fire Station', phone: '(032) 255-0911', distance: '1km' }],
    },
  },
  {
    name: "Carbon Market",
    category: 'market',
    description: "Carbon Market is the largest and oldest public market in Cebu City, offering everything from fresh produce, dried fish, flowers, clothes, and handicrafts. It is a vibrant cultural hub and an authentic Cebuano experience.",
    district: 'Cebu City',
    address: 'M.C. Briones St, Cebu City',
    latitude: 10.2947,
    longitude: 123.8996,
    entranceFee: 0,
    safetyStatus: 'caution',
    crowdLevel: 'high',
    status: 'published',
    averageRating: 3.9,
    totalReviews: 620,
    totalVisits: 18000,
    totalSaves: 1200,
    photos: [
      Q('1555396273-367ea4eb4db5'),
      Q('1534040385115-33dcb3f3e8cf'),
      Q('1488459716781-31db52582fe9'),
    ],
    operatingHours: { mon: '4:00 AM - 9:00 PM', tue: '4:00 AM - 9:00 PM', wed: '4:00 AM - 9:00 PM', thu: '4:00 AM - 9:00 PM', fri: '4:00 AM - 9:00 PM', sat: '4:00 AM - 9:00 PM', sun: '4:00 AM - 9:00 PM' },
    contactInfo: { phone: '+63-32-255-0100' },
    nearbyFacilities: {
      hospitals: [{ name: 'Cebu City Medical Center', phone: '(032) 255-1234', distance: '0.5km' }],
      police: [{ name: 'Carbon Police Sub-station', phone: '(032) 255-9900', distance: '0.2km' }],
      fire: [{ name: 'Cebu City Fire Station', phone: '(032) 255-0911', distance: '0.5km' }],
    },
  },
  {
    name: "Mactan Shrine",
    category: 'heritage',
    description: "The Mactan Shrine (Lapu-Lapu Shrine) marks the site of the Battle of Mactan on April 27, 1521, where Datu Lapu-Lapu and his warriors defeated Ferdinand Magellan. It features a bronze statue of Lapu-Lapu and a smaller statue of Magellan.",
    district: 'Lapu-Lapu City',
    address: 'Magellan Drive, Punta Engaño, Lapu-Lapu City',
    latitude: 10.2833,
    longitude: 124.0000,
    entranceFee: 0,
    safetyStatus: 'safe',
    crowdLevel: 'moderate',
    status: 'published',
    averageRating: 4.5,
    totalReviews: 1100,
    totalVisits: 9200,
    totalSaves: 3400,
    photos: [
      Q('1564507004-7b2e8d891d48'),
      Q('1578662996442-48f60103fc96'),
      Q('1548611635-a2d5df3a79e3'),
    ],
    operatingHours: { mon: '8:00 AM - 5:00 PM', tue: '8:00 AM - 5:00 PM', wed: '8:00 AM - 5:00 PM', thu: '8:00 AM - 5:00 PM', fri: '8:00 AM - 5:00 PM', sat: '8:00 AM - 5:00 PM', sun: '8:00 AM - 5:00 PM' },
    contactInfo: { phone: '+63-32-340-5000' },
    nearbyFacilities: {
      hospitals: [{ name: 'Lapu-Lapu City Hospital', phone: '(032) 340-5050', distance: '2km' }],
      police: [{ name: 'Lapu-Lapu City Police Office', phone: '(032) 340-5060', distance: '1km' }],
      fire: [{ name: 'Lapu-Lapu BFP Station', phone: '(032) 340-5070', distance: '1.5km' }],
    },
  },
];

const advisories = [
  {
    title: 'Typhoon Preparedness Alert — Southwest Cebu',
    description: 'Tropical Storm Isang is expected to make landfall near the southwestern coast of Cebu within the next 24-48 hours. Signal No. 2 has been raised for the municipalities of Badian, Moalboal, Alcantara, and Ronda. Expect strong winds and heavy rainfall. All outdoor activities including canyoneering and beach swimming are suspended.',
    severity: 'critical',
    source: 'pagasa',
    startDate: new Date(),
    endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    status: 'active',
    recommendedActions: '1. Stay indoors and away from windows.\n2. Prepare emergency bags with essentials (water, food, medicine, documents).\n3. Avoid beaches, rivers, and mountain trails.\n4. Monitor PAGASA updates at pagasa.dost.gov.ph.\n5. Contact CDRRMO Cebu at (032) 255-3068 if you need evacuation assistance.',
    affectedArea: { type: 'attractions', attractionIds: [] },
    notificationSent: true,
    acknowledgedBy: [],
  },
  {
    title: 'Strong Ocean Currents Warning — Moalboal & Pescador Island',
    description: 'The Philippine Coast Guard has issued a warning for strong underwater currents in the Moalboal dive area and around Pescador Island. Three divers reported being caught in strong currents last weekend. All diving activities should be accompanied by a certified dive master.',
    severity: 'warning',
    source: 'lgu',
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    status: 'active',
    recommendedActions: '1. Dive only with certified local dive guides.\n2. Do not dive alone or snorkel far from shore.\n3. Check current conditions before entering the water.\n4. Have a surface marker buoy (SMB) at all times.',
    affectedArea: { type: 'attractions', attractionIds: [] },
    notificationSent: true,
    acknowledgedBy: [],
  },
  {
    title: 'Sinulog Festival — Crowd & Traffic Advisory',
    description: 'The annual Sinulog Festival Grand Parade will be held in Cebu City on the third Sunday of January. Expect heavy foot traffic and road closures around the Cebu City Sports Center, Basilica del Santo Niño, and Colon Street. Extra police deployment will be in place.',
    severity: 'advisory',
    source: 'lgu',
    startDate: new Date(),
    endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    status: 'active',
    recommendedActions: '1. Use public transportation or ride-share instead of private vehicles.\n2. Keep valuables secure — pickpocketing incidents increase during festivals.\n3. Stay with your group and designate a meeting point.\n4. Carry enough water and sun protection.\n5. Emergency medical stations are set up at the Sports Center.',
    affectedArea: { type: 'attractions', attractionIds: [] },
    notificationSent: true,
    acknowledgedBy: [],
  },
];

const incidents = [
  {
    type: 'medical',
    description: 'Tourist suffered ankle injury after slipping on wet rocks near the second level of Kawasan Falls. Mild sprain, required first aid. Transported to Badian District Hospital via habal-habal.',
    latitude: 9.8167,
    longitude: 123.3833,
    nearestLandmark: 'Kawasan Falls, Badian',
    reporterContact: '+82-10-1234-5678',
    status: 'resolved',
    assignedTo: 'Badian District Hospital / Badian BFP Rescue Team',
    responderNotes: 'Patient treated and discharged. Recommended rest for 3-5 days.',
    resolvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    type: 'crime',
    description: 'Tourist reported having mobile phone stolen at Carbon Market. Incident occurred near the dried fish stalls. Tourist was shopping alone when the phone was grabbed by an unidentified male on a motorcycle.',
    latitude: 10.2947,
    longitude: 123.8996,
    nearestLandmark: 'Carbon Market — Dried Fish Section',
    reporterContact: '+1-310-555-0199',
    status: 'in_progress',
    assignedTo: 'Cebu City Police Station — Anti-Snatching Unit',
    responderNotes: 'CCTV footage being reviewed. Case blotter filed under Report No. 2025-CC-0342.',
    resolvedAt: null,
  },
  {
    type: 'lost_person',
    description: 'Korean tourist separated from trekking group near the summit of Osmeña Peak. Last seen wearing a red jacket. The group had 8 members; one did not return to the van at the designated time.',
    latitude: 9.7647,
    longitude: 123.5469,
    nearestLandmark: 'Osmeña Peak Summit Trail, Dalaguete',
    reporterContact: '+82-10-9876-5432',
    status: 'resolved',
    assignedTo: 'Dalaguete Search and Rescue Team / Dalaguete Police',
    responderNotes: 'Tourist found safe after 2 hours, had taken a wrong trail. Reunited with group at 4:30 PM.',
    resolvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
];

// ─── SEED FUNCTION ────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting CebuSafeTour seed...\n');

  // ── 1. Admin Accounts ──────────────────────────────────────────────────────
  console.log('👤 Seeding admin accounts...');
  const createdAdmins = [];

  for (const admin of adminAccounts) {
    const hashed = await hash(admin.password);
    const user = await prisma.user.upsert({
      where: { email: admin.email },
      update: {},
      create: {
        name: admin.name,
        email: admin.email,
        password: hashed,
        role: admin.role,
        nationality: admin.nationality,
        contactNumber: admin.contactNumber,
        isVerified: admin.isVerified,
        language: admin.language,
        status: 'active',
      },
    });
    createdAdmins.push(user);
    console.log(`  ✅ ${user.role.padEnd(20)} ${user.email}`);
  }

  // ── 2. Tourist Accounts ────────────────────────────────────────────────────
  console.log('\n👥 Seeding tourist accounts...');
  const createdTourists = [];

  for (const tourist of touristAccounts) {
    const hashed = await hash(tourist.password);
    const user = await prisma.user.upsert({
      where: { email: tourist.email },
      update: {},
      create: {
        name: tourist.name,
        email: tourist.email,
        password: hashed,
        role: 'tourist',
        nationality: tourist.nationality,
        contactNumber: tourist.contactNumber,
        language: tourist.language,
        isVerified: tourist.isVerified,
        status: 'active',
        emergencyContacts: tourist.emergencyContacts,
      },
    });
    createdTourists.push(user);
    console.log(`  ✅ ${user.nationality?.padEnd(12)} ${user.name} — ${user.email}`);
  }

  const superAdmin = createdAdmins[0];

  // ── 3. Attractions ─────────────────────────────────────────────────────────
  console.log('\n🏖  Seeding attractions...');
  const createdAttractions = [];

  for (const attr of attractions) {
    const existing = await prisma.attraction.findFirst({ where: { name: attr.name } });
    if (existing) {
      const updated = await prisma.attraction.update({
        where: { id: existing.id },
        data: { photos: attr.photos },
      });
      createdAttractions.push(updated);
      console.log(`  📸 Updated photos: ${attr.name}`);
      continue;
    }
    const created = await prisma.attraction.create({
      data: {
        ...attr,
        createdBy: superAdmin.id,
      },
    });
    createdAttractions.push(created);
    console.log(`  ✅ ${created.name} (${created.district})`);
  }

  // ── 4. Advisories ──────────────────────────────────────────────────────────
  console.log('\n⚠️  Seeding advisories...');
  const emergencyOfficer = createdAdmins[2];

  for (const adv of advisories) {
    const existing = await prisma.advisory.findFirst({ where: { title: adv.title } });
    if (existing) {
      console.log(`  ⏭  Skipped (exists): ${adv.title}`);
      continue;
    }
    const created = await prisma.advisory.create({
      data: { ...adv, createdBy: emergencyOfficer.id },
    });
    console.log(`  ✅ [${created.severity.toUpperCase()}] ${created.title}`);
  }

  // ── 5. Incidents ───────────────────────────────────────────────────────────
  console.log('\n🚨 Seeding incidents...');
  const touristReporters = [createdTourists[0], createdTourists[3], createdTourists[0]];

  for (let i = 0; i < incidents.length; i++) {
    const inc = incidents[i];
    const existing = await prisma.incident.findFirst({ where: { nearestLandmark: inc.nearestLandmark, type: inc.type } });
    if (existing) {
      console.log(`  ⏭  Skipped (exists): ${inc.type} @ ${inc.nearestLandmark}`);
      continue;
    }
    const created = await prisma.incident.create({
      data: { ...inc, reportedBy: touristReporters[i]?.id ?? null },
    });
    console.log(`  ✅ [${created.status.toUpperCase()}] ${created.type} — ${created.nearestLandmark}`);
  }

  // ── 6. Summary ─────────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────────');
  console.log('✅ Seed complete!\n');
  console.log('ADMIN CREDENTIALS:');
  console.log('  Super Admin   → superadmin@cebusafetour.ph  / SuperAdmin@123');
  console.log('  Content Mgr   → content@cebusafetour.ph     / Content@123');
  console.log('  Emergency Off → emergency@cebusafetour.ph   / Emergency@123');
  console.log('\nTOURIST CREDENTIALS (all use Tourist@123):');
  touristAccounts.forEach(t => console.log(`  ${t.nationality?.padEnd(12)} → ${t.email}`));
  console.log('─────────────────────────────────────────────\n');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
