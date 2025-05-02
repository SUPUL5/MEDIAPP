// models/User.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
  _id: {
    type: Schema.Types.ObjectId,
    auto: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true, // Ensures email uniqueness in the database
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
    enum: ['patient','doctor', 'admin'], 
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
   status:{
    type: String,
    enum: ['verified', 'unverified', 'blocked'],
    default: 'unverified',
   },
  specialization: {
    type: String,
    default: null, // doctors specific attribute
  },
   profilePicture: {
        type: String,
        default: null, // Optional
   },
    verificationCode: {
        type: Number,
        default: null
    },
     verificationCodeExpireTime:{
        type: Date,
         default: null
    },
    verificationAttempts:{
        type: Number,
        default: 0,
    },
    resetPasswordCode: {
      type: Number,
        default: null
    },
    refreshToken: {
      type: String,
      default: null
    },
    phone: {
        type: String,
        required: true, // Changed from default: null to required: true
    },
    hospital: {
        type: String,
        default: null, // New field for doctors
    },
    gender: {
        type: String,
        required: true,
        enum: ['male', 'female']
    },
    dateOfBirth: {
        type: Date,
        required: true
    }
});

// Before saving the user, update the 'updatedAt' field
userSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Create the User model
const User = mongoose.model('User', userSchema);

module.exports = User;