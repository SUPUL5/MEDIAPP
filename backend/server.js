// backend/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const { errorHandler } = require('./middlewares/errorMiddleware');
const userRoutes = require('./routes/UserRoutes');
const appointmentRoutes = require('./routes/AppointmentRoutes');
const availabilityRoutes = require('./routes/AvailabilityRoutes');
const chatRoutes = require('./routes/ChatRoutes'); // <-- Import chat routes

const app = express();

// Create uploads directory (existing code)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
const profilePicsDir = path.join(uploadsDir, 'profile_pictures');
if (!fs.existsSync(profilePicsDir)) {
    fs.mkdirSync(profilePicsDir, { recursive: true });
}

// Middleware
app.use(cors({
    origin: true, // Or specify your frontend origin for production
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Serve static files (existing code)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/chat', chatRoutes); // <-- Use chat routes

// Error handling middleware (existing code)
app.use(errorHandler);

app.get('/', (req, res) => {
    res.send('Server is running');
});

app.get('/api/handshake', (req, res) => {
    res.json({ message: 'Handshake successful' });
});

if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mobile-healthcare';

    mongoose.connect(uri)
        .then(() => console.log('MongoDB connected'))
        .catch(err => console.log('MongoDB Connection Error:', err.message));

    // Check Gemini initialization after potential config load
    require('./gemini/geminiConfig'); // This will log initialization status or errors

    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        console.log(`Serving static files from ${path.join(__dirname, 'uploads')}`);
    });
}

module.exports = app;