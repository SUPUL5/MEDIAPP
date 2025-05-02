import React from 'react';
    import { View, ScrollView, Text } from 'react-native';
    import { styles } from './styles'; // Removed .ts extension
    import TimeSlotItem from './TimeSlotItem';
    import { Availability } from '../../types';

    interface TimeSlotListProps {
      slots: Availability[];
      isLoading: boolean;
      selectedDate: string | null;
      onEditSlot: (slot: Availability) => void;
      onDeleteSlot: (id: string) => void;
    }

    const TimeSlotList: React.FC<TimeSlotListProps> = ({
      slots,
      isLoading,
      selectedDate,
      onEditSlot,
      onDeleteSlot
    }) => {
      if (!selectedDate) {
        return (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Select a date to manage time slots</Text>
          </View>
        );
      }

      if (isLoading) {
        return (
          <View style={styles.emptyContainer}>
            <Text>Loading time slots...</Text>
          </View>
        );
      }

      if (slots.length === 0) {
        return (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No time slots for this date</Text>
            <Text style={styles.emptySubText}>Tap "Add Slot" to create availability</Text>
          </View>
        );
      }

      return (
        <ScrollView style={styles.slotsContainer}>
          {slots.map((slot) => (
            <TimeSlotItem
              key={slot._id}
              slot={slot}
              onEdit={onEditSlot}
              onDelete={onDeleteSlot}
            />
          ))}
        </ScrollView>
      );
    };

    export default TimeSlotList;