// frontend/components/AppointmentCard.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated, Image } from 'react-native'; // Added Image
import { format, parseISO } from 'date-fns';
import { Appointment, AuthUser, User } from '../types';
import { AntDesign, FontAwesome5 } from '@expo/vector-icons';
import appointmentApi from '../api/appointmentApi';
import CustomAlert from './CustomAlert';
import { SERVER_ROOT_URL } from '../api/config'; // Import server root URL

interface AppointmentCardProps {
  appointment: Appointment;
  user: AuthUser;
  onUpdate: (updatedAppointment: Appointment) => void;
}

type ActionType = 'cancel' | 'confirm' | null;

interface CornerIcon {
    name: React.ComponentProps<typeof AntDesign>['name'] | React.ComponentProps<typeof FontAwesome5>['name'];
    library: 'AntDesign' | 'FontAwesome5';
    color: string;
}

const getCornerIcons = (status: string): CornerIcon[] => {
    const iconSize = 18;
    const defaultOpacity = 0.6;
    switch (status) {
        case 'scheduled': return [
            { name: 'calendar', library: 'AntDesign', color: `rgba(52, 152, 219, ${defaultOpacity})` }, // Blue
            { name: 'clockcircleo', library: 'AntDesign', color: `rgba(52, 152, 219, ${defaultOpacity * 0.8})` },
            { name: 'hourglass-half', library: 'FontAwesome5', color: `rgba(52, 152, 219, ${defaultOpacity * 0.6})` },
        ];
        case 'confirmed': return [
            { name: 'checkcircleo', library: 'AntDesign', color: `rgba(46, 204, 113, ${defaultOpacity})` }, // Green
            { name: 'calendar-check', library: 'FontAwesome5', color: `rgba(46, 204, 113, ${defaultOpacity * 0.8})` },
            { name: 'thumbs-up', library: 'FontAwesome5', color: `rgba(46, 204, 113, ${defaultOpacity * 0.6})` },
        ];
        case 'cancelled': return [
            { name: 'closecircleo', library: 'AntDesign', color: `rgba(231, 76, 60, ${defaultOpacity})` }, // Red
            { name: 'ban', library: 'FontAwesome5', color: `rgba(231, 76, 60, ${defaultOpacity * 0.8})` },
            { name: 'minus-circle', library: 'FontAwesome5', color: `rgba(231, 76, 60, ${defaultOpacity * 0.6})` },
        ];
        case 'completed': return [
            { name: 'check', library: 'AntDesign', color: `rgba(39, 174, 96, ${defaultOpacity})` }, // Darker Green
            { name: 'star', library: 'FontAwesome5', color: `rgba(39, 174, 96, ${defaultOpacity * 0.8})` },
            { name: 'flag-checkered', library: 'FontAwesome5', color: `rgba(39, 174, 96, ${defaultOpacity * 0.6})` },
        ];
        default: return [
            { name: 'questioncircleo', library: 'AntDesign', color: `rgba(127, 140, 141, ${defaultOpacity})` }, // Gray
        ];
    }
};


const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  user,
  onUpdate
}) => {
    const [isPressed, setIsPressed] = useState(false);
    const [alertConfig, setAlertConfig] = useState({
        visible: false,
        type: 'error' as 'error' | 'success' | 'warning' | 'info',
        title: '',
        message: '',
        confirmAction: null as (() => Promise<void>) | null,
        actionType: null as ActionType,
    });

    const animatedValues = useRef(getCornerIcons(appointment.status).map(() => new Animated.Value(0))).current;

    useEffect(() => {
        const animations = animatedValues.map((val, index) => {
            // Check if val exists before creating animation
            if (!val) return null;
            return Animated.loop(
                Animated.sequence([
                    Animated.timing(val, {
                        toValue: 1,
                        duration: 1500 + Math.random() * 500,
                        delay: index * 300 + Math.random() * 200,
                        useNativeDriver: true,
                    }),
                    Animated.timing(val, {
                        toValue: 0,
                        duration: 1500 + Math.random() * 500,
                        useNativeDriver: true,
                    }),
                ])
            );
        }).filter(anim => anim !== null) as Animated.CompositeAnimation[]; // Filter out nulls and assert type

        Animated.parallel(animations).start();

        return () => {
            animations.forEach(anim => anim.stop());
        };
    }, [appointment.status, animatedValues]);


    const showAlert = (
        type: 'success' | 'error' | 'warning' | 'info',
        title: string,
        message: string,
        confirmAction: (() => Promise<void>) | null = null,
        actionType: ActionType = null
    ) => {
        setAlertConfig({ visible: true, type, title, message, confirmAction, actionType });
    };

    const hideAlert = () => {
        setAlertConfig({ visible: false, type: 'error', title: '', message: '', confirmAction: null, actionType: null });
    };

    const handleCancelAppointment = async () => {
        showAlert(
            'warning',
            'Confirm Cancellation',
            'Are you sure you want to cancel this appointment?',
            async () => {
                try {
                    const updatedAppointment = await appointmentApi.cancelAppointment(appointment._id);
                    onUpdate(updatedAppointment);
                } catch (error: any) {
                    showAlert('error', 'Error', error.message || 'Failed to cancel appointment.');
                }
            },
            'cancel'
        );
    };

    const handleConfirmAppointment = async () => {
        showAlert(
            'warning',
            'Confirm Appointment',
            'Are you sure you want to confirm this appointment?',
            async () => {
                try {
                    const updatedAppointment = await appointmentApi.confirmAppointment(appointment._id);
                    onUpdate(updatedAppointment);
                } catch (error: any) {
                    console.error("Confirm Error Raw:", error);
                    showAlert('error', 'Error', error.message || 'Failed to confirm appointment.');
                }
            },
            'confirm'
        );
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'scheduled': return { color: '#3498db', icon: 'clockcircleo' as const, bgColor: 'rgba(52, 152, 219, 0.1)' };
            case 'confirmed': return { color: '#2ecc71', icon: 'checkcircleo' as const, bgColor: 'rgba(46, 204, 113, 0.1)' };
            case 'cancelled': return { color: '#e74c3c', icon: 'closecircleo' as const, bgColor: 'rgba(231, 76, 60, 0.1)' };
            case 'completed': return { color: '#27ae60', icon: 'check' as const, bgColor: 'rgba(39, 174, 96, 0.1)' };
            default: return { color: '#7f8c8d', icon: 'questioncircleo' as const, bgColor: 'rgba(127, 140, 141, 0.1)' };
        }
    };

    const statusStyle = getStatusStyle(appointment.status);
    // Determine the "other" person and their details
    const person = user.role === 'patient' ? appointment.doctorId : appointment.patientId;
    const personName = typeof person === 'object' && person !== null ? `${person.firstName} ${person.lastName}` : 'N/A';
    const personEmail = typeof person === 'object' && person !== null ? person.email : 'N/A';
    const personPhone = typeof person === 'object' && person !== null ? person.phone : 'N/A';
    const personProfilePic = typeof person === 'object' && person !== null ? person.profilePicture : null;
    const personRoleLabel = user.role === 'patient' ? 'Doctor' : 'Patient';

    // Construct image URL
    const personImageUri = personProfilePic
        ? personProfilePic.startsWith('/')
            ? `${SERVER_ROOT_URL}${personProfilePic}`
            : personProfilePic
        : null;

    const cornerIcons = getCornerIcons(appointment.status);

    return (
        <>
            <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.card, isPressed && styles.cardPressed]}
                onPressIn={() => setIsPressed(true)}
                onPressOut={() => setIsPressed(false)}
            >
                <View style={styles.cornerIconContainer}>
                    {cornerIcons.map((icon, index) => {
                         const animatedValue = animatedValues[index];
                         if (!animatedValue) return null;

                         const translateY = animatedValue.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [0, -5, 0],
                         });
                         const opacity = animatedValue.interpolate({
                            inputRange: [0, 0.2, 0.8, 1],
                            outputRange: [0.4, 0.7, 0.7, 0.4],
                         });
                         const IconComponent = icon.library === 'AntDesign' ? AntDesign : FontAwesome5;
                         return (
                             <Animated.View
                                key={index}
                                style={{
                                    transform: [{ translateY }],
                                    opacity: opacity,
                                    marginHorizontal: 2,
                                }}
                             >
                                <IconComponent
                                    name={icon.name as any}
                                    size={18}
                                    color={icon.color.replace(/[\d\.]+\)$/, '1)')}
                                />
                             </Animated.View>
                         );
                    })}
                </View>

                <View style={styles.contentWrapper}>
                    <View style={styles.topRow}>
                        <View style={styles.dateTimeSection}>
                            <View style={styles.dateTimeItem}>
                                <AntDesign name="calendar" size={14} color="#555" style={styles.iconMargin} />
                                <Text style={styles.dateText}>
                                    {format(parseISO(appointment.availability.startTime), 'MMMM dd, yyyy')}
                                </Text>
                            </View>
                            <View style={styles.dateTimeItem}>
                                <AntDesign name="clockcircleo" size={14} color="#555" style={styles.iconMargin} />
                                <Text style={styles.timeText}>
                                    {`${format(parseISO(appointment.availability.startTime), 'p')} - ${format(parseISO(appointment.availability.endTime), 'p')}`}
                                </Text>
                            </View>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bgColor }]}>
                            <AntDesign name={statusStyle.icon} size={14} color={statusStyle.color} />
                            <Text style={[styles.statusText, { color: statusStyle.color }]}>
                                {appointment.status}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.separator} />

                    {/* Updated Details Section */}
                    <View style={styles.detailsContainer}>
                        <View style={styles.detailRow}>
                            {/* Profile Picture */}
                            {personImageUri ? (
                                <Image
                                source={{ uri: personImageUri }}
                                style={styles.profileImage}
                                resizeMode="cover"
                                onError={(e) => console.warn("Failed to load profile image in card:", personImageUri, e.nativeEvent.error)}
                                />
                            ) : (
                                <View style={styles.profileImagePlaceholder}>
                                  <AntDesign
                                      name={user.role === 'patient' ? "solution1" : "user"}
                                      size={16}
                                      color="#FFF" // White icon on placeholder
                                  />
                                </View>
                            )}
                            <View style={styles.detailTextContainer}>
                                <Text style={styles.detailTextValue}>{personName}</Text>
                                <Text style={styles.detailSubText}>({personRoleLabel})</Text>
                            </View>
                        </View>

                        {typeof person === 'object' && person !== null && user.role === 'patient' && appointment.status === 'confirmed' && (
                            <>
                                <View style={styles.detailRow}>
                                    <AntDesign name="mail" size={16} color="#4B5563" style={styles.iconMargin} />
                                    <Text style={styles.detailTextValue}>{personEmail}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <AntDesign name="phone" size={16} color="#4B5563" style={styles.iconMargin} />
                                    <Text style={styles.detailTextValue}>{personPhone}</Text>
                                </View>
                            </>
                        )}

                        {typeof person === 'object' && person !== null && user.role === 'doctor' && (
                            <View style={styles.detailRow}>
                                <AntDesign name="phone" size={16} color="#4B5563" style={styles.iconMargin} />
                                <Text style={styles.detailTextValue}>{personPhone}</Text>
                            </View>
                        )}

                        <View style={styles.detailRow}>
                            <AntDesign name="medicinebox" size={16} color="#4B5563" style={styles.iconMargin} />
                            <Text style={styles.detailTextValue}>{appointment.serviceType}</Text>
                        </View>
                    </View>

                    <View style={styles.actionRow}>
                        {user.role === 'doctor' && appointment.status === 'scheduled' && (
                            <>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.confirmButton]}
                                    onPress={handleConfirmAppointment}
                                >
                                    <AntDesign name="check" size={18} color="#fff" />
                                    <Text style={styles.actionButtonText}>Confirm</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.cancelButton]}
                                    onPress={handleCancelAppointment}
                                >
                                    <AntDesign name="close" size={18} color="#fff" />
                                    <Text style={styles.actionButtonText}>Cancel</Text>
                                </TouchableOpacity>
                            </>
                        )}
                        {user.role === 'patient' && ['scheduled', 'confirmed'].includes(appointment.status) && (
                            <TouchableOpacity
                                style={[styles.actionButton, styles.cancelButton]}
                                onPress={handleCancelAppointment}
                            >
                                <AntDesign name="close" size={18} color="#fff" />
                                <Text style={styles.actionButtonText}>Cancel Appointment</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </TouchableOpacity>

            {/* Alerts remain unchanged */}
            <CustomAlert
                visible={alertConfig.visible && !!alertConfig.confirmAction}
                type={alertConfig.type}
                title={alertConfig.title}
                message={alertConfig.message}
                buttons={[
                    { text: 'Cancel', onPress: hideAlert, style: 'cancel' },
                    {
                        text: 'Confirm',
                        onPress: async () => {
                            await alertConfig.confirmAction?.();
                            hideAlert();
                        },
                        style: 'default'
                    },
                ]}
                onDismiss={hideAlert}
            />

            <CustomAlert
                visible={alertConfig.visible && !alertConfig.confirmAction}
                type={alertConfig.type}
                title={alertConfig.title}
                message={alertConfig.message}
                buttons={[{ text: 'OK', onPress: hideAlert }]}
                onDismiss={hideAlert}
            />
        </>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 15,
        paddingHorizontal: 18, // Slightly increased padding
        marginBottom: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        position: 'relative',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E5E7EB', // Lighter border
    },
    cardPressed: {
        transform: [{ scale: 0.98 }],
        shadowOpacity: 0.2,
        elevation: 6,
    },
    cornerIconContainer: {
        position: 'absolute',
        bottom: 8,
        right: 12,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 0,
    },
    contentWrapper: {
        position: 'relative',
        zIndex: 1,
        backgroundColor: 'transparent',
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12, // Increased margin
    },
    dateTimeSection: {
        flex: 1,
        marginRight: 10,
    },
    dateTimeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6, // Increased margin
    },
    iconMargin: {
        marginRight: 8, // Increased icon margin
    },
    dateText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#374151', // Darker gray
    },
    timeText: {
        fontSize: 14,
        color: '#6B7280', // Medium gray
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 15,
        marginTop: 2,
        marginLeft: 'auto', // Keep pushing it right
    },
    statusText: {
        marginLeft: 5,
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'capitalize',
    },
    separator: {
        height: 1,
        backgroundColor: '#F3F4F6', // Lighter separator
        marginVertical: 14, // Increased margin
    },
    detailsContainer: {
        marginBottom: 18, // Increased margin
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10, // Increased margin
    },
    profileImage: {
        width: 40, // Adjusted size
        height: 40,
        borderRadius: 20, // Adjusted radius
        marginRight: 12, // Space between image and text
        backgroundColor: '#e0e0e0', // Placeholder background
    },
     profileImagePlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
        backgroundColor: '#007bff', // Placeholder color
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailTextContainer: {
        flexDirection: 'column', // Stack vertically
        justifyContent: 'center',
        flexShrink: 1,
    },
    detailTextValue: {
        fontSize: 15,
        color: '#1F2937', // Very dark gray (almost black)
        fontWeight: '500',
        textTransform: 'capitalize',
        flexShrink: 1, // Prevent text overflow issues
    },
    detailSubText: {
        fontSize: 13,
        color: '#6B7280', // Medium gray
        marginTop: 1, // Small space between main text and subtext
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'center', // Center buttons
        alignItems: 'center',
        marginTop: 10, // Adjusted margin
        paddingTop: 10, // Add padding if needed
        borderTopWidth: 0, // Remove top border if it existed
        gap: 15,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 9, // Slightly adjusted padding
        paddingHorizontal: 16, // Slightly adjusted padding
        borderRadius: 20,
        marginBottom:20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    confirmButton: {
        backgroundColor: '#10B981', // Tailwind green-500
    },
    cancelButton: {
        backgroundColor: '#EF4444', // Tailwind red-500
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 6,
    },
});

export default AppointmentCard;