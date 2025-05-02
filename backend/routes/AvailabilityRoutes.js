// routes/AvailabilityRoutes.js

const express = require('express');
const { getAllAvailabilities, getAvailabilityById, createAvailability, updateAvailabilityById, deleteAvailabilityById, getAvailabilitiesByDoctorId, getMyAvailabilities } = require('../controllers/AvailabilityController');
const { authenticateToken, authorizeRole } = require('../middlewares/authMiddleware');
const { limiter } = require('../middlewares/rateLimitMiddleware');

const router = express.Router();

// Protected routes (authentication required for all availability routes)
router.use(authenticateToken);

router.get('/', authorizeRole(['admin', 'doctor']), getAllAvailabilities); // Get all availabilities(admin, doctor)
router.get('/me', authorizeRole(['doctor']), getMyAvailabilities); // Get my availabilities (doctor)
// New routes
router.get('/doctor/:doctorId', authorizeRole(['admin', 'patient']), getAvailabilitiesByDoctorId); // Get availabilities by doctor ID (admin, patient)
router.get('/:id', authorizeRole(['admin', 'doctor']), getAvailabilityById); // Get availability by ID(admin, doctor)
router.post('/', limiter, authorizeRole(['doctor']), createAvailability); // Create a new availability(doctor)
router.put('/:id', authorizeRole(['admin', 'doctor']), updateAvailabilityById); // Update an availability by ID (admin, doctor)
router.delete('/:id', authorizeRole(['admin','doctor']), deleteAvailabilityById); // Delete an availability by ID (admin, doctor)





module.exports = router;
