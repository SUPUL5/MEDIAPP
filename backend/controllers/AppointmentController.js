// backend/controllers/AppointmentController.js
const Appointment = require('../models/Appointment');
const Availability = require('../models/Availability');
const { isValidObjectId, isValidAppointmentStatus, isNotEmptyString } = require('../utils/commonUtils');

const findAndValidateAvailability = async (availabilityId) => {
    if (!isValidObjectId(availabilityId)) {
        return { error: 'Invalid availability ID', status: 400 };
    }
    const availability = await Availability.findById(availabilityId);
    if (!availability) {
        return { error: 'Availability slot not found', status: 404 };
    }
    // Allow booking check only during creation, not during admin updates potentially
    // if (availability.isBooked) {
    //     return { error: 'This availability slot is already booked', status: 400 };
    // }
    return { availability };
};

const getAllAppointments = async (req, res, next) => {
    try {
        const appointments = await Appointment.find({})
            .populate('patientId', 'firstName lastName email phone profilePicture') // Added profilePicture
            .populate('doctorId', 'firstName lastName email specialization phone hospital profilePicture') // Added profilePicture
            .populate('availability')
            .sort({ 'availability.startTime': 1 }); // Sort by time
        res.status(200).json(appointments);
    } catch (error) {
        next(error);
    }
};

const getAppointmentById = async (req, res, next) => {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid appointment ID' });
    }
    try {
        const appointment = await Appointment.findById(id)
            .populate('patientId', 'firstName lastName email phone profilePicture') // Added profilePicture
            .populate('doctorId', 'firstName lastName email specialization phone hospital profilePicture') // Added profilePicture
            .populate('availability');

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }
        res.status(200).json(appointment);
    } catch (error) {
        next(error);
    }
};

const createAppointment = async (req, res, next) => {
    const { availabilityId, serviceType } = req.body;
    const patientId = req.user._id;

    if (req.user.role !== 'patient') {
        return res.status(403).json({ message: 'Only patients can create appointments' });
    }

    if (!isNotEmptyString(serviceType)) {
        return res.status(400).json({ message: 'Service type is required' });
    }

    try {
        // Re-check availability specifically for booking
        const availabilityCheck = await Availability.findById(availabilityId);
        if (!availabilityCheck) {
            return res.status(404).json({ error: 'Availability slot not found' }); // Return error directly for API consistency
        }
        if (availabilityCheck.isBooked) {
            return res.status(400).json({ error: 'This availability slot is already booked' }); // Return error directly
        }
        const availability = availabilityCheck;


        const doctorId = availability.doctorId;

        const newAppointment = new Appointment({
            patientId,
            doctorId,
            availability: availabilityId,
            serviceType,
        });

        availability.isBooked = true;
        await availability.save();

        const savedAppointment = await newAppointment.save();

        // Populate after saving, find by ID first
        const populatedAppointment = await Appointment.findById(savedAppointment._id)
           .populate('patientId', 'firstName lastName email phone profilePicture') // Added profilePicture
           .populate('doctorId', 'firstName lastName email specialization phone hospital profilePicture') // Added profilePicture
           .populate('availability');


        res.status(201).json(populatedAppointment);

    } catch (error) {
        if (availabilityId) {
            try {
                // Attempt to unbook only if the error occurred after booking
                await Availability.findByIdAndUpdate(availabilityId, { isBooked: false });
                console.log(`Reverted booking status for availability ${availabilityId} due to error.`);
            } catch (revertError) {
                console.error("Failed to revert availability booking status:", revertError);
            }
        }
        next(error);
    }
};

const updateAppointmentById = async (req, res, next) => {
    const { id } = req.params;
    const { availabilityId, status, serviceType } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;

    if (!isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid appointment ID' });
    }

    // Validate status if provided
    if (status && !isValidAppointmentStatus(status)) {
        console.error(`Invalid status provided: ${status}`); // Log invalid status
        return res.status(400).json({ message: 'Invalid appointment status provided' });
    }
    if (serviceType && !isNotEmptyString(serviceType)) {
        return res.status(400).json({ message: 'Service type cannot be empty' });
    }

    try {
        const appointment = await Appointment.findById(id);
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // --- Authorization Checks ---
        const isPatientOwner = userRole === 'patient' && appointment.patientId.toString() === userId.toString();
        const isDoctorOwner = userRole === 'doctor' && appointment.doctorId.toString() === userId.toString();
        const isAdmin = userRole === 'admin';

        if (!isPatientOwner && !isDoctorOwner && !isAdmin) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission to modify this appointment.' });
        }

        // --- Permissions for Modifications ---
        let canUpdateStatus = false;
        let canUpdateAvailability = false;
        let canUpdateServiceType = false;

        if (isAdmin) {
            canUpdateStatus = true;
            canUpdateAvailability = true;
            canUpdateServiceType = true;
        } else if (isDoctorOwner) {
            // Doctors can confirm or cancel scheduled/confirmed appointments
            canUpdateStatus = (status && ['confirmed', 'cancelled'].includes(status) && ['scheduled', 'confirmed'].includes(appointment.status));
        } else if (isPatientOwner) {
            // Patients can only cancel scheduled or confirmed appointments
            canUpdateStatus = (status && status === 'cancelled' && ['scheduled', 'confirmed'].includes(appointment.status));
        }

        // Check if the requested update is allowed
        if (status && !canUpdateStatus) {
            return res.status(403).json({ message: `Forbidden: Your role (${userRole}) cannot change status to '${status}' for this appointment.` });
        }
        if (availabilityId && !canUpdateAvailability) {
             return res.status(403).json({ message: 'Forbidden: You cannot change the appointment time slot.' });
        }
        if (serviceType && !canUpdateServiceType) {
             return res.status(403).json({ message: 'Forbidden: You cannot change the service type.' });
        }


        let oldAvailabilityId = appointment.availability.toString();
        let newAvailability = null;

        // Handle availability change (only possible for admin as per logic above)
        if (availabilityId && availabilityId !== oldAvailabilityId && canUpdateAvailability) {
            const newAvailabilityResult = await findAndValidateAvailability(availabilityId);
            if (newAvailabilityResult.error) {
                return res.status(newAvailabilityResult.status).json({ message: newAvailabilityResult.error });
            }
            // Check if new slot is booked
             if (newAvailabilityResult.availability.isBooked) {
                return res.status(400).json({ message: 'The new availability slot is already booked.' });
            }
            newAvailability = newAvailabilityResult.availability;
            appointment.availability = availabilityId;
            appointment.doctorId = newAvailability.doctorId; // Doctor might change
        }

        // Update status and service type if allowed and provided
        if (status && canUpdateStatus) appointment.status = status;
        if (serviceType && canUpdateServiceType) appointment.serviceType = serviceType;

        // Save the updated appointment
        const savedAppointment = await appointment.save();

        // Handle availability status changes
        if (newAvailability) { // If availability slot was changed (by admin)
            await Availability.findByIdAndUpdate(oldAvailabilityId, { isBooked: false });
            newAvailability.isBooked = true;
            await newAvailability.save();
        } else if (status === 'cancelled' && canUpdateStatus) { // If status was changed to cancelled
            // Free up the original slot
            await Availability.findByIdAndUpdate(oldAvailabilityId, { isBooked: false });
        }

        // Re-fetch and populate the updated appointment to ensure all fields are current
        const populatedAppointment = await Appointment.findById(savedAppointment._id)
            .populate('patientId', 'firstName lastName email phone profilePicture') // Added profilePicture
            .populate('doctorId', 'firstName lastName email specialization phone hospital profilePicture') // Added profilePicture
            .populate('availability');

        if (!populatedAppointment) {
             // This should ideally not happen if save was successful
             return res.status(500).json({ message: 'Failed to retrieve updated appointment details.' });
        }


        res.status(200).json(populatedAppointment);

    } catch (error) {
        console.error("Error during appointment update:", error);
        next(error); // Pass to global error handler
    }
};


const deleteAppointmentById = async (req, res, next) => {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid appointment ID' });
    }
    try {
        const appointment = await Appointment.findById(id);
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        const availabilityId = appointment.availability;

        const deletedAppointment = await Appointment.findByIdAndDelete(id);

        if (!deletedAppointment) {
            return res.status(404).json({ message: 'Appointment not found during deletion' });
        }

        // Unbook the associated slot only if it wasn't already cancelled
        if (appointment.status !== 'cancelled') {
            await Availability.findByIdAndUpdate(availabilityId, { isBooked: false });
        }

        res.status(200).json({ message: 'Appointment deleted successfully' });
    } catch (error) {
        console.error("Error deleting appointment:", error);
        next(error);
    }
};

const getMyAllAppointment = async (req, res, next) => {
    const userId = req.user._id;
    const userRole = req.user.role;

    try {
        let query = {};
        if (userRole === 'patient') {
            query = { patientId: userId };
        } else if (userRole === 'doctor') {
            query = { doctorId: userId };
        } else {
            // Admin sees all, but maybe filter out truly old ones? Optional.
            query = {};
        }


        const appointments = await Appointment.find(query)
            .sort({ 'availability.startTime': 1 }) // Sort by appointment start time
            .populate('patientId', 'firstName lastName email phone profilePicture') // Added profilePicture
            .populate('doctorId', 'firstName lastName email specialization phone hospital profilePicture') // Added profilePicture
            .populate('availability');

        res.status(200).json(appointments);
    } catch (error) {
        console.error('Error in getMyAllAppointment:', error);
        next(error);
    }
};

module.exports = {
    getAllAppointments,
    getAppointmentById,
    createAppointment,
    updateAppointmentById,
    deleteAppointmentById,
    getMyAllAppointment
};