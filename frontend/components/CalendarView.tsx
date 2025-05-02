import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { DayProps } from 'react-native-calendars/src/calendar/day';
import { MaterialIcons } from '@expo/vector-icons';

interface CalendarViewProps {
  title?: string;
  isLoading: boolean;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  markedDates: Record<string, any>; // Keep this flexible, parent decides structure
}

const CalendarView: React.FC<CalendarViewProps> = ({
  title = 'Calendar View',
  isLoading,
  selectedDate,
  onSelectDate,
  markedDates
}) => {
  const [expanded, setExpanded] = useState(true);

  const toggleCalendar = () => {
    setExpanded(!expanded);
  };

  // Custom Day Component
  const renderDay = (dayProps: DayProps & { date?: DateData }) => {
    const { date, state } = dayProps;
    
    if (!date) {
      return <View />; // Should not happen with standard usage
    }

    const isMarked = markedDates[date.dateString];
    const isSelected = selectedDate === date.dateString;
    const isToday = state === 'today';
    const isDisabled = state === 'disabled';

    const dayTextStyle: any[] = [styles.dayText];
    const dayContainerStyle: any[] = [styles.dayContainer];

    if (isDisabled) {
      dayTextStyle.push(styles.disabledText);
    } else if (isSelected) {
      dayContainerStyle.push(styles.selectedDayContainer);
      dayTextStyle.push(styles.selectedDayText);
    } else if (isToday) {
      dayTextStyle.push(styles.todayText);
    }

    if (isMarked && !isSelected) { // Apply circle only if marked and not selected
        dayContainerStyle.push(styles.markedDayContainer);
        // Keep default text color unless specified otherwise by marking
        if (markedDates[date.dateString]?.customStyles?.text?.color) {
             dayTextStyle.push({ color: markedDates[date.dateString].customStyles.text.color });
        }
    }


    return (
      <TouchableOpacity 
        onPress={() => !isDisabled && onSelectDate(date.dateString)} 
        style={dayContainerStyle}
        disabled={isDisabled}
      >
        <Text style={dayTextStyle}>
          {date.day}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={toggleCalendar} style={styles.headerContainer}>
        <Text style={styles.header}>{title}</Text>
        <MaterialIcons 
          name={expanded ? "expand-less" : "expand-more"} 
          size={24} 
          color="#007bff" 
        />
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.calendarContainer}>
          <Calendar
            onDayPress={(day: DateData) => onSelectDate(day.dateString)}
            markedDates={markedDates} // Pass markedDates, parent controls structure
            // Use the custom day component
            dayComponent={renderDay}
            // Basic theme settings (selection, today, arrows)
            theme={{
              todayTextColor: '#007bff', // Still useful for the default today marking if not selected
              selectedDayBackgroundColor: '#007bff', // Handled by custom component now
              selectedDayTextColor: '#ffffff', // Handled by custom component now
              arrowColor: '#007bff',
              // Remove dot styling as it's replaced by dayComponent
              dotColor: 'transparent', 
              selectedDotColor: 'transparent',
            }}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  calendarContainer: {
    padding: 8,
  },
  // Custom Day Component Styles
  dayContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2, // Added margin for spacing
    borderRadius: 16, // Make it circular
    backgroundColor: 'transparent', // Default background
  },
  markedDayContainer: {
    borderWidth: 2,
    borderColor: '#007bff',
    backgroundColor: 'transparent', // Ensure no background color for marked
  },
  selectedDayContainer: {
    backgroundColor: '#007bff',
    borderColor: '#007bff', // Ensure border matches background for selected
    borderWidth: 2,
  },
  dayText: {
    fontSize: 14,
    color: '#2d4150', // Default text color
  },
  selectedDayText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  todayText: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  disabledText: {
    color: '#d9e1e8',
  },
});

export default CalendarView;