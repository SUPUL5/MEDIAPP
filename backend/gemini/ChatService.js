// backend/gemini/ChatService.js
const fs = require('fs').promises;
const path = require('path');
const { generativeModel } = require('./geminiConfig');
const User = require('../models/User');
const Availability = require('../models/Availability');
const Appointment = require('../models/Appointment');
const { isValidObjectId } = require('../utils/commonUtils');
const { Types } = require('mongoose');

let baseInstructionTemplate = null;

// --- Generate Dynamic System Instructions ---
const generateSystemInstruction = async (user) => {
    if (!baseInstructionTemplate) {
        try {
            // Ensure this path correctly points to your instructions file
            const instructionsPath = path.join(__dirname, 'instructions.PROMPT');
            baseInstructionTemplate = await fs.readFile(instructionsPath, 'utf-8');
            console.log("Base Gemini instructions loaded successfully.");
        } catch (error) {
            console.error("FATAL ERROR: Could not load base Gemini instructions:", error);
            // Provide a minimal, safe fallback if loading fails
            baseInstructionTemplate = "You are a helpful medical assistant. Respond clearly and concisely.";
        }
    }
    // Replace placeholder with actual user name or a default
    const userName = user ? `${user.firstName} ${user.lastName}` : 'the user';
    let dynamicInstruction = baseInstructionTemplate.replace(/{{userName}}/g, userName);
    return dynamicInstruction;
};

// --- Function Call Handlers ---

// Helper function to find slots with limit, used internally and publicly
const _findAvailableSlotsInternal = async (doctorId, limit = 15) => {
    if (!isValidObjectId(doctorId)) {
        return { error: "Invalid Doctor ID provided." };
    }
    try {
        const now = new Date();
        // Look ahead a reasonable period, e.g., 2-4 weeks
        const lookAheadDate = new Date(now);
        lookAheadDate.setDate(now.getDate() + 28); // Look 4 weeks ahead

        const slots = await Availability.find({
            doctorId: new Types.ObjectId(doctorId),
            isBooked: false,
            startTime: { $gte: now, $lt: lookAheadDate } // Query slots from now until the look-ahead date
        })
        .sort({ startTime: 1 }) // Ensure chronological order
        .limit(limit) // Apply the specified limit
        .lean(); // Use lean for performance

        return { slots }; // Return the found slots (or empty array)
    } catch (error) {
        console.error(`[ChatService] Error finding slots internally for doctor ${doctorId}:`, error);
        return { error: "Failed to retrieve available slots." };
    }
};


// _findDoctors: Finds doctors, optionally including a few preview slots
const _findDoctors = async (query) => {
    console.log(`[ChatService] Finding doctors with query: ${query || 'None'}`);
    let dbQuery = { role: 'doctor', status: 'verified' }; // Base query for verified doctors
    const searchLimit = 10; // Limit the number of doctors returned

    if (query && typeof query === 'string' && query.trim()) {
        const trimmedQuery = query.trim();
        // Escape regex special characters for safe searching
        const escapedQuery = trimmedQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const queryRegex = new RegExp(escapedQuery, 'i'); // Case-insensitive search

        // Search across multiple relevant fields
        dbQuery.$or = [
             { firstName: queryRegex },
             { lastName: queryRegex },
             { specialization: queryRegex },
             { hospital: queryRegex },
             { 'tags': queryRegex } // Assuming you might add searchable tags later
             // Add other fields if needed, e.g., address components if stored separately
        ];

         // Improved name searching (handles "Dr. First Last", "First Last")
         if (trimmedQuery.includes(' ') || trimmedQuery.toLowerCase().startsWith('dr.')) {
             const nameParts = trimmedQuery.replace(/dr\.?\s*/i, '').split(' ').filter(part => part.length > 0); // Remove "Dr." and empty parts
             const nameRegexes = nameParts.map(part => new RegExp(part.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i'));
              // Add combined name search possibilities if multiple parts exist
              if (nameRegexes.length > 0) {
                   // Match any part in first name OR last name
                  dbQuery.$or.push({ firstName: { $in: nameRegexes } });
                  dbQuery.$or.push({ lastName: { $in: nameRegexes } });
                   // Could add more complex $and clauses for specific first/last name combinations if needed
              }
         }

         // Simple keyword to specialty mapping (expand as needed)
         const lowerQuery = trimmedQuery.toLowerCase();
         const specialtyKeywords = {
             'heart': ['Cardiologist', 'Cardiac Surgeon'],
             'skin': ['Dermatologist'],
             'children': ['Pediatrician'],
             'kidney': ['Nephrologist'],
             'stomach': ['Gastroenterologist'],
             'brain': ['Neurologist'],
             'cancer': ['Oncologist'],
             'bone': ['Orthopedic Surgeon', 'Rheumatologist'],
             'eye': ['Ophthalmologist'],
             'ear': ['Otolaryngologist', 'ENT Specialist'],
             'nose': ['Otolaryngologist', 'ENT Specialist'],
             'throat': ['Otolaryngologist', 'ENT Specialist'],
             'headache': ['Neurologist'],
             // Add more symptom/condition to specialty mappings
         };
         const matchedSpecialties = new Set();
         for (const keyword in specialtyKeywords) {
             if (lowerQuery.includes(keyword)) {
                 specialtyKeywords[keyword].forEach(spec => matchedSpecialties.add(spec));
             }
          }
          // Add matched specialties to the $or query
         if (matchedSpecialties.size > 0) {
             dbQuery.$or.push({ specialization: { $in: Array.from(matchedSpecialties) } });
         }

    } else {
         console.log("[ChatService] No specific query, returning general list of verified doctors.");
    }

    try {
        // Find doctors matching the query, excluding sensitive fields
        const doctors = await User.find(dbQuery)
            .select('-password -refreshToken -verificationCode -verificationCodeExpireTime -verificationAttempts -resetPasswordCode -appointments') // Exclude sensitive/large fields
            .limit(searchLimit)
            .lean(); // Use lean for performance

        console.log(`[ChatService] Found ${doctors.length} doctors matching query.`);

        // For each found doctor, fetch a small number of upcoming slots for preview
        const recommendations = await Promise.all(
            doctors.map(async (doc) => {
                // Fetch only a few slots (e.g., 3) for the preview card
                const slotsResult = await _findAvailableSlotsInternal(doc._id.toString(), 3);
                return {
                    doctor: doc,
                    // Include slots if found, otherwise an empty array
                    availabilitySlots: slotsResult.slots || []
                };
            })
        );

        return { recommendations }; // Return the list of doctors with their preview slots
    } catch (error) {
        console.error("[ChatService] Error finding doctors:", error);
        return { error: "Failed to retrieve doctor recommendations." };
    }
};

// _findAvailableSlots: Public function called by Gemini to get slots for a *specific* doctor
const _findAvailableSlots = async (doctorId) => {
    console.log(`[ChatService] Finding available slots request for doctor ID: ${doctorId}`);
    if (!isValidObjectId(doctorId)) {
        return { error: "Invalid Doctor ID provided." };
    }
    try {
        // Use the internal helper, fetching a standard number of slots (e.g., 15) when explicitly asked
        const result = await _findAvailableSlotsInternal(doctorId, 15); // Fetch more slots for dedicated view
        if (result.error) {
            return result; // Propagate error if internal fetching failed
        }
        console.log(`[ChatService] Found ${result.slots?.length || 0} available slots for explicit request.`);
        // Return the result structured as expected by the prompt definition { foundSlots: Slot[] }
        return { foundSlots: result.slots || [] };
    } catch (error) { // Catch any unexpected error from the caller level
        console.error("[ChatService] Error in _findAvailableSlots wrapper:", error);
        return { error: "Failed to retrieve available slots." };
    }
};


// _createAppointment: Books a specific slot for the user
const _createAppointment = async (availabilityId, userId) => {
     console.log(`[ChatService] Attempting to book slot ID: ${availabilityId} for user ID: ${userId}`);
    if (!isValidObjectId(availabilityId) || !isValidObjectId(userId)) {
        return { error: "Invalid Slot or User ID provided." };
    }

    // Consider using a database transaction here if your DB supports it (e.g., MongoDB replica sets)
    // to ensure atomicity between finding/updating availability and creating the appointment.
    // const session = await mongoose.startSession();
    // session.startTransaction();

    try {
        // Find the availability slot, ensuring it's for the correct ID and *not already booked*
        const availability = await Availability.findById(availabilityId); // Add .session(session) if using transactions

        if (!availability) {
            // await session.abortTransaction(); session.endSession(); // Abort transaction
            return { error: 'Availability slot not found.' };
        }
        if (availability.isBooked) {
             // await session.abortTransaction(); session.endSession(); // Abort transaction
            return { error: 'Sorry, this time slot has just been booked by someone else. Please select another.' };
        }
        if (new Date(availability.startTime) < new Date()) {
             // await session.abortTransaction(); session.endSession(); // Abort transaction
            return { error: 'This time slot is in the past and cannot be booked.' };
        }

        // Mark the slot as booked
        availability.isBooked = true;
        await availability.save(); // Add { session } if using transactions

        // Create the new appointment record
        const newAppointment = new Appointment({
            patientId: new Types.ObjectId(userId),
            doctorId: availability.doctorId, // Get doctorId from the availability slot
            availability: new Types.ObjectId(availabilityId),
            serviceType: 'Consultation', // Default or derive from context if needed
            status: 'scheduled' // Initial status
        });
        const savedAppointment = await newAppointment.save(); // Add { session } if using transactions

        // If using transactions:
        // await session.commitTransaction();
        // session.endSession();

        // Populate the created appointment with details for the response
        const populatedAppointment = await Appointment.findById(savedAppointment._id)
            .populate('patientId', 'firstName lastName email phone profilePicture') // Select fields for patient
            .populate('doctorId', 'firstName lastName specialization hospital phone profilePicture') // Select fields for doctor
            .populate('availability') // Include the booked slot details
            .lean();

        console.log(`[ChatService] Appointment created successfully: ${populatedAppointment?._id}`);
        if (!populatedAppointment) {
            // This case is unlikely if save succeeded but good practice to check
            throw new Error("Failed to retrieve populated appointment after creation.");
        }

        // Return the created appointment as per the prompt definition
        return { createdAppointment: populatedAppointment };

    } catch (error) {
        console.error("[ChatService] Error creating appointment:", error);

        // If using transactions:
        // await session.abortTransaction();
        // session.endSession();

        // Attempt to rollback the availability booking status if an error occurred *after* it was set to true
        try {
            const checkAvailability = await Availability.findById(availabilityId);
            // Only revert if it's currently marked as booked (by this failed attempt)
            if (checkAvailability && checkAvailability.isBooked) {
                 // Check if an appointment actually got created referencing this slot
                 const existingAppointment = await Appointment.findOne({ availability: availabilityId, status: { $ne: 'cancelled' } });
                 if (!existingAppointment) { // Only revert if no valid appointment exists for it
                     await Availability.findByIdAndUpdate(availabilityId, { isBooked: false });
                     console.log(`[ChatService] Reverted booking status for ${availabilityId} due to appointment creation error.`);
                 }
            }
        } catch (revertError) {
            // Log critical failure if rollback fails
            console.error("[ChatService] CRITICAL: Failed to revert availability booking status after appointment error:", revertError);
        }

        return { error: `Booking failed. ${error.message || 'Please try again.'}` };
    }
};

// _findMyAppointments: Finds appointments for the current user
const _findMyAppointments = async (userId, statusFilter = 'upcoming') => {
    console.log(`[ChatService] Finding appointments for user ${userId} with filter: ${statusFilter}`);
    if (!isValidObjectId(userId)) {
        return { error: "Invalid User ID provided." };
    }

    try {
        const baseQuery = { patientId: new Types.ObjectId(userId) };
        const now = new Date();

        // Define status groups for filters
        const upcomingStatuses = ['scheduled', 'confirmed'];
        const pastStatuses = ['completed', 'cancelled']; // Define 'past' based on your app's logic

        let statusesToQuery = [];

        // Determine which statuses to include based on the filter
        if (statusFilter === 'upcoming') {
            statusesToQuery = upcomingStatuses;
        } else if (statusFilter === 'past') {
            statusesToQuery = pastStatuses;
        } else if (statusFilter && statusFilter !== 'all') {
            // Allow filtering by a specific status if provided and valid
            if (['scheduled', 'confirmed', 'cancelled', 'completed'].includes(statusFilter)) {
                 statusesToQuery = [statusFilter];
            } else {
                 console.warn(`[ChatService] Invalid status filter provided: ${statusFilter}. Defaulting to upcoming.`);
                 statusesToQuery = upcomingStatuses; // Default to upcoming if invalid status given
            }
        } else if (statusFilter === 'all') {
             statusesToQuery = ['scheduled', 'confirmed', 'cancelled', 'completed'];
        } else {
             // Default case (no filter or unrecognized) -> 'upcoming'
             statusesToQuery = upcomingStatuses;
        }

        if (statusesToQuery.length > 0) {
            baseQuery.status = { $in: statusesToQuery };
        }
        // If statusesToQuery is empty (e.g., invalid filter handled above resulted in empty),
        // the query might fetch nothing or everything depending on other conditions. Added default above.

        // We need to query Appointments first, then filter by populated availability time if needed.
        const appointments = await Appointment.find(baseQuery)
            .populate('patientId', 'firstName lastName email phone profilePicture')
            .populate('doctorId', 'firstName lastName specialization hospital phone profilePicture')
            .populate('availability') // Essential for time-based filtering and sorting
            .lean();

        // Filter further based on time if 'upcoming' or 'past' was the effective filter
        let finalAppointments = appointments;
        if (statusFilter === 'upcoming') {
            // Keep only appointments where the associated availability slot start time is in the future
            finalAppointments = appointments.filter(app => app.availability && new Date(app.availability.startTime) >= now);
        } else if (statusFilter === 'past') {
            // Keep only appointments where the associated availability slot start time is in the past
             finalAppointments = appointments.filter(app => app.availability && new Date(app.availability.startTime) < now);
        }

        // Sort the final list chronologically by start time
        finalAppointments.sort((a, b) => {
            // Handle cases where availability might be missing (though unlikely with populate)
            const timeA = a.availability ? new Date(a.availability.startTime).getTime() : 0;
            const timeB = b.availability ? new Date(b.availability.startTime).getTime() : 0;
            // Handle potential null/invalid times if necessary
            if (!timeA) return 1; // Push items without time to the end
            if (!timeB) return -1;
            return timeA - timeB; // Ascending order (earliest first)
        });

        console.log(`[ChatService] Found ${finalAppointments.length} appointments matching criteria for user ${userId}.`);
        // Return the result structured as expected by the prompt definition
        return { foundAppointments: finalAppointments };

    } catch (error) {
        console.error(`[ChatService] Error finding appointments for user ${userId}:`, error);
        return { error: "Failed to retrieve your appointments." };
    }
};


// _cancelAppointment: Cancels a specific appointment for the user
const _cancelAppointment = async (appointmentId, userId) => {
    console.log(`[ChatService] Attempting to cancel appointment ID: ${appointmentId} for user ID: ${userId}`);
    if (!isValidObjectId(appointmentId) || !isValidObjectId(userId)) {
        return { success: false, message: "Invalid Appointment or User ID provided." };
    }

    // Optional: Use transactions for atomicity
    // const session = await mongoose.startSession();
    // session.startTransaction();

    try {
        // Find the appointment by ID
        const appointment = await Appointment.findById(appointmentId); // Add .session(session) if using transactions

        if (!appointment) {
            // await session.abortTransaction(); session.endSession();
            return { success: false, message: 'Appointment not found.' };
        }

        // Authorization Check: Ensure the user requesting cancellation is the patient
        if (appointment.patientId.toString() !== userId.toString()) {
            // await session.abortTransaction(); session.endSession();
            return { success: false, message: 'You are not authorized to cancel this appointment.' };
        }

        // Status Check: Only allow cancellation for 'scheduled' or 'confirmed' appointments
        // Add business logic here - e.g., cannot cancel within X hours of appointment time
        const cancellableStatuses = ['scheduled', 'confirmed'];
        if (!cancellableStatuses.includes(appointment.status)) {
            // await session.abortTransaction(); session.endSession();
            return { success: false, message: `Cannot cancel an appointment with status: '${appointment.status}'.` };
        }

        // Optional: Check cancellation window (e.g., must be > 24 hours before)
        // const now = new Date();
        // const appointmentTime = appointment.availability ? new Date(appointment.availability.startTime) : null; // Requires availability to be populated or fetched
        // if (appointmentTime && (appointmentTime.getTime() - now.getTime()) < (24 * 60 * 60 * 1000)) {
        //     return { success: false, message: 'Appointments cannot be cancelled less than 24 hours in advance.' };
        // }


        // Proceed with cancellation: Update appointment status
        appointment.status = 'cancelled';
        const savedAppointment = await appointment.save(); // Add { session } if using transactions

        // Make the associated availability slot bookable again
        if (appointment.availability) {
            await Availability.findByIdAndUpdate(appointment.availability, { isBooked: false }); // Add { session } if using transactions
            console.log(`[ChatService] Availability slot ${appointment.availability} marked as available again.`);
        } else {
             console.warn(`[ChatService] Could not unbook availability slot for cancelled appointment ${appointmentId} as availability reference was missing.`);
        }

        // If using transactions:
        // await session.commitTransaction();
        // session.endSession();

        // Re-populate the updated appointment for the response
        const populatedAppointment = await Appointment.findById(savedAppointment._id)
           .populate('patientId', 'firstName lastName email phone profilePicture')
           .populate('doctorId', 'firstName lastName specialization hospital phone profilePicture')
           .populate('availability')
           .lean();

        console.log(`[ChatService] Appointment ${appointmentId} cancelled successfully.`);
        // Return success and the updated appointment details
        return { success: true, message: 'Appointment cancelled successfully.', updatedAppointment: populatedAppointment };

    } catch (error) {
        console.error(`[ChatService] Error cancelling appointment ${appointmentId}:`, error);

        // If using transactions:
        // await session.abortTransaction();
        // session.endSession();

        return { success: false, message: `Cancellation failed. ${error.message || 'An unexpected error occurred.'}` };
    }
};
// --- End Function Call Handlers ---


// --- Main Service Function ---
const handleUserMessage = async (user, userMessageText, incomingHistory = []) => {
    if (!generativeModel) {
        console.error("[ChatService] FATAL: Gemini model not initialized.");
        throw new Error("Gemini model not initialized.");
    }

    const instructions = await generateSystemInstruction(user);
    if (!instructions) {
        // Should not happen if fallback exists, but good practice
        console.error("[ChatService] FATAL: System instructions could not be generated.");
        throw new Error("System instructions could not be generated.");
    }

    // Define the tools available to the Gemini model
    const tools = [{
        functionDeclarations: [
            {
                name: "findDoctors",
                description: "Finds doctors based on a query (symptoms, specialty, name). Returns general list if no query.",
                parameters: { type: "OBJECT", properties: { query: { type: "STRING", description: "Optional search terms (symptoms, specialty, name)." }}}
            },
            {
                name: "findAvailableSlots",
                description: "Finds available upcoming time slots for a specific doctor ID.",
                parameters: { type: "OBJECT", properties: { doctorId: { type: "STRING", description: "The ID of the doctor." }}, required: ["doctorId"] }
            },
            {
                name: "createAppointment",
                description: `Books an appointment using a slot ID for the current user (${user.firstName} ${user.lastName}).`,
                parameters: { type: "OBJECT", properties: { availabilityId: { type: "STRING", description: "The unique ID of the availability slot to book." }}, required: ["availabilityId"] }
            },
            {
                name: "findMyAppointments",
                description: `Finds the current user's (${user.firstName} ${user.lastName}) appointments.`,
                parameters: {
                    type: "OBJECT", properties: {
                        status: { type: "STRING", description: "Optional filter by status ('upcoming', 'past', 'scheduled', 'confirmed', 'cancelled', 'completed', 'all'). Defaults to 'upcoming'." }
                    }
                }
            },
            {
                name: "cancelAppointment",
                description: `Cancels a specific appointment by its ID for the current user (${user.firstName} ${user.lastName}).`,
                parameters: {
                    type: "OBJECT", properties: {
                        appointmentId: { type: "STRING", description: "The unique ID of the appointment to cancel." }
                    }, required: ["appointmentId"]
                }
            }
        ]
    }];

    // Format history for the Gemini API
    const formattedHistory = (incomingHistory || []).map(item => ({
        role: item.role,
        // Ensure parts is always an array of objects with 'text' or other valid part types
        parts: Array.isArray(item.parts)
          ? item.parts.map(p => (typeof p === 'string' ? { text: p } : p)) // Convert strings to {text: ...}
          : typeof item.parts === 'string' ? [{ text: item.parts }] : [] // Handle single string part
     }));

    // Initialize the chat session with Gemini
    const chat = generativeModel.startChat({
        history: formattedHistory,
        generationConfig: {
            temperature: 0.7, // Adjust for creativity vs consistency (lower is more consistent)
            // topP: 0.9, // Consider adjusting topP as well
            // topK: 40,  // Consider adjusting topK
        },
        safetySettings: [ // Configure safety settings as needed
             { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
             { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
             { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
             { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
        tools: tools,
        systemInstruction: { role: "system", parts: [{ text: instructions }] }, // Pass the generated instructions
    });

    console.log(`[ChatService] Sending message to Gemini for user ${user._id}: "${userMessageText}"`);
    let currentResponse;
    try {
        // Send the user's message to Gemini
        currentResponse = await chat.sendMessage(userMessageText);
    } catch (error) {
         console.error("[ChatService] Error sending message to Gemini:", error);
         // Return a user-friendly error message
         return {
             response: { rawText: "Sorry, I encountered an issue communicating with the AI. Please try again later.", error: `Gemini API Error: ${error.message}` },
             history: formattedHistory // Return the history up to this point
         };
    }

    let structuredData = {}; // Initialize structured data collected from function calls

    // --- Function call handling loop ---
    try {
        while (true) {
            const functionCalls = currentResponse.response.functionCalls();
            if (!functionCalls || functionCalls.length === 0) {
                break; // No more function calls requested, exit loop
            }

            console.log("[ChatService] Gemini requested function calls:", functionCalls.map(fc => fc.name));
            const functionResponses = []; // Store responses to send back to Gemini

            // Process each function call requested by the model
            for (const call of functionCalls) {
                let apiResponse = { error: "Function call failed internally." }; // Default error
                const { name, args } = call;
                try {
                    console.log(`[ChatService] Executing function: ${name} with args:`, JSON.stringify(args));
                    // Execute the corresponding backend function based on the name
                    switch (name) {
                        case 'findDoctors':
                            apiResponse = await _findDoctors(args.query);
                            // Store successful recommendations in structuredData
                            if (!apiResponse.error && apiResponse.recommendations) {
                                structuredData.recommendations = apiResponse.recommendations;
                            }
                            break;
                        case 'findAvailableSlots':
                            apiResponse = await _findAvailableSlots(args.doctorId);
                             // Store successful slots in structuredData
                            if (!apiResponse.error && apiResponse.foundSlots) {
                                structuredData.foundSlots = apiResponse.foundSlots;
                            }
                            break;
                        case 'createAppointment':
                            apiResponse = await _createAppointment(args.availabilityId, user._id.toString());
                             // Store successful booking in structuredData
                            if (!apiResponse.error && apiResponse.createdAppointment) {
                                structuredData.createdAppointment = apiResponse.createdAppointment;
                            }
                            break;
                        case 'findMyAppointments':
                            apiResponse = await _findMyAppointments(user._id.toString(), args.status);
                            // Store found appointments in structuredData
                            if (!apiResponse.error && apiResponse.foundAppointments) {
                                structuredData.foundAppointments = apiResponse.foundAppointments;
                            }
                            break;
                        case 'cancelAppointment':
                            apiResponse = await _cancelAppointment(args.appointmentId, user._id.toString());
                            // Store updated appointment if cancellation was successful
                            if (apiResponse.success && apiResponse.updatedAppointment) {
                                structuredData.updatedAppointment = apiResponse.updatedAppointment;
                            }
                            break;
                        default:
                            console.warn(`[ChatService] Unknown function call requested: ${name}`);
                            apiResponse = { error: `Function ${name} is not implemented.` };
                    }
                } catch (execError) {
                    // Catch errors during the execution of the backend function itself
                    console.error(`[ChatService] Error executing function ${name}:`, execError);
                    apiResponse = { error: `An internal error occurred while executing ${name}. ${execError.message}` };
                }
                // Add the function's response to the list to send back to Gemini
                functionResponses.push({ functionResponse: { name, response: apiResponse } });
            } // End loop through function calls

            console.log("[ChatService] Sending function responses back to Gemini.");
            // Send the collected function responses back to Gemini to continue the conversation
            try {
                currentResponse = await chat.sendMessage(functionResponses);
            } catch (error) {
                 console.error("[ChatService] Error sending function responses to Gemini:", error);
                 // Return a user-friendly error if the follow-up fails
                 return {
                     response: { rawText: "Sorry, I encountered an issue processing the results. Please try again.", error: `Gemini API Error after function call: ${error.message}` },
                     history: await chat.getHistory() // Return history up to this point
                 };
            }

        } // End while loop for function calls
    } catch (error) {
         // Catch potential errors related to accessing currentResponse.response properties
         console.error("[ChatService] Error during function call processing loop:", error);
         return {
             response: { rawText: "Sorry, an unexpected error occurred while processing your request.", error: `Processing Error: ${error.message}` },
             history: await chat.getHistory()
         };
    }
    // --- End Function call handling loop ---

    // Get the final text response after all function calls are resolved
    let finalResponseText = "";
    try {
         // Ensure response and text() exist before calling
         if (currentResponse?.response?.text) {
             finalResponseText = currentResponse.response.text();
         } else {
             console.warn("[ChatService] Gemini response or text() method not available after function calls or initial message.");
             // Handle cases where the response might be missing text (e.g., only function call returned)
             // Check structuredData to formulate a minimal response if text is empty
             if (structuredData.createdAppointment) finalResponseText = "Okay, the appointment is booked. See details below.";
             else if (structuredData.recommendations?.length > 0) finalResponseText = "Here are the doctors I found:";
             else if (structuredData.foundSlots?.length > 0) finalResponseText = "Here are the available slots:";
             else if (structuredData.foundAppointments?.length > 0) finalResponseText = "Here are your appointments:";
             else if (structuredData.updatedAppointment?.status === 'cancelled') finalResponseText = "Okay, the appointment has been cancelled.";
             else finalResponseText = "Okay."; // Generic fallback if no text and no clear action occurred
         }
    } catch (error) {
         console.error("[ChatService] Error getting final text from Gemini response:", error);
         finalResponseText = "Sorry, I had trouble formulating my final response."; // Fallback text
    }


    const finalHistory = await chat.getHistory(); // Get the complete history

    console.log("[ChatService] Raw Gemini Response Text (Before tag processing):", finalResponseText);

    // --- Advice Extraction using Tags (as per instructions.PROMPT) ---
    let adviceText = null;
    const adviceStartTag = "[ADVICE_START]";
    const adviceEndTag = "[ADVICE_END]";

    try {
        const startIndex = finalResponseText.indexOf(adviceStartTag);
        const endIndex = finalResponseText.indexOf(adviceEndTag);

        // Check if both tags are present and in the correct order
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            // Extract the text content between the tags
            adviceText = finalResponseText.substring(startIndex + adviceStartTag.length, endIndex).trim();
            console.log("[ChatService] Successfully extracted advice block using tags:", adviceText);

            // Remove the advice block *including the tags* from the main conversational text
            // Combine the text before the start tag and after the end tag
            const textBefore = finalResponseText.substring(0, startIndex).trim();
            const textAfter = finalResponseText.substring(endIndex + adviceEndTag.length).trim();
            finalResponseText = (textBefore + " " + textAfter).trim(); // Add space between parts if both exist

            // Clean up potential excessive whitespace
            finalResponseText = finalResponseText.replace(/\s{2,}/g, ' ');

            console.log("[ChatService] Removed extracted advice block from finalResponseText. Remaining text:", finalResponseText);

            // Add the extracted advice to the structured data payload
            structuredData.advice = adviceText;
            console.log("[ChatService] Added advice block to structuredData");

        } else {
            // Log if tags were not found or were in the wrong order
            if (startIndex !== -1 || endIndex !== -1) {
                 console.warn("[ChatService] Found advice tags but they were mismatched or out of order. Advice not extracted.");
            } else {
                 console.log("[ChatService] Advice tags not found in response. Raw text preserved.");
            }
            // No advice extracted, finalResponseText remains as is.
        }
    } catch (e) {
        console.error("[ChatService] Error during advice tag processing:", e);
        // If an error occurs during string manipulation, keep the original text to avoid data loss
    }
    // --- End Advice Extraction using Tags ---

    // --- Optional Post-processing: Clean Doctor Names (Fallback) ---
    // This step is less critical if the instructions.PROMPT is followed well,
    // but can help clean up if the LLM still mentions names conversationally.
    if (structuredData.recommendations && structuredData.recommendations.length > 0 && finalResponseText) {
        console.log("[ChatService] Recommendations found, attempting fallback cleaning on remaining rawText.");
        let cleanedText = finalResponseText;
        structuredData.recommendations.forEach(rec => {
            if (rec.doctor) {
                const drFullName = `Dr. ${rec.doctor.firstName} ${rec.doctor.lastName}`;
                const fullName = `${rec.doctor.firstName} ${rec.doctor.lastName}`;
                 // Case-insensitive global replacement using RegExp
                cleanedText = cleanedText.replace(new RegExp(drFullName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi'), '');
                cleanedText = cleanedText.replace(new RegExp(fullName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi'), '');
                // Optionally remove specialization/hospital if they creep in
                // if (rec.doctor.specialization) { cleanedText = cleanedText.replace(new RegExp(rec.doctor.specialization.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi'), ''); }
                // if (rec.doctor.hospital) { cleanedText = cleanedText.replace(new RegExp(rec.doctor.hospital.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi'), ''); }
            }
        });
        // Remove common introductory phrases that might remain if LLM adds them before card reference
        cleanedText = cleanedText.replace(/Okay.*?,?\s*I found (?:these|the following|some) doctors?:?/gi, '');
        cleanedText = cleanedText.replace(/Here (?:is the|are the) doctor(?:s)? I found(?: for you)?:?/gi, '');
        cleanedText = cleanedText.replace(/You can see the details below\.?/gi, '');
        cleanedText = cleanedText.replace(/\s*:\s*$/,''); // Remove trailing colons/whitespace
        cleanedText = cleanedText.replace(/\s{2,}/g, ' ').trim(); // Collapse multiple spaces

        if (cleanedText !== finalResponseText) {
            console.log("[ChatService] Fallback cleaned rawText:", cleanedText);
            finalResponseText = cleanedText;
        }
    } else if (finalResponseText) {
        // Basic whitespace cleanup even if no recommendations/tags
        finalResponseText = finalResponseText.replace(/\s{2,}/g, ' ').trim();
    }
    // --- End Post-processing Step ---

    // Construct the final payload for the frontend
    const responsePayload = {
        // The final conversational text (after tag removal and optional cleaning)
        rawText: finalResponseText,
        // All structured data collected from function calls and advice extraction
        ...structuredData
    };

    // Final log of the payload being sent back
    console.log("[ChatService] Final Response Payload:", JSON.stringify(responsePayload, null, 2));

    // Return the payload and the complete conversation history
    return {
        response: responsePayload,
        history: finalHistory.map(h => ({ // Ensure history format matches input expectation
             role: h.role,
             parts: Array.isArray(h.parts)
               ? h.parts.map(p => (typeof p === 'string' ? { text: p } : p))
               : typeof h.parts === 'string' ? [{ text: h.parts }] : []
         }))
    };
};

module.exports = {
    handleUserMessage,
    // Potentially export helper functions if needed elsewhere, otherwise keep them internal
};