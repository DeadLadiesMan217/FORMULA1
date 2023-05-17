const express = require('express');

const router = express.Router();

const isAuth = require('../middleware/is-auth');
const isAdmin = require('../middleware/is-admin');
const adminControlller = require('../controllers/admin');

router.post('/add-event', isAuth, isAdmin, adminControlller.postEvent);

router.put('/check-qrcode', isAuth, isAdmin, adminControlller.check_qrcode);

module.exports = router;