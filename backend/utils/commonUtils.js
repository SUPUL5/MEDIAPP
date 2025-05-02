// backend/utils/commonUtils.js
const validator = require('validator');

const isValidEmail = (email) => {
  return validator.isEmail(email);
};

const isNotEmptyString = (str) => {
    return typeof str === 'string' && str.trim().length > 0;
};

const isValidRole = (role) => {
  const allowedRoles = ['patient', 'doctor', 'admin'];
  return allowedRoles.includes(role);
};

const isValidObjectId = (id) => {
    return validator.isMongoId(id);
}

const isValidDate = (dateString) => {
  try {
    // Use a more robust check, Date.parse returns NaN for invalid dates
    return !isNaN(Date.parse(dateString)) && validator.isISO8601(dateString);
  } catch(err) {
    return false;
  }
};


const isValidTimeString = (timeString) => {
    // This validation was removed as start/end times are now full ISO Dates
    // Keeping the function stubbed out if needed elsewhere, but it's not
    // currently used for availability times.
    return true; // Or implement specific H:i validation if needed elsewhere
}

const isValidDayOfWeek = (day) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days.includes(day);
}

const isValidAppointmentStatus = (status) => {
    // Corrected list based on the Appointment model enum
    const allowedStatus = ['scheduled', 'confirmed', 'cancelled', 'completed'];
    return allowedStatus.includes(status);
}


const isTimeSlotOverlap = (time1, time2, bufferMinutes = 5) => {
    const date1 = new Date(time1);
    const date2 = new Date(time2);

    const diffInMinutes = Math.abs((date1 - date2) / (1000 * 60));

    return diffInMinutes < bufferMinutes;
};

module.exports = {
  isValidEmail,
  isNotEmptyString,
  isValidRole,
  isValidObjectId,
  isValidDate,
  isValidTimeString,
  isValidDayOfWeek,
  isValidAppointmentStatus,
  isTimeSlotOverlap
};