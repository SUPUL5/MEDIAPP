// backend/config/geminiConfig.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config(); // Ensure env vars are loaded

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("FATAL ERROR: GEMINI_API_KEY is not set in the environment variables.");
    // Optionally, you might want to exit the process or throw a more critical error
    // process.exit(1);
}

let genAIInstance = null;
let generativeModel = null;

try {
    genAIInstance = new GoogleGenerativeAI(apiKey);
    // Specify the model you want to use, e.g., gemini-1.5-flash
    generativeModel = genAIInstance.getGenerativeModel({ model: "gemini-2.5-flash-preview-04-17" });
    console.log("Gemini AI client initialized successfully.");
} catch (error) {
    console.error("Failed to initialize Gemini AI client:", error);
    // Handle initialization error appropriately
}


module.exports = {
    genAIInstance,
    generativeModel,
};