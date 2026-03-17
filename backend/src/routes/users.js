const path   = require('path');
const multer = require('multer');
const { v4: uuid } = require('uuid');
const router = require('express').Router();
const ctrl   = require('../controllers/usersController');
const { authenticate, requireAdmin, requireSuperAdmin } = require('../middleware/auth');

const avatarStorage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads', 'avatars'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${uuid()}${ext}`);
  },
});
const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    cb(null, /image\/(jpeg|png|webp|gif)/.test(file.mimetype));
  },
}).single('avatar');

router.get('/me', authenticate, ctrl.getProfile || ((req, res) => res.json({ user: req.user })));
router.patch('/me', authenticate, ctrl.updateProfile);
router.post('/me/profile-picture', authenticate, uploadAvatar, ctrl.uploadAvatar);

// Admin only
router.get('/nationalities', authenticate, requireAdmin, ctrl.getRegisteredNationalities);
router.get('/stats', authenticate, requireAdmin, ctrl.getStats);
router.get('/', authenticate, requireAdmin, ctrl.list);
router.get('/:id', authenticate, requireAdmin, ctrl.get);
router.patch('/:id/status', authenticate, requireSuperAdmin, ctrl.updateStatus);
router.post('/:id/verify-picture', authenticate, requireAdmin, ctrl.verifyPicture);

module.exports = router;
