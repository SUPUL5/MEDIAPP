import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons'; // Keep Ionicons if used in empty state
import { format, parseISO } from 'date-fns';
import { styles } from './styles';
import TimeSlotList from './TimeSlotList';
import TimeSlotModal from './TimeSlotModal';
import { Availability, AvailabilityCreateRequest } from '../../types';

interface TimeSlotManagementProps {
  selectedDate: string | null;
  availabilities: Availability[];
  isLoading: boolean;
  onAddTimeSlot: (timeSlot: AvailabilityCreateRequest) => Promise<void>;
  onDeleteTimeSlot: (id: string) => Promise<void>;
  onUpdateTimeSlot: (id: string, timeSlot: Partial<Availability>) => Promise<void>;
}

const TimeSlotManagement: React.FC<TimeSlotManagementProps> = ({
  selectedDate,
  availabilities,
  isLoading,
  onAddTimeSlot,
  onDeleteTimeSlot,
  onUpdateTimeSlot,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSlot, setEditingSlot] = useState<Availability | null>(null);

  // Filter availabilities for the selected date
  // Calculate summary info for selected date
  const getSummaryForSelectedDate = () => {
    if (!selectedDate) return { total: 0, booked: 0, free: 0 };

    const dateAvailabilities = availabilities.filter(
      slot => format(parseISO(slot.startTime), 'yyyy-MM-dd') === selectedDate
    );
    
    const total = dateAvailabilities.length;
    const booked = dateAvailabilities.filter(slot => slot.isBooked).length;
    const free = total - booked;
    
    return { total, booked, free };
  };

  const summary = getSummaryForSelectedDate();
  const filteredAvailabilities = selectedDate
    ? availabilities.filter(slot =>
        format(parseISO(slot.startTime), 'yyyy-MM-dd') === selectedDate
      )
    : [];

  const openAddModal = () => {
    setEditingSlot(null);
    setModalVisible(true);
  };

  const openEditModal = (slot: Availability) => {
    setEditingSlot(slot);
    setModalVisible(true);
  };

  const handleSaveTimeSlot = async (data: AvailabilityCreateRequest | Partial<Availability>) => {
    if (editingSlot) {
      // Update existing time slot
      await onUpdateTimeSlot(editingSlot._id, data as Partial<Availability>);
    } else {
      // Add new time slot
      await onAddTimeSlot(data as AvailabilityCreateRequest);
    }
    // No need to close modal here, TimeSlotModal handles it internally on success
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitleMain}>Time Slots</Text>
        {selectedDate && (
          <>
            <View style={styles.dateContainer}>
              <MaterialIcons name="event" size={16} color="#666" />
              <Text style={styles.headerDate}>{selectedDate}</Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={openAddModal}
              disabled={!selectedDate}
            >
              <MaterialIcons name="add-circle" size={28} color="#007bff" />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Summary Section */}
      {selectedDate && (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Summary for {selectedDate}</Text>
          {isLoading ? (
            <ActivityIndicator size="small" color="#007bff" />
          ) : (
            <View style={styles.summaryContent}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Slots</Text>
                <Text style={styles.summaryValue}>{summary.total}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Booked</Text>
                <Text style={[styles.summaryValue, { color: '#e57373' }]}>{summary.booked}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Available</Text>
                <Text style={[styles.summaryValue, { color: '#4caf50' }]}>{summary.free}</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Render TimeSlotList - Pass filtered slots and handlers */}
      <TimeSlotList
        slots={filteredAvailabilities}
        isLoading={isLoading}
        selectedDate={selectedDate}
        onEditSlot={openEditModal}
        onDeleteSlot={onDeleteTimeSlot} // Pass delete handler directly
      />

      {/* Render TimeSlotModal */}
      <TimeSlotModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveTimeSlot}
        editingSlot={editingSlot}
        initialDate={selectedDate} // Pass selectedDate to set initial day
      />
    </View>
  );
};

export default TimeSlotManagement;