const Appointment = require('../models/Appointment');

const generateQueueNumber = async (doctorId, date) => {
  // Set start and end of the day for the given date
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Find highest queue number for this doctor on this day
  const latestAppointment = await Appointment.findOne({
    doctorId,
    date: { $gte: startOfDay, $lte: endOfDay },
  })
    .sort({ queueNumber: -1 })
    .limit(1);

  if (latestAppointment && latestAppointment.queueNumber) {
    return latestAppointment.queueNumber + 1;
  }

  // If no appointments today, start at 1
  return 1;
};

module.exports = generateQueueNumber;
