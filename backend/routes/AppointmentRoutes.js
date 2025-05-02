// routes/AppointmentRoutes.js

const express = require('express');
const { getAllAppointments, getAppointmentById, createAppointment, updateAppointmentById, deleteAppointmentById, getMyAllAppointment } = require('../controllers/AppointmentController');
const { authenticateToken, authorizeRole } = require('../middlewares/authMiddleware');
const { limiter } = require('../middlewares/rateLimitMiddleware');

const router = express.Router();

// Protected routes (authentication required for all appointment routes)
router.use(authenticateToken);

router.get('/', authorizeRole(['admin', 'patient','doctor']), getAllAppointments); // Get all appointments

router.post('/', limiter, authorizeRole(['patient', 'doctor']), createAppointment); // Create a new appointment
// New route for getting all appointments for the logged-in user
router.get('/me', authorizeRole(['patient', 'doctor']), getMyAllAppointment);

router.get('/:id', authorizeRole(['admin','patient','doctor']), getAppointmentById); // Get appointment by id
router.put('/:id', authorizeRole(['admin', 'patient','doctor']), updateAppointmentById); // Update an existing appointment
router.delete('/:id', authorizeRole(['admin','patient', 'doctor']), deleteAppointmentById); // Delete an appointment



module.exports = router;
