// frontend/screens/DoctorHome.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AntDesign } from '@expo/vector-icons';
import { DoctorStackParamList } from '../types/navigation.types';
import TopBar from '../components/TopBar';
import Appointments from './doctor/Appointments';
import Dashboard from './doctor/Dashboard';
import FreeSlots from './doctor/FreeSlots';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation.types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthUser } from '../types/user';

const Tab = createBottomTabNavigator<DoctorStackParamList>();

const DoctorHome = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [user, setUser] = useState<AuthUser | null>(null);

  const loadUserData = useCallback(async () => {
      try {
        const userDataString = await AsyncStorage.getItem('user');
        if (userDataString) {
          setUser(JSON.parse(userDataString));
        } else {
          console.log("No user data in DoctorHome, navigating to login.");
          navigation.replace('Login');
        }
      } catch(e) {
        console.error("Failed to load user data in DoctorHome:", e);
        navigation.replace('Login');
      }
  }, [navigation]);

  useEffect(() => {
    // Wrap async call
    (async () => {
        await loadUserData();
    })();
  }, [loadUserData]);

  useFocusEffect(
      useCallback(() => {
        // Wrap async call
        (async () => {
            await loadUserData();
        })();
        // return () => { /* cleanup */ };
    }, [loadUserData])
  );

  return (
    <View style={styles.container}>
      <TopBar
        onPressUserIcon={() => {
          navigation.navigate('Profile');
        }}
        profilePicture={user?.profilePicture}
        iconSize={30}
        iconColor="#007bff"
      />
      <View style={styles.contentContainer}>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#007bff',
            tabBarInactiveTintColor: '#000',
            tabBarStyle: {
              paddingVertical: 5,
              borderTopWidth: 1,
              borderTopColor: '#ddd',
            },
          }}
        >
          <Tab.Screen
            name="DoctorDashboard"
            component={Dashboard}
            options={{
              tabBarLabel: 'Home',
              tabBarIcon: ({ color, size }) => (
                <AntDesign name="home" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="DoctorAppointments"
            component={Appointments}
            options={{
              tabBarLabel: 'Appointments',
              tabBarIcon: ({ color, size }) => (
                <AntDesign name="calendar" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="DoctorFreeSlots"
            component={FreeSlots}
            options={{
              tabBarLabel: 'Free Slots',
              tabBarIcon: ({ color, size }) => (
                <AntDesign name="clockcircleo" size={size} color={color} />
              ),
            }}
          />
        </Tab.Navigator>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
});

export default DoctorHome;