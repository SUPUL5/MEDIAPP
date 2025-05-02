import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Text,
    ActivityIndicator,
    ImageBackground,
    Dimensions,
    ScrollView,
    Animated,
    Easing,
    Image,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Using Expo vector icons
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation.types';
import userApi from '../api/userApi';
import CustomAlert from '../components/CustomAlert';

// --- Reusing styles and constants from Login ---
const TEAL_COLOR = '#009688';
const LIGHT_TEAL_COLOR = '#B2DFDB';
const DARK_TEAL_COLOR = '#00796B';
const WHITE_COLOR = '#FFFFFF';
const GREY_COLOR = '#757575';
const LIGHT_GREY_COLOR = '#EEEEEE';
const BORDER_COLOR = '#BDBDBD';
const ACCENT_TEAL_COLOR = '#4DB6AC';

const LOGO_SIZE = 140; // Same logo size as Login

const isValidPassword = (password: string): boolean => {
    // Keep your existing password validation logic (e.g., length >= 6)
    // You could add more complexity here if needed (uppercase, number, symbol)
    return password.length >= 6;
};

const screenHeight = Dimensions.get('window').height;
const screenWidth = Dimensions.get('window').width;

const AnimatedText = Animated.createAnimatedComponent(Text);
// --- End Reusing styles and constants ---

type ResetPasswordScreenRouteProp = RouteProp<RootStackParamList, 'ResetPassword'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ResetPassword'>;

const ResetPassword = () => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [alertConfig, setAlertConfig] = useState({
        visible: false,
        type: 'error' as 'error' | 'success' | 'warning' | 'info',
        title: '',
        message: ''
    });
    const route = useRoute<ResetPasswordScreenRouteProp>();
    const navigation = useNavigation<NavigationProp>();

    // Refs for input fields
    const newPasswordInputRef = useRef<TextInput>(null);
    const confirmPasswordInputRef = useRef<TextInput>(null);

    // --- Animation Setup (Copied from previous components) ---
    const textAnimValue = useRef(new Animated.Value(0)).current;
    const logoAnimValue = useRef(new Animated.Value(0)).current;
    const gradientAnimValue = useRef(new Animated.Value(0)).current;

    const gradientColors = [TEAL_COLOR, LIGHT_TEAL_COLOR, DARK_TEAL_COLOR, TEAL_COLOR];

    useEffect(() => {
        // Start animations
        const textAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(textAnimValue, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(textAnimValue, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])
        );
        const logoAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(logoAnimValue, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(logoAnimValue, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])
        );
        const gradientTextAnimation = Animated.loop(
            Animated.timing(gradientAnimValue, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: false })
        );

        textAnimation.start();
        logoAnimation.start();
        gradientTextAnimation.start();

        // Focus first input on mount
        newPasswordInputRef.current?.focus();

        return () => {
            textAnimation.stop();
            logoAnimation.stop();
            gradientTextAnimation.stop();
        };
    }, [textAnimValue, logoAnimValue, gradientAnimValue]);

    const translateXTopic = textAnimValue.interpolate({ inputRange: [0, 1], outputRange: [0, screenWidth * 0.05] });
    const translateXSubtopic = textAnimValue.interpolate({ inputRange: [0, 1], outputRange: [0, -screenWidth * 0.05] });
    const scaleLogo = logoAnimValue.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.08, 1] });
    const interpolatedTextColor = gradientAnimValue.interpolate({ inputRange: [0, 0.33, 0.66, 1], outputRange: gradientColors });

    const animatedStyleTopicWrapper = { transform: [{ translateX: translateXTopic }] };
    const animatedStyleSubtopic = { transform: [{ translateX: translateXSubtopic }] };
    const animatedStyleLogo = { transform: [{ scale: scaleLogo }] };
    const animatedStyleHeaderText = { color: interpolatedTextColor };
    // --- End Animation Setup ---


    const showAlert = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string, onDismiss?: () => void) => {
        setAlertConfig({
            visible: true,
            type,
            title,
            message,
        });
        // Store the onDismiss callback if provided
        // Note: CustomAlert needs modification to handle onDismiss or pass navigation logic to button onPress
    };

    const validateForm = () => {
        if (!newPassword || !confirmPassword) {
            showAlert('warning', 'Missing Information', 'Please enter and confirm your new password.');
            return false;
        }
        if (!isValidPassword(newPassword)) {
            showAlert('error', 'Invalid Password', 'Password must be at least 6 characters long.');
            return false;
        }
        if (newPassword !== confirmPassword) {
            showAlert('error', 'Password Mismatch', 'The passwords you entered do not match.');
            confirmPasswordInputRef.current?.focus(); // Focus confirm password field on mismatch
            return false;
        }
        return true;
    };

    const handleResetPassword = async () => {
        if (!validateForm()) return;

        setIsLoading(true);
        try {
            await userApi.resetPassword({
                email: route.params.email,
                resetPasswordCode: route.params.code,
                newPassword: newPassword,
            });
            // Show success alert, then navigate to Login when user dismisses it
            showAlert(
                'success',
                'Password Reset Successful',
                'Your password has been updated. You can now log in with your new password.'
                // Pass navigation logic to the alert button's onPress
            );
             // Navigate immediately after showing alert (alternative approach)
             // navigation.navigate('Login');
        } catch (error: any) {
            const message = error?.response?.data?.message || 'Failed to reset password. The code might be invalid or expired.';
            showAlert('error', 'Reset Failed', message);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleNewPasswordVisibility = () => {
        setIsNewPasswordVisible(!isNewPasswordVisible);
    };

    const toggleConfirmPasswordVisibility = () => {
        setIsConfirmPasswordVisible(!isConfirmPasswordVisible);
    };

    const handleNavigateToLogin = () => {
       navigation.navigate('Login');
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
                         <Animated.View style={animatedStyleTopicWrapper}>
                             <AnimatedText style={[styles.headerText, animatedStyleHeaderText]}>
                                 Reset Password
                             </AnimatedText>
                         </Animated.View>
                    </View>
                </ImageBackground>

                <View style={styles.contentContainer}>
                    <Animated.Text style={[styles.subHeaderText, animatedStyleSubtopic]}>
                        Create your new secure password
                    </Animated.Text>
                     <Text style={styles.poweredByText}>
                         powered by University
                     </Text>

                     <Animated.View style={[styles.logoContainer, animatedStyleLogo]}>
                         <Image
                            source={require('../assets/logo.jpg')}
                            style={styles.logo}
                        />
                     </Animated.View>

                    <View style={styles.form}>
                        {/* New Password Input */}
                        <View style={styles.inputContainer}>
                             <Ionicons name="lock-closed-outline" size={22} color={GREY_COLOR} style={styles.inputIcon} />
                             <TextInput
                                ref={newPasswordInputRef}
                                style={styles.input}
                                placeholder="New Password"
                                placeholderTextColor={GREY_COLOR}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                secureTextEntry={!isNewPasswordVisible}
                                returnKeyType="next"
                                onSubmitEditing={() => confirmPasswordInputRef.current?.focus()} // Focus next input
                                blurOnSubmit={false} // Prevent keyboard dismiss
                             />
                             <TouchableOpacity onPress={toggleNewPasswordVisibility} style={styles.eyeIcon}>
                                <Ionicons name={isNewPasswordVisible ? "eye-off-outline" : "eye-outline"} size={24} color={GREY_COLOR} />
                             </TouchableOpacity>
                        </View>

                         {/* Confirm Password Input */}
                         <View style={styles.inputContainer}>
                             <Ionicons name="lock-closed-outline" size={22} color={GREY_COLOR} style={styles.inputIcon} />
                             <TextInput
                                ref={confirmPasswordInputRef}
                                style={styles.input}
                                placeholder="Confirm New Password"
                                placeholderTextColor={GREY_COLOR}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!isConfirmPasswordVisible}
                                returnKeyType="done" // Set return key to 'done' for last input
                                onSubmitEditing={handleResetPassword} // Attempt reset on 'done'
                             />
                             <TouchableOpacity onPress={toggleConfirmPasswordVisibility} style={styles.eyeIcon}>
                                <Ionicons name={isConfirmPasswordVisible ? "eye-off-outline" : "eye-outline"} size={24} color={GREY_COLOR} />
                             </TouchableOpacity>
                        </View>


                         {/* Reset Button */}
                         <TouchableOpacity
                            style={[styles.button, isLoading && styles.buttonDisabled]}
                            onPress={handleResetPassword}
                            disabled={isLoading}
                         >
                            {isLoading ? (
                                <ActivityIndicator color={WHITE_COLOR} size="small" />
                            ) : (
                                <Text style={styles.buttonText}>Set New Password</Text>
                            )}
                         </TouchableOpacity>

                         {/* Optional: Back to Login Link if needed */}
                         {/* <TouchableOpacity onPress={handleNavigateToLogin} style={styles.backButton}>
                             <Text style={styles.backText}>
                                Back to <Text style={styles.backLink}>Login</Text>
                             </Text>
                         </TouchableOpacity> */}
                    </View>
                </View>

                <CustomAlert
                    visible={alertConfig.visible}
                    type={alertConfig.type}
                    title={alertConfig.title}
                    message={alertConfig.message}
                    buttons={[
                        {
                            text: 'OK',
                            onPress: () => {
                                setAlertConfig(prev => ({ ...prev, visible: false }));
                                // Navigate to Login only after successful reset alert is dismissed
                                if (alertConfig.type === 'success') {
                                    navigation.navigate('Login');
                                }
                            }
                        }
                    ]}
                />
            </ScrollView>
        </KeyboardAvoidingView>
    );
};


// --- Styles adapted from Login/ForgotPassword/Verify ---
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
        height: screenHeight * 0.30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerContent: {
        padding: 20,
        marginTop: 30,
        alignItems: 'center',
    },
    headerText: {
        fontSize: 38, // Adjusted size
        fontWeight: 'bold',
        textAlign: 'center',
    },
    contentContainer: {
        backgroundColor: WHITE_COLOR,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingHorizontal: 25,
        paddingTop: 25,
        paddingBottom: 20,
        marginTop: -30,
        flex: 1,
        alignItems: 'center',
    },
    subHeaderText: {
        fontSize: 18, // Adjusted size
        color: DARK_TEAL_COLOR,
        marginBottom: 5,
        textAlign: 'center',
        fontWeight: '600',
    },
    poweredByText: {
        fontSize: 12,
        color: ACCENT_TEAL_COLOR,
        marginBottom: 20,
        textAlign: 'center',
    },
    logoContainer: {
        marginBottom: 25,
    },
    logo: {
        width: LOGO_SIZE,
        height: LOGO_SIZE,
        borderRadius: LOGO_SIZE / 2,
        borderWidth: 3,
        borderColor: LIGHT_TEAL_COLOR,
    },
    form: {
       width: '100%',
    },
    inputContainer: { // Copied from Login
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
    inputIcon: { // Copied from Login
        marginRight: 10,
    },
    input: { // Copied from Login
        flex: 1,
        height: '100%',
        fontSize: 16,
        color: '#333',
        paddingVertical: 0,
    },
    eyeIcon: { // Copied from Login
        marginLeft: 10,
        padding: 5,
    },
    button: { // Copied from Login
        backgroundColor: TEAL_COLOR,
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10, // Added margin top for spacing
        marginBottom: 20, // Adjusted margin
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    buttonDisabled: { // Copied from Login
      backgroundColor: LIGHT_TEAL_COLOR,
      elevation: 0,
    },
    buttonText: { // Copied from Login
        color: WHITE_COLOR,
        fontSize: 18,
        fontWeight: 'bold',
    },
    // Optional back button styles (if needed)
    backButton: {
        marginTop: 5,
        alignItems: 'center',
    },
    backText: {
        color: GREY_COLOR,
        fontSize: 15,
        textAlign: 'center',
    },
    backLink: {
        color: TEAL_COLOR,
        fontWeight: 'bold',
    },
});

export default ResetPassword;