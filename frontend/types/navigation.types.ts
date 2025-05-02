import { NativeStackNavigationProp } from '@react-navigation/native-stack';


export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  SignupStep1: undefined;
  SignupStep2: {
    role: 'patient' | 'doctor';
  };
  SignupStep3: {
    firstName: string;
    lastName: string;
    phone: string;
    gender: string;
    dateOfBirth: Date;
    specialization?: string;
    hospital?: string;
    role: 'patient' | 'doctor';
  };
  ResetPassword: {
    email: string;
    code: number;
  };
  ForgotPassword: undefined;
  Verify: { 
    email: string;
    verifyType?: 'emailVerification' | 'resetPassword'; 
  };
  PatientHome: undefined;
  DoctorHome: undefined;
  AdminHome: undefined;
  Profile: undefined; // Add PatientProfile to root stack
};

export type PatientStackParamList = {
  PatientDashboard: undefined;
  PatientAppointments: undefined;
  // Remove PatientProfile from here since it's not in the tab navigation
};



export type DoctorStackParamList = {
  DoctorDashboard: undefined;
  DoctorAppointments: undefined;
  DoctorFreeSlots: undefined; // Add the new screen type
  // Add other doctor-specific tab screens here if needed
};

export type AdminStackParamList = {
  AdminDashboard: undefined;
  AdminUsers: undefined;
  // Add other admin-specific tab screens here if needed
};

// Use a simple NavigationProp since we're now using proper tab navigation
export type PatientNavigationProp = NativeStackNavigationProp<PatientStackParamList>;
