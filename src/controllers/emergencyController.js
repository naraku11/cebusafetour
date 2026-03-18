const prisma = require('../config/prisma');
const { sendPushToAdmins } = require('../services/fcmService');
const { getFirestore } = require('../config/firebase');
const socket = require('../services/socketService');

exports.reportIncident = async (req, res, next) => {
  try {
    const { type, description, latitude, longitude, nearestLandmark, attachments } = req.body;

    const incident = await prisma.incident.create({
      data: {
        type, description,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        nearestLandmark, attachments,
        reportedBy: req.user?.id,
        reporterContact: req.user?.contactNumber,
      },
    });

    await getFirestore().collection('incidents').doc(incident.id).set({
      id: incident.id, type,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      status: 'new',
      reportedAt: new Date().toISOString(),
    });

    await sendPushToAdmins({
      title: `New Incident: ${type.replace('_', ' ').toUpperCase()}`,
      body: `Reported at ${nearestLandmark || `${latitude}, ${longitude}`}`,
      data: { type: 'incident', incidentId: incident.id },
    });

    socket.emitToAdmins('incident:new', { incident });
    res.status(201).json({ incident, message: 'Incident reported. Help is on the way.' });
  } catch (err) { next(err); }
};

exports.myIncidents = async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = { reportedBy: req.user.id };
    if (status) where.status = status;
    const incidents = await prisma.incident.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ incidents });
  } catch (err) { next(err); }
};

exports.listIncidents = async (req, res, next) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [incidents, total] = await prisma.$transaction([
      prisma.incident.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { reporter: { select: { id: true, name: true } } } }),
      prisma.incident.count({ where }),
    ]);

    res.json({ incidents, total });
  } catch (err) { next(err); }
};

exports.getIncident = async (req, res, next) => {
  try {
    const incident = await prisma.incident.findUnique({ where: { id: req.params.id } });
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    res.json({ incident });
  } catch (err) { next(err); }
};

exports.updateIncident = async (req, res, next) => {
  try {
    const existing = await prisma.incident.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Incident not found' });

    const data = { ...req.body };
    if (req.body.status === 'resolved') data.resolvedAt = new Date();

    const incident = await prisma.incident.update({ where: { id: req.params.id }, data });

    await getFirestore().collection('incidents').doc(incident.id).set({
      status: incident.status,
      assignedTo: incident.assignedTo,
    }, { merge: true });

    socket.emitToAdmins('incident:updated', { incident });
    res.json({ incident });
  } catch (err) { next(err); }
};

const EMERGENCY_SERVICES = {
  hospitals: [
    { name: 'Vicente Sotto Memorial Medical Center', phone: '(032) 253-9891', lat: 10.2969, lng: 123.9026 },
    { name: 'Chong Hua Hospital (Fuente)', phone: '(032) 255-8000', lat: 10.3156, lng: 123.8907 },
    { name: 'Cebu Doctors University Hospital', phone: '(032) 255-5555', lat: 10.3101, lng: 123.8938 },
    { name: 'Cebu Velez General Hospital', phone: '(032) 253-7121', lat: 10.2996, lng: 123.9042 },
    { name: 'Perpetual Succour Hospital', phone: '(032) 233-8620', lat: 10.2890, lng: 123.8640 },
    { name: 'University of Cebu Medical Center', phone: '(032) 230-5050', lat: 10.3318, lng: 123.9094 },
    { name: 'Gullas College Hospital (Urgello)', phone: '(032) 261-0777', lat: 10.3050, lng: 123.8870 },
    { name: 'Lapu-Lapu City Hospital', phone: '(032) 340-6088', lat: 10.3021, lng: 123.9627 },
    { name: 'Mandaue City Hospital', phone: '(032) 346-0033', lat: 10.3231, lng: 123.9618 },
    { name: 'Talisay City Hospital', phone: '(032) 273-0000', lat: 10.2460, lng: 123.8485 },
    { name: 'Consolacion Municipal Hospital', phone: '(032) 238-0052', lat: 10.3778, lng: 123.9593 },
    { name: 'Cordova Rural Health Unit', phone: '(032) 238-0088', lat: 10.2560, lng: 123.9601 },
    { name: 'Minglanilla District Hospital', phone: '(032) 272-5110', lat: 10.2390, lng: 123.7970 },
    { name: 'Naga City General Hospital', phone: '(032) 487-0017', lat: 10.2114, lng: 123.7569 },
    { name: 'Danao City Hospital', phone: '(032) 200-5111', lat: 10.5249, lng: 124.0279 },
    { name: 'Carcar District Hospital', phone: '(032) 487-8000', lat: 10.1073, lng: 123.6400 },
    { name: 'Bogo City Community Hospital', phone: '(032) 251-8034', lat: 11.0516, lng: 124.0001 },
    { name: 'Mactan Cebu International Airport Clinic', phone: '(032) 340-2486', lat: 10.3075, lng: 123.9794 },
  ],
  police: [
    { name: 'Cebu City Police Office (CCPO)', phone: '(032) 416-0460', lat: 10.2897, lng: 123.8966 },
    { name: 'Lapu-Lapu City Police Office', phone: '(032) 340-5060', lat: 10.2957, lng: 123.9694 },
    { name: 'Mandaue City Police Office', phone: '(032) 346-0177', lat: 10.3231, lng: 123.9618 },
    { name: 'Talisay City Police', phone: '(032) 272-7611', lat: 10.2460, lng: 123.8485 },
    { name: 'Consolacion Police Station', phone: '(032) 238-0063', lat: 10.3778, lng: 123.9593 },
    { name: 'Cordova Police Station', phone: '(032) 238-0060', lat: 10.2560, lng: 123.9601 },
    { name: 'Minglanilla Police Station', phone: '(032) 272-7100', lat: 10.2390, lng: 123.7970 },
    { name: 'Naga City Police', phone: '(032) 487-8010', lat: 10.2114, lng: 123.7569 },
    { name: 'Danao City Police', phone: '(032) 200-3111', lat: 10.5249, lng: 124.0279 },
    { name: 'Carcar City Police', phone: '(032) 487-8052', lat: 10.1073, lng: 123.6400 },
    { name: 'Bogo City Police', phone: '(032) 251-8010', lat: 11.0516, lng: 124.0001 },
    { name: 'Mactan Airport Police', phone: '(032) 340-2486', lat: 10.3075, lng: 123.9794 },
    { name: 'Liloan Police Station', phone: '(032) 424-0037', lat: 10.4027, lng: 123.9939 },
    { name: 'Compostela Police Station', phone: '(032) 424-0038', lat: 10.4587, lng: 124.0065 },
    { name: 'Moalboal Police Station', phone: '(032) 474-0031', lat: 9.9480, lng: 123.4002 },
    { name: 'Oslob Police Station', phone: '(032) 480-9113', lat: 9.5268, lng: 123.4294 },
  ],
  fire: [
    { name: 'Cebu City Fire Station (BFP)', phone: '(032) 255-0911', lat: 10.2961, lng: 123.9021 },
    { name: 'Lapu-Lapu City Fire Station', phone: '(032) 340-6055', lat: 10.3021, lng: 123.9627 },
    { name: 'Mandaue City Fire Station', phone: '(032) 346-2490', lat: 10.3231, lng: 123.9618 },
    { name: 'Talisay Fire Station', phone: '(032) 272-2334', lat: 10.2460, lng: 123.8485 },
    { name: 'Consolacion Fire Station', phone: '(032) 238-0074', lat: 10.3778, lng: 123.9593 },
    { name: 'Cordova Fire Station', phone: '(032) 238-0079', lat: 10.2560, lng: 123.9601 },
    { name: 'Minglanilla Fire Station', phone: '(032) 272-7105', lat: 10.2390, lng: 123.7970 },
    { name: 'Naga City Fire Station', phone: '(032) 487-0020', lat: 10.2114, lng: 123.7569 },
    { name: 'Danao Fire Station', phone: '(032) 200-4291', lat: 10.5249, lng: 124.0279 },
    { name: 'Carcar Fire Station', phone: '(032) 487-8005', lat: 10.1073, lng: 123.6400 },
    { name: 'Bogo City Fire Station', phone: '(032) 251-8009', lat: 11.0516, lng: 124.0001 },
    { name: 'Liloan Fire Station', phone: '(032) 424-0035', lat: 10.4027, lng: 123.9939 },
    { name: 'Moalboal Fire Station', phone: '(032) 474-0032', lat: 9.9480, lng: 123.4002 },
  ],
  redCross: [
    { name: 'Philippine Red Cross — Cebu Chapter', phone: '(032) 253-3720', lat: 10.3073, lng: 123.8951 },
    { name: 'Red Cross Blood Bank Cebu', phone: '(032) 253-5036', lat: 10.3073, lng: 123.8951 },
    { name: 'Red Cross Mandaue Chapter', phone: '(032) 346-3015', lat: 10.3231, lng: 123.9618 },
  ],
  cdrrmo: [
    { name: 'CDRRMO Cebu City', phone: '(032) 255-3068', lat: 10.2938, lng: 123.9003 },
    { name: 'PDRRMO Cebu Province', phone: '(032) 254-3060', lat: 10.2938, lng: 123.9003 },
    { name: 'DRRMO Lapu-Lapu City', phone: '(032) 340-1188', lat: 10.2957, lng: 123.9694 },
    { name: 'DRRMO Mandaue City', phone: '(032) 344-2190', lat: 10.3231, lng: 123.9618 },
    { name: 'DRRMO Talisay City', phone: '(032) 273-0011', lat: 10.2460, lng: 123.8485 },
    { name: 'MDRRMO Consolacion', phone: '(032) 238-0099', lat: 10.3778, lng: 123.9593 },
    { name: 'MDRRMO Cordova', phone: '(032) 238-0088', lat: 10.2560, lng: 123.9601 },
    { name: 'MDRRMO Minglanilla', phone: '(032) 272-7108', lat: 10.2390, lng: 123.7970 },
    { name: 'CDRRMO Danao City', phone: '(032) 200-3115', lat: 10.5249, lng: 124.0279 },
    { name: 'CDRRMO Carcar City', phone: '(032) 487-8055', lat: 10.1073, lng: 123.6400 },
    { name: 'CDRRMO Bogo City', phone: '(032) 251-8022', lat: 11.0516, lng: 124.0001 },
    { name: 'MDRRMO Liloan', phone: '(032) 424-0041', lat: 10.4027, lng: 123.9939 },
    { name: 'CDRRMO Moalboal', phone: '(032) 474-0030', lat: 9.9480, lng: 123.4002 },
  ],
  coastGuard: [
    { name: 'Philippine Coast Guard — Cebu', phone: '(032) 232-7321', lat: 10.2864, lng: 123.9128 },
    { name: 'PCG Station Mactan', phone: '(032) 340-5855', lat: 10.3075, lng: 123.9794 },
    { name: 'PCG Sub-Station Danao', phone: '(032) 200-4285', lat: 10.5249, lng: 124.0279 },
    { name: 'PCG Sub-Station Oslob', phone: '(032) 480-9119', lat: 9.5268, lng: 123.4294 },
  ],
};

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

exports.getNearbyEmergencyServices = async (req, res, next) => {
  try {
    const { lat, lng, radius = 20 } = req.query;
    const userLat = lat ? parseFloat(lat) : null;
    const userLng = lng ? parseFloat(lng) : null;
    const maxRadius = parseFloat(radius);

    const filterAndAnnotate = (list) => list
      .map(s => {
        if (userLat != null && userLng != null) {
          const distance = Math.round(haversine(userLat, userLng, s.lat, s.lng) * 10) / 10;
          return { ...s, distance };
        }
        return s;
      })
      .filter(s => userLat == null || s.distance <= maxRadius)
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));

    const services = {};
    for (const [key, list] of Object.entries(EMERGENCY_SERVICES)) {
      services[key] = filterAndAnnotate(list);
    }

    res.json({ services });
  } catch (err) { next(err); }
};
