# 🚑 MEDIAPP

**Cross-platform Mobile Health Application for University Environments**

**MEDIAPP** is a modern and intuitive mobile application designed to streamline healthcare access for students, faculty, and staff in university settings. It offers seamless appointment scheduling, AI-powered symptom checking, real-time provider availability, and secure mental health support—all in one place.

---

## ✨ Features

- 📅 Easy appointment booking & management  
- 🤖 AI-powered symptom checker (via Google Gemini API)  
- 🔐 Secure, role-based login system  
- 🔔 Smart notifications and reminders  
- 🧠 Mental health counseling support

---

## 🧱 Tech Stack

### 📱 Frontend (React Native + TypeScript)

- **Navigation**: React Navigation  
- **API Communication**: Axios  
- **State Management**: Redux / Context API  
- **Push Notifications**:  
  - `@react-native-community/push-notification-ios`  
  - `react-native-push-notification`  
- **UI Components**: NativeBase / React Native Elements  
- **Animations**: `react-native-reanimated`, `react-native-animatable`

### 🛠 Backend (Node.js + Express.js)

- **Database**: MongoDB (with Mongoose ODM)  
- **Authentication**: `bcrypt`, `jsonwebtoken` (JWT)  
- **Configuration**: `dotenv`  
- **Validation**: `joi`, `express-validator`  
- **Middleware**: Rate limiting, error handling, file uploads  
- **Email**: `nodemailer` for notifications

### 🧠 AI Integration

- **Google Gemini API** for NLP-driven symptom analysis and chatbot interaction  
- Fully integrated with backend for secure and contextual health insights

---

## 🔐 Security Features

- 🔑 Passwords hashed with `bcrypt` + salting  
- 🪪 JWT-based stateless authentication  
- 🧍 Role-based access control  
- 🌐 CORS and rate-limiting middleware for API security

---

## 🚀 Getting Started

### Backend Setup

```bash
cd backend
npm install
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npx expo start
```

---

## 🧪 Testing

- **Unit & Integration Tests**: Jest  
- **UI Testing**: React Native Testing Library  

To run backend tests:

```bash
cd backend
npm test
```

---
