import React, { useState, useEffect, useRef } from 'react';
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
import { useNavigation } from '@react-navigation/native';
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

const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const screenHeight = Dimensions.get('window').height;
const screenWidth = Dimensions.get('window').width;

const AnimatedText = Animated.createAnimatedComponent(Text);
// --- End Reusing styles and constants ---

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;


const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [alertConfig, setAlertConfig] = useState({
        visible: false,
        type: 'error' as 'error' | 'success' | 'warning' | 'info',
        title: '',
        message: ''
    });
    const navigation = useNavigation<NavigationProp>();

    // --- Animation Setup (Copied from Login) ---
    const textAnimValue = useRef(new Animated.Value(0)).current;
    const logoAnimValue = useRef(new Animated.Value(0)).current;
    const gradientAnimValue = useRef(new Animated.Value(0)).current;

    const gradientColors = [TEAL_COLOR, LIGHT_TEAL_COLOR, DARK_TEAL_COLOR, TEAL_COLOR];

    useEffect(() => {
        const textAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(textAnimValue, {
                    toValue: 1,
                    duration: 2500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(textAnimValue, {
                    toValue: 0,
                    duration: 2500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );

        const logoAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(logoAnimValue, {
                    toValue: 1,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(logoAnimValue, {
                    toValue: 0,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );

         const gradientTextAnimation = Animated.loop(
              Animated.timing(gradientAnimValue, {
                toValue: 1,
                duration: 4000,
                easing: Easing.linear,
                useNativeDriver: false, // Must be false for color
              })
            );

        textAnimation.start();
        logoAnimation.start();
        gradientTextAnimation.start();

        return () => {
            textAnimation.stop();
            logoAnimation.stop();
            gradientTextAnimation.stop();
        };
    }, [textAnimValue, logoAnimValue, gradientAnimValue]);

    const translateXTopic = textAnimValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, screenWidth * 0.05],
    });
    const translateXSubtopic = textAnimValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -screenWidth * 0.05],
    });

    const scaleLogo = logoAnimValue.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [1, 1.08, 1],
    });

    const interpolatedTextColor = gradientAnimValue.interpolate({
        inputRange: [0, 0.33, 0.66, 1],
        outputRange: gradientColors,
    });

    const animatedStyleTopicWrapper = { transform: [{ translateX: translateXTopic }] };
    const animatedStyleSubtopic = { transform: [{ translateX: translateXSubtopic }] };
    const animatedStyleLogo = { transform: [{ scale: scaleLogo }] };
    const animatedStyleHeaderText = { color: interpolatedTextColor }; // Applied to the main header text
    // --- End Animation Setup ---


    const showAlert = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
        setAlertConfig({ visible: true, type, title, message });
    };

    const validateForm = () => {
        if (!email) {
            showAlert('warning', 'Missing Information', 'Please enter your email address.');
            return false;
        }
        if (!isValidEmail(email)) {
            showAlert('error', 'Invalid Email', 'Please enter a valid email address.');
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setIsLoading(true);
        try {
            await userApi.forgetPassword({ email });
            showAlert(
                'success',
                'Check Your Email',
                'Password reset instructions have been sent to your email.'
            );
            // Navigate to Verify screen *after* user dismisses the success alert
            // The navigation now happens inside the alert button's onPress if needed,
            // or we assume the user reads the alert and then might want to go back or wait.
            // Let's keep the navigation here for now, but prompt is better UX.
             navigation.navigate('Verify', {
                 email,
                 verifyType: 'resetPassword'
             });
        } catch (error: any) {
            showAlert('error', 'Request Failed', error.response?.data?.message || 'An unexpected error occurred.');
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
            style={styles.keyboardAvoidingView} // Use style from Login
        >
            <ScrollView
                contentContainerStyle={styles.scrollContainer} // Use style from Login
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <ImageBackground
                    source={require('../assets/login-bg.jpg')} // Use same background
                    style={styles.backgroundImage} // Use style from Login
                    resizeMode="cover"
                >
                    <View style={styles.headerContent}>
                        {/* Apply transform animation to the wrapper View */}
                         <Animated.View style={animatedStyleTopicWrapper}>
                             {/* Apply color animation to the inner Text */}
                             {/* Use AnimatedText for color animation */}
                             <AnimatedText style={[styles.headerText, animatedStyleHeaderText]}>
                                 Forgot Password
                             </AnimatedText>
                         </Animated.View>
                    </View>
                </ImageBackground>

                {/* Use contentContainer style from Login */}
                <View style={styles.contentContainer}>
                     {/* Animated Subtitle */}
                     <Animated.Text style={[styles.subHeaderText, animatedStyleSubtopic]}>
                         Enter email to reset password
                     </Animated.Text>
                     {/* Added Powered by text */}
                     <Text style={styles.poweredByText}>
                         powered by University
                     </Text>

                     {/* Added Animated Logo */}
                     <Animated.View style={[styles.logoContainer, animatedStyleLogo]}>
                         <Image
                            source={require('../assets/logo.jpg')} // Use same logo
                            style={styles.logo}
                        />
                     </Animated.View>


                    {/* Use form structure and styles from Login */}
                    <View style={styles.form}>
                         {/* Use inputContainer and input styles from Login */}
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
                                returnKeyType="done"
                                onSubmitEditing={handleSubmit} // Submit on done
                                blurOnSubmit={false}
                            />
                        </View>

                        {/* Use button styles from Login */}
                         <TouchableOpacity
                            style={[styles.button, isLoading && styles.buttonDisabled]}
                            onPress={handleSubmit}
                            disabled={isLoading}
                         >
                            {isLoading ? (
                                <ActivityIndicator color={WHITE_COLOR} size="small" />
                            ) : (
                                <Text style={styles.buttonText}>Send Reset Link</Text>
                            )}
                         </TouchableOpacity>

                         {/* Use signupButton style for the back link */}
                         <TouchableOpacity onPress={handleLoginPress} style={styles.backButton}>
                             <Text style={styles.backText}>
                                Remembered your password? <Text style={styles.backLink}>Login</Text>
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


// --- Styles copied and adapted from Login ---
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
        height: screenHeight * 0.30, // Match Login height
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerContent: {
        padding: 20,
        marginTop: 30, // Match Login margin
        alignItems: 'center',
    },
    // Renamed from signInText, but uses same style properties
    headerText: {
        fontSize: 38, // Slightly smaller to fit "Forgot Password"
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
        marginTop: -30, // Overlap effect like Login
        flex: 1,
        alignItems: 'center',
    },
    // Renamed from welcomeText, uses same style properties
    subHeaderText: {
        fontSize: 20, // Slightly smaller than Login's welcome
        color: DARK_TEAL_COLOR,
        marginBottom: 5,
        textAlign: 'center',
        fontWeight: '600',
    },
    poweredByText: { // Copied from Login
        fontSize: 12,
        color: ACCENT_TEAL_COLOR,
        marginBottom: 20,
        textAlign: 'center',
    },
    logoContainer: { // Copied from Login
        marginBottom: 25,
    },
    logo: { // Copied from Login
        width: LOGO_SIZE,
        height: LOGO_SIZE,
        borderRadius: LOGO_SIZE / 2,
        borderWidth: 3,
        borderColor: LIGHT_TEAL_COLOR,
    },
    form: { // Copied from Login
       width: '100%',
    },
    inputContainer: { // Copied from Login
        height: 55,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: BORDER_COLOR,
        backgroundColor: LIGHT_GREY_COLOR,
        marginBottom: 18, // Adjusted spacing a bit
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
    // No eye icon needed here
    button: { // Copied from Login
        backgroundColor: TEAL_COLOR,
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 25, // Adjusted spacing
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
    // Styles for the "Back to Login" link, mirroring signupButton/Text/Link
    backButton: { // Copied from signupButton
        marginTop: 5,
        alignItems: 'center',
    },
    backText: { // Copied from signupText
        color: GREY_COLOR,
        fontSize: 15,
        textAlign: 'center',
    },
    backLink: { // Copied from signupLink
        color: TEAL_COLOR,
        fontWeight: 'bold',
    },
});

export default ForgotPassword;