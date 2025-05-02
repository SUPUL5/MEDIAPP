// frontend/screens/patient/Appointments.tsx
import React, { useState, useEffect, useCallback, ComponentType } from 'react';
import {
    View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, RefreshControl,
    ImageBackground
} from 'react-native';
import { format, parseISO } from 'date-fns';
import CalendarView from '../../components/CalendarView';
import appointmentApi from '../../api/appointmentApi';
import availabilityApi from '../../api/availabilityApi';
import DoctorSearch from '../../components/DoctorSearch';
import TimeSlotSelection from '../../components/TimeSlotSelection';
import AppointmentCreation from '../../components/AppointmentCreation';
import AppointmentCard from '../../components/AppointmentCard'; // Updated import path
import { Appointment, Availability, AuthUser } from '../../types';
import { AntDesign, MaterialIcons, FontAwesome5 } from '@expo/vector-icons'; // Added FontAwesome5
import { IconProps } from '@expo/vector-icons/build/createIconSet'; // Added IconProps
import CustomAlert from '../../components/CustomAlert';
import AsyncStorage from '@react-native-async-storage/async-storage';


// Define types for section configuration (Similar to doctor screen)
type AppointmentCategoryKey = 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
type IconComponentType = ComponentType<IconProps<any>>;
interface SectionIconConfig {
    name: string;
    library: IconComponentType;
    color: string;
}

const Appointments = () => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<Availability | null>(null);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]); // Renamed from 'appointments'
  const [doctorAvailabilities, setDoctorAvailabilities] = useState<Availability[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Combined loading state
  const [isFetchingAvailabilities, setIsFetchingAvailabilities] = useState<boolean>(false);
  const [isCreateAppointmentVisible, setIsCreateAppointmentVisible] = useState<boolean>(false);
  const [user, setUser] = useState<AuthUser | null>(null); // Store logged-in user
  const [refreshing, setRefreshing] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: 'error' as 'error' | 'success' | 'warning' | 'info',
    title: '',
    message: ''
  });
   const [viewMore, setViewMore] = useState<Record<AppointmentCategoryKey, boolean>>({
        scheduled: false,
        confirmed: false,
        cancelled: false,
        completed: false,
    });

  const showAlert = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    setAlertConfig({
      visible: true,
      type,
      title,
      message
    });
  };

  const hideAlert = () => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
  };

  // Fetch user data and initial appointments
  const fetchInitialData = useCallback(async () => {
     if (!refreshing) {
         setIsLoading(true);
     }
    try {
      const userDataString = await AsyncStorage.getItem('user');
      if (userDataString) {
        setUser(JSON.parse(userDataString));
      }
      const fetchedAppointments = await appointmentApi.getMyAllAppointment();
      setAllAppointments(fetchedAppointments);
    } catch (e: any) {
        showAlert('error', 'Error', e.message || 'Failed to load initial data.');
        setAllAppointments([]);
        setUser(null);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]); // Added refreshing as dependency

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);


  // Fetch availabilities when doctor is selected
  useEffect(() => {
    const fetchDoctorAvailabilities = async () => {
      if (selectedDoctorId) {
        setIsFetchingAvailabilities(true); // Start loading indicator for availabilities
        try {
          const fetchedAvailabilities = await availabilityApi.getAvailabilitiesByDoctorId(selectedDoctorId);
          const filteredAvailabilities = fetchedAvailabilities.filter(availability => !availability.isBooked);
          setDoctorAvailabilities(filteredAvailabilities);
        } catch (e: any) {
          showAlert('error', 'Error', e.message || 'Failed to load doctor availability.');
          setDoctorAvailabilities([]);
        } finally {
           setIsFetchingAvailabilities(false); // Stop loading indicator
        }
      } else {
        setDoctorAvailabilities([]); // Clear if no doctor selected
      }
    };

    fetchDoctorAvailabilities();
  }, [selectedDoctorId]);

  // Handle refresh
   const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInitialData(); // Re-fetch everything on refresh
  }, [fetchInitialData]);

  // Handle successful appointment creation
  const handleAppointmentCreationSuccess = (newAppointment: Appointment) => {
    setAllAppointments((prevAppointments) => [newAppointment, ...prevAppointments].sort((a, b) =>
       new Date(a.availability.startTime).getTime() - new Date(b.availability.startTime).getTime()
    )); // Add to list and sort
    // Reset the creation flow state
    setIsCreateAppointmentVisible(false);
    setSelectedDoctorId(null);
    setSelectedDate(null);
    setSelectedTimeSlot(null);
    showAlert('success', 'Success', 'Appointment booked successfully!');
  };

  // Handle appointment update (e.g., after cancellation)
  const handleUpdateAppointment = useCallback((updatedAppointment: Appointment) => {
        setAllAppointments(prevAppointments => {
            const index = prevAppointments.findIndex(appt => appt._id === updatedAppointment._id);
            if (index !== -1) {
                const newAppointments = [...prevAppointments];
                newAppointments[index] = updatedAppointment;
                return newAppointments;
            }
            return prevAppointments; // Return previous state if not found (shouldn't happen ideally)
        });
    }, []); // Empty dependency array, relies on closure

  const getMarkedDates = () => {
    const markedDates: Record<string, any> = {};
    doctorAvailabilities.forEach((availability) => {
        const date = format(parseISO(availability.startTime), 'yyyy-MM-dd');
        markedDates[date] = {
            ...(markedDates[date] || {}), // Preserve existing properties like selected
            marked: true,
            dotColor: '#10B981', // Green dot for available days
            customStyles: { // Using custom styles for consistency
                 container: {
                    borderWidth: 2,
                    borderColor: '#10B981', // Green border for available
                    borderRadius: 16,
                    backgroundColor: 'transparent',
                },
                text: {
                    color: '#10B981', // Green text for available days
                },
            }
        };
    });
    if (selectedDate) {
        markedDates[selectedDate] = {
            ...(markedDates[selectedDate] || {}),
            selected: true,
            customStyles: { // Custom styles for selected date
                 container: {
                    backgroundColor: '#3B82F6', // Blue background
                    borderColor: '#3B82F6',
                    borderRadius: 16,
                 },
                text: {
                    color: '#ffffff', // White text
                    fontWeight: 'bold',
                },
            }
        };
    }
    return markedDates;
};

  const filteredAvailabilities = selectedDate
    ? doctorAvailabilities.filter(
        (availability) => format(parseISO(availability.startTime), 'yyyy-MM-dd') === selectedDate
      )
    : [];

  const toggleCreateAppointmentVisibility = () => {
    setIsCreateAppointmentVisible(!isCreateAppointmentVisible);
    if (isCreateAppointmentVisible) {
      setSelectedDoctorId(null);
      setSelectedDate(null);
      setSelectedTimeSlot(null);
    }
  };

  // Categorize appointments (like in doctor screen)
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

    // Section Icons (like in doctor screen)
     const sectionIcons: Record<AppointmentCategoryKey, SectionIconConfig> = {
        scheduled: { name: "calendar-alt", library: FontAwesome5, color: "#3B82F6" }, // Blue
        confirmed: { name: "check-circle", library: FontAwesome5, color: "#10B981" }, // Green
        cancelled: { name: "cancel", library: MaterialIcons, color: "#EF4444" },       // Red
        completed: { name: "calendar-check", library: FontAwesome5, color: "#6B7280" }, // Gray
    };

    // Function to render sections (like in doctor screen)
    const renderAppointmentSection = (
        title: string,
        appointmentsToShow: Appointment[],
        categoryKey: AppointmentCategoryKey
    ) => {
        const displayCount = viewMore[categoryKey] ? appointmentsToShow.length : 3;
        const hasMore = appointmentsToShow.length > 3;
        const sectionIconInfo = sectionIcons[categoryKey];
        const IconComponent = sectionIconInfo.library;
        const shouldRenderSectionContent = appointmentsToShow.length > 0 || (isLoading && !refreshing && appointmentsToShow.length === 0);

        if (!shouldRenderSectionContent && !isLoading) {
            return null; // Don't render empty sections unless loading
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
                            user && <AppointmentCard // Use AppointmentCard here
                                key={app._id}
                                appointment={app}
                                user={user}
                                onUpdate={handleUpdateAppointment} // Pass the update handler
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
          source={require('../../assets/common.jpg')} // Add background image
          style={styles.container}
          resizeMode="cover"
      >
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
         refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#007AFF"]} tintColor={"#007AFF"} />
          }
         // Adjust contentContainerStyle to always use flexGrow for proper expansion
         contentContainerStyle={[
            styles.scrollViewBaseContent,
             allAppointments.length === 0 && !isLoading && !isCreateAppointmentVisible ? styles.scrollViewEmpty : {} // Only apply empty state style when list is empty and not creating
         ]}
      >
        {isCreateAppointmentVisible ? (
          // --- Appointment Creation Flow ---
          <View style={styles.creationSection}>
             <View style={styles.sectionWrapper}>
                <View style={styles.sectionHeader}>
                     <FontAwesome5 name="user-md" size={18} color="#3B82F6" style={styles.sectionIcon} />
                     <Text style={styles.sectionTitle}>Find a Doctor</Text>
                </View>
                 <DoctorSearch
                    onDoctorSelect={(doctorId) => {
                    setSelectedDoctorId(doctorId);
                    setSelectedDate(null);
                    setSelectedTimeSlot(null);
                    }}
                />
            </View>

            {selectedDoctorId && (
              <>
                <View style={styles.sectionWrapper}>
                    <View style={styles.sectionHeader}>
                         <FontAwesome5 name="calendar-alt" size={18} color="#3B82F6" style={styles.sectionIcon} />
                         <Text style={styles.sectionTitle}>Select Date</Text>
                    </View>
                    {isFetchingAvailabilities ? (
                        <ActivityIndicator size="small" color="#007bff" style={styles.sectionLoader} />
                    ) : (
                        <CalendarView
                            title="Select Date" // Title removed from component props, handled by section header
                            isLoading={false} // Loading handled outside now
                            selectedDate={selectedDate}
                            onSelectDate={setSelectedDate}
                            markedDates={getMarkedDates()}
                        />
                    )}
                </View>

                {selectedDate && (
                  <View style={styles.sectionWrapper}>
                        <View style={styles.sectionHeader}>
                           <MaterialIcons name="access-time" size={18} color="#3B82F6" style={styles.sectionIcon} />
                           <Text style={styles.sectionTitle}>Select Time Slot</Text>
                       </View>
                       <TimeSlotSelection
                           availabilities={filteredAvailabilities}
                           onTimeSlotSelect={(timeSlot) => setSelectedTimeSlot(timeSlot)}
                       />
                   </View>
                )}

                {selectedTimeSlot && (
                   <View style={styles.sectionWrapper}>
                     <View style={styles.sectionHeader}>
                        <AntDesign name="form" size={18} color="#3B82F6" style={styles.sectionIcon} />
                        <Text style={styles.sectionTitle}>Confirm Booking</Text>
                     </View>
                     <AppointmentCreation
                         availability={selectedTimeSlot}
                         onAppointmentCreate={handleAppointmentCreationSuccess}
                     />
                   </View>
                )}
              </>
            )}
          </View>
        ) : (
          // --- Appointment List View ---
          <View style={styles.listSection}>
            {isLoading && allAppointments.length === 0 && !refreshing ? (
              <View style={styles.fullScreenLoader}>
                 <ActivityIndicator size="large" color="#007AFF" />
                 <Text style={styles.loadingText}>Loading Appointments...</Text>
              </View>
            ) : allAppointments.length === 0 && !isLoading ? (
              <View style={styles.emptyStateContainer}>
                  <MaterialIcons name="event-busy" size={70} color="#a0aec0" />
                  <Text style={styles.emptyStateTitle}>No Appointments Yet</Text>
                  <Text style={styles.emptyStateText}>Tap the '+' button to book a new appointment.</Text>
                  <Text style={styles.emptyStateHint}>(Pull down to refresh)</Text>
              </View>
            ) : (
              <>
                {/* Render categorized sections */}
                {renderAppointmentSection('Scheduled', scheduled, 'scheduled')}
                {renderAppointmentSection('Confirmed', confirmed, 'confirmed')}
                {renderAppointmentSection('Cancelled', cancelled, 'cancelled')}
                {renderAppointmentSection('Completed', completed, 'completed')}
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* FAB Button remains the same */}
      <TouchableOpacity
        style={styles.fab}
        onPress={toggleCreateAppointmentVisibility}
      >
        <AntDesign name={isCreateAppointmentVisible ? "close" : "plus"} size={24} color="#fff" />
      </TouchableOpacity>

      {/* CustomAlert remains the same */}
       <CustomAlert
          visible={alertConfig.visible}
          type={alertConfig.type}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={[{ text: 'OK', onPress: hideAlert }]}
          onDismiss={hideAlert}
       />
      </ImageBackground> // Close ImageBackground
  );
};

// Combine and adapt styles from both doctor and patient screens
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent', // Make ScrollView transparent
  },
  // Base style for scroll view content, always applies flexGrow
  scrollViewBaseContent: {
      paddingHorizontal: 16,
      paddingTop: 15,
      paddingBottom: 80, // Increased padding to avoid overlap with FAB
      flexGrow: 1, // Ensure content area can grow
  },
  // Style specifically for when the list is empty (centering content)
  scrollViewEmpty: {
      justifyContent: 'center',
      alignItems: 'center',
   },
  creationSection: {
    marginBottom: 20,
    // Ensure creation section itself doesn't have flex: 1 unless intended
  },
  listSection: {
    // This section might need flex: 1 if it's supposed to fill remaining space
    // but within a ScrollView, it usually just takes the space needed for content.
  },
  sectionWrapper: {
    marginBottom: 25,
    // Optional: Add semi-transparent background if needed
    // backgroundColor: 'rgba(255, 255, 255, 0.9)',
    // borderRadius: 12,
    // padding: 15,
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
      shadowOffset: { width: 0, height: 1 },
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
  },
  countText: {
      fontSize: 14,
      fontWeight: '600',
      // Color set dynamically inline
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
      color: '#FEFEFE', // White text for better contrast on background
      backgroundColor: 'rgba(0, 0, 0, 0.4)', // Darker overlay for text
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
      backgroundColor: '#E7F0FF', // Light blue background
      borderRadius: 25,
      minWidth: 140,
  },
  fullScreenLoader: {
      // Keep this as is for initial loading
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: 50,
      backgroundColor: 'rgba(0, 0, 0, 0.3)', // Semi-transparent overlay
  },
  loadingText: {
      marginTop: 10,
      fontSize: 16,
      color: '#FFFFFF', // White text for loader
      fontWeight: '500',
  },
  emptyStateContainer: {
      // This style is now applied via scrollViewEmpty, keep definition for reference
      // or specific overrides if needed.
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 30,
      paddingBottom: 30,
      backgroundColor: 'rgba(255, 255, 255, 0.8)', // Semi-transparent white background
      borderRadius: 15,
      marginHorizontal: 20,
      marginVertical: 40, // Give some vertical margin if used outside scrollview logic
      minHeight: 300, // Ensure it takes some space
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
  },
  fab: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    right: 25,
    bottom: 80,
    backgroundColor: '#007bff',
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});

export default Appointments;