// controllers/AvailabilityController.js

const Availability = require('../models/Availability');
const { isValidObjectId, isValidDayOfWeek } = require('../utils/commonUtils');

/**
 * Check if time slots overlap within 5 minutes
 */
const isTimeOverlapping = async (doctorId, startTime, endTime, dayOfWeek, excludeId = null) => {
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
    const query = {
        doctorId,
        dayOfWeek,
        _id: { $ne: excludeId }, // exclude current availability when updating
        $or: [
            {
                // Check if new start time is within 5 minutes of existing slot
                startTime: {
                    $gte: new Date(new Date(startTime).getTime() - fiveMinutes),
                    $lte: new Date(new Date(startTime).getTime() + fiveMinutes)
                }
            },
            {
                // Check if new end time is within 5 minutes of existing slot
                endTime: {
                    $gte: new Date(new Date(endTime).getTime() - fiveMinutes),
                    $lte: new Date(new Date(endTime).getTime() + fiveMinutes)
                }
            }
        ]
    };
    
    const existingAvailability = await Availability.findOne(query);
    return existingAvailability !== null;
};

/**
 * Get all availabilities
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
const getAllAvailabilities = async (req, res, next) => {
    try {
        const availabilities = await Availability.find({});
        res.status(200).json(availabilities);
    } catch (error) {
        console.error('Error in updateAvailabilityById:', error);
        next(error);
    }
};

/**
 * Get an availability by ID
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
const getAvailabilityById = async (req, res, next) => {
    const { id } = req.params;
    if(!isValidObjectId(id)){
         return res.status(400).json({message: 'Invalid availability ID'});
    }
    try {
        const availability = await Availability.findById(id);
        if (!availability) {
            return res.status(404).json({ message: 'Availability not found' });
        }
        res.status(200).json(availability);
    } catch (error) {
        console.error('Error in getAllAvailabilities:', error);
        next(error);
    }
};

/**
 * Create a new availability slot
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
const createAvailability = async (req, res, next) => {
    const { startTime, endTime, dayOfWeek } = req.body;

    const doctorId = req.user._id; // Use doctorId from req.user

    // Removed isValidTimeString checks for startTime and endTime.
    // Mongoose schema validation will handle Date type casting from ISO string.
    // Ensure startTime and endTime are provided and are valid ISO strings implicitly by Mongoose.
    if (!startTime || !endTime) {
        return res.status(400).json({ message: 'Start time and end time are required' });
    }
    // Basic check if they look like ISO strings (optional, Mongoose handles robustly)
    // if (typeof startTime !== 'string' || typeof endTime !== 'string' || !startTime.includes('T') || !endTime.includes('T')) {
    //     return res.status(400).json({ message: 'Start time and end time must be valid ISO date strings' });
    // }
     if(!isValidDayOfWeek(dayOfWeek)){
        return res.status(400).json({ message: 'Invalid day of week' });
     }

    try {
        // Check for time overlap
        const hasOverlap = await isTimeOverlapping(doctorId, startTime, endTime, dayOfWeek);
        if (hasOverlap) {
            return res.status(400).json({ 
                message: 'Cannot create availability within 5 minutes of existing time slot' 
            });
        }

        const newAvailability = new Availability({
            doctorId,
            startTime,
            endTime,
            dayOfWeek,
        });
        const savedAvailability = await newAvailability.save();
        res.status(201).json(savedAvailability);
    } catch (error) {
        console.error('Error in createAvailability:', error);
        next(error);
    }
};

/**
 * Update an availability slot by ID
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
const updateAvailabilityById = async (req, res, next) => {
    const { id } = req.params;
    const { startTime, endTime, dayOfWeek, isBooked } = req.body;
    const doctorId = req.user._id;

    if(!isValidObjectId(id)){
        return res.status(400).json({message: 'Invalid availability ID'});
    }

    try {
        // First find the availability
        const availability = await Availability.findById(id);
        if (!availability) {
            return res.status(404).json({ message: 'Availability not found' });
        }

        // Check if the availability belongs to the requesting user
        if (availability.doctorId.toString() !== doctorId.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this availability' });
        }

        // Rest of the validation and update logic
        // Removed isValidTimeString checks for startTime and endTime.
        // Mongoose schema validation handles Date type casting.
        // Basic check if provided values look like ISO strings (optional)
        // if (startTime && (typeof startTime !== 'string' || !startTime.includes('T'))) {
        //     return res.status(400).json({ message: 'Invalid start time format (must be ISO string)' });
        // }
        // if (endTime && (typeof endTime !== 'string' || !endTime.includes('T'))) {
        //     return res.status(400).json({ message: 'Invalid end time format (must be ISO string)' });
        // }
        if (dayOfWeek && !isValidDayOfWeek(dayOfWeek)) {
            return res.status(400).json({message: 'Invalid day of week'});
        }

        // Continue with update if authorized
        if (startTime || endTime || dayOfWeek) {
            const newStartTime = startTime || availability.startTime;
            const newEndTime = endTime || availability.endTime;
            const newDayOfWeek = dayOfWeek || availability.dayOfWeek;

            const hasOverlap = await isTimeOverlapping(
                doctorId, 
                newStartTime, 
                newEndTime, 
                newDayOfWeek,
                id // exclude current availability from overlap check
            );

            if (hasOverlap) {
                return res.status(400).json({ 
                    message: 'Cannot update availability within 5 minutes of existing time slot' 
                });
            }
        }

        availability.doctorId = doctorId;
        if (startTime) availability.startTime = startTime;
        if (endTime) availability.endTime = endTime;
        if (dayOfWeek) availability.dayOfWeek = dayOfWeek;
        if(isBooked !== undefined) availability.isBooked = isBooked; //only update if provided 

        const updatedAvailability = await availability.save();
        res.status(200).json(updatedAvailability);
    } catch (error) {
        console.error('Error in getAvailabilityById:', error);
        next(error);
    }
};

/**
 * Delete an availability slot by ID
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
const deleteAvailabilityById = async (req, res, next) => {
    const { id } = req.params;
    const doctorId = req.user._id;

    if(!isValidObjectId(id)){
        return res.status(400).json({message: 'Invalid availability ID'});
    }

    try {
        // First find the availability
        const availability = await Availability.findById(id);
        if (!availability) {
            return res.status(404).json({ message: 'Availability not found' });
        }

        // Check if the availability belongs to the requesting user
        if (availability.doctorId.toString() !== doctorId.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this availability' });
        }

        // Proceed with deletion if authorized
        await availability.deleteOne();
        res.status(200).json({ message: 'Availability deleted successfully' });
    } catch (error) {
        console.error('Error in deleteAvailabilityById:', error);
        next(error);
    }
};

/**
 * Get availabilities by doctor ID (for patients and admins)
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
const getAvailabilitiesByDoctorId = async (req, res, next) => {
    const { doctorId } = req.params;

    if(!isValidObjectId(doctorId)){
        return res.status(400).json({message: 'Invalid doctor ID'});
    }

    try {
        const availabilities = await Availability.find({ doctorId: doctorId });
        res.status(200).json(availabilities);
    } catch (error) {
        console.error('Error in getAvailabilitiesByDoctorId:', error);
        next(error);
    }
};

/**
 * Get my availabilities (for doctors)
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
const getMyAvailabilities = async (req, res, next) => {
    const doctorId = req.user._id;

    try {
        const availabilities = await Availability.find({ doctorId: doctorId });
        res.status(200).json(availabilities);
    } catch (error) {
        console.error('Error in getMyAvailabilities:', error);
        next(error);
    }
};

module.exports = {
    getAllAvailabilities,
    getAvailabilityById,
    createAvailability,
    updateAvailabilityById,
    deleteAvailabilityById,
    getAvailabilitiesByDoctorId,
    getMyAvailabilities
};
