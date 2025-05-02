// frontend/components/FreeSlotCard.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { format, parseISO } from 'date-fns';
import { AntDesign } from '@expo/vector-icons';
import { Availability } from '../types';
import appointmentApi from '../api/appointmentApi';
import CustomAlert from './CustomAlert'; // Import CustomAlert

interface FreeSlotCardProps {
  slot: Availability;
  doctorId: string; // Need doctorId to link appointment if needed (though backend uses slot ID)
  onAppointmentBooked: (appointment: any) => void; // Callback after successful booking
}

const FreeSlotCard: React.FC<FreeSlotCardProps> = ({ slot, doctorId, onAppointmentBooked }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: 'error' as 'error' | 'success' | 'warning' | 'info',
    title: '',
    message: '',
    confirmAction: null as (() => Promise<void>) | null,
  });

  const showAlert = (
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string,
    confirmAction: (() => Promise<void>) | null = null
  ) => {
    setAlertConfig({ visible: true, type, title, message, confirmAction });
  };

  const hideAlert = () => {
    setAlertConfig(prev => ({ ...prev, visible: false, confirmAction: null }));
  };

  const handleBookAppointment = async () => {
      // Show confirmation alert first
      showAlert(
          'info',
          'Confirm Booking',
          `Book appointment for ${format(parseISO(slot.startTime), 'MMM dd, yyyy')} at ${format(parseISO(slot.startTime), 'p')}?`,
          async () => { // The actual booking logic is the confirm action
              setIsLoading(true);
              try {
                  // Simple service type, can be made dynamic if needed
                  const serviceType = 'Consultation';
                  const newAppointment = await appointmentApi.createAppointment({
                      availabilityId: slot._id,
                      serviceType: serviceType,
                  });
                  onAppointmentBooked(newAppointment); // Notify parent
                  showAlert('success', 'Success', 'Appointment booked successfully!');
              } catch (error: any) {
                  showAlert('error', 'Booking Failed', error.message || 'Could not book appointment.');
              } finally {
                  setIsLoading(false);
              }
          }
      );
  };


  return (
     <>
        <View style={styles.card}>
          <View style={styles.dateTimeContainer}>
            <View style={styles.infoRow}>
              <AntDesign name="calendar" size={14} color="#4B5563" style={styles.icon} />
              <Text style={styles.dateText}>{format(parseISO(slot.startTime), 'MMM dd, yyyy')}</Text>
            </View>
            <View style={styles.infoRow}>
              <AntDesign name="clockcircleo" size={14} color="#4B5563" style={styles.icon} />
              <Text style={styles.timeText}>
                {`${format(parseISO(slot.startTime), 'p')} - ${format(parseISO(slot.endTime), 'p')}`}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.bookButton}
            onPress={handleBookAppointment}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.bookButtonText}>Book Now</Text>
            )}
          </TouchableOpacity>
        </View>
         {/* Alert components */}
        <CustomAlert
            visible={alertConfig.visible && !!alertConfig.confirmAction}
            type={alertConfig.type}
            title={alertConfig.title}
            message={alertConfig.message}
            buttons={[
                { text: 'Cancel', onPress: hideAlert, style: 'cancel' },
                { text: 'Confirm', onPress: async () => {
                     await alertConfig.confirmAction?.(); // Await the action
                     hideAlert();
                   }, style: 'default'
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB', // Light grey background
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB', // Light border
  },
  dateTimeContainer: {
    flex: 1, // Take available space
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  icon: {
    marginRight: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#374151', // Darker text
    fontWeight: '500',
  },
  timeText: {
    fontSize: 15,
    color: '#1F2937', // Even darker for time
    fontWeight: '600',
  },
  bookButton: {
    backgroundColor: '#10B981', // Green color for booking
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    marginLeft: 10, // Space between text and button
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
});

export default FreeSlotCard;