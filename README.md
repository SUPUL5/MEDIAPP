# MEDIAPP

**Cross-platform Mobile Health Application for University Environments**

MEDIAPP is a modern mobile application designed to revolutionize healthcare access for students, faculty, and staff in university settings. 
It provides seamless appointment scheduling, AI-driven symptom checking, real-time provider availability, and secure access to mental health support.

---

## 🚀 Features
 
- ReaAppointment booking and management  
- AI-powered symptom checker using Google Gemini API  
- Role-based secure login system  
- Notifications and reminders  
- Support for mental health counseling

---

## 🧱 Tech Stack

### 📱 Frontend (React Native + TypeScript)

- React Navigation for screen transitions
- Axios for API requests
- Redux/Context API for state management
- Push notifications: `@react-native-community/push-notification-ios`, `react-native-push-notification`
- UI Libraries: NativeBase / React Native Elements
- Animations: `react-native-reanimated`, `react-native-animatable`

### 🔧 Backend (Node.js + Express.js + JavaScript)

- MongoDB (NoSQL) with Mongoose ODM
- Authentication: `bcrypt`, `jsonwebtoken` (JWT)
- Environment Config: `dotenv`
- Validation: `joi` / `express-validator`
- Middleware: rate limiting, error handling, file uploads
- Email Notifications: `nodemailer`

### 🧠 AI Integration

- **Google Gemini API** for NLP-driven symptom checking and chatbot suggestions
- Full integration with backend for secure, contextual symptom analysis

---

## 🛡️ Security

- Passwords hashed with `bcrypt` and salting
- Stateless JWT authentication
- Role-based access control
- CORS and Rate Limiting middleware

---

## Setup Backend
cd backend
npm install
npm run dev

## Setup Frontend
cd ../frontend
npm install
npx expo start


## 🧪 Testing

- **Jest** for unit and integration testing
- **React Native Testing Library** for UI interaction testing

Run backend tests:
```bash
cd backend
npm install
npm test


