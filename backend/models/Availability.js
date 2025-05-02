// models/Availability.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const availabilitySchema = new Schema({
  _id: {
    type: Schema.Types.ObjectId,
    auto: true,
  },
  doctorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true // Reference to the User model (doctor)
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
  dayOfWeek: {
    type: String,
    required: true,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
    isBooked: {
        type: Boolean,
        default: false
    }
});

const Availability = mongoose.model('Availability', availabilitySchema);

module.exports = Availability;
