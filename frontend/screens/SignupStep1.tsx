import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Text,
    ScrollView,
    ImageBackground, // Added
    Dimensions,      // Added
    Animated,        // Added
    Easing,          // Added
    Image,           // Added
    KeyboardAvoidingView, // Added
    Platform         // Added
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons'; // Keeping Material Icons
import { RootStackParamList } from '../types/navigation.types';
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
const screenWidth = Dimensions.get('window').width; // Keep for potential future use

const AnimatedText = Animated.createAnimatedComponent(Text);
// --- End Reusing styles and constants ---

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'SignupStep1'>;

const SignupStep1 = () => {
    const [role, setRole] = useState<'patient' | 'doctor'>('patient');
    const navigation = useNavigation<NavigationProp>();
    const [alertConfig, setAlertConfig] = useState({
        visible: false,
        type: 'error' as 'success' | 'error' | 'warning' | 'info',
        title: '',
        message: ''
    });

    // --- Animation Setup (Logo Scale and Header Color only) ---
    const logoAnimValue = useRef(new Animated.Value(0)).current;
    const gradientAnimValue = useRef(new Animated.Value(0)).current;

    const gradientColors = [TEAL_COLOR, LIGHT_TEAL_COLOR, DARK_TEAL_COLOR, TEAL_COLOR];

    useEffect(() => {
        // Start animations
        const logoAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(logoAnimValue, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(logoAnimValue, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])
        );
        const gradientTextAnimation = Animated.loop(
            Animated.timing(gradientAnimValue, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: false })
        );

        logoAnimation.start();
        gradientTextAnimation.start();

        return () => {
            logoAnimation.stop();
            gradientTextAnimation.stop();
        };
    }, [logoAnimValue, gradientAnimValue]); // Only include dependencies for used animations

    const scaleLogo = logoAnimValue.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.08, 1] });
    const interpolatedTextColor = gradientAnimValue.interpolate({ inputRange: [0, 0.33, 0.66, 1], outputRange: gradientColors });

    // Only include animated styles that are actually used
    const animatedStyleLogo = { transform: [{ scale: scaleLogo }] };
    const animatedStyleHeaderText = { color: interpolatedTextColor };
    // --- End Animation Setup ---

    const showAlert = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
        setAlertConfig({ visible: true, type, title, message });
    };

    const handleNext = () => {
        // Navigate to Step 2, passing the selected role
        navigation.navigate('SignupStep2', { role });
    };

     const handleLoginPress = () => {
        navigation.navigate('Login'); // Navigate back to Login
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
                    source={require('../assets/login-bg.jpg')} // Use consistent background
                    style={styles.backgroundImage}
                    resizeMode="cover"
                >
                    <View style={styles.headerContent}>
                        {/* Header Text with color animation */}
                        {/* NO horizontal transform animation applied */}
                        <AnimatedText style={[styles.headerText, animatedStyleHeaderText]}>
                            Create Account
                        </AnimatedText>
                    </View>
                </ImageBackground>

                <View style={styles.contentContainer}>
                    {/* Step Indicator */}
                    <Text style={styles.stepText}>Step 1 of 3</Text>

                    {/* Subtitle */}
                    <Text style={styles.subHeaderText}>Select Your Role</Text>

                    {/* Powered By */}
                    <Text style={styles.poweredByText}>powered by University</Text>

                    {/* Animated Logo */}
                    <Animated.View style={[styles.logoContainer, animatedStyleLogo]}>
                         <Image
                            source={require('../assets/logo.jpg')} // Use consistent logo
                            style={styles.logo}
                        />
                     </Animated.View>

                    {/* Role Selection Cards */}
                    <View style={styles.roleContainer}>
                        <TouchableOpacity
                            style={[styles.roleCard, role === 'patient' && styles.selectedRole]}
                            onPress={() => setRole('patient')}
                            activeOpacity={0.7} // Add feedback
                        >
                            <MaterialIcons name="person" size={48} color={role === 'patient' ? WHITE_COLOR : TEAL_COLOR} />
                            <Text style={[styles.roleText, role === 'patient' && styles.selectedRoleText]}>
                            Patient
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.roleCard, role === 'doctor' && styles.selectedRole]}
                            onPress={() => setRole('doctor')}
                             activeOpacity={0.7} // Add feedback
                        >
                            {/* Consider a different icon if 'medical-services' doesn't fit */}
                            <MaterialIcons name="medical-services" size={48} color={role === 'doctor' ? WHITE_COLOR : TEAL_COLOR} />
                            <Text style={[styles.roleText, role === 'doctor' && styles.selectedRoleText]}>
                            Doctor
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Next Button */}
                    <TouchableOpacity style={styles.button} onPress={handleNext}>
                        <Text style={styles.buttonText}>Next Step</Text>
                    </TouchableOpacity>

                    {/* Back to Login Link */}
                     <TouchableOpacity onPress={handleLoginPress} style={styles.backButton}>
                         <Text style={styles.backText}>
                            Already have an account? <Text style={styles.backLink}>Login</Text>
                         </Text>
                     </TouchableOpacity>

                </View>

                <CustomAlert
                    visible={alertConfig.visible}
                    type={alertConfig.type}
                    title={alertConfig.title}
                    message={alertConfig.message}
                    buttons={[{
                        text: 'OK',
                        onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
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
        height: screenHeight * 0.25, // Slightly smaller header background
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerContent: {
        padding: 20,
        marginTop: 20, // Adjust margin
        alignItems: 'center',
    },
    headerText: { // Based on Login's signInText
        fontSize: 40, // Slightly smaller
        fontWeight: 'bold',
        textAlign: 'center',
    },
    contentContainer: {
        backgroundColor: WHITE_COLOR,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingHorizontal: 25,
        paddingTop: 20, // Adjust padding
        paddingBottom: 20,
        marginTop: -30, // Overlap effect
        flex: 1,
        alignItems: 'center',
    },
    stepText: { // Style for step indicator
        fontSize: 14,
        color: GREY_COLOR,
        textAlign: 'center',
        marginBottom: 5,
        fontWeight: '500',
    },
    subHeaderText: { // Subtitle style
        fontSize: 22,
        color: DARK_TEAL_COLOR,
        marginBottom: 5,
        textAlign: 'center',
        fontWeight: '600',
    },
    poweredByText: { // Copied from Login
        fontSize: 12,
        color: ACCENT_TEAL_COLOR,
        marginBottom: 15, // Adjust margin
        textAlign: 'center',
    },
    logoContainer: { // Copied from Login
        marginBottom: 20, // Adjust margin
    },
    logo: { // Copied from Login
        width: LOGO_SIZE * 0.9, // Slightly smaller logo for this screen
        height: LOGO_SIZE * 0.9,
        borderRadius: (LOGO_SIZE * 0.9) / 2,
        borderWidth: 3,
        borderColor: LIGHT_TEAL_COLOR,
    },
    roleContainer: { // Container for role cards
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginVertical: 25, // Adjust vertical spacing
    },
    roleCard: { // Style for the role selection cards
        width: screenWidth * 0.38, // Responsive width
        maxWidth: 150, // Max width
        aspectRatio: 1, // Make it square
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: WHITE_COLOR,
        borderRadius: 25, // Adjust border radius
        borderWidth: 2,
        borderColor: LIGHT_TEAL_COLOR, // Use light teal for border
        marginHorizontal: 5, // Adjust horizontal spacing
        elevation: 3, // Consistent elevation
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        padding: 10, // Add some padding
    },
    selectedRole: { // Style for the selected card
        backgroundColor: TEAL_COLOR, // Use main teal for selected background
        borderColor: TEAL_COLOR, // Match border color
        elevation: 6, // Increase elevation when selected
        shadowOpacity: 0.25,
    },
    roleText: { // Style for the text inside the card
        marginTop: 10, // Adjust spacing
        color: TEAL_COLOR, // Use main teal for unselected text
        fontWeight: 'bold',
        fontSize: 16, // Adjust font size
        textAlign: 'center',
    },
    selectedRoleText: { // Style for text when card is selected
        color: WHITE_COLOR, // White text when selected
    },
    button: { // Copied from Login
        backgroundColor: TEAL_COLOR,
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%', // Full width button
        marginTop: 15, // Adjust margin
        marginBottom: 15, // Adjust margin
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    buttonText: { // Copied from Login
        color: WHITE_COLOR,
        fontSize: 18,
        fontWeight: 'bold',
    },
    // Copied styles for "Back to Login" link
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

export default SignupStep1;