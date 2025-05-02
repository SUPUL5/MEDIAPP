import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Text,
    ScrollView,
    Platform,
    ImageBackground, // Added
    Dimensions,      // Added
    Animated,        // Added
    Easing,          // Added
    Image,           // Added
    KeyboardAvoidingView, // Added
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'; // Corrected import
import { Picker } from '@react-native-picker/picker';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons'; // Using Ionicons for consistency
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
const INPUT_TEXT_COLOR = '#333'; // Define input text color

const LOGO_SIZE = 140;

const screenHeight = Dimensions.get('window').height;
const screenWidth = Dimensions.get('window').width; // Keep for potential future use

const AnimatedText = Animated.createAnimatedComponent(Text);
// --- End Reusing styles and constants ---

type SignupStep2RouteProp = RouteProp<RootStackParamList, 'SignupStep2'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'SignupStep2'>;

const SignupStep2 = () => {
    const route = useRoute<SignupStep2RouteProp>();
    const navigation = useNavigation<NavigationProp>();
    const { role } = route.params;

    // State remains the same
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [specialization, setSpecialization] = useState(''); // Doctor specific
    const [hospital, setHospital] = useState('');             // Doctor specific
    const [gender, setGender] = useState<'male' | 'female'>('male'); // Type gender state
    const [dateOfBirth, setDateOfBirth] = useState(new Date(new Date().setFullYear(new Date().getFullYear() - 18))); // Default to 18 years ago
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [alertConfig, setAlertConfig] = useState({
        visible: false,
        type: 'error' as 'success' | 'error' | 'warning' | 'info',
        title: '',
        message: ''
    });

    // Refs for focusing inputs
    const lastNameRef = useRef<TextInput>(null);
    const phoneRef = useRef<TextInput>(null);
    const specializationRef = useRef<TextInput>(null); // Doctor specific
    const hospitalRef = useRef<TextInput>(null);       // Doctor specific


    // --- Animation Setup (Logo Scale and Header Color only) ---
    const logoAnimValue = useRef(new Animated.Value(0)).current;
    const gradientAnimValue = useRef(new Animated.Value(0)).current;

    const gradientColors = [TEAL_COLOR, LIGHT_TEAL_COLOR, DARK_TEAL_COLOR, TEAL_COLOR];

    useEffect(() => {
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
    }, [logoAnimValue, gradientAnimValue]);

    const scaleLogo = logoAnimValue.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.08, 1] });
    const interpolatedTextColor = gradientAnimValue.interpolate({ inputRange: [0, 0.33, 0.66, 1], outputRange: gradientColors });

    const animatedStyleLogo = { transform: [{ scale: scaleLogo }] };
    const animatedStyleHeaderText = { color: interpolatedTextColor };
    // --- End Animation Setup ---


    // Date Picker Handler (Type event correctly)
    const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        const currentDate = selectedDate || dateOfBirth;
        setShowDatePicker(Platform.OS === 'ios'); // Keep visible on iOS until dismissed
        // Prevent selecting future dates if DateTimePicker doesn't enforce maximumDate strictly on all platforms/modes
        if (currentDate <= new Date()) {
            setDateOfBirth(currentDate);
        } else {
            // Optionally show an alert if a future date is selected
            showAlert('warning', 'Invalid Date', 'Please select a date of birth in the past.');
            setDateOfBirth(new Date(new Date().setFullYear(new Date().getFullYear() - 18))); // Reset to default or last valid date
        }
        // Hide picker on Android after selection
        if (Platform.OS === 'android') {
             setShowDatePicker(false);
        }
    };

    const showDateSelector = () => {
        setShowDatePicker(true);
    };

    // Alert Handler
    const showAlert = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
        setAlertConfig({ visible: true, type, title, message });
    };

    // Validation Logic (minor adjustments for clarity)
    const validateForm = () => {
         // Basic fields check
         if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
             showAlert('warning', 'Missing Information', 'Please fill in First Name, Last Name, and Phone Number.');
             return false;
         }
         // Phone number format (basic check - can be improved)
         if (!/^\+?[0-9\s-()]{7,}$/.test(phone)) {
            showAlert('warning', 'Invalid Phone', 'Please enter a valid phone number.');
            return false;
         }

        // Doctor specific fields
        if (role === 'doctor') {
            if (!specialization.trim()) {
                showAlert('warning', 'Missing Information', 'Please enter your specialization.');
                return false;
            }
            if (!hospital.trim()) {
                showAlert('warning', 'Missing Information', 'Please enter the hospital/clinic name.');
                return false;
            }
        }

        // Date check (ensure a valid date was actually picked, not just initial default)
        // This might depend on whether the initial default is acceptable
         if (dateOfBirth > new Date(new Date().setFullYear(new Date().getFullYear() - 1))) { // Example: Ensure user is at least 1 year old
             showAlert('warning', 'Invalid Date', 'Please select a valid date of birth.');
             return false;
         }

        return true;
    };

    // Navigation Logic
    const handleNext = () => {
        if (!validateForm()) return;

        navigation.navigate('SignupStep3', { // Navigate instead of replace if back navigation is desired
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone.trim(),
            gender,
            dateOfBirth, // Send as Date object or formatted string? API might prefer ISO string: dateOfBirth.toISOString()
            specialization: role === 'doctor' ? specialization.trim() : undefined,
            hospital: role === 'doctor' ? hospital.trim() : undefined,
            role
        });
    };

    const handleGoBack = () => {
        navigation.goBack(); // Go back to Step 1
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
                        <AnimatedText style={[styles.headerText, animatedStyleHeaderText]}>
                            Create Account
                        </AnimatedText>
                    </View>
                </ImageBackground>

                <View style={styles.contentContainer}>
                    <Text style={styles.stepText}>Step 2 of 3</Text>
                    <Text style={styles.subHeaderText}>Personal Information</Text>
                    <Text style={styles.poweredByText}>powered by University</Text>

                    <Animated.View style={[styles.logoContainer, animatedStyleLogo]}>
                         <Image
                            source={require('../assets/logo.jpg')}
                            style={styles.logo}
                        />
                     </Animated.View>

                    {/* Form using consistent input styles */}
                    <View style={styles.form}>
                        {/* First Name */}
                        <View style={styles.inputContainer}>
                            <Ionicons name="person-outline" size={22} color={GREY_COLOR} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="First Name"
                                placeholderTextColor={GREY_COLOR}
                                value={firstName}
                                onChangeText={setFirstName}
                                autoCapitalize="words"
                                returnKeyType="next"
                                onSubmitEditing={() => lastNameRef.current?.focus()}
                                blurOnSubmit={false}
                            />
                        </View>

                        {/* Last Name */}
                        <View style={styles.inputContainer}>
                             <Ionicons name="person-outline" size={22} color={GREY_COLOR} style={styles.inputIcon} />
                             <TextInput
                                ref={lastNameRef}
                                style={styles.input}
                                placeholder="Last Name"
                                placeholderTextColor={GREY_COLOR}
                                value={lastName}
                                onChangeText={setLastName}
                                autoCapitalize="words"
                                returnKeyType="next"
                                onSubmitEditing={() => phoneRef.current?.focus()}
                                blurOnSubmit={false}
                             />
                        </View>

                         {/* Phone Number */}
                        <View style={styles.inputContainer}>
                             <Ionicons name="call-outline" size={22} color={GREY_COLOR} style={styles.inputIcon} />
                             <TextInput
                                ref={phoneRef}
                                style={styles.input}
                                placeholder="Phone Number"
                                placeholderTextColor={GREY_COLOR}
                                value={phone}
                                onChangeText={setPhone}
                                keyboardType="phone-pad"
                                autoComplete='tel'
                                textContentType='telephoneNumber'
                                returnKeyType={role === 'doctor' ? "next" : "done"} // Change based on role
                                onSubmitEditing={() => {
                                    if (role === 'doctor') specializationRef.current?.focus();
                                    // else if no more fields, could trigger validation/next
                                }}
                                blurOnSubmit={false}
                             />
                        </View>

                         {/* Doctor Specific Fields */}
                        {role === 'doctor' && (
                            <>
                                {/* Specialization */}
                                <View style={styles.inputContainer}>
                                    {/* Consider 'school-outline' or 'ribbon-outline' */}
                                    <Ionicons name="ribbon-outline" size={22} color={GREY_COLOR} style={styles.inputIcon} />
                                    <TextInput
                                        ref={specializationRef}
                                        style={styles.input}
                                        placeholder="Specialization (e.g., Cardiology)"
                                        placeholderTextColor={GREY_COLOR}
                                        value={specialization}
                                        onChangeText={setSpecialization}
                                        autoCapitalize="words"
                                        returnKeyType="next"
                                        onSubmitEditing={() => hospitalRef.current?.focus()}
                                        blurOnSubmit={false}
                                    />
                                </View>

                                {/* Hospital */}
                                <View style={styles.inputContainer}>
                                    <Ionicons name="business-outline" size={22} color={GREY_COLOR} style={styles.inputIcon} />
                                    <TextInput
                                        ref={hospitalRef}
                                        style={styles.input}
                                        placeholder="Hospital / Clinic Name"
                                        placeholderTextColor={GREY_COLOR}
                                        value={hospital}
                                        onChangeText={setHospital}
                                        autoCapitalize="words"
                                        returnKeyType="done" // Or next if more fields follow
                                        // onSubmitEditing={() => { /* focus next or submit */ }}
                                        blurOnSubmit={false}
                                    />
                                </View>
                            </>
                        )}

                        {/* Date of Birth Picker Trigger */}
                         <TouchableOpacity
                            style={styles.inputContainer}
                            onPress={showDateSelector}
                            activeOpacity={0.7}
                         >
                            <Ionicons name="calendar-outline" size={22} color={GREY_COLOR} style={styles.inputIcon} />
                            <Text style={[styles.inputText, !dateOfBirth && styles.placeholderText]}>
                                {/* Format date nicely */}
                                {dateOfBirth ? dateOfBirth.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Date of Birth'}
                            </Text>
                         </TouchableOpacity>

                        {/* Date Picker Modal */}
                        {showDatePicker && (
                            <DateTimePicker
                                value={dateOfBirth}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={onDateChange}
                                maximumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 1))} // Example: Max date is yesterday or 1yr ago
                                // minimumDate can also be set
                                // textColor={Platform.OS === 'ios' ? DARK_TEAL_COLOR : undefined} // Optional iOS styling
                                // accentColor={Platform.OS === 'android' ? TEAL_COLOR : undefined} // Optional Android styling
                            />
                        )}

                         {/* Gender Picker */}
                         <View style={styles.inputContainer}>
                             <Ionicons name="male-female-outline" size={22} color={GREY_COLOR} style={styles.inputIcon} />
                             <Picker
                                selectedValue={gender}
                                style={styles.picker}
                                onValueChange={(itemValue: 'male' | 'female') => setGender(itemValue)}
                                dropdownIconColor={GREY_COLOR} // Style dropdown icon
                                mode="dropdown" // Use dropdown mode on Android
                             >
                                 <Picker.Item label="Male" value="male" style={styles.pickerItem}/>
                                 <Picker.Item label="Female" value="female" style={styles.pickerItem}/>
                                 {/* Add 'Other' or 'Prefer not to say' if needed */}
                             </Picker>
                         </View>


                        {/* Next Button */}
                        <TouchableOpacity
                            style={styles.button}
                            onPress={handleNext}
                        >
                            <Text style={styles.buttonText}>Next Step</Text>
                        </TouchableOpacity>

                        {/* Back Link */}
                         <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
                             <Text style={styles.backText}>
                                Back to Role Selection
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
    },
    logo: { // Slightly smaller logo for signup steps
        width: LOGO_SIZE * 0.9,
        height: LOGO_SIZE * 0.9,
        borderRadius: (LOGO_SIZE * 0.9) / 2,
        borderWidth: 3,
        borderColor: LIGHT_TEAL_COLOR,
    },
    form: { // Container for all inputs
       width: '100%',
       marginTop: 10, // Add some space before first input
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
        color: INPUT_TEXT_COLOR, // Use defined text color
        paddingVertical: 0, // Remove default padding
    },
    inputText: { // Style for text displayed in TouchableOpacity (like DatePicker trigger)
        flex: 1,
        height: '100%',
        fontSize: 16,
        color: INPUT_TEXT_COLOR,
        textAlignVertical: 'center', // Align text vertically
        paddingLeft: Platform.OS === 'ios' ? 0 : 4, // Adjust padding inconsistencies
         lineHeight: 20, // Adjust line height for vertical centering
    },
    placeholderText: { // Style for placeholder-like text in TouchableOpacity
        color: GREY_COLOR,
    },
    picker: { // Style for the Picker component itself
        flex: 1,
        height: '100%', // Ensure picker takes full height of container
        color: INPUT_TEXT_COLOR, // Text color for selected item
        // marginLeft: -8, // Adjust positioning if needed
        // marginRight: -8, // Adjust positioning if needed
        // backgroundColor: 'transparent', // Make background transparent on Android if needed
    },
     pickerItem: { // Style individual picker items (might have limited effect)
         fontSize: 16,
         color: INPUT_TEXT_COLOR,
        // backgroundColor: WHITE_COLOR, // Background for dropdown items
     },
    button: { // Standard button style
        backgroundColor: TEAL_COLOR,
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        marginTop: 10, // Spacing above button
        marginBottom: 15,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
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
        // Replaced link style with plain text for 'Back'
    },
    // No backLink style needed here if just plain text
});

export default SignupStep2;