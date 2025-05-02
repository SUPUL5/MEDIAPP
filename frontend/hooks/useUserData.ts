import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthUser } from '../types'; // Adjust path if needed

interface UseUserDataOutput {
  currentUser: AuthUser | null;
  loadUserData: () => Promise<AuthUser | null>; // Return user or null
  isLoadingUser: boolean;
  clearUser: () => void; // Function to clear user state if needed
}

export const useUserData = (): UseUserDataOutput => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true); // Start loading initially

  const loadUserData = useCallback(async (): Promise<AuthUser | null> => {
    setIsLoadingUser(true);
    // console.log("[useUserData] Loading user data...");
    try {
      const userDataString = await AsyncStorage.getItem('user');
      if (userDataString) {
        const parsedUser = JSON.parse(userDataString) as AuthUser;
        setCurrentUser(parsedUser);
        // console.log("[useUserData] User data loaded:", parsedUser._id);
        setIsLoadingUser(false);
        return parsedUser;
      } else {
        console.warn("[useUserData] User data not found in storage.");
        setCurrentUser(null);
        setIsLoadingUser(false);
        return null;
      }
    } catch (e) {
      console.error("[useUserData] Failed to load user data:", e);
      setCurrentUser(null);
      setIsLoadingUser(false);
      throw new Error('Failed to load user profile.'); // Rethrow for calling component
    }
  }, []);

  const clearUser = useCallback(() => {
    setCurrentUser(null);
    // Consider removing from AsyncStorage here too if needed on clear
  }, []);

  return { currentUser, loadUserData, isLoadingUser, clearUser };
};