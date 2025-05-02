import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Text,
    ScrollView,
    ImageBackground, // Added
    Dimensions,      // Added
    // Removed Animated
    // Removed Easing
    Image,           // Added
    KeyboardAvoidingView, // Added
    Platform,         // Added
    ActivityIndicator // Added for loading state
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons'; // Using Ionicons
import { RootStackParamList } from '../types/navigation.types';
import CustomAlert from '../components/CustomAlert';
import userApi from '../api/userApi'; // Assuming userApi is correctly set up

// --- Reusing styles and constants from Login ---
const TEAL_COLOR = '#009688';
const LIGHT_TEAL_COLOR = '#B2DFDB';
const DARK_TEAL_COLOR = '#00796B';
const WHITE_COLOR = '#FFFFFF';
const GREY_COLOR = '#757575';
const LIGHT_GREY_COLOR = '#EEEEEE';
const BORDER_COLOR = '#BDBDBD';
const ACCENT_TEAL_COLOR = '#4DB6AC';
const INPUT_TEXT_COLOR = '#333';

const LOGO_SIZE = 140;

const screenHeight = Dimensions.get('window').height;
const screenWidth = Dimensions.get('window').width;

// Removed AnimatedText
// --- End Reusing styles and constants ---

type SignupStep3RouteProp = RouteProp<RootStackParamList, 'SignupStep3'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'SignupStep3'>;

const SignupStep3 = () => {
    const route = useRoute<SignupStep3RouteProp>();
    const navigation = useNavigation<NavigationProp>();
    const { firstName, lastName, phone, gender, dateOfBirth, specialization, hospital, role } = route.params;

    // State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false); // Use for loading state
    const [alertConfig, setAlertConfig] = useState({
        visible: false,
        type: 'error' as 'success' | 'error' | 'warning' | 'info',
        title: '',
        message: ''
    });

    // Refs
    const passwordRef = useRef<TextInput>(null);
    const confirmPasswordRef = useRef<TextInput>(null);

    // --- Removed Animation Setup ---

    // Alert Handler
    const showAlert = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
        setAlertConfig({ visible: true, type, title, message });
    };

    // Validation (minor adjustments)
    const validateForm = () => {
        if (!email.trim() || !password || !confirmPassword) {
            showAlert('warning', 'Missing Information', 'Please fill in Email, Password, and Confirm Password.');
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            showAlert('warning', 'Invalid Email', 'Please enter a valid email address.');
            return false;
        }

        if (password.length < 6) {
            showAlert('warning', 'Weak Password', 'Password must be at least 6 characters long.');
            return false;
        }

        if (password !== confirmPassword) {
            showAlert('warning', 'Password Mismatch', 'The passwords you entered do not match.');
            confirmPasswordRef.current?.focus(); // Focus confirm field on mismatch
            return false;
        }

        return true;
    };

    // Registration Handler
    const handleRegister = async () => {
        if (!validateForm() || isSubmitting) return; // Prevent double submission
        setIsSubmitting(true);

        try {
            const userData = {
                firstName,
                lastName,
                email: email.trim(), // Send trimmed email
                password, // Password should be sent as is
                role,
                phone,
                gender,
                dateOfBirth: typeof dateOfBirth === 'string' ? dateOfBirth : dateOfBirth.toISOString(), // Ensure it's ISO string if Date object
                // Conditionally add doctor-specific fields
                ...(role === 'doctor' && specialization && { specialization }),
                ...(role === 'doctor' && hospital && { hospital })
            };

            // console.log('Submitting User Data:', userData); // For debugging
            await userApi.register(userData);

            // Show success and navigate on dismiss
            showAlert('success', 'Registration Initiated', 'A verification email has been sent to your address. Please check your inbox (and spam folder) to complete registration.');

        } catch (error: any) {
            // console.error('Registration Error:', error.response || error); // For debugging
            const message = error.response?.data?.message || 'Registration failed. Please check your details or try again later.';
            showAlert('error', 'Registration Failed', message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Password Visibility Toggles
    const togglePasswordVisibility = () => setIsPasswordVisible(!isPasswordVisible);
    const toggleConfirmPasswordVisibility = () => setIsConfirmPasswordVisible(!isConfirmPasswordVisible);

    // Navigation Back
    const handleGoBack = () => {
        navigation.goBack();
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardAvoidingView}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <ImageBackground
                    source={require('../assets/login-bg.jpg')}
                    style={styles.backgroundImage}
                    resizeMode="cover"
                >
                    <View style={styles.headerContent}>
                        {/* Replaced AnimatedText with Text */}
                        <Text style={styles.headerText}>
                            Create Account
                        </Text>
                    </View>
                </ImageBackground>

                <View style={styles.contentContainer}>
                    <Text style={styles.stepText}>Step 3 of 3</Text>
                    <Text style={styles.subHeaderText}>Account Credentials</Text>
                    <Text style={styles.poweredByText}>powered by University</Text>

                    {/* Replaced Animated.View with View */}
                    <View style={styles.logoContainer}>
                         <Image
                            source={require('../assets/logo.jpg')}
                            style={styles.logo}
                        />
                     </View>

                    {/* Form using consistent input styles */}
                    <View style={styles.form}>
                        {/* Email Input */}
                        <View style={styles.inputContainer}>
                            <Ionicons name="mail-outline" size={22} color={GREY_COLOR} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Email Address"
                                placeholderTextColor={GREY_COLOR}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoComplete='email'
                                textContentType='emailAddress'
                                returnKeyType="next"
                                onSubmitEditing={() => passwordRef.current?.focus()}
                                blurOnSubmit={false}
                            />
                        </View>

                         {/* Password Input */}
                         <View style={styles.inputContainer}>
                             <Ionicons name="lock-closed-outline" size={22} color={GREY_COLOR} style={styles.inputIcon} />
                             <TextInput
                                ref={passwordRef}
                                style={styles.input}
                                placeholder="Password"
                                placeholderTextColor={GREY_COLOR}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!isPasswordVisible}
                                returnKeyType="next"
                                textContentType='newPassword' // Hint for password managers
                                onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                                blurOnSubmit={false}
                             />
                             <TouchableOpacity onPress={togglePasswordVisibility} style={styles.eyeIcon}>
                                <Ionicons name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} size={24} color={GREY_COLOR} />
                             </TouchableOpacity>
                        </View>

                         {/* Confirm Password Input */}
                         <View style={styles.inputContainer}>
                             <Ionicons name="lock-closed-outline" size={22} color={GREY_COLOR} style={styles.inputIcon} />
                             <TextInput
                                ref={confirmPasswordRef}
                                style={styles.input}
                                placeholder="Confirm Password"
                                placeholderTextColor={GREY_COLOR}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!isConfirmPasswordVisible}
                                returnKeyType="done"
                                textContentType='newPassword' // Hint for password managers
                                onSubmitEditing={handleRegister} // Submit on done
                             />
                             <TouchableOpacity onPress={toggleConfirmPasswordVisibility} style={styles.eyeIcon}>
                                <Ionicons name={isConfirmPasswordVisible ? "eye-off-outline" : "eye-outline"} size={24} color={GREY_COLOR} />
                             </TouchableOpacity>
                        </View>


                        {/* Register Button */}
                        <TouchableOpacity
                            style={[styles.button, isSubmitting && styles.buttonDisabled]}
                            onPress={handleRegister}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color={WHITE_COLOR} size="small" />
                            ) : (
                                <Text style={styles.buttonText}>Complete Registration</Text>
                            )}
                        </TouchableOpacity>

                        {/* Back Link */}
                         <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
                             <Text style={styles.backText}>
                                Back to Personal Info
                             </Text>
                         </TouchableOpacity>

                    </View>
                </View>

                <CustomAlert
                    visible={alertConfig.visible}
                    type={alertConfig.type}
                    title={alertConfig.title}
                    message={alertConfig.message}
                    buttons={[{
                        text: 'OK',
                        onPress: () => {
                            const shouldNavigate = alertConfig.type === 'success';
                            setAlertConfig(prev => ({ ...prev, visible: false }));
                            // Navigate to Verify screen only after successful registration alert dismissed
                            if (shouldNavigate) {
                                navigation.replace('Verify', { email: email.trim() });
                            }
                        }
                    }]}
                />
            </ScrollView>
        </KeyboardAvoidingView>
    );
};


// --- Styles adapted from previous components ---
const styles = StyleSheet.create({
    keyboardAvoidingView: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
        backgroundColor: WHITE_COLOR,
    },
    backgroundImage: {
        width: '100%',
        height: screenHeight * 0.25, // Consistent header height
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerContent: {
        padding: 20,
        marginTop: 20,
        alignItems: 'center',
    },
    headerText: {
        fontSize: 40,
        fontWeight: 'bold',
        textAlign: 'center',
        // Set a static color since animation is removed
        color: TEAL_COLOR, // Or DARK_TEAL_COLOR, choose one
    },
    contentContainer: {
        backgroundColor: WHITE_COLOR,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingHorizontal: 25,
        paddingTop: 20,
        marginTop: -30,
        flex: 1,
        alignItems: 'center',
    },
    stepText: {
        fontSize: 14,
        color: GREY_COLOR,
        textAlign: 'center',
        marginBottom: 5,
        fontWeight: '500',
    },
    subHeaderText: {
        fontSize: 22,
        color: DARK_TEAL_COLOR,
        marginBottom: 5,
        textAlign: 'center',
        fontWeight: '600',
    },
    poweredByText: {
        fontSize: 12,
        color: ACCENT_TEAL_COLOR,
        marginBottom: 15,
        textAlign: 'center',
    },
    logoContainer: {
        marginBottom: 20,
        // Removed transform from animatedStyleLogo
    },
    logo: {
        width: LOGO_SIZE * 0.9,
        height: LOGO_SIZE * 0.9,
        borderRadius: (LOGO_SIZE * 0.9) / 2,
        borderWidth: 3,
        borderColor: LIGHT_TEAL_COLOR,
        // Removed transform from animatedStyleLogo
    },
    form: {
       width: '100%',
       marginTop: 10,
    },
    inputContainer: { // Standard input container style
        height: 55,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: BORDER_COLOR,
        backgroundColor: LIGHT_GREY_COLOR,
        marginBottom: 18,
        borderRadius: 12,
        paddingHorizontal: 12,
    },
    inputIcon: { // Standard icon style
        marginRight: 10,
    },
    input: { // Standard text input style
        flex: 1,
        height: '100%',
        fontSize: 16,
        color: INPUT_TEXT_COLOR,
        paddingVertical: 0,
    },
    eyeIcon: { // Copied from Login/ResetPassword
        marginLeft: 10,
        padding: 5,
    },
    button: { // Standard button style
        backgroundColor: TEAL_COLOR,
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        marginTop: 10,
        marginBottom: 15,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    buttonDisabled: { // Standard disabled button style
      backgroundColor: LIGHT_TEAL_COLOR,
      elevation: 0,
    },
    buttonText: { // Standard button text style
        color: WHITE_COLOR,
        fontSize: 18,
        fontWeight: 'bold',
    },
    backButton: { // Standard back link style
        marginTop: 5,
        alignItems: 'center',
    },
    backText: { // Standard back link text style
        color: GREY_COLOR,
        fontSize: 15,
        textAlign: 'center',
    },
});

export default SignupStep3;