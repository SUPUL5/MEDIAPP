// File: test/chat.test.js
// Location: test/chat.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server'); // Adjust path as needed
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const ChatService = require('../gemini/ChatService'); // Import the service to mock

// Mock the ChatService module
jest.mock('../gemini/ChatService');

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
        status: userData.status || 'verified',
        phone: userData.phone || '+1234567890',
        gender: userData.gender || 'male',
        dateOfBirth: userData.dateOfBirth || new Date('1990-01-01'),
    });
    await user.save();
    return user;
};

// --- Test Suite ---
describe('Chat API Route (/api/chat)', () => {
    let patient, doctor, admin;
    let patientToken, doctorToken, adminToken;

    beforeAll(async () => {
        await User.deleteMany({});

        patient = await createUser({ firstName: 'Chat', lastName: 'Patient', email: 'chat.patient@test.com', role: 'patient' });
        doctor = await createUser({ firstName: 'Chat', lastName: 'Doctor', email: 'chat.doctor@test.com', role: 'doctor' });
        admin = await createUser({ firstName: 'Chat', lastName: 'Admin', email: 'chat.admin@test.com', role: 'admin' });

        patientToken = generateToken(patient);
        doctorToken = generateToken(doctor);
        adminToken = generateToken(admin);
    });

     beforeEach(() => {
         // Reset mocks before each test
         ChatService.handleUserMessage.mockClear();
     });

    afterAll(async () => {
        await User.deleteMany({});
    });

    it('should allow a patient to send a message and receive a response', async () => {
        const mockResponse = {
            response: { rawText: 'Hello! How can I help you today?' },
            history: [{ role: 'user', parts: [{text: 'Hi'}] }, { role: 'model', parts: [{text: 'Hello! How can I help you today?'}] }]
        };
        ChatService.handleUserMessage.mockResolvedValue(mockResponse);

        const res = await request(app)
            .post('/api/chat')
            .set('Authorization', `Bearer ${patientToken}`)
            .send({ message: 'Hi' });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual(mockResponse);
        expect(ChatService.handleUserMessage).toHaveBeenCalledTimes(1);
        // Check if user object was passed correctly
        expect(ChatService.handleUserMessage).toHaveBeenCalledWith(
            expect.objectContaining({ _id: patient._id }), // Check for user object with correct ID
            'Hi',
            [] // Initial history is empty
        );
    });

    it('should allow sending message with history', async () => {
        const incomingHistory = [{ role: 'user', parts: [{text: 'Previous message'}] }, { role: 'model', parts: [{text: 'Previous response'}] }];
        const mockResponse = {
            response: { rawText: 'Okay, following up.' },
            history: [...incomingHistory, { role: 'user', parts: [{text: 'Follow up question'}] }, { role: 'model', parts: [{text: 'Okay, following up.'}] }]
        };
        ChatService.handleUserMessage.mockResolvedValue(mockResponse);

        const res = await request(app)
            .post('/api/chat')
            .set('Authorization', `Bearer ${patientToken}`)
            .send({ message: 'Follow up question', history: incomingHistory });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual(mockResponse);
        expect(ChatService.handleUserMessage).toHaveBeenCalledTimes(1);
         expect(ChatService.handleUserMessage).toHaveBeenCalledWith(
            expect.objectContaining({ _id: patient._id }),
            'Follow up question',
            incomingHistory // Check if history was passed
        );
    });

    it('should return 400 if message content is missing or empty', async () => {
        const res1 = await request(app)
            .post('/api/chat')
            .set('Authorization', `Bearer ${patientToken}`)
            .send({});
        expect(res1.statusCode).toEqual(400);
        expect(res1.body.message).toEqual('Message content is required.');

        const res2 = await request(app)
            .post('/api/chat')
            .set('Authorization', `Bearer ${patientToken}`)
            .send({ message: '   ' }); // Empty message
        expect(res2.statusCode).toEqual(400);
        expect(res2.body.message).toEqual('Message content is required.');

        expect(ChatService.handleUserMessage).not.toHaveBeenCalled();
    });

    it('should return 400 if history format is invalid', async () => {
        const res = await request(app)
            .post('/api/chat')
            .set('Authorization', `Bearer ${patientToken}`)
            .send({ message: 'Valid message', history: { invalid: 'format' } }); // Invalid history

        expect(res.statusCode).toEqual(400);
        expect(res.body.message).toEqual('Invalid history format. Expected an array.');
        expect(ChatService.handleUserMessage).not.toHaveBeenCalled();
    });

    it('should return 401 if no authentication token is provided', async () => {
        const res = await request(app)
            .post('/api/chat')
            .send({ message: 'Test' });

        expect(res.statusCode).toEqual(401);
        expect(res.body.message).toEqual('No token provided');
        expect(ChatService.handleUserMessage).not.toHaveBeenCalled();
    });

    it('should return 401 if authentication token is invalid', async () => {
        const invalidToken = 'Bearer invalidtoken123';
        const res = await request(app)
            .post('/api/chat')
            .set('Authorization', invalidToken)
            .send({ message: 'Test' });

        expect(res.statusCode).toEqual(401);
        expect(res.body.message).toEqual('Invalid token');
        expect(ChatService.handleUserMessage).not.toHaveBeenCalled();
    });

    it('should prevent doctor from using the chat route', async () => {
        const res = await request(app)
            .post('/api/chat')
            .set('Authorization', `Bearer ${doctorToken}`)
            .send({ message: 'Test' });

        expect(res.statusCode).toEqual(403);
        expect(res.body.message).toEqual('Unauthorized'); // From authorizeRole middleware
        expect(ChatService.handleUserMessage).not.toHaveBeenCalled();
    });

    it('should prevent admin from using the chat route', async () => {
        const res = await request(app)
            .post('/api/chat')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ message: 'Test' });

        expect(res.statusCode).toEqual(403);
        expect(res.body.message).toEqual('Unauthorized'); // From authorizeRole middleware
        expect(ChatService.handleUserMessage).not.toHaveBeenCalled();
    });

     it('should handle errors from ChatService.handleUserMessage', async () => {
         const errorMessage = 'Gemini API failed';
         ChatService.handleUserMessage.mockRejectedValue(new Error(errorMessage));

         const res = await request(app)
             .post('/api/chat')
             .set('Authorization', `Bearer ${patientToken}`)
             .send({ message: 'Test causing error' });

         expect(res.statusCode).toEqual(500);
         expect(res.body.message).toEqual(errorMessage);
         expect(ChatService.handleUserMessage).toHaveBeenCalledTimes(1);
     });

     it('should handle cases where ChatService returns invalid response structure', async () => {
         // Simulate service returning null or missing 'response'
         ChatService.handleUserMessage.mockResolvedValue(null);

         const res = await request(app)
             .post('/api/chat')
             .set('Authorization', `Bearer ${patientToken}`)
             .send({ message: 'Test' });

         expect(res.statusCode).toEqual(500);
         expect(res.body.message).toEqual('Chat service returned an invalid response.');
         expect(ChatService.handleUserMessage).toHaveBeenCalledTimes(1);
     });
});