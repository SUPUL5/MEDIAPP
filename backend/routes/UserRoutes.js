// backend/routes/UserRoutes.js
const express = require('express');
const {
    getAllUsers,
    getUserById,
    createUser,
    updateUserById, // Keep existing update for non-file data
    deleteUserById,
    verifyEmail,
    forgetPassword,
    resetPassword,
    getDoctors,
    getPatients,
    login,
    refreshToken,
    logout,
    updatePassword,
    blockUser,
    unblockUser,
    uploadProfilePicture // Import new controller
} = require('../controllers/UserController');
const { authenticateToken, authorizeRole } = require('../middlewares/authMiddleware');
const { limiter } = require('../middlewares/rateLimitMiddleware');
const upload = require('../middlewares/uploadMiddleware'); // Import upload middleware

const router = express.Router();

// Public routes
router.post('/register', limiter, createUser);
router.post('/verify-email', limiter, verifyEmail);
router.post('/forget-password', limiter, forgetPassword);
router.post('/reset-password', limiter, resetPassword);
router.post('/refresh-token', limiter, refreshToken);
router.post('/login', limiter, login);


// Protected routes
router.use(authenticateToken);

// --- Profile Picture Upload Route ---
// Use upload middleware *before* the controller function
router.post('/:id/upload-profile-picture', upload, uploadProfilePicture);
// -----------------------------------


router.get('/doctors', authorizeRole(['admin','patient', 'doctor']), getDoctors);
router.get('/patients', authorizeRole(['admin','patient', 'doctor']), getPatients);
router.get('/', authorizeRole(['admin']), getAllUsers);

router.put('/update-password', authorizeRole(['admin', 'patient', 'doctor']), updatePassword);
router.post('/logout', logout);

// Admin only user management routes
router.put('/:id/block', authorizeRole(['admin']), blockUser);
router.put('/:id/unblock', authorizeRole(['admin']), unblockUser);

router.get('/:id', authorizeRole(['admin','patient', 'doctor']), getUserById);
// Route for updating user text data (like name, phone etc.) - does NOT handle file upload
router.put('/:id', authorizeRole(['admin', 'patient', 'doctor']), updateUserById);
router.delete('/:id', authorizeRole(['admin']), deleteUserById);



module.exports = router;