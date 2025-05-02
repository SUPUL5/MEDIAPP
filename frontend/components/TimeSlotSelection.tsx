import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { format, parseISO, isValid } from 'date-fns';
import { Availability } from '../types';
import { AntDesign, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

interface TimeSlotSelectionProps {
  availabilities: Availability[];
  onTimeSlotSelect: (timeSlot: Availability) => void;
}

// Helper function to safely format date
const formatDate = (dateStr: string): string => {
  try {
    const date = parseISO(dateStr);
    if (isValid(date)) {
      return format(date, 'EEEE, MMMM do'); // e.g., Monday, April 12th
    } else {
      console.warn(`Invalid date format found for date display: date=${dateStr}`);
      return 'Invalid date';
    }
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Error';
  }
};


// Helper function to safely format time range
const formatTimeRange = (startTimeStr: string, endTimeStr: string): string => {
  try {
    const startTime = parseISO(startTimeStr);
    const endTime = parseISO(endTimeStr);

    if (isValid(startTime) && isValid(endTime)) {
      return `${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}`; // e.g., 9:00 AM - 9:30 AM
    } else {
      console.warn(`Invalid date format found in TimeSlotSelection: startTime=${startTimeStr}, endTime=${endTimeStr}`);
      return 'Invalid time';
    }
  } catch (error) {
    console.error('Error formatting time range:', error);
    return 'Error';
  }
};


const TimeSlotSelection: React.FC<TimeSlotSelectionProps> = ({ availabilities, onTimeSlotSelect }) => {
  const [selectedTimeSlotId, setSelectedTimeSlotId] = useState<string | null>(null);

  const handleTimeSlotSelect = (timeSlot: Availability) => {
    onTimeSlotSelect(timeSlot);
    setSelectedTimeSlotId(timeSlot._id);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Select Time Slot</Text>
      {availabilities.length === 0 ? (
        <View style={styles.emptyContainer}>
          <AntDesign name="calendar" size={60} color="#cccccc" />
          <Text style={styles.emptyText}>No time slots available for this date.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.timeSlotsContainer} showsVerticalScrollIndicator={false}>
          {availabilities.map((item) => {
            const key = String(item._id || `timeslot-${Math.random()}`);
            const isSelected = selectedTimeSlotId === item._id;
            const dateText = formatDate(item.startTime); // Format the date
            const timeText = formatTimeRange(item.startTime, item.endTime); // Format the time range

            return (
              <TouchableOpacity
                key={key}
                style={[styles.itemCard, isSelected && styles.selectedItemCard]}
                onPress={() => handleTimeSlotSelect(item)}
                activeOpacity={0.7}
              >
                <View style={styles.iconContainer}>
                   <FontAwesome5 name="calendar-alt" size={20} color={isSelected ? '#fff' : '#555'} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={[styles.dateText, isSelected && styles.selectedText]}>
                    {dateText}
                  </Text>
                   <Text style={[styles.timeTextLabel, isSelected && styles.selectedText]}>
                    Time
                  </Text>
                  <Text style={[styles.timeTextValue, isSelected && styles.selectedText]}>
                    {timeText}
                  </Text>
                </View>
                 <View style={styles.iconContainer}>
                   <MaterialIcons name="access-time" size={22} color={isSelected ? '#fff' : '#555'} />
                 </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    backgroundColor: '#ffff', // Lighter background for the whole section
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold', // Bolder label
    marginBottom: 15,
    color: '#333', // Darker text
    textAlign: 'left', // Align label to the left
    paddingLeft: 5,
  },
  timeSlotsContainer: {
    paddingBottom: 10,
  },
  itemCard: {
    backgroundColor: '#ffffff', // White background for cards
    paddingVertical: 15,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, // Subtle shadow
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row', // Arrange icon, text, icon horizontally
    alignItems: 'center', // Center items vertically
    borderWidth: 1,
    borderColor: '#e0e0e0', // Light border
  },
  selectedItemCard: {
    backgroundColor: '#007bff', // Professional blue for selected
    borderColor: '#0056b3', // Darker blue border for selected
    shadowColor: '#007bff',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  iconContainer: {
    marginHorizontal: 8, // Space around icons
  },
  textContainer: {
    flex: 1, // Take remaining space
    marginLeft: 10, // Space between icon and text
  },
  dateText: {
    fontSize: 15,
    fontWeight: '600', // Slightly bolder date
    color: '#444',
    marginBottom: 4, // Space between date and time label
  },
   timeTextLabel: {
    fontSize: 13,
    color: '#666', // Lighter color for the label
    fontWeight: '500',
  },
  timeTextValue: {
    fontSize: 16, // Larger time value
    color: '#333',
    fontWeight: 'bold', // Bold time
  },
  selectedText: {
    color: '#ffffff', // White text when selected
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    opacity: 0.8,
    backgroundColor: '#f9f9f9', // Slightly different background for empty state
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    marginTop: 10,
  },
  emptyText: {
    fontSize: 16, // Slightly smaller empty text
    color: '#666', // Grey color
    textAlign: 'center',
    marginTop: 15,
    fontWeight: '500',
  },
});

export default TimeSlotSelection;