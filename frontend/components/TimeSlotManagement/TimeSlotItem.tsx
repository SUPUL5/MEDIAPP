import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { styles } from './styles';
import { Availability } from '../../types';
import CustomAlert from '../CustomAlert';

interface TimeSlotItemProps {
  slot: Availability;
  onEdit: (slot: Availability) => void;
  onDelete: (id: string) => void;
}

const TimeSlotItem: React.FC<TimeSlotItemProps> = ({ slot, onEdit, onDelete }) => {
  const [isDeleteAlertVisible, setIsDeleteAlertVisible] = useState(false);

  const handleDeletePress = () => {
    setIsDeleteAlertVisible(true);
  };

  const confirmDelete = async () => {
    await onDelete(slot._id);
    setIsDeleteAlertVisible(false);
  };

  const cancelDelete = () => {
    setIsDeleteAlertVisible(false);
  };

  return (
    <>
      <View
        style={[
          styles.slotItem,
          (slot.isBooked && styles.bookedSlot) || null // Using || null for type safety
        ]}
      >
        <View style={styles.slotInfo}>
          <Text style={styles.dayText}>{slot.dayOfWeek}</Text>
          <Text style={styles.timeText}>
            {format(new Date(slot.startTime), 'h:mm a')} - {format(new Date(slot.endTime), 'h:mm a')}
          </Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: slot.isBooked ? '#e57373' : '#4caf50' }]} />
            <Text style={[styles.statusText, { color: slot.isBooked ? '#e57373' : '#4caf50' }]}>
              {slot.isBooked ? 'Booked' : 'Available'}
            </Text>
          </View>
        </View>
        <View style={styles.slotActions}>
          {!slot.isBooked && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onEdit(slot)}
            >
              <MaterialIcons name="edit" size={20} color="#007bff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleDeletePress}
          >
            <MaterialIcons name="delete" size={20} color="#ff6b6b" />
          </TouchableOpacity>
        </View>
      </View>

      <CustomAlert
        visible={isDeleteAlertVisible}
        type="warning"
        title="Delete Time Slot"
        message={`Are you sure you want to delete the time slot for ${slot.dayOfWeek} from ${format(new Date(slot.startTime), 'h:mm a')} to ${format(new Date(slot.endTime), 'h:mm a')}?`}
        buttons={[
          { text: 'Cancel', onPress: cancelDelete, style: 'cancel' },
          { text: 'Delete', onPress: confirmDelete, style: 'default' }
        ]}
        onDismiss={cancelDelete}
      />
    </>
  );
};

export default TimeSlotItem;