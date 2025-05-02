import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { AppointmentCreateRequest, Appointment, Availability } from '../types';
import appointmentApi from '../api/appointmentApi';
import { format, parseISO } from 'date-fns';
import CustomAlert from './CustomAlert';
import { AntDesign } from '@expo/vector-icons';

interface AppointmentCreationProps {
  availability: Availability;
  onAppointmentCreate: (appointment: Appointment) => void;
}

const AppointmentCreation: React.FC<AppointmentCreationProps> = ({ availability, onAppointmentCreate }) => {
  const [serviceType, setServiceType] = useState('default');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [successAlertVisible, setSuccessAlertVisible] = useState(false);

  const handleCreateAppointment = async () => {
    setIsLoading(true);
    setError(null);

    if (!serviceType) {
      setError('Please select the service type');
      setAlertVisible(true);
      setIsLoading(false);
      return;
    }

    const appointmentData: AppointmentCreateRequest = {
      availabilityId: availability._id,
      serviceType: serviceType,
    };

    try {
      const response: any = await appointmentApi.createAppointment(appointmentData);
      if (response) {
        onAppointmentCreate(response);
        setServiceType('');
        setSuccessAlertVisible(true);
      }
    } catch (e: any) {
      const errorMessage = e.response?.data?.message || e.message || 'Failed to create appointment';
      setError(errorMessage);
      setAlertVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Create Appointment</Text>
      <View style={[styles.infoContainer, styles.cardContainer]}>
        <AntDesign name="calendar" size={20} color="#8cb4ff" style={{ marginRight: 5 }} />
        <Text style={styles.infoLabel}>Date</Text>
        <Text style={styles.info}>
          {format(parseISO(availability.startTime), 'MMMM dd, yyyy')}
        </Text>
      </View>
      <View style={[styles.infoContainer, styles.cardContainer]}>
        <AntDesign name="clockcircleo" size={20} color="#8cb4ff" style={{ marginRight: 5 }} />
        <Text style={styles.infoLabel}>Time</Text>
        <Text style={styles.info}>
          {format(parseISO(availability.startTime), 'h:mm a')} - {format(parseISO(availability.endTime), 'h:mm a')}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.choiceButton, serviceType === 'default' && styles.selectedChoiceButton]}
          onPress={() => setServiceType('default')}
        >
          <AntDesign name="user" size={24} color={serviceType === 'default' ? '#fff' : '#007bff'} />
          <Text style={[styles.choiceButtonText, serviceType === 'default' && styles.selectedChoiceButtonText]}>Default</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.choiceButton, serviceType === 'counseling' && styles.selectedChoiceButton]}
          onPress={() => setServiceType('counseling')}
        >
          <AntDesign name="solution1" size={24} color={serviceType === 'counseling' ? '#fff' : '#007bff'} />
          <Text style={[styles.choiceButtonText, serviceType === 'counseling' && styles.selectedChoiceButtonText]}>Counseling</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.createButton} onPress={handleCreateAppointment} disabled={isLoading}>
        {isLoading ? <ActivityIndicator size="small" color="#fff" /> : <AntDesign name="pluscircle" size={30} color="#fff" />}
      </TouchableOpacity>

      <CustomAlert
        visible={alertVisible}
        type="error"
        title="Error"
        message={error || ''}
        buttons={[{ text: 'OK', onPress: () => setAlertVisible(false), style: 'default' }]}
        onDismiss={() => setAlertVisible(false)}
      />
      <CustomAlert
        visible={successAlertVisible}
        type="success"
        title="Success"
        message="Appointment created successfully!"
        buttons={[{ text: 'OK', onPress: () => setSuccessAlertVisible(false), style: 'default' }]}
        onDismiss={() => setSuccessAlertVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    elevation: 3,
  },
  label: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 20,
    color: '#444',
    textAlign: 'left',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardContainer: {
    backgroundColor: '#ffff',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#007bff',
    elevation: 1,
  },
  infoLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#555',
    marginRight: 7,
  },
  info: {
    fontSize: 17,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  choiceButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
    flex: 1,
    marginHorizontal: 5,
  },
  selectedChoiceButton: {
    backgroundColor: '#007bff',
  },
  choiceButtonText: {
    color: '#007bff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 5,
  },
  selectedChoiceButtonText: {
    color: '#fff',
  },
  createButton: {
    backgroundColor: '#007bff',
    borderRadius: 50,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignSelf: 'center'
  },
  error: {
    color: 'red',
    marginTop: 5,
    textAlign: 'center',
  },
});

export default AppointmentCreation;