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
    findNodeHandle, // Needed if using measure, etc., but not for focus/clear
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
// Assuming Ionicons is available if needed
// import { Ionicons } from '@expo/vector-icons';
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

const LOGO_SIZE = 140;

const screenHeight = Dimensions.get('window').height;
const screenWidth = Dimensions.get('window').width;

const AnimatedText = Animated.createAnimatedComponent(Text);
// --- End Reusing styles and constants ---

type VerifyScreenRouteProp = RouteProp<RootStackParamList, 'Verify'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Verify'>;

const Verify = () => {
    const [code, setCode] = useState<string[]>(['', '', '', '', '', '']); // Explicitly type state
    const [isLoading, setIsLoading] = useState(false);
    const route = useRoute<VerifyScreenRouteProp>();
    const navigation = useNavigation<NavigationProp>();
    const [alertConfig, setAlertConfig] = useState({
        visible: false,
        type: 'error' as 'error' | 'success' | 'warning' | 'info',
        title: '',
        message: ''
    });

    const isPasswordReset = route.params.verifyType === 'resetPassword';
    const userEmail = route.params.email;

    // --- Corrected Ref Handling ---
    // Create an array of refs. Use useRef to hold the array itself
    // so it persists across renders. Initialize it once.
    const inputRefs = useRef<Array<React.RefObject<TextInput>>>(
        Array(6).fill(null).map(() => React.createRef<TextInput>())
    ).current; // Use .current here to get the actual array of refs
    // --- End Corrected Ref Handling ---

    // --- Animation Setup (Copied from Login/ForgotPassword) ---
    const textAnimValue = useRef(new Animated.Value(0)).current;
    const logoAnimValue = useRef(new Animated.Value(0)).current;
    const gradientAnimValue = useRef(new Animated.Value(0)).current;

    const gradientColors = [TEAL_COLOR, LIGHT_TEAL_COLOR, DARK_TEAL_COLOR, TEAL_COLOR];

    useEffect(() => {
        // Focus first input on mount - Access .current of the specific ref object
        inputRefs[0]?.current?.focus();

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

        return () => {
            textAnimation.stop();
            logoAnimation.stop();
            gradientTextAnimation.stop();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Dependencies are animation values, but they don't change. Added eslint disable for focus logic.

    const translateXTopic = textAnimValue.interpolate({ inputRange: [0, 1], outputRange: [0, screenWidth * 0.05] });
    const translateXSubtopic = textAnimValue.interpolate({ inputRange: [0, 1], outputRange: [0, -screenWidth * 0.05] });
    const scaleLogo = logoAnimValue.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.08, 1] });
    const interpolatedTextColor = gradientAnimValue.interpolate({ inputRange: [0, 0.33, 0.66, 1], outputRange: gradientColors });

    const animatedStyleTopicWrapper = { transform: [{ translateX: translateXTopic }] };
    const animatedStyleSubtopic = { transform: [{ translateX: translateXSubtopic }] };
    const animatedStyleLogo = { transform: [{ scale: scaleLogo }] };
    const animatedStyleHeaderText = { color: interpolatedTextColor };
    // --- End Animation Setup ---

    const showAlert = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
        setAlertConfig({ visible: true, type, title, message });
    };

    const validateForm = () => {
        const enteredCode = code.join('');
        if (enteredCode.length !== 6 || code.some(digit => !digit.match(/^\d$/))) {
             showAlert('warning', 'Invalid Code', 'Please enter a valid 6-digit code.');
            return false;
        }
        return true;
    };

    const handleInputChange = (index: number, value: string) => {
        const newCode = [...code];

        // Handle single digit input or clearing the input
        if ((value.match(/^\d$/) || value === '') && index >= 0 && index < 6) {
            newCode[index] = value;
            setCode(newCode);

            // Auto-focus next input
            if (value && index < 5) {
                inputRefs[index + 1]?.current?.focus();
            }
            // Auto-focus previous input on backspace/delete if current is empty
            else if (!value && index > 0) {
                inputRefs[index - 1]?.current?.focus();
            }
        }
        // Handle pasting code
        else if (value.length > 1 && index >= 0 && index < 6) {
            const pastedCode = value.slice(0, 6 - index).split(''); // Limit paste length
            let currentFocusIndex = index;
            pastedCode.forEach((digit, i) => {
                const targetIndex = index + i;
                if (targetIndex < 6 && digit.match(/^\d$/)) {
                    newCode[targetIndex] = digit;
                    currentFocusIndex = targetIndex; // Track last filled index
                }
            });
            setCode(newCode);

            // Focus the next empty input after the paste, or the last input if full
             if (currentFocusIndex < 5) {
                 inputRefs[currentFocusIndex + 1]?.current?.focus();
             } else {
                 inputRefs[currentFocusIndex]?.current?.focus(); // Stay on last if full
             }
        }
    };


    const handleVerify = async () => {
        if (!validateForm()) return;

        const codeValue = parseInt(code.join(''), 10);
        setIsLoading(true);

        try {
            if (isPasswordReset) {
                // For password reset, navigate forward. Validation happens on next screen.
                 navigation.navigate('ResetPassword', {
                    email: userEmail,
                    code: codeValue
                });
            } else {
                // For email verification flow
                const response = await userApi.verifyEmail({
                    email: userEmail,
                    verificationCode: codeValue
                });
                showAlert('success', 'Success', 'Email verified successfully!');
                // Navigate based on user role
                // Consider navigating *after* the alert is dismissed for better UX
                // Example: Add navigation logic to the alert's button onPress
                if (response.user.role === 'patient') navigation.replace('PatientHome');
                else if (response.user.role === 'doctor') navigation.replace('DoctorHome');
                else if (response.user.role === 'admin') navigation.replace('AdminHome');
                else showAlert('error', 'Verification Failed', 'Unexpected user role.');
            }
        } catch (error: any) {
             // Provide specific error message if available
             const message = error?.response?.data?.message || error?.message || 'The code is invalid or expired.';
             showAlert('error', 'Verification Failed', message);
        } finally {
            setIsLoading(false);
        }
    };

     const handleLoginPress = () => {
        navigation.navigate('Login');
    };


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
                                 Verify Code
                             </AnimatedText>
                         </Animated.View>
                    </View>
                </ImageBackground>

                <View style={styles.contentContainer}>
                    <Animated.Text style={[styles.subHeaderText, animatedStyleSubtopic]}>
                        Enter the code sent to
                    </Animated.Text>
                     <Text style={styles.emailText}>{userEmail}</Text>
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
                         <View style={styles.codeInputContainer}>
                            {code.map((digit, index) => (
                                <TextInput
                                    key={index}
                                    style={styles.codeInput}
                                    value={digit}
                                    onChangeText={(text) => handleInputChange(index, text)}
                                    keyboardType="number-pad"
                                    maxLength={1}
                                    // Assign the correct ref object from the array
                                    ref={inputRefs[index]}
                                    caretHidden
                                    selectTextOnFocus
                                    textContentType="oneTimeCode" // Helps with auto-fill on iOS
                                    autoComplete='sms-otp' // Helps with auto-fill on Android
                                />
                            ))}
                        </View>

                         <TouchableOpacity
                            style={[styles.button, isLoading && styles.buttonDisabled]}
                            onPress={handleVerify}
                            disabled={isLoading}
                         >
                            {isLoading ? (
                                <ActivityIndicator color={WHITE_COLOR} size="small" />
                            ) : (
                                <Text style={styles.buttonText}>Verify</Text>
                            )}
                         </TouchableOpacity>

                         <TouchableOpacity onPress={handleLoginPress} style={styles.backButton}>
                             <Text style={styles.backText}>
                                Back to <Text style={styles.backLink}>Login</Text>
                             </Text>
                         </TouchableOpacity>
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
                            onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
                        }
                    ]}
                />
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

// --- Styles adapted from Login/ForgotPassword ---
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
        fontSize: 42,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    contentContainer: {
        backgroundColor: WHITE_COLOR,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingHorizontal: 25,
        paddingTop: 20,
        paddingBottom: 20,
        marginTop: -30,
        flex: 1,
        alignItems: 'center',
    },
    subHeaderText: {
        fontSize: 18,
        color: DARK_TEAL_COLOR,
        marginBottom: 2,
        textAlign: 'center',
        fontWeight: '600',
    },
    emailText: {
        fontSize: 16,
        color: GREY_COLOR,
        fontWeight: '500',
        marginBottom: 5,
        textAlign: 'center',
    },
    poweredByText: {
        fontSize: 12,
        color: ACCENT_TEAL_COLOR,
        marginBottom: 15,
        textAlign: 'center',
    },
    logoContainer: {
        marginBottom: 20,
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
       alignItems: 'center',
    },
    codeInputContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '90%',
        maxWidth: 350, // Max width for the container on larger screens
        marginBottom: 30,
    },
    codeInput: {
        height: 55,
        // Dynamic width calculation based on container width and number of inputs
        width: Dimensions.get('window').width > 400 ? 50 : '14%', // Smaller percentage on smaller screens, fixed on larger
        minWidth: 40, // Minimum width
        maxWidth: 50, // Maximum width
        borderWidth: 1.5,
        borderColor: BORDER_COLOR,
        backgroundColor: WHITE_COLOR,
        borderRadius: 10,
        textAlign: 'center',
        fontSize: 22,
        fontWeight: 'bold',
        color: DARK_TEAL_COLOR,
        padding: 0, // Remove default padding if needed
    },
    button: {
        backgroundColor: TEAL_COLOR,
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        marginBottom: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    buttonDisabled: {
      backgroundColor: LIGHT_TEAL_COLOR,
      elevation: 0,
    },
    buttonText: {
        color: WHITE_COLOR,
        fontSize: 18,
        fontWeight: 'bold',
    },
    backButton: {
        marginTop: 0,
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

export default Verify;