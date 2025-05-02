import React, { useState, useEffect, useCallback, ComponentType } from 'react';
import {
    View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, ImageBackground
} from 'react-native';
import { format, parseISO } from 'date-fns';
import CalendarView from '../../components/CalendarView';
import TimeSlotManagement from '../../components/TimeSlotManagement';
import availabilityApi from '../../api/availabilityApi';
import { Availability, AvailabilityCreateRequest } from '../../types';
import CustomAlert from '../../components/CustomAlert';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { IconProps } from '@expo/vector-icons/build/createIconSet';

// Define types for section configuration
type IconComponentType = ComponentType<IconProps<any>>;
interface SectionIconConfig {
    name: string;
    library: IconComponentType;
    color: string;
}

const FreeSlots = () => {
    const [availabilities, setAvailabilities] = useState<Availability[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
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

    const fetchAvailabilities = useCallback(async () => {
        if (!refreshing) {
            setIsLoading(true);
        }
        try {
            const response = await availabilityApi.getMyAvailabilities();
            setAvailabilities(response);
        } catch (error: any) {
            console.error('Error fetching availabilities:', error);
            showAlert('error', 'Loading Error', error.message || 'Failed to load availabilities.');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [refreshing]);

    useEffect(() => {
        fetchAvailabilities();
    }, [fetchAvailabilities]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setSelectedDate(null); // Optionally reset selected date on refresh
        fetchAvailabilities();
    }, [fetchAvailabilities]);

    const getMarkedDates = () => {
        const markedDates: Record<string, any> = {};
        availabilities.forEach(slot => {
            const dateString = format(parseISO(slot.startTime), 'yyyy-MM-dd');
            if (!markedDates[dateString]) {
                markedDates[dateString] = { marked: true, dots: [] };
            }
            // Simplified dot representation
            markedDates[dateString].dots.push({
                key: slot._id,
                color: slot.isBooked ? '#EF4444' : '#10B981', // Red for booked, Green for available
            });
            // Limit dots for performance/visual clarity if needed
            if (markedDates[dateString].dots.length > 3) {
                markedDates[dateString].dots = markedDates[dateString].dots.slice(0, 3);
            }
        });

        if (selectedDate) {
            markedDates[selectedDate] = {
                ...(markedDates[selectedDate] || {}),
                selected: true,
                selectedColor: '#3B82F6', // Use a theme color for selection
                // Optionally disable marking if it clashes with selection styling
                // marked: false,
            };
        }
        return markedDates;
    };

    const handleAddTimeSlot = async (timeSlotData: AvailabilityCreateRequest) => {
        try {
            await availabilityApi.createAvailability(timeSlotData);
            showAlert('success', 'Success', 'Time slot added successfully!');
            fetchAvailabilities(); // Refetch to update the list and calendar marks
        } catch (error: any) {
            showAlert('error', 'Error', error.message || 'Failed to add time slot.');
        }
    };

    const handleUpdateTimeSlot = async (id: string, timeSlotData: Partial<Availability>) => {
        try {
            await availabilityApi.updateAvailabilityById(id, timeSlotData);
            showAlert('success', 'Success', 'Time slot updated successfully!');
            fetchAvailabilities();
        } catch (error: any) {
            console.error('Error updating time slot:', error);
            showAlert('error', 'Error', error.message || 'Failed to update time slot.');
        }
    };

    const handleDeleteTimeSlot = async (id: string) => {
        try {
            await availabilityApi.deleteAvailabilityById(id);
            showAlert('success', 'Success', 'Time slot deleted successfully!');
            fetchAvailabilities();
        } catch (error: any) {
            console.error('Error deleting time slot:', error);
            showAlert('error', 'Error', error.message || 'Failed to delete time slot.');
        }
    };

    // --- Section Rendering Logic ---
    const sectionIcons: Record<string, SectionIconConfig> = {
        calendar: { name: "calendar-alt", library: FontAwesome5, color: "#3B82F6" }, // Blue
        timeslots: { name: "clock-time-four-outline", library: MaterialCommunityIcons, color: "#10B981" }, // Green
    };

    const renderSectionHeader = (title: string, iconKey: string, count?: number) => {
        const sectionIconInfo = sectionIcons[iconKey];
        const IconComponent = sectionIconInfo.library;

        return (
            <View style={styles.sectionHeader}>
                <IconComponent name={sectionIconInfo.name} size={18} color={sectionIconInfo.color} style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>{title}</Text>
                {count !== undefined && (
                     <View style={styles.countContainer}>
                        <FontAwesome5 name="circle" size={8} color={sectionIconInfo.color} style={styles.countIcon} />
                        <Text style={[styles.countText, { color: sectionIconInfo.color }]}>
                             {count}
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    const filteredAvailabilities = selectedDate
        ? availabilities.filter(a => format(parseISO(a.startTime), 'yyyy-MM-dd') === selectedDate)
        : [];

    return (
        <ImageBackground
            source={require('../../assets/common.jpg')} // Use the same background
            style={styles.container}
            resizeMode="cover"
        >
            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#007AFF"]} tintColor={"#007AFF"} />
                }
                contentContainerStyle={styles.scrollViewContent}
            >
                {/* Calendar Section */}
                <View style={styles.sectionWrapper}>
                    {renderSectionHeader("Manage Calendar", "calendar")}
                    {isLoading && availabilities.length === 0 && !refreshing ? (
                        <View style={styles.sectionLoaderContainer}>
                           <ActivityIndicator size="large" color="#007AFF" />
                        </View>
                    ) : (
                        <CalendarView
                            // Pass necessary props, potentially simplify if header handles title
                            isLoading={isLoading && availabilities.length > 0} // Show calendar structure even when refreshing
                            selectedDate={selectedDate}
                            onSelectDate={setSelectedDate}
                            markedDates={getMarkedDates()}
                            // Optional: Pass theme or styles if CalendarView supports it
                        />
                    )}
                </View>

                {/* Time Slots Section */}
                <View style={styles.sectionWrapper}>
                   {renderSectionHeader(
                      selectedDate ? `Slots for ${format(parseISO(selectedDate), 'MMM dd, yyyy')}` : "Select a Date",
                      "timeslots",
                      selectedDate ? filteredAvailabilities.length : undefined
                    )}
                   {isLoading && availabilities.length === 0 && !refreshing ? (
                       // Optional: Show loader only if initial load is happening
                       <View style={styles.sectionLoaderContainer}>
                           {/* Optionally hide if calendar loader is sufficient */}
                           {/* <ActivityIndicator size="small" color="#007AFF" /> */}
                       </View>
                    ) : (
                      <TimeSlotManagement
                          selectedDate={selectedDate}
                          availabilities={availabilities} // Pass all, let component filter or use filteredAvailabilities
                          isLoading={isLoading && availabilities.length > 0} // Indicate loading state within component
                          onAddTimeSlot={handleAddTimeSlot}
                          onDeleteTimeSlot={handleDeleteTimeSlot}
                          onUpdateTimeSlot={handleUpdateTimeSlot}
                      />
                   )}
                </View>

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
        backgroundColor: 'transparent', // Make ScrollView background transparent
    },
    scrollViewContent: {
        paddingHorizontal: 16,
        paddingTop: 15,
        paddingBottom: 20,
    },
    sectionWrapper: {
        marginBottom: 25,
        // Optional: Add background color with opacity for content readability
        // backgroundColor: 'rgba(255, 255, 255, 0.85)',
        // borderRadius: 10,
        // padding: 15, // Add padding if using background color
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF', // White background for chip
        borderRadius: 20,          // Rounded corners for chip
        paddingVertical: 8,       // Vertical padding inside chip
        paddingHorizontal: 12,    // Horizontal padding inside chip
        alignSelf: 'flex-start',   // Chip takes only needed width
        marginBottom: 15,          // Space below the chip
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
        color: '#4A5568', // Dark gray color
        marginRight: 8, // Add space before count
    },
    countContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        // Optional: Add a background or border to the count itself
        // backgroundColor: '#E2E8F0', // Light gray background
        // borderRadius: 10,
        // paddingHorizontal: 6,
        // paddingVertical: 2,
    },
    countIcon: {
        marginRight: 4,
    },
    countText: {
        fontSize: 14,
        fontWeight: '600',
    },
    sectionLoaderContainer: {
       alignItems: 'center',
       justifyContent: 'center',
       minHeight: 100, // Ensure loader takes some space
       padding: 20,
       // Optional: Add a semi-transparent background
       // backgroundColor: 'rgba(255, 255, 255, 0.7)',
       // borderRadius: 8,
    },
    // Removed old styles for calendarSection, timeSlotsSection as structure changed
});

export default FreeSlots;