// frontend/screens/AdminHome.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AntDesign } from '@expo/vector-icons';
import { AdminStackParamList } from '../types/navigation.types';
import TopBar from '../components/TopBar';
import Dashboard from './admin/Dashboard';
import Users from './admin/Users';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation.types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthUser } from '../types/user';

const Tab = createBottomTabNavigator<AdminStackParamList>();

const AdminHome = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [user, setUser] = useState<AuthUser | null>(null);

   const loadUserData = useCallback(async () => {
      try {
        const userDataString = await AsyncStorage.getItem('user');
        if (userDataString) {
          setUser(JSON.parse(userDataString));
        } else {
          console.log("No user data in AdminHome, navigating to login.");
          navigation.replace('Login');
        }
      } catch(e) {
        console.error("Failed to load user data in AdminHome:", e);
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
        iconColor="#8a2be2"
      />
      <View style={styles.contentContainer}>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#8a2be2',
            tabBarInactiveTintColor: '#000',
            tabBarStyle: {
              paddingVertical: 5,
              borderTopWidth: 1,
              borderTopColor: '#ddd',
            },
          }}
        >
          <Tab.Screen
            name="AdminDashboard"
            component={Dashboard}
            options={{
              tabBarLabel: 'Home',
              tabBarIcon: ({ color, size }) => (
                <AntDesign name="home" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="AdminUsers"
            component={Users}
            options={{
              tabBarLabel: 'Users',
              tabBarIcon: ({ color, size }) => (
                <AntDesign name="team" size={size} color={color} />
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

export default AdminHome;