import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { RootStackParamList } from './types/navigation.types';

// Import screens
import Splash from './screens/Splash';
import Login from './screens/Login';
import SignupStep1 from './screens/SignupStep1';
import SignupStep2 from './screens/SignupStep2';
import SignupStep3 from './screens/SignupStep3';
import ForgotPassword from './screens/ForgotPassword';
import ResetPassword from './screens/ResetPassword';
import Verify from './screens/Verify';
import PatientHome from './screens/PatientHome';
import DoctorHome from './screens/DoctorHome';
import AdminHome from './screens/AdminHome';
import Profile from './screens/Profile';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Splash" component={Splash} />
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="SignupStep1" component={SignupStep1} />
        <Stack.Screen name="SignupStep2" component={SignupStep2} />
        <Stack.Screen name="SignupStep3" component={SignupStep3} />
        <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
        <Stack.Screen name="ResetPassword" component={ResetPassword} />
        <Stack.Screen name="Verify" component={Verify} />
        <Stack.Screen name="PatientHome" component={PatientHome} />
        <Stack.Screen name="DoctorHome" component={DoctorHome} />
        <Stack.Screen name="AdminHome" component={AdminHome} />
        <Stack.Screen name="Profile" component={Profile} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
