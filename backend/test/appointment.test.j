// File: test/appointment.test.js
// Location: test/appointment.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server'); // Adjust path if your server file is elsewhere
const User = require('../models/User');
const Availability = require('../models/Availability');
const Appointment = require('../models/Appointment');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// --- Helper Functions ---
const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, role: user.role, status: user.status },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

const createUser = async (userData) => {
    const hashedPassword = await bcrypt.hash(userData.password || 'password123', 10);
    const user = new User({
        ...userData,
        password: hashedPassword,
        status: userData.status || 'verified', // Default to verified for tests unless specified
        phone: userData.phone || '+1234567890',
        gender: userData.gender || 'male',
        dateOfBirth: userData.dateOfBirth || new Date('1990-01-01'),
    });
    await user.save();
    return user;
};

const createAvailability = async (availabilityData) => {
    const availability = new Availability(availabilityData);
    await availability.save();
    return availability;
};

const createAppointment = async (appointmentData) => {
    const appointment = new Appointment(appointmentData);
    await appointment.save();
    return appointment;
}

// --- Test Suite ---
describe('Appointment API Routes', () => {
    let patient, doctor, admin, patientToken, doctorToken, adminToken;
    let availability1, availability2, availabilityBooked;

    beforeAll(async () => {
        // Clear existing data
        await User.deleteMany({});
        await Availability.deleteMany({});
        await Appointment.deleteMany({});

        // Create test users
        patient = await createUser({ firstName: 'Test', lastName: 'Patient', email: 'patient@test.com', role: 'patient' });
        doctor = await createUser({ firstName: 'Test', lastName: 'Doctor', email: 'doctor@test.com', role: 'doctor', specialization: 'Cardiology', hospital: 'Test Hospital' });
        admin = await createUser({ firstName: 'Test', lastName: 'Admin', email: 'admin@test.com', role: 'admin' });

        // Generate tokens
        patientToken = generateToken(patient);
        doctorToken = generateToken(doctor);
        adminToken = generateToken(admin);

        // Create test availabilities
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0); // 10:00 AM tomorrow

        const tomorrowLater = new Date(tomorrow);
        tomorrowLater.setHours(11, 0, 0, 0); // 11:00 AM tomorrow

        const tomorrowBooked = new Date(tomorrow);
        tomorrowBooked.setHours(14, 0, 0, 0); // 2:00 PM tomorrow

        availability1 = await createAvailability({
            doctorId: doctor._id,
            startTime: tomorrow,
            endTime: new Date(tomorrow.getTime() + 30 * 60000), // 10:30 AM
            dayOfWeek: 'Wednesday', // Adjust day based on test run date if necessary
            isBooked: false
        });
        availability2 = await createAvailability({
            doctorId: doctor._id,
            startTime: tomorrowLater,
            endTime: new Date(tomorrowLater.getTime() + 30 * 60000), // 11:30 AM
            dayOfWeek: 'Wednesday',
            isBooked: false
        });
        availabilityBooked = await createAvailability({
            doctorId: doctor._id,
            startTime: tomorrowBooked,
            endTime: new Date(tomorrowBooked.getTime() + 30 * 60000), // 2:30 PM
            dayOfWeek: 'Wednesday',
            isBooked: true // This one is already booked
        });
    });

    afterAll(async () => {
        // Clean up after tests
        await User.deleteMany({});
        await Availability.deleteMany({});
        await Appointment.deleteMany({});
    });

    // --- POST /api/appointments ---
    describe('POST /api/appointments', () => {
        let createdAppointmentId;

        afterEach(async () => {
             // Clean up the specific appointment created in this test block
             if (createdAppointmentId) {
                 await Appointment.findByIdAndDelete(createdAppointmentId);
                 // Also reset the availability slot if it was booked by the test
                 const appointment = await Appointment.findById(createdAppointmentId); // Re-fetch in case of update test
                 if(appointment?.availability) {
                    await Availability.findByIdAndUpdate(appointment.availability, { isBooked: false });
                 } else {
                    // Fallback: unbook availability1 if ID isn't tracked perfectly
                    await Availability.findByIdAndUpdate(availability1._id, { isBooked: false });
                 }
                 createdAppointmentId = null;
             }
             // Ensure availability1 is unbooked if test failed before cleanup
             await Availability.findByIdAndUpdate(availability1._id, { isBooked: false });
        });

        it('should allow a patient to create an appointment', async () => {
            const res = await request(app)
                .post('/api/appointments')
                .set('Authorization', `Bearer ${patientToken}`)
                .send({ availabilityId: availability1._id.toString(), serviceType: 'Checkup' });

            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('_id');
            expect(res.body.patientId._id).toEqual(patient._id.toString());
            expect(res.body.doctorId._id).toEqual(doctor._id.toString());
            expect(res.body.availability._id).toEqual(availability1._id.toString());
            expect(res.body.serviceType).toEqual('Checkup');
            expect(res.body.status).toEqual('scheduled');
            createdAppointmentId = res.body._id; // Store ID for cleanup

            // Verify availability is booked
            const updatedAvailability = await Availability.findById(availability1._id);
            expect(updatedAvailability.isBooked).toBe(true);
        });

        it('should prevent booking an already booked slot', async () => {
            const res = await request(app)
                .post('/api/appointments')
                .set('Authorization', `Bearer ${patientToken}`)
                .send({ availabilityId: availabilityBooked._id.toString(), serviceType: 'Consultation' });

            expect(res.statusCode).toEqual(400);
            expect(res.body.error).toEqual('This availability slot is already booked');
        });

        it('should return 404 if availability slot does not exist', async () => {
            const invalidId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .post('/api/appointments')
                .set('Authorization', `Bearer ${patientToken}`)
                .send({ availabilityId: invalidId.toString(), serviceType: 'Follow-up' });

            expect(res.statusCode).toEqual(404);
            expect(res.body.error).toEqual('Availability slot not found');
        });


        it('should prevent a doctor from creating an appointment', async () => {
            const res = await request(app)
                .post('/api/appointments')
                .set('Authorization', `Bearer ${doctorToken}`)
                .send({ availabilityId: availability2._id.toString(), serviceType: 'Procedure' });

            expect(res.statusCode).toEqual(403);
            expect(res.body.message).toEqual('Only patients can create appointments');
        });

        it('should prevent creating an appointment without serviceType', async () => {
            const res = await request(app)
                .post('/api/appointments')
                .set('Authorization', `Bearer ${patientToken}`)
                .send({ availabilityId: availability2._id.toString() });

            expect(res.statusCode).toEqual(400);
            expect(res.body.message).toEqual('Service type is required');
        });
    });

    // --- GET /api/appointments ---
    describe('GET /api/appointments', () => {
        let testAppt;
        beforeAll(async () => {
             // Create an appointment for testing GET requests
             testAppt = await createAppointment({
                 patientId: patient._id,
                 doctorId: doctor._id,
                 availability: availability1._id, // Use an existing valid availability
                 serviceType: 'Test Get',
                 status: 'scheduled'
             });
             // Ensure the linked availability is marked booked for consistency
             await Availability.findByIdAndUpdate(availability1._id, { isBooked: true });
        });

        afterAll(async () => {
             // Clean up the test appointment and unbook slot
             if (testAppt) await Appointment.findByIdAndDelete(testAppt._id);
             await Availability.findByIdAndUpdate(availability1._id, { isBooked: false });
        });

        it('should allow admin to get all appointments', async () => {
            const res = await request(app)
                .get('/api/appointments')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toEqual(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(1); // Should include testAppt
             expect(res.body[0]).toHaveProperty('patientId');
             expect(res.body[0]).toHaveProperty('doctorId');
             expect(res.body[0]).toHaveProperty('availability');
        });

        it('should allow doctor to get all appointments', async () => {
            const res = await request(app)
                .get('/api/appointments')
                .set('Authorization', `Bearer ${doctorToken}`);

            expect(res.statusCode).toEqual(200);
            expect(Array.isArray(res.body)).toBe(true);
            // Add more specific checks if doctors should only see their appointments via this route (controller logic check)
        });

        it('should allow patient to get all appointments', async () => {
            const res = await request(app)
                .get('/api/appointments')
                .set('Authorization', `Bearer ${patientToken}`);

            expect(res.statusCode).toEqual(200);
            expect(Array.isArray(res.body)).toBe(true);
             // Add more specific checks if patients should only see their appointments via this route (controller logic check)
        });
    });

    // --- GET /api/appointments/me ---
    describe('GET /api/appointments/me', () => {
         let patientAppt, doctorAppt;
         beforeAll(async () => {
             // Create specific appointments for patient and doctor
             patientAppt = await createAppointment({
                 patientId: patient._id,
                 doctorId: doctor._id,
                 availability: availability1._id,
                 serviceType: 'Patient Me Test',
                 status: 'scheduled'
             });
             await Availability.findByIdAndUpdate(availability1._id, { isBooked: true });

             // Need another patient and availability for the doctor's appointment
             const otherPatient = await createUser({ firstName: 'Other', lastName: 'Pat', email: 'other@test.com', role: 'patient' });
             doctorAppt = await createAppointment({
                 patientId: otherPatient._id,
                 doctorId: doctor._id,
                 availability: availability2._id,
                 serviceType: 'Doctor Me Test',
                 status: 'confirmed'
             });
             await Availability.findByIdAndUpdate(availability2._id, { isBooked: true });
         });

         afterAll(async () => {
             // Clean up appointments and availability
             if (patientAppt) await Appointment.findByIdAndDelete(patientAppt._id);
             if (doctorAppt) await Appointment.findByIdAndDelete(doctorAppt._id);
             await Availability.findByIdAndUpdate(availability1._id, { isBooked: false });
             await Availability.findByIdAndUpdate(availability2._id, { isBooked: false });
             await User.deleteOne({ email: 'other@test.com' });
         });

        it('should allow a patient to get their own appointments', async () => {
            const res = await request(app)
                .get('/api/appointments/me')
                .set('Authorization', `Bearer ${patientToken}`);

            expect(res.statusCode).toEqual(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(1);
            expect(res.body.some(appt => appt._id.toString() === patientAppt._id.toString())).toBe(true);
             expect(res.body.every(appt => appt.patientId._id.toString() === patient._id.toString())).toBe(true); // Ensure only patient's appointments
        });

        it('should allow a doctor to get their own appointments', async () => {
            const res = await request(app)
                .get('/api/appointments/me')
                .set('Authorization', `Bearer ${doctorToken}`);

            expect(res.statusCode).toEqual(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(1);
             expect(res.body.some(appt => appt._id.toString() === patientAppt._id.toString())).toBe(true); // Doctor involved in patientAppt
             expect(res.body.some(appt => appt._id.toString() === doctorAppt._id.toString())).toBe(true); // Doctor involved in doctorAppt
            expect(res.body.every(appt => appt.doctorId._id.toString() === doctor._id.toString())).toBe(true); // Ensure only doctor's appointments
        });

         it('should prevent admin from using /me route (or return all if controller allows)', async () => {
            // Assuming /me is specific to patient/doctor roles based on typical use cases
            const res = await request(app)
                .get('/api/appointments/me')
                .set('Authorization', `Bearer ${adminToken}`);
            // Check the specific behavior - might be 403 if strictly for patient/doctor,
            // or 200 with all appointments if the controller doesn't filter by role for /me specifically
            // Based on route definition `authorizeRole(['patient', 'doctor'])`, it should be 403.
            expect(res.statusCode).toEqual(403);
         });
    });

    // --- GET /api/appointments/:id ---
    describe('GET /api/appointments/:id', () => {
         let testAppt;
         let otherDoctor;
         let otherPatient;
         let otherAppt;

         beforeAll(async () => {
             testAppt = await createAppointment({
                 patientId: patient._id,
                 doctorId: doctor._id,
                 availability: availability1._id,
                 serviceType: 'Test Get By ID',
                 status: 'scheduled'
             });
             await Availability.findByIdAndUpdate(availability1._id, { isBooked: true });

             otherPatient = await createUser({ firstName: 'OtherGet', lastName: 'Patient', email: 'otherget@test.com', role: 'patient'});
             otherDoctor = await createUser({ firstName: 'OtherGet', lastName: 'Doctor', email: 'othergetdoc@test.com', role: 'doctor'});
             otherAppt = await createAppointment({
                 patientId: otherPatient._id,
                 doctorId: otherDoctor._id,
                 availability: availability2._id, // Assuming availability2 belongs to `doctor`
                 serviceType: 'Other Appt',
                 status: 'scheduled'
             });
             await Availability.findByIdAndUpdate(availability2._id, { isBooked: true });

         });

         afterAll(async () => {
             if(testAppt) await Appointment.findByIdAndDelete(testAppt._id);
             if(otherAppt) await Appointment.findByIdAndDelete(otherAppt._id);
             await Availability.findByIdAndUpdate(availability1._id, { isBooked: false });
             await Availability.findByIdAndUpdate(availability2._id, { isBooked: false });
             if(otherPatient) await User.findByIdAndDelete(otherPatient._id);
             if(otherDoctor) await User.findByIdAndDelete(otherDoctor._id);

         });

        it('should allow patient to get their own appointment by ID', async () => {
            const res = await request(app)
                .get(`/api/appointments/${testAppt._id}`)
                .set('Authorization', `Bearer ${patientToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body._id).toEqual(testAppt._id.toString());
            expect(res.body.patientId._id).toEqual(patient._id.toString());
        });

        it('should allow doctor to get their own appointment by ID', async () => {
            const res = await request(app)
                .get(`/api/appointments/${testAppt._id}`)
                .set('Authorization', `Bearer ${doctorToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body._id).toEqual(testAppt._id.toString());
            expect(res.body.doctorId._id).toEqual(doctor._id.toString());
        });

        it('should allow admin to get any appointment by ID', async () => {
            const res = await request(app)
                .get(`/api/appointments/${testAppt._id}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body._id).toEqual(testAppt._id.toString());
        });


        it('should return 404 for a non-existent appointment ID', async () => {
            const invalidId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .get(`/api/appointments/${invalidId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toEqual(404);
            expect(res.body.message).toEqual('Appointment not found');
        });

        it('should return 400 for an invalid appointment ID format', async () => {
            const res = await request(app)
                .get('/api/appointments/invalid-id')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toEqual(400);
            expect(res.body.message).toEqual('Invalid appointment ID');
        });
    });

    // --- PUT /api/appointments/:id ---
    describe('PUT /api/appointments/:id', () => {
         let apptToUpdate;

         beforeEach(async () => {
             // Create a fresh appointment for each PUT test
             apptToUpdate = await createAppointment({
                 patientId: patient._id,
                 doctorId: doctor._id,
                 availability: availability1._id,
                 serviceType: 'Initial Service',
                 status: 'scheduled'
             });
             await Availability.findByIdAndUpdate(availability1._id, { isBooked: true });
         });

         afterEach(async () => {
             // Clean up the appointment and availability slot
             if (apptToUpdate) await Appointment.findByIdAndDelete(apptToUpdate._id);
             await Availability.findByIdAndUpdate(availability1._id, { isBooked: false });
             await Availability.findByIdAndUpdate(availability2._id, { isBooked: false }); // Ensure second slot is also free
         });

        it('should allow admin to update status, serviceType, and availability', async () => {
            const res = await request(app)
                .put(`/api/appointments/${apptToUpdate._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    status: 'completed',
                    serviceType: 'Admin Updated Service',
                    availabilityId: availability2._id.toString() // Change to the other slot
                });

            expect(res.statusCode).toEqual(200);
            expect(res.body._id).toEqual(apptToUpdate._id.toString());
            expect(res.body.status).toEqual('completed');
            expect(res.body.serviceType).toEqual('Admin Updated Service');
            expect(res.body.availability._id).toEqual(availability2._id.toString());

            // Verify availability changes
            const oldSlot = await Availability.findById(availability1._id);
            const newSlot = await Availability.findById(availability2._id);
            expect(oldSlot.isBooked).toBe(false);
            expect(newSlot.isBooked).toBe(true);
        });

        it('should allow doctor to confirm a scheduled appointment', async () => {
            const res = await request(app)
                .put(`/api/appointments/${apptToUpdate._id}`)
                .set('Authorization', `Bearer ${doctorToken}`)
                .send({ status: 'confirmed' });

            expect(res.statusCode).toEqual(200);
            expect(res.body.status).toEqual('confirmed');
            const updatedAppt = await Appointment.findById(apptToUpdate._id);
            expect(updatedAppt.status).toEqual('confirmed');
        });

         it('should allow doctor to cancel a scheduled appointment', async () => {
            const res = await request(app)
                .put(`/api/appointments/${apptToUpdate._id}`)
                .set('Authorization', `Bearer ${doctorToken}`)
                .send({ status: 'cancelled' });

            expect(res.statusCode).toEqual(200);
            expect(res.body.status).toEqual('cancelled');
            const updatedAppt = await Appointment.findById(apptToUpdate._id);
             expect(updatedAppt.status).toEqual('cancelled');

            // Verify availability is unbooked
            const slot = await Availability.findById(availability1._id);
            expect(slot.isBooked).toBe(false);
        });

        it('should allow patient to cancel a scheduled appointment', async () => {
            const res = await request(app)
                .put(`/api/appointments/${apptToUpdate._id}`)
                .set('Authorization', `Bearer ${patientToken}`)
                .send({ status: 'cancelled' });

            expect(res.statusCode).toEqual(200);
            expect(res.body.status).toEqual('cancelled');
            const updatedAppt = await Appointment.findById(apptToUpdate._id);
            expect(updatedAppt.status).toEqual('cancelled');

             // Verify availability is unbooked
            const slot = await Availability.findById(availability1._id);
            expect(slot.isBooked).toBe(false);
        });

        it('should prevent patient from confirming an appointment', async () => {
            const res = await request(app)
                .put(`/api/appointments/${apptToUpdate._id}`)
                .set('Authorization', `Bearer ${patientToken}`)
                .send({ status: 'confirmed' });

            expect(res.statusCode).toEqual(403);
            expect(res.body.message).toContain('Forbidden: Your role (patient) cannot change status to \'confirmed\'');
        });

        it('should prevent doctor from changing status to scheduled', async () => {
            // First, confirm it
            await Appointment.findByIdAndUpdate(apptToUpdate._id, { status: 'confirmed' });

            const res = await request(app)
                .put(`/api/appointments/${apptToUpdate._id}`)
                .set('Authorization', `Bearer ${doctorToken}`)
                .send({ status: 'scheduled' });

            expect(res.statusCode).toEqual(403);
            expect(res.body.message).toContain('Forbidden: Your role (doctor) cannot change status to \'scheduled\'');
        });


        it('should prevent updating a non-existent appointment', async () => {
            const invalidId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .put(`/api/appointments/${invalidId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'completed' });

            expect(res.statusCode).toEqual(404);
             expect(res.body.message).toEqual('Appointment not found');
        });

         it('should prevent updating with an invalid ID format', async () => {
             const res = await request(app)
                 .put('/api/appointments/invalid-id')
                 .set('Authorization', `Bearer ${adminToken}`)
                 .send({ status: 'completed' });

             expect(res.statusCode).toEqual(400);
             expect(res.body.message).toEqual('Invalid appointment ID');
         });

         it('should prevent updating with an invalid status', async () => {
             const res = await request(app)
                 .put(`/api/appointments/${apptToUpdate._id}`)
                 .set('Authorization', `Bearer ${adminToken}`)
                 .send({ status: 'invalid-status' });

             expect(res.statusCode).toEqual(400);
             expect(res.body.message).toEqual('Invalid appointment status provided');
         });

         it('should prevent admin from updating availability to an already booked slot', async () => {
             // Make availability2 booked by another appointment
             const tempAppt = await createAppointment({ patientId: patient._id, doctorId: doctor._id, availability: availability2._id, serviceType: 'Temp', status: 'scheduled'});
             await Availability.findByIdAndUpdate(availability2._id, { isBooked: true });

             const res = await request(app)
                 .put(`/api/appointments/${apptToUpdate._id}`) // Try to move apptToUpdate to availability2
                 .set('Authorization', `Bearer ${adminToken}`)
                 .send({ availabilityId: availability2._id.toString() });

             expect(res.statusCode).toEqual(400);
             expect(res.body.message).toEqual('The new availability slot is already booked.');

             // Clean up temporary appointment
             await Appointment.findByIdAndDelete(tempAppt._id);
             await Availability.findByIdAndUpdate(availability2._id, { isBooked: false });
         });

         it('should prevent doctor/patient from updating availability', async () => {
            const resPatient = await request(app)
                 .put(`/api/appointments/${apptToUpdate._id}`)
                 .set('Authorization', `Bearer ${patientToken}`)
                 .send({ availabilityId: availability2._id.toString() });

             expect(resPatient.statusCode).toEqual(403);
             expect(resPatient.body.message).toEqual('Forbidden: You cannot change the appointment time slot.');

             const resDoctor = await request(app)
                 .put(`/api/appointments/${apptToUpdate._id}`)
                 .set('Authorization', `Bearer ${doctorToken}`)
                 .send({ availabilityId: availability2._id.toString() });

             expect(resDoctor.statusCode).toEqual(403);
             expect(resDoctor.body.message).toEqual('Forbidden: You cannot change the appointment time slot.');
         });

         it('should prevent doctor/patient from updating serviceType', async () => {
            const resPatient = await request(app)
                 .put(`/api/appointments/${apptToUpdate._id}`)
                 .set('Authorization', `Bearer ${patientToken}`)
                 .send({ serviceType: "PatientUpdate" });

             expect(resPatient.statusCode).toEqual(403);
             expect(resPatient.body.message).toEqual('Forbidden: You cannot change the service type.');

             const resDoctor = await request(app)
                 .put(`/api/appointments/${apptToUpdate._id}`)
                 .set('Authorization', `Bearer ${doctorToken}`)
                 .send({ serviceType: "DoctorUpdate" });

             expect(resDoctor.statusCode).toEqual(403);
             expect(resDoctor.body.message).toEqual('Forbidden: You cannot change the service type.');
         });
    });

     // --- DELETE /api/appointments/:id ---
    describe('DELETE /api/appointments/:id', () => {
        let apptToDelete;

        beforeEach(async () => {
            // Create an appointment to delete
            apptToDelete = await createAppointment({
                patientId: patient._id,
                doctorId: doctor._id,
                availability: availability1._id,
                serviceType: 'To Delete',
                status: 'scheduled'
            });
            await Availability.findByIdAndUpdate(availability1._id, { isBooked: true });
        });

        afterEach(async () => {
            // Ensure cleanup even if test fails
            if (apptToDelete) await Appointment.findByIdAndDelete(apptToDelete._id);
            await Availability.findByIdAndUpdate(availability1._id, { isBooked: false });
        });

        it('should allow admin to delete any appointment', async () => {
            const res = await request(app)
                .delete(`/api/appointments/${apptToDelete._id}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.message).toEqual('Appointment deleted successfully');

            const deleted = await Appointment.findById(apptToDelete._id);
            expect(deleted).toBeNull();

            const slot = await Availability.findById(availability1._id);
            expect(slot.isBooked).toBe(false);
            apptToDelete = null; // Prevent double deletion in afterEach
        });

        it('should allow patient to delete their own scheduled appointment', async () => {
            // Note: Controller/Route logic might restrict deletion based on status or role,
            // but current route allows patient delete. Let's test it.
            const res = await request(app)
                .delete(`/api/appointments/${apptToDelete._id}`)
                .set('Authorization', `Bearer ${patientToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.message).toEqual('Appointment deleted successfully');

            const deleted = await Appointment.findById(apptToDelete._id);
            expect(deleted).toBeNull();

            const slot = await Availability.findById(availability1._id);
            expect(slot.isBooked).toBe(false);
            apptToDelete = null;
        });

        it('should allow doctor to delete their own scheduled appointment', async () => {
             // Similar to patient, testing the allowed route
            const res = await request(app)
                .delete(`/api/appointments/${apptToDelete._id}`)
                .set('Authorization', `Bearer ${doctorToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.message).toEqual('Appointment deleted successfully');

            const deleted = await Appointment.findById(apptToDelete._id);
            expect(deleted).toBeNull();

            const slot = await Availability.findById(availability1._id);
            expect(slot.isBooked).toBe(false);
            apptToDelete = null;
        });

        it('should prevent deleting a non-existent appointment', async () => {
            const invalidId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .delete(`/api/appointments/${invalidId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toEqual(404);
             expect(res.body.message).toEqual('Appointment not found');
        });

         it('should prevent deleting with an invalid ID format', async () => {
             const res = await request(app)
                 .delete('/api/appointments/invalid-id')
                 .set('Authorization', `Bearer ${adminToken}`);

             expect(res.statusCode).toEqual(400);
             expect(res.body.message).toEqual('Invalid appointment ID');
         });

         it('should unbook availability when deleting a scheduled appointment', async () => {
             await request(app)
                 .delete(`/api/appointments/${apptToDelete._id}`)
                 .set('Authorization', `Bearer ${adminToken}`);

             const slot = await Availability.findById(availability1._id);
             expect(slot.isBooked).toBe(false);
             apptToDelete = null; // Avoid duplicate delete in afterEach
         });

         it('should NOT unbook availability when deleting an already cancelled appointment', async () => {
             // First, cancel the appointment
             await Appointment.findByIdAndUpdate(apptToDelete._id, { status: 'cancelled' });
             // Manually unbook the slot as cancellation should do
             await Availability.findByIdAndUpdate(availability1._id, { isBooked: false });

             const res = await request(app)
                 .delete(`/api/appointments/${apptToDelete._id}`)
                 .set('Authorization', `Bearer ${adminToken}`);

             expect(res.statusCode).toEqual(200);

             const slot = await Availability.findById(availability1._id);
             expect(slot.isBooked).toBe(false); // Should remain unbooked
             apptToDelete = null;
         });
    });
});