// backend/controllers/UserController.js
const User = require('../models/User');
const { isValidEmail, isNotEmptyString, isValidRole, isValidObjectId } = require('../utils/commonUtils');
const bcrypt = require('bcrypt');
const { sendEmail } = require('../utils/emailService');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// --- Function Definitions ---

const getAllUsers = async (req, res, next) => {
    try {
        const users = await User.find({}).select('-password -verificationCode -resetPasswordCode -verificationAttempts -verificationCodeExpireTime -refreshToken');
        res.status(200).json(users);
    } catch (error) {
        next(error);
    }
};

const getUserById = async (req, res, next) => {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid user id' });
    }
    try {
        const user = await User.findById(id).select('-password -verificationCode -resetPasswordCode -verificationAttempts -verificationCodeExpireTime -refreshToken');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error) {
        next(error);
    }
};

const createUser = async (req, res, next) => {
    const { firstName, lastName, email, password, role, specialization, profilePicture, phone, gender, dateOfBirth, hospital } = req.body;

    if (!isNotEmptyString(firstName)) return res.status(400).json({ message: 'First name is required' });
    if (!isNotEmptyString(lastName)) return res.status(400).json({ message: 'Last name is required' });
    if (!isValidEmail(email)) return res.status(400).json({ message: 'Invalid email format' });
    if (!isNotEmptyString(password)) return res.status(400).json({ message: 'Password is required' });
    if (!isValidRole(role)) return res.status(400).json({ message: 'Invalid role' });
    if (!isNotEmptyString(phone)) return res.status(400).json({ message: 'Phone number is required' });
    if (!isNotEmptyString(gender)) return res.status(400).json({ message: 'Gender is required' });
    if (!dateOfBirth) return res.status(400).json({ message: 'Date of birth is required' });


    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationCode = Math.floor(100000 + Math.random() * 900000);
        const verificationCodeExpireTime = new Date(Date.now() + 10 * 60 * 1000);

        const newUser = new User({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            role,
            specialization: specialization || null,
            profilePicture: profilePicture || null,
            verificationCode: verificationCode,
            verificationCodeExpireTime: verificationCodeExpireTime,
            status: 'unverified',
            phone,
            gender,
            dateOfBirth,
            hospital: hospital || null
        });
        const savedUser = await newUser.save();

        const mailSent = await sendEmail(email, 'Verify Your Email', `Your verification code is: ${verificationCode}`);
        if (!mailSent) {
            console.log('Failed to send verification email');
        }

        res.status(201).json({
            message: 'User created successfully , please verify your email',
            user: {
                _id: savedUser._id,
                firstName: savedUser.firstName,
                lastName: savedUser.lastName,
                email: savedUser.email,
                role: savedUser.role,
                status: savedUser.status,
                specialization: savedUser.specialization,
                profilePicture: savedUser.profilePicture,
                phone: savedUser.phone,
                gender: savedUser.gender,
                dateOfBirth: savedUser.dateOfBirth,
                hospital: savedUser.hospital
            }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        next(error);
    }
};

const updateUserById = async (req, res, next) => {
    const { id } = req.params;
    if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
        return res.status(403).json({ message: 'Forbidden: You can only update your own profile.' });
    }

    const { firstName, lastName, phone, gender, dateOfBirth, hospital, specialization, profilePicture, email, role, status } = req.body;

    if (!isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid user id' });
    }

    if (firstName !== undefined && !isNotEmptyString(firstName)) return res.status(400).json({ message: 'First name cannot be empty' });
    if (lastName !== undefined && !isNotEmptyString(lastName)) return res.status(400).json({ message: 'Last name cannot be empty' });
    if (phone !== undefined && !isNotEmptyString(phone)) return res.status(400).json({ message: 'Phone cannot be empty' });
    if (gender !== undefined && !isNotEmptyString(gender)) return res.status(400).json({ message: 'Gender cannot be empty' });
    if (dateOfBirth !== undefined && !dateOfBirth) return res.status(400).json({ message: 'Date of birth cannot be empty' });

    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (phone) user.phone = phone;
        if (gender) user.gender = gender;
        if (dateOfBirth) user.dateOfBirth = dateOfBirth;
        if (specialization !== undefined) user.specialization = specialization;
        if (hospital !== undefined) user.hospital = hospital;
        if (profilePicture !== undefined) {
             user.profilePicture = profilePicture;
        }

        if (req.user.role === 'admin') {
            if (email && email !== user.email) {
                const existingUser = await User.findOne({ email: email });
                if (existingUser && existingUser._id.toString() !== id) {
                    return res.status(400).json({ message: 'Email already exists' });
                }
                user.email = email;
            }
            if (role && isValidRole(role)) user.role = role;
            if (status && ['verified', 'unverified', 'blocked'].includes(status)) user.status = status;
        } else {
            if (email && email !== user.email) return res.status(403).json({ message: 'Forbidden: Cannot change email.' });
            if (role && role !== user.role) return res.status(403).json({ message: 'Forbidden: Cannot change role.' });
            if (status && status !== user.status) return res.status(403).json({ message: 'Forbidden: Cannot change status.' });
        }

        const updatedUser = await user.save();

        res.status(200).json({
             _id: updatedUser._id,
             firstName: updatedUser.firstName,
             lastName: updatedUser.lastName,
             email: updatedUser.email,
             role: updatedUser.role,
             status: updatedUser.status,
             specialization: updatedUser.specialization,
             profilePicture: updatedUser.profilePicture,
             phone: updatedUser.phone,
             gender: updatedUser.gender,
             dateOfBirth: updatedUser.dateOfBirth,
             hospital: updatedUser.hospital
        });
    } catch (error) {
        next(error);
    }
};

const uploadProfilePicture = async (req, res, next) => {
    const { id } = req.params;
    const requestingUserId = req.user._id.toString();

    if (req.user.role !== 'admin' && requestingUserId !== id) {
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error("Error deleting unauthorized upload:", err);
            });
        }
        return res.status(403).json({ message: 'Forbidden: You can only upload your own profile picture.' });
    }

    if (!req.file) {
        return res.status(400).json({ message: 'No image file uploaded.' });
    }

    try {
        const user = await User.findById(id);
        if (!user) {
             fs.unlink(req.file.path, (err) => {
                if (err) console.error("Error deleting upload for non-existent user:", err);
            });
            return res.status(404).json({ message: 'User not found.' });
        }

        if (user.profilePicture && user.profilePicture.startsWith('/uploads/')) {
            try {
                const oldFilename = path.basename(user.profilePicture);
                const oldFilePath = path.join(__dirname, '../uploads/profile_pictures', oldFilename);

                if (fs.existsSync(oldFilePath)) {
                    fs.unlink(oldFilePath, (err) => {
                        if (err) {
                            console.error("Error deleting old profile picture:", oldFilePath, err);
                        } else {
                            console.log("Deleted old profile picture:", oldFilePath);
                        }
                    });
                } else {
                     console.log("Old profile picture file not found, skipping deletion:", oldFilePath);
                }
            } catch (e) {
                console.error("Error processing old profile picture path for deletion:", user.profilePicture, e);
            }
        }

        const relativeImagePath = `/uploads/profile_pictures/${req.file.filename}`;

        user.profilePicture = relativeImagePath;
        await user.save();

        res.status(200).json({
            message: 'Profile picture uploaded successfully.',
             user: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                status: user.status,
                specialization: user.specialization,
                profilePicture: user.profilePicture,
                phone: user.phone,
                gender: user.gender,
                dateOfBirth: user.dateOfBirth,
                hospital: user.hospital
            }
        });

    } catch (error) {
        if (req.file) {
             fs.unlink(req.file.path, (err) => {
                if (err) console.error("Error deleting file after DB error:", err);
            });
        }
        console.error("Error during profile picture upload processing:", error);
        next(error);
    }
};

const deleteUserById = async (req, res, next) => {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid user id' });
    }
    try {
        const user = await User.findByIdAndDelete(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
         if (user.profilePicture && user.profilePicture.startsWith('/uploads/')) {
             try {
                const filename = path.basename(user.profilePicture);
                const filePath = path.join(__dirname, '../uploads/profile_pictures', filename);
                 if (fs.existsSync(filePath)) {
                    fs.unlink(filePath, (err) => {
                        if (err) console.error("Error deleting profile picture on user delete:", err);
                    });
                 }
             } catch(e) { console.error("Error parsing URL for deletion on user delete:", e); }
        }
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        next(error);
    }
};

const verifyEmail = async (req, res, next) => {
    const { email, verificationCode } = req.body;
    if (!isValidEmail(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
    }
    if (!verificationCode) {
        return res.status(400).json({ message: 'Verification code is required' });
    }
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.status === 'blocked') {
            return res.status(403).json({ message: 'User is blocked , contact administration' });
        }

        const createUserResponseObject = (userDoc) => ({
            _id: userDoc._id,
            firstName: userDoc.firstName,
            lastName: userDoc.lastName,
            email: userDoc.email,
            role: userDoc.role,
            status: userDoc.status,
            specialization: userDoc.specialization,
            profilePicture: userDoc.profilePicture,
            phone: userDoc.phone,
            gender: userDoc.gender,
            dateOfBirth: userDoc.dateOfBirth,
            hospital: userDoc.hospital
        });

        if (user.status === 'verified') {
            const { accessToken, refreshToken } = generateTokens(user._id, user.role, user.status);
            user.refreshToken = await bcrypt.hash(refreshToken, 10);
            await user.save();

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });

            return res.status(200).json({
                message: 'User already verified. Logged in.',
                accessToken,
                user: createUserResponseObject(user)
            });
        }
        if (user.verificationCodeExpireTime < new Date()) {
            const newVerificationCode = Math.floor(100000 + Math.random() * 900000);
            const newVerificationCodeExpireTime = new Date(Date.now() + 10 * 60 * 1000);
            user.verificationCode = newVerificationCode;
            user.verificationCodeExpireTime = newVerificationCodeExpireTime;
            user.verificationAttempts = 0;
            await user.save();
            const mailSent = await sendEmail(email, 'New Verification Code', `Your new verification code is: ${newVerificationCode}`);
            if (!mailSent) {
                console.log('Failed to send verification email');
            }
            return res.status(400).json({ message: 'Verification code expired. New code sent to your email' });
        }
        if (user.verificationCode !== verificationCode) {
            user.verificationAttempts = (user.verificationAttempts || 0) + 1;
            if (user.verificationAttempts >= 3) {
                user.status = 'blocked';
                await user.save();
                return res.status(403).json({ message: 'Verification attempts exceeded, your account is blocked please contact administration' });
            } else {
                await user.save();
                return res.status(400).json({ message: 'Invalid verification code' });
            }
        }

        user.status = 'verified';
        user.verificationCode = null;
        user.verificationAttempts = 0;
        user.verificationCodeExpireTime = null;

        const { accessToken, refreshToken } = generateTokens(user._id, user.role, user.status);
        user.refreshToken = await bcrypt.hash(refreshToken, 10);
        await user.save();

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(200).json({
            message: 'Email verified successfully. Logged in.',
            accessToken,
            user: createUserResponseObject(user)
        });

    } catch (error) {
        next(error);
    }
};

const forgetPassword = async (req, res, next) => {
    const { email } = req.body;
    if (!isValidEmail(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
    }
    try {
        const user = await User.findOne({ email });
        if (!user) {
            console.log(`Password reset requested for non-existent email: ${email}`);
            return res.status(200).json({ message: 'If your email is registered, a reset code has been sent.' });
        }
        const resetCode = Math.floor(100000 + Math.random() * 900000);
        user.resetPasswordCode = resetCode;
        await user.save();
        const mailSent = await sendEmail(email, 'Reset Your Password', `Your reset password code is: ${resetCode}`);
        if (!mailSent) {
            console.log('Failed to send reset password email');
        }
        res.status(200).json({ message: 'If your email is registered, a reset code has been sent.' });

    } catch (error) {
        next(error);
    }
};

const resetPassword = async (req, res, next) => {
    const { email, resetPasswordCode, newPassword } = req.body;
    if (!isValidEmail(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
    }
    if (!resetPasswordCode) {
        return res.status(400).json({ message: 'Reset password code is required' });
    }
    if (!newPassword) {
        return res.status(400).json({ message: 'New password is required' });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found or invalid code' });
        }
        if (user.resetPasswordCode !== resetPasswordCode) {
            return res.status(400).json({ message: 'Invalid reset password code' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetPasswordCode = null;

        const { accessToken, refreshToken } = generateTokens(user._id, user.role, user.status);
        user.refreshToken = await bcrypt.hash(refreshToken, 10);
        await user.save();

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        const createUserResponseObject = (userDoc) => ({
            _id: userDoc._id,
            firstName: userDoc.firstName,
            lastName: userDoc.lastName,
            email: userDoc.email,
            role: userDoc.role,
            status: userDoc.status,
            specialization: userDoc.specialization,
            profilePicture: userDoc.profilePicture,
            phone: userDoc.phone,
            gender: userDoc.gender,
            dateOfBirth: userDoc.dateOfBirth,
            hospital: userDoc.hospital
        });

        res.status(200).json({
            message: 'Password reset successfully. Logged in.',
            accessToken,
            user: createUserResponseObject(user)
        });

    } catch (error) {
        next(error);
    }
};

const getDoctors = async (req, res, next) => {
    try {
        const doctors = await User.find({ role: 'doctor' }).select('-password -verificationCode -resetPasswordCode -verificationAttempts -verificationCodeExpireTime -refreshToken');
        res.status(200).json(doctors);
    } catch (error) {
        console.error('Error in getDoctors:', error);
        next(error);
    }
};

const getPatients = async (req, res, next) => {
    try {
        const patients = await User.find({ role: 'patient' }).select('-password -verificationCode -resetPasswordCode -verificationAttempts -verificationCodeExpireTime -refreshToken');
        res.status(200).json(patients);
    } catch (error) {
        next(error);
    }
};

const generateTokens = (userId, role, status) => {
    const accessToken = jwt.sign(
        { userId, role, status },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
    const refreshToken = crypto.randomBytes(40).toString('hex');
    return { accessToken, refreshToken };
};

const login = async (req, res, next) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (user.status === 'blocked') {
            return res.status(403).json({ message: 'Account is blocked' });
        }

        if (user.status === 'unverified') {
            return res.status(403).json({ message: 'Please verify your email first' });
        }

        const { accessToken, refreshToken } = generateTokens(user._id, user.role, user.status);
        user.refreshToken = await bcrypt.hash(refreshToken, 10);
        await user.save();

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({
            accessToken,
            user: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                status: user.status,
                specialization: user.specialization,
                profilePicture: user.profilePicture,
                phone: user.phone,
                gender: user.gender,
                dateOfBirth: user.dateOfBirth,
                hospital: user.hospital
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        next(error);
    }
};

const refreshToken = async (req, res, next) => {
    try {
        const refreshTokenFromCookie = req.cookies.refreshToken;

        if (!refreshTokenFromCookie) {
            return res.status(401).json({ message: 'Refresh token required' });
        }

        const users = await User.find({ refreshToken: { $exists: true, $ne: null } });
        let user = null;
        for (const potentialUser of users) {
            if (await bcrypt.compare(refreshTokenFromCookie, potentialUser.refreshToken)) {
                user = potentialUser;
                break;
            }
        }

        if (!user) {
             console.warn('Invalid or expired refresh token used.');
             res.clearCookie('refreshToken');
             return res.status(401).json({ message: 'Invalid refresh token' });
        }

        const tokens = generateTokens(user._id, user.role, user.status);

        user.refreshToken = await bcrypt.hash(tokens.refreshToken, 10);
        await user.save();

        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.status(200).json({ accessToken: tokens.accessToken });
    } catch (error) {
        console.error('Refresh token error:', error);
        res.clearCookie('refreshToken');
        return res.status(500).json({ message: 'Internal server error during token refresh' });
    }
};


const logout = async (req, res, next) => {
    try {
        const userId = req.user?._id;
        if (userId) {
             const user = await User.findById(userId);
             if (user) {
                 user.refreshToken = null;
                 await user.save();
             }
        } else {
            console.log("Logout called without authenticated user (token might have expired)");
        }

        res.clearCookie('refreshToken');
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        next(error);
    }
};

const updatePassword = async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id.toString();

    if (!isNotEmptyString(currentPassword)) {
        return res.status(400).json({ message: 'Current password is required' });
    }
    if (!isNotEmptyString(newPassword)) {
        return res.status(400).json({ message: 'New password is required' });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Incorrect current password' });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedNewPassword;
        await user.save();

        res.status(200).json({ message: 'Password updated successfully' });

    } catch (error) {
        console.error('Password update error:', error);
        next(error);
    }
};

const blockUser = async (req, res, next) => {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid user ID' });
    }
    if (id === req.user._id.toString()) {
        return res.status(400).json({ message: 'Admin cannot block themselves' });
    }

    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.role === 'admin') {
             return res.status(403).json({ message: 'Cannot block another admin' });
        }
        user.status = 'blocked';
        user.refreshToken = null;
        await user.save();
        res.status(200).json({ message: 'User blocked successfully' });
    } catch (error) {
        next(error);
    }
};

const unblockUser = async (req, res, next) => {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid user ID' });
    }

    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.status !== 'blocked') {
            return res.status(400).json({ message: 'User is not currently blocked' });
        }
        user.status = 'verified';
        user.verificationAttempts = 0;
        await user.save();
        res.status(200).json({ message: 'User unblocked successfully' });
    } catch (error) {
        next(error);
    }
};

// Ensure all functions are defined before exporting
module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUserById,
    deleteUserById,
    verifyEmail,
    forgetPassword,
    resetPassword,
    getDoctors,
    getPatients,
    updatePassword,
    login,
    refreshToken,
    logout,
    blockUser,
    unblockUser,
    uploadProfilePicture
};