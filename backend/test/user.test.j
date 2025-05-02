// test/user.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { MongoMemoryServer } = require('mongodb-memory-server'); // Import in-memory server
const app = require('../server'); // Import the Express app instance from server.js
const User = require('../models/User');

// Timers and Timeouts
jest.useRealTimers(); // Use real timers for async operations
const HOOK_TIMEOUT = 60000; // Timeout for beforeAll/afterAll (DB start/stop)
const TEST_TIMEOUT = 30000; // Timeout per test case

let mongod; // Instance of the in-memory MongoDB server
let server; // Instance of the Express HTTP server
let mongoConnection; // Mongoose connection instance

// --- Test Suite Setup & Teardown ---

beforeAll(async () => {
    try {
        // 1. Start the In-Memory MongoDB Server
        console.log('Starting MongoDB Memory Server...');
        mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri(); // Get connection URI
        console.log(`MongoDB Memory Server started at: ${uri}`);

        // 2. Connect Mongoose to the In-Memory Server
        if (mongoose.connection.readyState === 0) {
            console.log('Connecting Mongoose...');
            mongoConnection = await mongoose.connect(uri, {
                // No specific timeouts usually needed for local memory server
                // But keep if you experience issues:
                // serverSelectionTimeoutMS: 10000,
                // socketTimeoutMS: 15000,
            });
            console.log('Mongoose connected to In-Memory DB.');
        } else {
            mongoConnection = mongoose;
            console.log('Mongoose connection potentially already established.');
        }

        // 3. Start the Express Server for Supertest (only if not already listening)
        if (app && typeof app.listen === 'function' && !app.listening) {
            server = app.listen(0); // Listen on random port
            await new Promise((resolve, reject) => {
                server.on('listening', () => {
                    const address = server.address();
                    console.log(`Test Express Server started dynamically on port ${address?.port}`);
                    resolve();
                });
                server.on('error', (error) => {
                    console.error('Test Express Server failed to start:', error);
                    reject(error);
                });
            });
        } else if (app && app.listening) {
            server = app; // Use the already running server instance
            console.log('Using pre-existing listening server instance for tests.');
        } else {
            throw new Error("Could not obtain a listening Express server instance from server.js");
        }

        // Brief pause to ensure everything is settled (optional)
        // await new Promise(resolve => setTimeout(resolve, 50));

    } catch (err) {
        console.error("\n⛔️ FATAL ERROR during beforeAll: Setup failed.", err);
        // Attempt cleanup even on setup failure
        if (server && server.close) await server.close();
        if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
        if (mongod) await mongod.stop();
        process.exit(1); // Exit tests if setup fails critically
    }
}, HOOK_TIMEOUT);

// Clear the User collection before each test for isolation
beforeEach(async () => {
    try {
        if (mongoConnection && mongoConnection.connection.readyState === 1) {
            await User.deleteMany({});
        } else {
            console.warn('beforeEach: DB not connected, skipping deleteMany.');
        }
    } catch (error) {
        console.error("⚠️ Error cleaning User collection in beforeEach:", error);
    }
});

// Disconnect Mongoose, Stop MongoDB Memory Server, Stop Express Server
afterAll(async () => {
    console.log('Starting afterAll cleanup...');
    try {
        // 1. Close Express Server
        if (server && typeof server.close === 'function') {
             console.log('Attempting to close test server...');
             await new Promise((resolve, reject) => {
                 server.close((err) => {
                     if (err) {
                         console.error('Error closing test server:', err);
                         // Don't reject, proceed to DB cleanup
                     } else {
                         console.log('Test Server Closed.');
                     }
                     resolve();
                 });
             });
             server = null; // Clear reference
        } else {
            console.log('No active server instance found to close or already closed.');
        }

        // 2. Disconnect Mongoose
        if (mongoConnection && mongoConnection.connection.readyState !== 0) {
            console.log('Disconnecting Mongoose...');
            await mongoConnection.connection.close();
            console.log('Mongoose Disconnected.');
        } else {
             console.log('Mongoose connection already closed or never established.');
        }

        // 3. Stop the In-Memory MongoDB Server
        if (mongod) {
            console.log('Stopping MongoDB Memory Server...');
            await mongod.stop();
            console.log('MongoDB Memory Server Stopped.');
        } else {
             console.log('No MongoDB Memory Server instance found to stop.');
        }

    } catch (err) {
        console.error("⚠️ Error during afterAll cleanup:", err);
    }
    console.log('afterAll Cleanup Finished.');
}, HOOK_TIMEOUT);


// --- Test Cases ---

describe('User API Endpoints', () => {
    const testUser = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test.user@example.com',
        password: 'password123',
        role: 'patient',
        phone: '1234567890',
        gender: 'male',
        dateOfBirth: '1990-01-01T00:00:00.000Z',
    };

    // --- Registration Tests ---
    describe('POST /api/users/register', () => {
        it('should register a new user successfully and return 201', async () => {
            const res = await request(server)
                .post('/api/users/register')
                .send(testUser)
                .expect('Content-Type', /json/)
                .expect(201);

            expect(res.body).toHaveProperty('message', 'User created successfully , please verify your email');
            expect(res.body).toHaveProperty('user');
            expect(res.body.user).toHaveProperty('email', testUser.email);
            expect(res.body.user).toHaveProperty('status', 'unverified');
            expect(res.body.user).not.toHaveProperty('password');
            expect(res.body.user).not.toHaveProperty('verificationCode');
        }, TEST_TIMEOUT);


        it('should return 400 if email format is invalid', async () => {
            await request(server)
                .post('/api/users/register')
                .send({ ...testUser, email: 'not-a-valid-email' })
                .expect(400)
                .expect(res => expect(res.body.message).toBe('Invalid email format'));
        }, TEST_TIMEOUT);

        it('should return 400 if role is invalid', async () => {
            await request(server)
                .post('/api/users/register')
                .send({ ...testUser, role: 'invalidRole' })
                .expect(400)
                .expect(res => expect(res.body.message).toBe('Invalid role'));
        }, TEST_TIMEOUT);

        it('should return 400 if email already exists', async () => {
            await request(server).post('/api/users/register').send(testUser).expect(201);
            const res = await request(server)
                .post('/api/users/register')
                .send(testUser)
                .expect(400);
            expect(res.body).toHaveProperty('message', 'Email already exists');
        }, TEST_TIMEOUT);
    });

    // --- Verification Test ---
    describe('POST /api/users/verify-email', () => {
        it('should verify the email with the correct code and return 200 with tokens', async () => {
            await request(server).post('/api/users/register').send(testUser).expect(201);
            const userFromDb = await User.findOne({ email: testUser.email });
            expect(userFromDb).not.toBeNull();
            const verificationCode = userFromDb.verificationCode;
            expect(verificationCode).toBeDefined();

            const verifyRes = await request(server)
                .post('/api/users/verify-email')
                .send({ email: testUser.email, verificationCode: verificationCode })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(verifyRes.body).toHaveProperty('message', 'Email verified successfully. Logged in.');
            expect(verifyRes.body).toHaveProperty('accessToken');
            expect(verifyRes.body).toHaveProperty('user');
            expect(verifyRes.body.user.status).toBe('verified');
            expect(verifyRes.headers['set-cookie']).toBeDefined();
            expect(verifyRes.headers['set-cookie'][0]).toMatch(/refreshToken=.+/);
            expect(verifyRes.headers['set-cookie'][0]).toMatch(/HttpOnly/);
            expect(verifyRes.headers['set-cookie'][0]).toMatch(/SameSite=Strict/);

            const updatedUserFromDb = await User.findById(userFromDb._id);
            expect(updatedUserFromDb.status).toBe('verified');
            expect(updatedUserFromDb.verificationCode).toBeNull();
            expect(updatedUserFromDb.verificationAttempts).toBe(0);
        }, TEST_TIMEOUT);

        it('should return 400 for invalid verification code', async () => {
            await request(server).post('/api/users/register').send(testUser).expect(201);
            const res = await request(server)
                .post('/api/users/verify-email')
                .send({ email: testUser.email, verificationCode: '000000' })
                .expect(400);
            expect(res.body).toHaveProperty('message', 'Invalid verification code');
            const userFromDb = await User.findOne({ email: testUser.email });
            expect(userFromDb.verificationAttempts).toBe(1);
        }, TEST_TIMEOUT);
    });

    // --- Login Tests ---
    describe('POST /api/users/login', () => {
        let verifiedUser;
        beforeEach(async () => {
            const hashedPassword = await bcrypt.hash(testUser.password, 10);
            verifiedUser = await User.create({
                ...testUser,
                password: hashedPassword,
                status: 'verified',
                verificationCode: null,
                verificationCodeExpireTime: null
            });
        });

        it('should login a verified user successfully and return 200 with tokens', async () => {
            const res = await request(server)
                .post('/api/users/login')
                .send({ email: testUser.email, password: testUser.password })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body).toHaveProperty('accessToken');
            expect(res.body).toHaveProperty('user');
            expect(res.body.user.email).toBe(testUser.email);
            expect(res.body.user.status).toBe('verified');
            expect(res.headers['set-cookie']).toBeDefined();
            expect(res.headers['set-cookie'][0]).toMatch(/refreshToken=.+/);

            const userFromDb = await User.findById(verifiedUser._id);
            expect(userFromDb.refreshToken).toBeDefined();
            expect(userFromDb.refreshToken).not.toBeNull();
        }, TEST_TIMEOUT);

        it('should return 401 for invalid credentials (wrong password)', async () => {
            await request(server)
                .post('/api/users/login')
                .send({ email: testUser.email, password: 'wrongpassword' })
                .expect(401)
                .expect(res => expect(res.body.message).toBe('Invalid credentials'));
        }, TEST_TIMEOUT);

        it('should return 401 for invalid credentials (wrong email)', async () => {
            await request(server)
                .post('/api/users/login')
                .send({ email: 'wrong@example.com', password: testUser.password })
                .expect(401)
                .expect(res => expect(res.body.message).toBe('Invalid credentials'));
        }, TEST_TIMEOUT);

        it('should return 403 if user is unverified', async () => {
            await User.deleteMany({ email: testUser.email });
            const unverifiedPassword = await bcrypt.hash(testUser.password, 10);
            await User.create({ ...testUser, password: unverifiedPassword, status: 'unverified' });
            await request(server)
                .post('/api/users/login')
                .send({ email: testUser.email, password: testUser.password })
                .expect(403)
                .expect(res => expect(res.body.message).toBe('Please verify your email first'));
        }, TEST_TIMEOUT);

        it('should return 403 if user is blocked', async () => {
            verifiedUser.status = 'blocked';
            await verifiedUser.save();
            await request(server)
                .post('/api/users/login')
                .send({ email: testUser.email, password: testUser.password })
                .expect(403)
                .expect(res => expect(res.body.message).toBe('Account is blocked'));
        }, TEST_TIMEOUT);
    });

    // --- Get User By ID (Protected Route Example) ---
    describe('GET /api/users/:id', () => {
        let authToken;
        let userId;
        beforeEach(async () => {
            const hashedPassword = await bcrypt.hash(testUser.password, 10);
            const createdUser = await User.create({
                ...testUser,
                password: hashedPassword,
                status: 'verified',
                verificationCode: null,
                verificationCodeExpireTime: null
            });
            userId = createdUser._id.toString();
            const loginRes = await request(server)
                .post('/api/users/login')
                .send({ email: testUser.email, password: testUser.password });
            authToken = loginRes.body.accessToken;
            expect(authToken).toBeDefined();
        });

        it('should get user details with valid token and return 200', async () => {
            const res = await request(server)
                .get(`/api/users/${userId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect('Content-Type', /json/)
                .expect(200);
            expect(res.body).toHaveProperty('_id', userId);
            expect(res.body).toHaveProperty('email', testUser.email);
            expect(res.body).not.toHaveProperty('password');
            expect(res.body).not.toHaveProperty('refreshToken');
            expect(res.body).not.toHaveProperty('verificationCode');
        }, TEST_TIMEOUT);

        it('should return 401 if no token is provided', async () => {
            await request(server)
                .get(`/api/users/${userId}`)
                .expect(401)
                .expect(res => expect(res.body.message).toBe('No token provided'));
        }, TEST_TIMEOUT);

        it('should return 401 if token is invalid/expired', async () => {
            await request(server)
                .get(`/api/users/${userId}`)
                .set('Authorization', 'Bearer invalidtoken')
                .expect(401)
                .expect(res => expect(res.body.message).toBe('Invalid token'));
        }, TEST_TIMEOUT);

        it('should return 400 for invalid user ID format', async () => {
            await request(server)
                .get('/api/users/invalid-id-format')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(400)
                .expect(res => expect(res.body.message).toBe('Invalid user id'));
        }, TEST_TIMEOUT);

        it('should return 404 if user ID does not exist', async () => {
            const nonExistentId = new mongoose.Types.ObjectId().toString();
            await request(server)
                .get(`/api/users/${nonExistentId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404)
                .expect(res => expect(res.body.message).toBe('User not found'));
        }, TEST_TIMEOUT);
    });

    // --- Refresh Token Test ---
    describe('POST /api/users/refresh-token', () => {
        let validRefreshToken;
        let userId;
        beforeEach(async () => {
            const hashedPassword = await bcrypt.hash(testUser.password, 10);
            const user = await User.create({ ...testUser, password: hashedPassword, status: 'verified' });
            userId = user._id.toString();
            const loginRes = await request(server)
                .post('/api/users/login')
                .send({ email: testUser.email, password: testUser.password });
            const cookieHeader = loginRes.headers['set-cookie'];
            const match = cookieHeader[0].match(/refreshToken=([^;]+);/);
            validRefreshToken = match ? match[1] : null;
            expect(validRefreshToken).toBeDefined();
            expect(validRefreshToken).not.toBeNull();
        });

        it('should issue a new access token with a valid refresh token cookie', async () => {
            const res = await request(server)
                .post('/api/users/refresh-token')
                .set('Cookie', `refreshToken=${validRefreshToken}`)
                .expect('Content-Type', /json/)
                .expect(200);
            expect(res.body).toHaveProperty('accessToken');
            expect(res.body.accessToken).not.toBeNull();
        }, TEST_TIMEOUT);

        it('should return 401 if no refresh token cookie is provided', async () => {
            await request(server)
                .post('/api/users/refresh-token')
                .expect(401)
                .expect(res => expect(res.body.message).toBe('Refresh token required'));
        }, TEST_TIMEOUT);

        it('should return 401 if refresh token is invalid', async () => {
            await request(server)
                .post('/api/users/refresh-token')
                .set('Cookie', 'refreshToken=invalidtokenvalue')
                .expect(401)
                .expect(res => expect(res.body.message).toBe('Invalid refresh token'));
        }, TEST_TIMEOUT);

        it('should return 401 if refresh token does not match any user', async () => {
            await User.findByIdAndUpdate(userId, { refreshToken: null });
            await request(server)
                .post('/api/users/refresh-token')
                .set('Cookie', `refreshToken=${validRefreshToken}`)
                .expect(401)
                .expect(res => expect(res.body.message).toBe('Invalid refresh token'));
        }, TEST_TIMEOUT);
    });

    // --- Logout Test ---
    describe('POST /api/users/logout', () => {
        let authToken;
        let userId;
        beforeEach(async () => {
            const hashedPassword = await bcrypt.hash(testUser.password, 10);
            const user = await User.create({ ...testUser, password: hashedPassword, status: 'verified' });
            userId = user._id.toString();
            const loginRes = await request(server)
                .post('/api/users/login')
                .send({ email: testUser.email, password: testUser.password });
            authToken = loginRes.body.accessToken;
            const userFromDb = await User.findById(userId);
            expect(userFromDb.refreshToken).toBeDefined();
            expect(userFromDb.refreshToken).not.toBeNull();
        });

        it('should logout successfully, clear refresh token cookie and DB token', async () => {
            const res = await request(server)
                .post('/api/users/logout')
                .set('Authorization', `Bearer ${authToken}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body).toHaveProperty('message', 'Logged out successfully');
            expect(res.headers['set-cookie']).toBeDefined();
            expect(res.headers['set-cookie'][0]).toMatch(/refreshToken=;/);
            expect(res.headers['set-cookie'][0]).toMatch(/Expires=Thu, 01 Jan 1970/);

            // Add a slight delay before DB check
            await new Promise(resolve => setTimeout(resolve, 50));
            const updatedUserFromDb = await User.findById(userId);
            expect(updatedUserFromDb.refreshToken).toBeNull();
        }, TEST_TIMEOUT);

        it('should still return 200 even if user is already logged out (no token in DB)', async () => {
            await User.findByIdAndUpdate(userId, { refreshToken: null });
            const res = await request(server)
                .post('/api/users/logout')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(res.body).toHaveProperty('message', 'Logged out successfully');
            expect(res.headers['set-cookie']).toBeDefined();
            expect(res.headers['set-cookie'][0]).toMatch(/refreshToken=;/);
            expect(res.headers['set-cookie'][0]).toMatch(/Expires=Thu, 01 Jan 1970/);
        }, TEST_TIMEOUT);
    });

}); // End describe('User API Endpoints')