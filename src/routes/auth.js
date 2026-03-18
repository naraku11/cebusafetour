const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.post('/register', [
  body('name').notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 8 }),
], validate, ctrl.register);

router.post('/resend-otp', [body('email').isEmail()], validate, ctrl.resendOtp);
router.post('/verify-otp', [
  body('email').isEmail(),
  body('otp').isLength({ min: 6, max: 6 }),
], validate, ctrl.verifyOtp);

router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
], validate, ctrl.login);

router.post('/forgot-password', [body('email').isEmail()], validate, ctrl.forgotPassword);
router.post('/reset-password', ctrl.resetPassword);
router.get('/me', authenticate, ctrl.getMe);
router.patch('/fcm-token', authenticate, ctrl.updateFcmToken);

module.exports = router;
