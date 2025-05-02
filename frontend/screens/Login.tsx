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
import { AuthResponse } from '../types/user';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation.types';
import userApi from '../api/userApi';
import CustomAlert from '../components/CustomAlert';

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

interface LoginProps {
    navigation: LoginScreenNavigationProp;
}

const TEAL_COLOR = '#009688';
const LIGHT_TEAL_COLOR = '#B2DFDB';
const DARK_TEAL_COLOR = '#00796B';
const WHITE_COLOR = '#FFFFFF';
const GREY_COLOR = '#757575';
const LIGHT_GREY_COLOR = '#EEEEEE';
const BORDER_COLOR = '#BDBDBD';
const ACCENT_TEAL_COLOR = '#4DB6AC';

const LOGO_SIZE = 140;

const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const isValidPassword = (password: string): boolean => {
    return password.length >= 6;
};

const screenHeight = Dimensions.get('window').height;
const screenWidth = Dimensions.get('window').width;

const AnimatedText = Animated.createAnimatedComponent(Text);

const Login = ({ navigation }: LoginProps) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const textAnimValue = useRef(new Animated.Value(0)).current;
    const logoAnimValue = useRef(new Animated.Value(0)).current;
    const gradientAnimValue = useRef(new Animated.Value(0)).current;
    const passwordInputRef = useRef<TextInput>(null);

    const gradientColors = [TEAL_COLOR, LIGHT_TEAL_COLOR, DARK_TEAL_COLOR, TEAL_COLOR];

    useEffect(() => {
        const textAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(textAnimValue, {
                    toValue: 1,
                    duration: 2500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true, // Keep native for transform
                }),
                Animated.timing(textAnimValue, {
                    toValue: 0,
                    duration: 2500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true, // Keep native for transform
                }),
            ])
        );

        const logoAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(logoAnimValue, {
                    toValue: 1,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true, // Keep native for transform
                }),
                Animated.timing(logoAnimValue, {
                    toValue: 0,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true, // Keep native for transform
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


    const animatedStyleTopicWrapper = { transform: [{ translateX: translateXTopic }] }; // Renamed for clarity
    const animatedStyleSubtopic = { transform: [{ translateX: translateXSubtopic }] };
    const animatedStyleLogo = { transform: [{ scale: scaleLogo }] };
    const animatedStyleSignInText = { color: interpolatedTextColor };


    const [alertConfig, setAlertConfig] = useState({
        visible: false,
        type: 'error' as 'error' | 'success' | 'warning' | 'info',
        title: '',
        message: ''
    });

    const showAlert = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
        setAlertConfig({ visible: true, type, title, message });
    };

    const validateForm = () => {
        if (!email || !password) {
            showAlert('warning', 'Missing Information', 'Please fill in both email and password.');
            return false;
        }
        if (!isValidEmail(email)) {
            showAlert('error', 'Invalid Email', 'Please enter a valid email address.');
            return false;
        }
        if (!isValidPassword(password)) {
            showAlert('error', 'Invalid Password', 'Password must be at least 6 characters long.');
            return false;
        }
        return true;
    };

    const handleLogin = async () => {
        if (!validateForm()) return;

        setIsLoading(true);
        try {
            const response: AuthResponse = await userApi.login(email, password);
            console.log('Login response:', response);

            if (response.user.role === 'patient') {
                navigation.replace('PatientHome');
            } else if (response.user.role === 'doctor') {
                navigation.replace('DoctorHome');
            } else if (response.user.role === 'admin') {
                navigation.replace('AdminHome');
            } else {
                showAlert('error', 'Login Failed', 'Unexpected user role.');
            }
        } catch (error: any) {
             if (error.status === 403 && error.message === 'Please verify your email first') {
                showAlert(
                    'info',
                    'Email Verification Required',
                    'Please check your email to verify your account before logging in.'
                );
                 return;
             }
            showAlert('error', 'Login Failed', error.message || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignupPress = () => {
        navigation.navigate('SignupStep1');
    };

    const handleForgotPasswordPress = () => {
        navigation.navigate('ForgotPassword');
    }

    const togglePasswordVisibility = () => {
        setIsPasswordVisible(!isPasswordVisible);
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
                         {/* Apply transform animation to the wrapper View */}
                         <Animated.View style={animatedStyleTopicWrapper}>
                             {/* Apply color animation to the inner Text */}
                             <AnimatedText style={[styles.signInText, animatedStyleSignInText]}>
                                 Sign In
                             </AnimatedText>
                         </Animated.View>
                    </View>
                </ImageBackground>

                <View style={styles.contentContainer}>
                    <Animated.Text style={[styles.welcomeText, animatedStyleSubtopic]}>
                        Welcome to MEDIAPP
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
                                returnKeyType="next"
                                onSubmitEditing={() => passwordInputRef.current?.focus()}
                                blurOnSubmit={false}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                             <Ionicons name="lock-closed-outline" size={22} color={GREY_COLOR} style={styles.inputIcon} />
                             <TextInput
                                ref={passwordInputRef}
                                style={styles.input}
                                placeholder="Password"
                                placeholderTextColor={GREY_COLOR}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!isPasswordVisible}
                                returnKeyType="done"
                                onSubmitEditing={handleLogin}
                             />
                             <TouchableOpacity onPress={togglePasswordVisibility} style={styles.eyeIcon}>
                                <Ionicons name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} size={24} color={GREY_COLOR} />
                             </TouchableOpacity>
                        </View>

                         <TouchableOpacity onPress={handleForgotPasswordPress} style={styles.forgotPasswordButton}>
                             <Text style={styles.linkText}>Forgot Password?</Text>
                         </TouchableOpacity>

                         <TouchableOpacity
                            style={[styles.button, isLoading && styles.buttonDisabled]}
                            onPress={handleLogin}
                            disabled={isLoading}
                         >
                            {isLoading ? (
                                <ActivityIndicator color={WHITE_COLOR} size="small" />
                            ) : (
                                <Text style={styles.buttonText}>Login</Text>
                            )}
                         </TouchableOpacity>
                         <TouchableOpacity onPress={handleSignupPress} style={styles.signupButton}>
                             <Text style={styles.signupText}>
                                Don't have an account? <Text style={styles.signupLink}>Sign up</Text>
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
    signInText: {
        fontSize: 42,
        fontWeight: 'bold',
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
    welcomeText: {
        fontSize: 22,
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
    inputContainer: {
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
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        height: '100%',
        fontSize: 16,
        color: '#333',
        paddingVertical: 0,
    },
    eyeIcon: {
        marginLeft: 10,
        padding: 5,
    },
    forgotPasswordButton: {
        alignSelf: 'flex-end',
        marginBottom: 25,
    },
    linkText: {
        color: TEAL_COLOR,
        fontSize: 14,
        fontWeight: '500',
    },
    button: {
        backgroundColor: TEAL_COLOR,
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 25,
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
    signupButton: {
        marginTop: 5,
        alignItems: 'center',
    },
    signupText: {
        color: GREY_COLOR,
        fontSize: 15,
        textAlign: 'center',
    },
    signupLink: {
        color: TEAL_COLOR,
        fontWeight: 'bold',
    },
});

export default Login;