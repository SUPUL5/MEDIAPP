// frontend/screens/PatientHome.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AntDesign } from '@expo/vector-icons';
import { PatientStackParamList } from '../types/navigation.types';
import TopBar from '../components/TopBar';
import Appointments from './patient/Appointments';
import Dashboard from './patient/Dashboard';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation.types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthUser } from '../types/user';
import CustomTabBar from '../components/CustomTabBar'; // Keep using this
import ChatPanel from '../components/ChatPanel'; // Keep this import

const Tab = createBottomTabNavigator<PatientStackParamList>();

const PatientHome = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isChatPanelVisible, setIsChatPanelVisible] = useState(false); // State for chat panel

  // loadUserData (keep as is)
  const loadUserData = useCallback(async () => {
    try {
      const userDataString = await AsyncStorage.getItem('user');
      if (userDataString) {
        setUser(JSON.parse(userDataString));
      } else {
        console.log("No user data in PatientHome, navigating to login.");
        navigation.replace('Login');
      }
    } catch (e) {
      console.error("Failed to load user data in PatientHome:", e);
      navigation.replace('Login');
    }
  }, [navigation]);

  useEffect(() => {
    (async () => { await loadUserData(); })();
  }, [loadUserData]);

  useFocusEffect(
    useCallback(() => { (async () => { await loadUserData(); })(); }, [loadUserData])
  );

  // Function to toggle chat panel
  const toggleChatPanel = () => {
    setIsChatPanelVisible(!isChatPanelVisible);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <TopBar
          onPressUserIcon={() => { navigation.navigate('Profile'); }}
          profilePicture={user?.profilePicture}
          iconSize={30}
          iconColor="#007bff"
        />
        {/* Tab Navigator Renders First */}
        <Tab.Navigator
          tabBar={(props) => (
            <CustomTabBar
              {...props}
              isChatPanelVisible={isChatPanelVisible}
              toggleChatPanel={toggleChatPanel}
            />
          )}
          screenOptions={{
            headerShown: false,
          }}
        >
          <Tab.Screen
            name="PatientDashboard"
            component={Dashboard}
            options={{
              tabBarIcon: ({ color, size, focused }) => (
                <AntDesign name="home" size={size} color={color} />
              ),
              tabBarLabel: 'Dashboard' // Explicitly set label
            }}
          />
          <Tab.Screen
            name="PatientAppointments"
            component={Appointments}
            options={{
              tabBarIcon: ({ color, size, focused }) => (
                <AntDesign name="calendar" size={size} color={color} />
              ),
               tabBarLabel: 'Appointments' // Explicitly set label
            }}
          />
        </Tab.Navigator>

        {/* ChatPanel Renders Last to overlay */}
        <ChatPanel isVisible={isChatPanelVisible} onClose={toggleChatPanel} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff', // Or your desired background
  },
  container: {
    flex: 1,
    position: 'relative', // Keep relative positioning for absolute children
  },
});

export default PatientHome;