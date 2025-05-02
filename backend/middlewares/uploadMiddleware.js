// backend/middlewares/uploadMiddleware.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure the destination directory exists
const profilePicsDir = path.join(__dirname, '../uploads/profile_pictures');
if (!fs.existsSync(profilePicsDir)) {
    fs.mkdirSync(profilePicsDir, { recursive: true });
    console.log(`Created directory: ${profilePicsDir}`);
} else {
     console.log(`Directory already exists: ${profilePicsDir}`);
}


// Set up storage engine
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, profilePicsDir); // Save to uploads/profile_pictures
    },
    filename: function (req, file, cb) {
        // Generate unique filename: fieldname-timestamp.extension
        cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

// Check file type
function checkFileType(file, cb) {
    // Allowed extensions
    const filetypes = /jpeg|jpg|png|gif/;
    // Check extension
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime type
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}

// Init upload variable
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
}).single('profilePicture'); // Middleware expects a single file named 'profilePicture'

module.exports = upload;