const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');

// API Routes
const API_ROUTES = {
  REGISTER: '/api/users/register',
  LOGIN: '/api/users/login',
  USERS: '/api/users'
};

let emailCounter = 1;

function generateUniqueEmail(prefix = 'test') {
  return `${prefix}.${emailCounter++}@example.com`;
}

async function createTestUser(customData = {}) {
  const defaultUser = {
    firstName: 'Test',
    lastName: 'User',
    email: generateUniqueEmail('admin'),
    password: await bcrypt.hash('password123', 10), // Hash password
    role: 'admin',
    status: 'verified',
    verificationCode: 123456,  // Add verification code
    ...customData
  };
  
  const user = await User.create(defaultUser);
  
  const token = jwt.sign(
    { 
      userId: user._id,
      role: user.role,
      status: user.status  // Include status in token
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
  
  return { user, token };
}

async function createRegularUser(customData = {}) {
  return createTestUser({
    ...customData,
    role: 'student',
    email: generateUniqueEmail('student')
  });
}

module.exports = { 
  createTestUser, 
  createRegularUser, 
  generateUniqueEmail,
  API_ROUTES 
};
