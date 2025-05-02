// models/Appointment.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const appointmentSchema = new Schema({
  _id: {
    type: Schema.Types.ObjectId,
    auto: true,
  },
  patientId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true // Reference to the User model (patient)
  },
  doctorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true // Reference to the User model (doctor)
  },
  availability: { // Added availability reference
    type: Schema.Types.ObjectId,
    ref: 'Availability',
    required: true
  },
  // appointmentDate removed
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'cancelled', 'completed'],
    default: 'scheduled',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  serviceType: {
    type: String,
    required: true
  }
});

// Before saving the appointment, update the 'updatedAt' field
appointmentSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;
