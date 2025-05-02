// frontend/screens/Profile.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView,
    ImageBackground, Image
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation.types';
import { AntDesign, FontAwesome5, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthUser } from '../types/user';
import ProfileUpdateForm from '../components/ProfileUpdateForm';
import userApi from '../api/userApi';
import CustomAlert from '../components/CustomAlert';
import { SERVER_ROOT_URL } from '../api/config'; // Ensure this is imported

// Helper functions (getStatusBadgeStyle, getRoleIcon, formatDate) remain the same

const Profile = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [alertConfig, setAlertConfig] = useState({
        visible: false,
        type: 'error' as 'error' | 'success' | 'warning' | 'info',
        title: '',
        message: ''
    });

    const showAlert = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
        setAlertConfig({ visible: true, type, title, message });
    };

    const hideAlert = () => {
        setAlertConfig(prev => ({ ...prev, visible: false }));
    };

    const loadUserData = useCallback(async () => {
        try {
            const userDataString = await AsyncStorage.getItem('user');
            if (userDataString) {
                setUser(JSON.parse(userDataString));
            } else {
                console.log("No user data found in storage.");
                 // Optionally navigate to login if user data is strictly required here
                 // navigation.replace('Login');
            }
        } catch (error: any) {
            console.error("Failed to load user data:", error);
            showAlert('error', 'Load Error', 'Failed to load profile data.');
        } finally {
            // Only stop initial loading indicator once
            if (isLoading) setIsLoading(false);
        }
    }, [isLoading]); // Rerun if isLoading changes (for initial load)

    // Initial load
    useEffect(() => {
        setIsLoading(true); // Set loading true on initial mount
        loadUserData();
    }, []); // Empty dependency array means run once on mount

    // Refresh on focus
    useFocusEffect(
        useCallback(() => {
            loadUserData(); // Reload data when screen comes into focus
        }, [loadUserData]) // Dependency ensures loadUserData is stable
    );

    // This function is passed to the form, it updates *this* screen's state
    const handleUpdateSuccess = (updatedUser: AuthUser) => {
        setUser(updatedUser); // Update the state in Profile.tsx
        setIsEditing(false); // Exit edit mode
        // Optionally show a success message here as well, or rely on the form's alert
        // showAlert('success', 'Profile Updated', 'Your information is saved.');
    };

    const handleLogout = () => {
        setAlertConfig({
            visible: true,
            type: 'warning',
            title: 'Confirm Logout',
            message: 'Are you sure you want to log out?',
        });
    };

    const performLogout = async () => {
        hideAlert();
        try {
            await userApi.logout();
            navigation.replace('Login');
        } catch (error) {
            console.error("Logout failed:", error);
            showAlert('error', 'Logout Failed', 'An error occurred during logout. Please try again.');
        }
    };

    // Loading State UI
    if (isLoading) {
        return (
            <ImageBackground source={require('../assets/common.jpg')} style={styles.fullScreenLoaderContainer} resizeMode="cover">
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.loadingText}>Loading Profile...</Text>
            </ImageBackground>
        );
    }

    // Error State UI (User is null after loading attempted)
    if (!user) {
        return (
             <ImageBackground source={require('../assets/common.jpg')} style={styles.container} resizeMode="cover">
               <View style={styles.emptyStateContainer}>
                   <MaterialIcons name="error-outline" size={70} color="#EF4444" />
                   <Text style={styles.emptyStateTitle}>Profile Error</Text>
                   <Text style={styles.emptyStateText}>Could not load user profile data.</Text>
                   <TouchableOpacity onPress={() => navigation.replace('Login')} style={styles.primaryButton}>
                       <Text style={styles.primaryButtonText}>Go to Login</Text>
                   </TouchableOpacity>
               </View>
               <CustomAlert
                   visible={alertConfig.visible}
                   type={alertConfig.type}
                   title={alertConfig.title}
                   message={alertConfig.message}
                   buttons={[{ text: 'OK', onPress: () => { hideAlert(); navigation.replace('Login'); } }]}
                   onDismiss={() => { hideAlert(); navigation.replace('Login'); }}
               />
             </ImageBackground>
        );
    }

    // User data loaded successfully
    const statusStyle = getStatusBadgeStyle(user.status);
    const displayProfilePicUri = user.profilePicture
        ? user.profilePicture.startsWith('/')
            ? `${SERVER_ROOT_URL}${user.profilePicture}`
            : user.profilePicture
        : null;


    return (
        <ImageBackground
            source={require('../assets/common.jpg')}
            style={styles.container}
            resizeMode="cover"
        >
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.headerButton}
                    onPress={() => isEditing ? setIsEditing(false) : navigation.goBack()}
                >
                    <AntDesign name={isEditing ? "close" : "arrowleft"} size={24} color="#3B82F6" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isEditing ? 'Edit Profile' : 'My Profile'}</Text>
                {!isEditing ? (
                    <TouchableOpacity style={styles.headerButton} onPress={() => setIsEditing(true)}>
                        <AntDesign name="edit" size={24} color="#3B82F6" />
                    </TouchableOpacity>
                ) : <View style={styles.placeholder} />}
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollViewContent}
                keyboardShouldPersistTaps="handled"
            >
                {!isEditing ? (
                    // --- Display Mode ---
                    <View style={styles.profileCard}>
                        <View style={styles.avatarWrapper}>
                            <View style={styles.avatarContainer}>
                                {displayProfilePicUri ? (
                                    <Image
                                        source={{ uri: displayProfilePicUri }}
                                        style={styles.avatarImage}
                                        resizeMode="cover"
                                        onError={(e) => console.log("Failed to load profile image:", e.nativeEvent.error)}
                                    />
                                ) : (
                                    <AntDesign name="user" size={60} color="#3B82F6" style={styles.avatarIcon} />
                                )}
                            </View>
                            <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
                                <AntDesign name={statusStyle.icon} size={12} color="#fff" />
                                <Text style={styles.statusBadgeText}>{user.status}</Text>
                            </View>
                        </View>

                        <Text style={styles.name}>{user.firstName} {user.lastName}</Text>
                        <View style={styles.roleRow}>
                            {getRoleIcon(user.role)}
                            <Text style={[styles.roleText, styles.capitalize]}>{user.role}</Text>
                        </View>

                        <View style={styles.infoDivider} />

                        {/* Info Rows... */}
                         <View style={styles.infoRow}>
                            <AntDesign name="mail" size={18} color="#6B7280" style={styles.infoIcon} />
                            <Text style={styles.infoTextValue}>{user.email}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <AntDesign name="phone" size={18} color="#6B7280" style={styles.infoIcon} />
                            <Text style={styles.infoTextValue}>{user.phone}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <FontAwesome5 name={user.gender?.toLowerCase() === 'male' ? 'mars' : user.gender?.toLowerCase() === 'female' ? 'venus' : 'genderless'} size={18} color="#6B7280" style={styles.infoIcon} />
                            <Text style={[styles.infoTextValue, styles.capitalize]}>{user.gender ?? 'N/A'}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <AntDesign name="calendar" size={18} color="#6B7280" style={styles.infoIcon} />
                            <Text style={styles.infoTextValue}>{formatDate(user.dateOfBirth)}</Text>
                        </View>

                        {user.role === 'doctor' && user.specialization && (
                            <View style={styles.infoRow}>
                                <FontAwesome5 name="stethoscope" size={18} color="#6B7280" style={styles.infoIcon} />
                                <Text style={styles.infoTextValue}>{user.specialization}</Text>
                            </View>
                        )}
                        {user.hospital && (
                            <View style={styles.infoRow}>
                                <FontAwesome5 name="hospital" size={18} color="#6B7280" style={styles.infoIcon} />
                                <Text style={styles.infoTextValue}>{user.hospital}</Text>
                            </View>
                        )}

                        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                            <MaterialCommunityIcons name="logout" size={20} color="#EF4444" />
                            <Text style={styles.logoutButtonText}>Logout</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                     // --- Edit Mode ---
                    <ProfileUpdateForm user={user} onUpdateSuccess={handleUpdateSuccess} />
                )}
            </ScrollView>

            {/* Logout Confirmation Alert */}
            <CustomAlert
                visible={alertConfig.visible && alertConfig.title === 'Confirm Logout'}
                type="warning"
                title="Confirm Logout"
                message="Are you sure you want to log out?"
                buttons={[
                    { text: 'Cancel', onPress: hideAlert, style: 'cancel' },
                    { text: 'Logout', onPress: performLogout, style: 'default' },
                ]}
                onDismiss={hideAlert}
            />
            {/* Other Alerts */}
             <CustomAlert
                visible={alertConfig.visible && alertConfig.title !== 'Confirm Logout'}
                type={alertConfig.type}
                title={alertConfig.title}
                message={alertConfig.message}
                buttons={[{ text: 'OK', onPress: hideAlert }]} // Don't force login on general errors here
                onDismiss={hideAlert}
            />
        </ImageBackground>
    );
};

// Styles remain the same
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    scrollViewContent: {
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 30,
        flexGrow: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingTop: 45,
        paddingBottom: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(229, 231, 235, 0.8)',
    },
    headerButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
    },
    placeholder: {
        width: 34,
    },
    profileCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 12,
        padding: 20,
        paddingTop: 25,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        marginBottom: 20,
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: 15,
        alignItems: 'center',
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: '#3B82F6',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#E0E7FF',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarIcon: {
        // Fallback icon styles if needed
    },
    statusBadge: {
        position: 'absolute',
        bottom: -5,
        right: -5,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#fff',
    },
    statusBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
        marginLeft: 4,
        textTransform: 'capitalize',
    },
    name: {
        fontSize: 22,
        fontWeight: '700',
        textAlign: 'center',
        color: '#1F2937',
        marginBottom: 5,
    },
    roleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 15,
    },
    roleText: {
        fontSize: 16,
        color: '#4A5568',
        marginLeft: 8,
    },
    infoDivider: {
      width: '90%',
      height: 1,
      backgroundColor: '#E5E7EB',
      marginVertical: 15,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        width: '100%',
    },
    infoIcon: {
        marginRight: 15,
        width: 20,
        textAlign: 'center',
        color: '#6B7280',
    },
    infoTextValue: {
        fontSize: 15,
        color: '#374151',
        flexShrink: 1,
    },
    capitalize: {
        textTransform: 'capitalize',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: '#EF4444',
        marginTop: 25,
        alignSelf: 'stretch',
        marginHorizontal: 10,
    },
    logoutButtonText: {
        color: '#EF4444',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 10,
    },
    fullScreenLoaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    loadingText: {
        marginTop: 15,
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: '500',
    },
     emptyStateContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 30,
        paddingBottom: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 15,
        marginHorizontal: 20,
        marginVertical: 40,
    },
    emptyStateTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1F2937',
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 8,
    },
    emptyStateText: {
        fontSize: 15,
        color: '#4B5563',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 20,
    },
    primaryButton: {
        backgroundColor: '#3B82F6',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 8,
        marginTop: 10,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

// Helper function to get status badge style
const getStatusBadgeStyle = (status: string | undefined) => { // Allow undefined status
    switch (status) {
        case 'verified':
            return { backgroundColor: '#10B981', icon: 'checkcircleo' as const };
        case 'unverified':
            return { backgroundColor: '#F59E0B', icon: 'infocirlceo' as const };
        case 'blocked':
            return { backgroundColor: '#EF4444', icon: 'closecircleo' as const };
        default:
            return { backgroundColor: '#6B7280', icon: 'questioncircleo' as const };
    }
};

// Helper function to get role icon
const getRoleIcon = (role: string | undefined) => { // Allow undefined role
    switch (role) {
        case 'patient':
            return <FontAwesome5 name="user-alt" size={18} color="#4A5568" />;
        case 'doctor':
            return <FontAwesome5 name="user-md" size={18} color="#4A5568" />;
        case 'admin':
            return <MaterialCommunityIcons name="shield-crown-outline" size={18} color="#4A5568" />;
        default:
            return <AntDesign name="question" size={18} color="#4A5568" />;
    }
};

// Helper function to format date
const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';

        const day = date.getDate();
        const month = date.toLocaleString('default', { month: 'long' });
        const year = date.getFullYear();

        let suffix = 'th';
        if (day === 1 || day === 21 || day === 31) suffix = 'st';
        else if (day === 2 || day === 22) suffix = 'nd';
        else if (day === 3 || day === 23) suffix = 'rd';

        return `${day}${suffix} ${month} ${year}`;
    } catch (e) {
        console.error("Error formatting date:", e);
        return 'Error';
    }
};


export default Profile;