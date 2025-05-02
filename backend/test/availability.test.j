// File: test/availability.test.js
// Location: test/availability.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server'); // Adjust path if your server file is elsewhere
const User = require('../models/User');
const Availability = require('../models/Availability');
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

// --- Test Suite ---
describe('Availability API Routes', () => {
    let doctor, otherDoctor, patient, admin;
    let doctorToken, otherDoctorToken, patientToken, adminToken;
    let availability1, availability2;

    const getTomorrowTime = (hour, minute = 0) => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(hour, minute, 0, 0);
        return tomorrow;
    }

    beforeAll(async () => {
        await User.deleteMany({});
        await Availability.deleteMany({});

        doctor = await createUser({ firstName: 'Ava', lastName: 'Doctor', email: 'ava.doc@test.com', role: 'doctor', specialization: 'Cardiology' });
        otherDoctor = await createUser({ firstName: 'Other', lastName: 'Doctor', email: 'other.doc@test.com', role: 'doctor', specialization: 'Dermatology' });
        patient = await createUser({ firstName: 'Ava', lastName: 'Patient', email: 'ava.patient@test.com', role: 'patient' });
        admin = await createUser({ firstName: 'Ava', lastName: 'Admin', email: 'ava.admin@test.com', role: 'admin' });

        doctorToken = generateToken(doctor);
        otherDoctorToken = generateToken(otherDoctor);
        patientToken = generateToken(patient);
        adminToken = generateToken(admin);

        // Pre-create some availability for GET/PUT/DELETE tests
        availability1 = await createAvailability({
            doctorId: doctor._id,
            startTime: getTomorrowTime(9),
            endTime: getTomorrowTime(9, 30),
            dayOfWeek: 'Thursday', // Adjust if needed
            isBooked: false
        });
        availability2 = await createAvailability({
            doctorId: doctor._id,
            startTime: getTomorrowTime(14),
            endTime: getTomorrowTime(14, 30),
            dayOfWeek: 'Thursday',
            isBooked: true // This one is booked
        });
    });

    afterAll(async () => {
        await User.deleteMany({});
        await Availability.deleteMany({});
    });

    // --- POST /api/availability ---
    describe('POST /api/availability', () => {
         let createdAvailabilityId;

         afterEach(async () => {
             if (createdAvailabilityId) {
                 await Availability.findByIdAndDelete(createdAvailabilityId);
                 createdAvailabilityId = null;
             }
         });

        it('should allow a doctor to create an availability slot', async () => {
            const startTime = getTomorrowTime(10);
            const endTime = getTomorrowTime(10, 30);
            const res = await request(app)
                .post('/api/availability')
                .set('Authorization', `Bearer ${doctorToken}`)
                .send({
                    startTime: startTime.toISOString(),
                    endTime: endTime.toISOString(),
                    dayOfWeek: 'Thursday'
                });

            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('_id');
            expect(res.body.doctorId).toEqual(doctor._id.toString());
            expect(new Date(res.body.startTime)).toEqual(startTime);
            expect(res.body.dayOfWeek).toEqual('Thursday');
            expect(res.body.isBooked).toBe(false);
            createdAvailabilityId = res.body._id;
        });

        it('should prevent creating an overlapping slot (within 5 mins)', async () => {
             // Overlaps with availability1 (starts 9:00)
            const startTime = getTomorrowTime(9, 4); // Starts 4 mins after availability1 starts
            const endTime = getTomorrowTime(9, 34);
            const res = await request(app)
                .post('/api/availability')
                .set('Authorization', `Bearer ${doctorToken}`)
                .send({
                    startTime: startTime.toISOString(),
                    endTime: endTime.toISOString(),
                    dayOfWeek: 'Thursday'
                });

            expect(res.statusCode).toEqual(400);
            expect(res.body.message).toContain('Cannot create availability within 5 minutes');
        });


        it('should prevent creating a slot with missing startTime', async () => {
            const endTime = getTomorrowTime(12, 30);
            const res = await request(app)
                .post('/api/availability')
                .set('Authorization', `Bearer ${doctorToken}`)
                .send({
                    endTime: endTime.toISOString(),
                    dayOfWeek: 'Friday'
                });

            expect(res.statusCode).toEqual(400);
            expect(res.body.message).toEqual('Start time and end time are required');
        });

         it('should prevent creating a slot with missing endTime', async () => {
            const startTime = getTomorrowTime(12);
            const res = await request(app)
                .post('/api/availability')
                .set('Authorization', `Bearer ${doctorToken}`)
                .send({
                    startTime: startTime.toISOString(),
                    dayOfWeek: 'Friday'
                });

            expect(res.statusCode).toEqual(400);
             expect(res.body.message).toEqual('Start time and end time are required');
        });

        it('should prevent patient from creating an availability slot', async () => {
            const startTime = getTomorrowTime(13);
            const endTime = getTomorrowTime(13, 30);
            const res = await request(app)
                .post('/api/availability')
                .set('Authorization', `Bearer ${patientToken}`)
                .send({
                    startTime: startTime.toISOString(),
                    endTime: endTime.toISOString(),
                    dayOfWeek: 'Friday'
                });

            expect(res.statusCode).toEqual(403); // Forbidden due to role check
        });

        it('should prevent admin from creating an availability slot', async () => {
             const startTime = getTomorrowTime(13);
            const endTime = getTomorrowTime(13, 30);
            const res = await request(app)
                .post('/api/availability')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    startTime: startTime.toISOString(),
                    endTime: endTime.toISOString(),
                    dayOfWeek: 'Friday'
                });

            expect(res.statusCode).toEqual(403); // Forbidden due to role check
        });
    });

    // --- GET /api/availability ---
    describe('GET /api/availability', () => {
        it('should allow admin to get all availabilities', async () => {
            const res = await request(app)
                .get('/api/availability')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(2); // At least the two created in beforeAll
        });

        it('should allow doctor to get all availabilities', async () => {
            const res = await request(app)
                .get('/api/availability')
                .set('Authorization', `Bearer ${doctorToken}`);
            expect(res.statusCode).toEqual(200);
            expect(Array.isArray(res.body)).toBe(true);
             expect(res.body.length).toBeGreaterThanOrEqual(2);
        });

        it('should prevent patient from getting all availabilities', async () => {
            const res = await request(app)
                .get('/api/availability')
                .set('Authorization', `Bearer ${patientToken}`);
            expect(res.statusCode).toEqual(403); // Forbidden by authorizeRole
        });
    });

    // --- GET /api/availability/me ---
    describe('GET /api/availability/me', () => {
        it('should allow a doctor to get their own availabilities', async () => {
            const res = await request(app)
                .get('/api/availability/me')
                .set('Authorization', `Bearer ${doctorToken}`);
            expect(res.statusCode).toEqual(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(2);
            expect(res.body.every(a => a.doctorId === doctor._id.toString())).toBe(true);
        });

        it('should prevent patient from using /me', async () => {
            const res = await request(app)
                .get('/api/availability/me')
                .set('Authorization', `Bearer ${patientToken}`);
            expect(res.statusCode).toEqual(403);
        });

        it('should prevent admin from using /me', async () => {
            const res = await request(app)
                .get('/api/availability/me')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(403);
        });
    });

    // --- GET /api/availability/doctor/:doctorId ---
    describe('GET /api/availability/doctor/:doctorId', () => {
        it('should allow patient to get availabilities for a specific doctor', async () => {
            const res = await request(app)
                .get(`/api/availability/doctor/${doctor._id}`)
                .set('Authorization', `Bearer ${patientToken}`);
            expect(res.statusCode).toEqual(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(2);
            expect(res.body.every(a => a.doctorId === doctor._id.toString())).toBe(true);
        });

        it('should allow admin to get availabilities for a specific doctor', async () => {
            const res = await request(app)
                .get(`/api/availability/doctor/${doctor._id}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(2);
            expect(res.body.every(a => a.doctorId === doctor._id.toString())).toBe(true);
        });

        it('should return empty array for a doctor with no availabilities', async () => {
             // Use otherDoctor who has no availabilities created yet
            const res = await request(app)
                .get(`/api/availability/doctor/${otherDoctor._id}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toEqual(0);
        });

         it('should return 400 for an invalid doctor ID format', async () => {
            const res = await request(app)
                .get('/api/availability/doctor/invalid-id')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(400);
            expect(res.body.message).toEqual('Invalid doctor ID');
        });
    });

    // --- GET /api/availability/:id ---
    describe('GET /api/availability/:id', () => {
        it('should allow doctor to get their own availability by ID', async () => {
            const res = await request(app)
                .get(`/api/availability/${availability1._id}`)
                .set('Authorization', `Bearer ${doctorToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body._id).toEqual(availability1._id.toString());
            expect(res.body.doctorId).toEqual(doctor._id.toString());
        });

        it('should allow admin to get any availability by ID', async () => {
            const res = await request(app)
                .get(`/api/availability/${availability1._id}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body._id).toEqual(availability1._id.toString());
        });

        it('should prevent patient from getting availability by ID', async () => {
            const res = await request(app)
                .get(`/api/availability/${availability1._id}`)
                .set('Authorization', `Bearer ${patientToken}`);
            expect(res.statusCode).toEqual(403);
        });

        it('should return 404 for non-existent availability ID', async () => {
            const invalidId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .get(`/api/availability/${invalidId}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(404);
             expect(res.body.message).toEqual('Availability not found');
        });

        it('should return 400 for invalid availability ID format', async () => {
            const res = await request(app)
                .get('/api/availability/invalid-id')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(400);
            expect(res.body.message).toEqual('Invalid availability ID');
        });
    });

    // --- PUT /api/availability/:id ---
    describe('PUT /api/availability/:id', () => {
         let avaToUpdate;
         beforeEach(async ()=>{
            // Create a fresh one for each test to avoid side effects
            avaToUpdate = await createAvailability({
                doctorId: doctor._id,
                startTime: getTomorrowTime(15),
                endTime: getTomorrowTime(15, 30),
                dayOfWeek: 'Friday',
                isBooked: false
            });
         });
         afterEach(async ()=>{
            if(avaToUpdate) await Availability.findByIdAndDelete(avaToUpdate._id);
         })

        it('should allow doctor to update their own availability', async () => {
            const newStartTime = getTomorrowTime(16);
            const newEndTime = getTomorrowTime(16, 45);
            const res = await request(app)
                .put(`/api/availability/${avaToUpdate._id}`)
                .set('Authorization', `Bearer ${doctorToken}`)
                .send({
                    startTime: newStartTime.toISOString(),
                    endTime: newEndTime.toISOString(),
                    dayOfWeek: 'Saturday',
                    isBooked: true
                });

            expect(res.statusCode).toEqual(200);
            expect(new Date(res.body.startTime)).toEqual(newStartTime);
            expect(new Date(res.body.endTime)).toEqual(newEndTime);
            expect(res.body.dayOfWeek).toEqual('Saturday');
            expect(res.body.isBooked).toBe(true);
        });


        it('should prevent doctor updating slot causing overlap', async () => {
            // Try to update avaToUpdate (15:00 Fri) to overlap availability1 (9:00 Thu) - need same day
            await Availability.findByIdAndUpdate(avaToUpdate._id, {dayOfWeek: 'Thursday'});

            const res = await request(app)
                .put(`/api/availability/${avaToUpdate._id}`)
                .set('Authorization', `Bearer ${doctorToken}`)
                .send({
                    startTime: getTomorrowTime(9, 2).toISOString() // Overlaps 9:00 start of availability1
                });

            expect(res.statusCode).toEqual(400);
            expect(res.body.message).toContain('Cannot update availability within 5 minutes');
         });

        it('should prevent doctor from updating another doctor\'s availability', async () => {
             // create availability for otherDoctor
            const otherAva = await createAvailability({ doctorId: otherDoctor._id, startTime: getTomorrowTime(11), endTime: getTomorrowTime(11, 30), dayOfWeek: 'Monday'});
            const res = await request(app)
                .put(`/api/availability/${otherAva._id}`)
                .set('Authorization', `Bearer ${doctorToken}`) // Main doctor tries to update other doctor's slot
                .send({ isBooked: true });

            expect(res.statusCode).toEqual(403);
            expect(res.body.message).toEqual('Not authorized to update this availability');
             await Availability.findByIdAndDelete(otherAva._id); // cleanup
        });

        it('should prevent patient from updating availability', async () => {
            const res = await request(app)
                .put(`/api/availability/${avaToUpdate._id}`)
                .set('Authorization', `Bearer ${patientToken}`)
                .send({ isBooked: true });
            expect(res.statusCode).toEqual(403);
        });

        it('should return 404 when updating non-existent availability', async () => {
             const invalidId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .put(`/api/availability/${invalidId}`)
                .set('Authorization', `Bearer ${doctorToken}`)
                .send({ isBooked: true });
            expect(res.statusCode).toEqual(404);
            expect(res.body.message).toEqual('Availability not found');
        });

        it('should return 400 for invalid ID format during update', async () => {
            const res = await request(app)
                .put('/api/availability/invalid-id')
                .set('Authorization', `Bearer ${doctorToken}`)
                .send({ isBooked: true });
            expect(res.statusCode).toEqual(400);
            expect(res.body.message).toEqual('Invalid availability ID');
        });
    });

    // --- DELETE /api/availability/:id ---
    describe('DELETE /api/availability/:id', () => {
        let avaToDelete;
        beforeEach(async ()=>{
           // Create a fresh one for each test to avoid side effects
           avaToDelete = await createAvailability({
               doctorId: doctor._id,
               startTime: getTomorrowTime(18),
               endTime: getTomorrowTime(18, 30),
               dayOfWeek: 'Sunday',
               isBooked: false
           });
        });
        // afterEach handled by beforeAll/afterAll cleanuo

        it('should allow doctor to delete their own availability', async () => {
            const res = await request(app)
                .delete(`/api/availability/${avaToDelete._id}`)
                .set('Authorization', `Bearer ${doctorToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.message).toEqual('Availability deleted successfully');
            const deleted = await Availability.findById(avaToDelete._id);
            expect(deleted).toBeNull();
        });


        it('should prevent doctor from deleting another doctor\'s availability', async () => {
             // create availability for otherDoctor
            const otherAva = await createAvailability({ doctorId: otherDoctor._id, startTime: getTomorrowTime(11), endTime: getTomorrowTime(11, 30), dayOfWeek: 'Monday'});
            const res = await request(app)
                .delete(`/api/availability/${otherAva._id}`)
                .set('Authorization', `Bearer ${doctorToken}`); // Main doctor tries to delete

            expect(res.statusCode).toEqual(403);
            expect(res.body.message).toEqual('Not authorized to delete this availability');
            await Availability.findByIdAndDelete(otherAva._id); // cleanup
        });

        it('should prevent patient from deleting availability', async () => {
            const res = await request(app)
                .delete(`/api/availability/${avaToDelete._id}`)
                .set('Authorization', `Bearer ${patientToken}`);
            expect(res.statusCode).toEqual(403);
        });

        it('should return 404 when deleting non-existent availability', async () => {
            const invalidId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .delete(`/api/availability/${invalidId}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(404);
             expect(res.body.message).toEqual('Availability not found');
        });

        it('should return 400 for invalid ID format during delete', async () => {
             const res = await request(app)
                .delete('/api/availability/invalid-id')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(400);
            expect(res.body.message).toEqual('Invalid availability ID');
        });
    });
});