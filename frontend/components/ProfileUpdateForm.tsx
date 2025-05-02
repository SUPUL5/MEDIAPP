// frontend/components/ProfileUpdateForm.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Platform, Image, Button } from 'react-native';
import { Ionicons, FontAwesome5, AntDesign } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import userApi from '../api/userApi';
import { AuthUser, UserUpdateRequest, UpdatePasswordRequest } from '../types/user';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import CustomAlert from './CustomAlert';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVER_ROOT_URL } from '../api/config'; // Import SERVER_ROOT_URL

interface ProfileUpdateFormProps {
    user: AuthUser;
    onUpdateSuccess: (updatedUser: AuthUser) => void;
}

const ProfileUpdateForm: React.FC<ProfileUpdateFormProps> = ({ user, onUpdateSuccess }) => {
    // States for form fields, mirroring user prop initially
    const [firstName, setFirstName] = useState(user.firstName);
    const [lastName, setLastName] = useState(user.lastName);
    const [phone, setPhone] = useState(user.phone);
    const [gender, setGender] = useState(user.gender);
    const [dateOfBirth, setDateOfBirth] = useState<Date>(new Date(user.dateOfBirth));
    const [hospital, setHospital] = useState(user.hospital || '');
    const [specialization, setSpecialization] = useState(user.specialization || '');

    // State for the profile picture RELATIVE PATH stored/displayed
    const [profilePicturePath, setProfilePicturePath] = useState<string | null>(user.profilePicture ?? null);
    // State to track the URI of a *newly selected* local image for preview
    const [localPreviewUri, setLocalPreviewUri] = useState<string | null>(null);

    // Password states
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    // UI states
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Alert states
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
    const [alertTitle, setAlertTitle] = useState('');
    const [alertMessage, setAlertMessage] = useState('');

    // Effect to reset form state when user prop changes
    useEffect(() => {
        setFirstName(user.firstName);
        setLastName(user.lastName);
        setPhone(user.phone);
        setGender(user.gender);
        setDateOfBirth(new Date(user.dateOfBirth));
        setHospital(user.hospital || '');
        setSpecialization(user.specialization || '');
        setProfilePicturePath(user.profilePicture ?? null); // Store the relative path
        setLocalPreviewUri(null); // Reset local preview URI
    }, [user]);

    // --- Image Picker Logic ---
    const requestPermissions = async () => {
        if (Platform.OS !== 'web') {
            const libraryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (libraryStatus.status !== 'granted') {
                showAlert('warning', 'Permission Required', 'Sorry, we need camera roll permissions to make this work!');
                return false;
            }
        }
        return true;
    };

    const pickImage = async () => {
        const hasPermission = await requestPermissions();
        if (!hasPermission) return;

        try {
            let result = await ImagePicker.launchImageLibraryAsync({
                 mediaTypes: ImagePicker.MediaTypeOptions.Images, // Reverted to use MediaTypeOptions
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
                base64: false,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const selectedImageUri = result.assets[0].uri;
                setLocalPreviewUri(selectedImageUri); // Store the *local* URI for preview only
                // Don't update profilePicturePath here, only update the preview
                showAlert('info', 'Image Selected', 'Image ready. Press "Update Profile" to upload and save.');
            }
        } catch (error) {
            console.error("Image picking error:", error);
            showAlert('error', 'Image Error', 'Could not select image.');
        }
    };
    // --- End Image Picker Logic ---

    const showAlert = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
        setAlertType(type);
        setAlertTitle(title);
        setAlertMessage(message);
        setAlertVisible(true);
    };

    const hideAlert = () => {
        setAlertVisible(false);
    };

     const updateUserContext = (updatedUserData: AuthUser) => {
        AsyncStorage.setItem('user', JSON.stringify(updatedUserData));
        setProfilePicturePath(updatedUserData.profilePicture ?? null); // Update with relative path
        setLocalPreviewUri(null); // Clear preview URI after successful update
    };


    const handleProfileUpdate = async () => {
        setIsUpdatingProfile(true);
        let finalDbProfilePicturePath = profilePicturePath; // Start with the current relative path or null

        // 1. Check if a new local image needs uploading
        if (localPreviewUri) { // Use localPreviewUri to check if a new image was selected
            try {
                // Upload the new local image
                const uploadResponse = await userApi.uploadProfilePicture(user._id, localPreviewUri);
                finalDbProfilePicturePath = uploadResponse.user.profilePicture ?? null; // Get the relative path from the updated user object
                // Update context/storage immediately after successful upload
                updateUserContext(uploadResponse.user);
                // localPreviewUri will be cleared by updateUserContext
            } catch (uploadError: any) {
                console.error("Upload Error during profile update:", uploadError);
                showAlert('error', 'Upload Failed', `Could not upload image: ${uploadError.message || 'Unknown error'}`);
                setIsUpdatingProfile(false);
                return;
            }
        }
        // If no localPreviewUri, finalDbProfilePicturePath remains as the currently stored relative path (or null)

        // 2. Prepare the rest of the profile data
        const updatedData: UserUpdateRequest = {
            firstName,
            lastName,
            phone,
            gender,
            dateOfBirth: dateOfBirth.toISOString().split('T')[0],
            hospital: hospital || undefined,
            specialization: user.role === 'doctor' ? (specialization || undefined) : undefined,
            profilePicture: finalDbProfilePicturePath, // Send the final relative path (or null)
        };

        // 3. Update the text-based profile data (including the potentially new image path)
        try {
            // Only call updateUserById if there were text changes or if the picture path changed
            // (The upload call already updated the user if the picture was the only change)
            if (JSON.stringify(updatedData) !== JSON.stringify({ // Simple comparison, might need deeper for complex objects
                 firstName: user.firstName,
                 lastName: user.lastName,
                 phone: user.phone,
                 gender: user.gender,
                 dateOfBirth: user.dateOfBirth.split('T')[0], // Compare formatted date
                 hospital: user.hospital || undefined,
                 specialization: user.role === 'doctor' ? (user.specialization || undefined) : undefined,
                 profilePicture: user.profilePicture ?? null, // Compare existing path
             }) || finalDbProfilePicturePath !== (user.profilePicture ?? null) ) {

                const updatedUser = await userApi.updateUserById(user._id, updatedData);
                // Update context again to ensure all fields are synced
                updateUserContext(updatedUser);
                onUpdateSuccess(updatedUser); // Notify parent component
            } else if(localPreviewUri) {
                 // If only the image was uploaded and no other data changed, still notify parent
                 const currentUserDataString = await AsyncStorage.getItem('user');
                 if(currentUserDataString) {
                    onUpdateSuccess(JSON.parse(currentUserDataString));
                 }
            }

            showAlert('success', 'Success', 'Profile updated successfully!');


        } catch (error: any) {
            console.error("Profile update error (after potential upload):", error);
            showAlert('error', 'Update Failed', error.message || 'Failed to update profile details.');
        } finally {
            setIsUpdatingProfile(false);
        }
    };


    const handlePasswordUpdate = async () => {
        // Password update logic remains the same...
         if (newPassword !== confirmNewPassword) {
            showAlert('error', 'Error', 'New passwords do not match.');
            return;
        }
        if (!currentPassword || !newPassword) {
            showAlert('error', 'Error', 'Please fill in all password fields.');
            return;
        }

        setIsUpdatingPassword(true);
        const passwordData: UpdatePasswordRequest = {
            currentPassword,
            newPassword,
        };

        try {
            const response = await userApi.updatePassword(passwordData);
            showAlert('success', 'Success', response.message);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (error: any) {
            console.error("Password update error:", error);
            showAlert('error', 'Error', error.message || 'Failed to update password.');
        } finally {
            setIsUpdatingPassword(false);
        }
    };

     const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        // Date change logic remains the same...
       const currentDate = selectedDate || dateOfBirth;
       if (Platform.OS === 'android') {
            setShowDatePicker(false);
       }
       if (event.type === 'set' && selectedDate) {
            setDateOfBirth(currentDate);
       }
        if (Platform.OS === 'ios') {
            setShowDatePicker(false);
        }
    };

     // Determine the URI to display: local preview if available, otherwise construct from relative path
     const displayUri = localPreviewUri ?? (profilePicturePath ? `${SERVER_ROOT_URL}${profilePicturePath}` : null);

    return (
        <>
            {/* Update Profile Section */}
             <View style={styles.sectionHeaderContainer}>
                <FontAwesome5 name="user-edit" size={18} style={[styles.sectionHeaderIcon, { color: '#007AFF' }]} />
                <Text style={styles.sectionHeaderTitle}>Update Profile Information</Text>
            </View>
            <View style={styles.sectionContent}>
                {/* Profile Picture Picker/Display */}
                <View style={styles.profilePicContainer}>
                    <TouchableOpacity onPress={pickImage}>
                        <Image
                            source={displayUri ? { uri: displayUri } : require('../assets/placeholder-user.jpg')}
                            style={styles.profileImage}
                            resizeMode="cover"
                            key={displayUri || 'placeholder'} // Use displayUri in key
                        />
                        <View style={styles.editIconContainer}>
                           <FontAwesome5 name="camera" size={14} color="#fff" />
                        </View>
                    </TouchableOpacity>
                    
                </View>
                {/* --- End Profile Picture Section --- */}
                <TextInput
                    style={styles.input}
                    placeholder="First Name"
                    value={firstName}
                    onChangeText={setFirstName}
                    editable={!isUpdatingProfile}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Last Name"
                    value={lastName}
                    onChangeText={setLastName}
                    editable={!isUpdatingProfile}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Phone"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    editable={!isUpdatingProfile}
                />
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={gender}
                        onValueChange={(itemValue) => setGender(itemValue)}
                        enabled={!isUpdatingProfile}
                        style={styles.picker}
                    >
                        <Picker.Item label="Select Gender" value="" />
                        <Picker.Item label="Male" value="male" />
                        <Picker.Item label="Female" value="female" />
                    </Picker>
                </View>
                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateInput}>
                    <Text style={styles.dateText}>
                        {dateOfBirth.toLocaleDateString()}
                    </Text>
                </TouchableOpacity>
                {showDatePicker && (
                    <DateTimePicker
                        testID="dateTimePicker"
                        value={dateOfBirth}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onDateChange}
                        maximumDate={new Date()}
                    />
                )}
                {user.role === 'doctor' && (
                    <>
                        <TextInput
                            style={styles.input}
                            placeholder="Specialization"
                            value={specialization}
                            onChangeText={setSpecialization}
                            editable={!isUpdatingProfile}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Hospital (Optional)"
                            value={hospital}
                            onChangeText={setHospital}
                            editable={!isUpdatingProfile}
                        />
                    </>
                )}
                <TouchableOpacity
                    style={[styles.button, (isUpdatingProfile || isUpdatingPassword) && styles.buttonDisabled]}
                    onPress={handleProfileUpdate}
                    disabled={isUpdatingProfile || isUpdatingPassword}
                >
                    <Text style={styles.buttonText}>
                        {isUpdatingProfile ? 'Saving...' : 'Update Profile'}
                    </Text>
                    {isUpdatingProfile ? (
                        <ActivityIndicator color="#fff" style={styles.buttonLoader} />
                    ) : (
                        <Ionicons name="save-outline" size={20} color="#fff" style={styles.buttonIcon} />
                    )}
                </TouchableOpacity>
            </View>

            {/* Change Password Section */}
             <View style={[styles.sectionHeaderContainer, { marginTop: 30 }]}>
                 <FontAwesome5 name="key" size={18} style={[styles.sectionHeaderIcon, { color: '#ff8c00' }]} />
                 <Text style={styles.sectionHeaderTitle}>Change Password</Text>
             </View>
             <View style={styles.sectionContent}>
                <TextInput
                    style={styles.input}
                    placeholder="Current Password"
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry
                    editable={!isUpdatingPassword && !isUpdatingProfile}
                />
                <TextInput
                    style={styles.input}
                    placeholder="New Password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    editable={!isUpdatingPassword && !isUpdatingProfile}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Confirm New Password"
                    value={confirmNewPassword}
                    onChangeText={setConfirmNewPassword}
                    secureTextEntry
                    editable={!isUpdatingPassword && !isUpdatingProfile}
                />
                <TouchableOpacity
                    style={[styles.button, styles.passwordButton, (isUpdatingPassword || isUpdatingProfile) && styles.buttonDisabled]}
                    onPress={handlePasswordUpdate}
                    disabled={isUpdatingPassword || isUpdatingProfile}
                >
                    <Text style={styles.buttonText}>
                        {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                    </Text>
                    {isUpdatingPassword ? (
                        <ActivityIndicator color="#fff" style={styles.buttonLoader} />
                    ) : (
                        <Ionicons name="key-outline" size={20} color="#fff" style={styles.buttonIcon} />
                    )}
                </TouchableOpacity>
            </View>

            {/* Alert component */}
            <CustomAlert
                visible={alertVisible}
                type={alertType}
                title={alertTitle}
                message={alertMessage}
                onDismiss={hideAlert}
                buttons={[{ text: 'OK', onPress: hideAlert }]}
            />
        </>
    );
};

// Styles remain the same
const styles = StyleSheet.create({
    sectionHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 15,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        alignSelf: 'flex-start',
    },
    sectionHeaderIcon: {
        marginRight: 10,
    },
    sectionHeaderTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    sectionContent: {},
    profilePicContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: '#007AFF',
        backgroundColor: '#e0e0e0',
        marginBottom: 10,
    },
    editIconContainer: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 15,
        padding: 6,
    },
    input: {
        height: 50,
        borderColor: '#ddd',
        borderWidth: 1,
        marginBottom: 15,
        paddingHorizontal: 15,
        borderRadius: 10,
        backgroundColor: '#fff',
        fontSize: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    dateInput: {
        height: 50,
        borderColor: '#ddd',
        borderWidth: 1,
        marginBottom: 15,
        paddingHorizontal: 15,
        borderRadius: 10,
        backgroundColor: '#fff',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    dateText: {
        fontSize: 16,
        color: '#333',
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 40,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    buttonDisabled: {
        backgroundColor: '#99c4ff',
        shadowOpacity: 0.1,
    },
    passwordButton: {
        backgroundColor: '#ff8c00',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginRight: 10,
    },
    buttonIcon: {
        marginLeft: 5,
    },
    buttonLoader: {
        marginLeft: 10,
    },
    pickerContainer: {
        height: 50,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        marginBottom: 15,
        backgroundColor: '#fff',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        overflow: 'hidden',
    },
    picker: {
        height: 50,
        width: '100%',
        backgroundColor: 'transparent',
    },
});

export default ProfileUpdateForm;