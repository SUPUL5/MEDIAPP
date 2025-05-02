import React, { useState, useEffect, useCallback, ComponentType } from 'react';
import {
    View, Text, StyleSheet, ActivityIndicator, ScrollView, RefreshControl, TouchableOpacity,
    ImageBackground
} from 'react-native';
import appointmentApi from '../../api/appointmentApi';
import { Appointment, AuthUser } from '../../types';
import AppointmentCard from '../../components/AppointmentCard';
import CustomAlert from '../../components/CustomAlert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AntDesign, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { IconProps } from '@expo/vector-icons/build/createIconSet';

type AppointmentCategoryKey = 'scheduled' | 'confirmed' | 'cancelled' | 'completed';

type IconComponentType = ComponentType<IconProps<any>>;

interface SectionIconConfig {
    name: string;
    library: IconComponentType;
    color: string;
}

const Appointments = () => {
    const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<AuthUser | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [viewMore, setViewMore] = useState<Record<AppointmentCategoryKey, boolean>>({
        scheduled: false,
        confirmed: false,
        cancelled: false,
        completed: false,
    });
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

    const fetchAppointmentsAndUser = useCallback(async () => {
        if (!refreshing) {
            setIsLoading(true);
        }
        try {
            const userDataString = await AsyncStorage.getItem('user');
            if (userDataString) {
                const parsedUser = JSON.parse(userDataString);
                setUser(parsedUser);
                const fetchedAppointments = await appointmentApi.getMyAllAppointment();
                setAllAppointments(fetchedAppointments);
            } else {
                showAlert('error', 'Error', 'User data not found. Please log in.');
                setAllAppointments([]);
                setUser(null);
            }
        } catch (error: any) {
            console.error("Error fetching data:", error);
            showAlert('error', 'Error', error.message || 'Failed to load appointments.');
            setAllAppointments([]);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [refreshing]);

    useEffect(() => {
        fetchAppointmentsAndUser();
    }, [fetchAppointmentsAndUser]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchAppointmentsAndUser();
    }, [fetchAppointmentsAndUser]);

    const handleUpdateAppointmentState = useCallback((updatedAppointment: Appointment) => {
        setAllAppointments(prevAppointments => {
            const index = prevAppointments.findIndex(appt => appt._id === updatedAppointment._id);
            if (index !== -1) {
                const newAppointments = [...prevAppointments];
                newAppointments[index] = updatedAppointment;
                return newAppointments;
            }
            return prevAppointments;
        });
    }, []);

    const categorizeAppointments = () => {
        const scheduled: Appointment[] = [];
        const confirmed: Appointment[] = [];
        const cancelled: Appointment[] = [];
        const completed: Appointment[] = [];

        allAppointments.forEach(app => {
            switch (app.status) {
                case 'scheduled': scheduled.push(app); break;
                case 'confirmed': confirmed.push(app); break;
                case 'cancelled': cancelled.push(app); break;
                case 'completed': completed.push(app); break;
                default: break;
            }
        });

        const sortByDate = (a: Appointment, b: Appointment) =>
            new Date(a.availability.startTime).getTime() - new Date(b.availability.startTime).getTime();

        return {
            scheduled: scheduled.sort(sortByDate),
            confirmed: confirmed.sort(sortByDate),
            cancelled: cancelled.sort(sortByDate),
            completed: completed.sort(sortByDate),
        };
    };

    const { scheduled, confirmed, cancelled, completed } = categorizeAppointments();

    const sectionIcons: Record<AppointmentCategoryKey, SectionIconConfig> = {
        scheduled: { name: "calendar-alt", library: FontAwesome5, color: "#3B82F6" },
        confirmed: { name: "check-circle", library: FontAwesome5, color: "#10B981" },
        cancelled: { name: "cancel", library: MaterialIcons, color: "#EF4444" },
        completed: { name: "calendar-check", library: FontAwesome5, color: "#6B7280" },
    };

    const renderAppointmentSection = (
        title: string,
        appointmentsToShow: Appointment[],
        categoryKey: AppointmentCategoryKey
    ) => {
        const displayCount = viewMore[categoryKey] ? appointmentsToShow.length : 3;
        const hasMore = appointmentsToShow.length > 3;
        const shouldRenderSectionContent = appointmentsToShow.length > 0 || (isLoading && !refreshing && appointmentsToShow.length === 0);

        const sectionIconInfo = sectionIcons[categoryKey];
        const IconComponent = sectionIconInfo.library;

        if (!shouldRenderSectionContent && !isLoading) {
            return null;
        }

        return (
            <View style={styles.sectionWrapper}>
                <View style={styles.sectionHeader}>
                    <IconComponent name={sectionIconInfo.name} size={18} color={sectionIconInfo.color} style={styles.sectionIcon} />
                    <Text style={styles.sectionTitle}>
                        {title}
                    </Text>
                    <View style={styles.countContainer}>
                      <FontAwesome5 name="circle" size={8} color={sectionIconInfo.color} style={styles.countIcon} />
                      <Text style={[styles.countText, { color: sectionIconInfo.color }]}>
                          {appointmentsToShow.length}
                      </Text>
                    </View>
                </View>

                {isLoading && !refreshing && appointmentsToShow.length === 0 ? (
                   <ActivityIndicator size="small" color="#007AFF" style={styles.sectionLoader}/>
                ) : (
                   appointmentsToShow.length === 0 ? (
                       <Text style={styles.emptySectionText}>No {title.toLowerCase()} appointments found.</Text>
                   ) : (
                        appointmentsToShow.slice(0, displayCount).map(app => (
                            user && <AppointmentCard
                                key={app._id}
                                appointment={app}
                                user={user}
                                onUpdate={handleUpdateAppointmentState}
                            />
                        ))
                   )
                )}

                {hasMore && !isLoading && (
                    <TouchableOpacity
                        style={styles.viewMoreButton}
                        onPress={() => setViewMore(prev => ({ ...prev, [categoryKey]: !prev[categoryKey] }))}
                    >
                        <AntDesign name={viewMore[categoryKey] ? "up" : "down"} size={16} color="#007AFF" />
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <ImageBackground
            source={require('../../assets/common.jpg')}
            style={styles.container}
            resizeMode="cover"
        >
            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#007AFF"]} tintColor={"#007AFF"} />
                }
                contentContainerStyle={allAppointments.length === 0 && !isLoading ? styles.scrollViewEmpty : styles.scrollViewContent}
            >
                {isLoading && allAppointments.length === 0 && !refreshing ? (
                    <View style={styles.fullScreenLoader}>
                        <ActivityIndicator size="large" color="#007AFF" />
                        <Text style={styles.loadingText}>Loading Appointments...</Text>
                    </View>
                ) : (
                    allAppointments.length === 0 && !isLoading ? (
                         <View style={styles.emptyStateContainer}>
                             <MaterialIcons name="event-busy" size={70} color="#a0aec0" />
                             <Text style={styles.emptyStateTitle}>No Appointments Yet</Text>
                             <Text style={styles.emptyStateText}>You currently have no appointments scheduled.</Text>
                             <Text style={styles.emptyStateHint}>(Pull down to refresh)</Text>
                         </View>
                    ) : (
                     <>
                        {renderAppointmentSection('Scheduled', scheduled, 'scheduled')}
                        {renderAppointmentSection('Confirmed', confirmed, 'confirmed')}
                        {renderAppointmentSection('Cancelled', cancelled, 'cancelled')}
                        {renderAppointmentSection('Completed', completed, 'completed')}
                     </>
                    )
                )}
            </ScrollView>
            <CustomAlert
                visible={alertConfig.visible}
                type={alertConfig.type}
                title={alertConfig.title}
                message={alertConfig.message}
                buttons={[{ text: 'OK', onPress: hideAlert }]}
                onDismiss={hideAlert}
            />
        </ImageBackground>
    );
};

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
        paddingTop: 15,
        paddingBottom: 20,
    },
    scrollViewEmpty: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
        paddingHorizontal: 16,
    },
    sectionWrapper: {
        marginBottom: 25,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 12,
        alignSelf: 'flex-start',
        marginBottom: 15,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.15,
        shadowRadius: 2.0,
        elevation: 2,
    },
    sectionIcon: {
        marginRight: 8,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#4A5568',
        marginRight: 8,
    },
    countContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    countIcon: {
        marginRight: 4,
        // Adjust position slightly if needed, e.g., top: 1
    },
    countText: {
        fontSize: 14,
        fontWeight: '600',
        // Color is set dynamically inline
    },
    sectionLoader: {
        marginVertical: 20,
        padding: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderRadius: 8,
        alignSelf: 'center',
    },
    emptySectionText: {
        textAlign: 'center',
        color: '#FEFEFE',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        marginTop: 5,
        marginBottom: 10,
        fontSize: 14,
        fontStyle: 'italic',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        alignSelf: 'center',
    },
    viewMoreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
        marginTop: 15,
        alignSelf: 'center',
        backgroundColor: '#E7F0FF',
        borderRadius: 25,
        minWidth: 140,
    },
    viewMoreText: { // This style is not used in the current button, but keeping it in case
        color: '#0052CC',
        fontSize: 14,
        fontWeight: '600',
        marginRight: 6,
    },
    fullScreenLoader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 50,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    loadingText: {
        marginTop: 10,
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
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 15,
        marginHorizontal: 20,
        marginVertical: 40,
    },
    emptyStateTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#2D3748',
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 8,
    },
    emptyStateText: {
        fontSize: 15,
        color: '#4A5568',
        textAlign: 'center',
        lineHeight: 22,
    },
    emptyStateHint: {
        fontSize: 13,
        color: '#718096',
        textAlign: 'center',
        marginTop: 15,
        fontStyle: 'italic',
    }
});

export default Appointments;