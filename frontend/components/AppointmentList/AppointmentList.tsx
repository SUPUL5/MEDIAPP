// frontend/components/AppointmentList/AppointmentList.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { format, parseISO } from 'date-fns';
import { Appointment, AuthUser } from '../../types';
import styles from './styles';
import { AntDesign, MaterialIcons } from '@expo/vector-icons';
import appointmentApi from '../../api/appointmentApi';
import CustomAlert from '../CustomAlert'; // Import CustomAlert

interface AppointmentListProps {
  appointments: Appointment[];
  user: AuthUser; // Pass user info to determine actions
  onUpdateAppointment: (updatedAppointment: Appointment) => void; // Callback to update parent state
}

type ActionType = 'cancel' | 'confirm' | 'delete' | null; // Allow null for initial state

const AppointmentList: React.FC<AppointmentListProps> = ({ appointments, user, onUpdateAppointment }) => {
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: 'error' as 'error' | 'success' | 'warning' | 'info',
    title: '',
    message: '',
    confirmAction: null as (() => Promise<void>) | null, // Action is async
    appointmentIdToAction: null as string | null,
    actionType: null as ActionType, // Initialize with null
  });

  const showAlert = (
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string,
    confirmAction: (() => Promise<void>) | null = null, // Action is async
    appointmentId: string | null = null,
    actionType: ActionType = null // Use ActionType
  ) => {
    setAlertConfig({
      visible: true,
      type,
      title,
      message,
      confirmAction,
      appointmentIdToAction: appointmentId,
      actionType,
    });
  };

  const hideAlert = () => {
    setAlertConfig({
      visible: false,
      type: 'error',
      title: '',
      message: '',
      confirmAction: null,
      appointmentIdToAction: null,
      actionType: null, // Reset to null
    });
  };

  const handleCancelAppointment = async (id: string) => {
    showAlert(
      'warning',
      'Confirm Cancellation',
      'Are you sure you want to cancel this appointment?',
      async () => { // Pass the async function directly
        try {
          const updatedAppointment = await appointmentApi.cancelAppointment(id);
          onUpdateAppointment(updatedAppointment); // Update state in parent
          showAlert('success', 'Cancelled', 'Appointment cancelled successfully.');
        } catch (error: any) {
          showAlert('error', 'Error', error.message || 'Failed to cancel appointment.');
        }
      },
      id,
      'cancel'
    );
  };

   const handleConfirmAppointment = async (id: string) => {
    showAlert(
      'warning',
      'Confirm Appointment',
      'Are you sure you want to confirm this appointment?',
      async () => { // Pass the async function directly
        try {
          const updatedAppointment = await appointmentApi.confirmAppointment(id);
          onUpdateAppointment(updatedAppointment);
          showAlert('success', 'Confirmed', 'Appointment confirmed successfully.');
        } catch (error: any) {
          showAlert('error', 'Error', error.message || 'Failed to confirm appointment.');
        }
      },
      id,
      'confirm'
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <AntDesign name="clockcircleo" size={16} color={getStatusBorderColor(status)} />;
      case 'confirmed':
        return <AntDesign name="checkcircleo" size={16} color={getStatusBorderColor(status)} />;
      case 'cancelled':
        return <AntDesign name="closecircleo" size={16} color={getStatusBorderColor(status)} />;
      case 'completed':
        return <AntDesign name="check" size={16} color={getStatusBorderColor(status)} />;
      default:
        return <AntDesign name="questioncircleo" size={16} color={getStatusBorderColor(status)} />;
    }
  };

  const renderDoctorActions = (appointment: Appointment) => {
    if (appointment.status === 'scheduled') {
      return (
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={[styles.actionButton, styles.confirmButton]} onPress={() => handleConfirmAppointment(appointment._id)}>
            <AntDesign name="check" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Confirm</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={() => handleCancelAppointment(appointment._id)}>
            <AntDesign name="close" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null; // No actions for other statuses for doctor
  };

  const renderPatientActions = (appointment: Appointment) => {
    if (['scheduled', 'confirmed'].includes(appointment.status)) {
      return (
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={() => handleCancelAppointment(appointment._id)}>
            <AntDesign name="close" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null; // No actions for cancelled or completed for patient
  };

  return (
    <>
      <View style={styles.container}>
        {appointments.length === 0 ? (
          <View style={styles.emptyStateContainer}>
             <MaterialIcons name="event-busy" size={60} color="#bdc3c7" />
             <Text style={styles.empty}>No appointments found.</Text>
          </View>
        ) : (
          <View style={styles.appointmentsContainer}>
            {appointments.map((item) => {
              const person = user.role === 'patient' ? item.doctorId : item.patientId;
              // Type guard to ensure person is an object before accessing properties
              const personName = typeof person === 'object' && person !== null ? `${person.firstName} ${person.lastName}` : 'N/A';
              const personEmail = typeof person === 'object' && person !== null ? person.email : 'N/A';
              const personPhone = typeof person === 'object' && person !== null ? person.phone : 'N/A';

              return (
                <View style={styles.item} key={item._id}>
                  <View style={styles.itemHeader}>
                    <View style={styles.dateTimeContainer}>
                       <AntDesign name="calendar" size={16} color="#34495e" style={styles.iconMargin} />
                       <Text style={styles.date}>
                          {format(parseISO(item.availability.startTime), 'MMMM dd, yyyy')}
                       </Text>
                    </View>
                    <View style={styles.dateTimeContainer}>
                        <AntDesign name="clockcircleo" size={16} color="#34495e" style={styles.iconMargin}/>
                        <Text style={styles.time}>
                         {`${format(parseISO(item.availability.startTime), 'h:mm a')} - ${format(parseISO(item.availability.endTime), 'h:mm a')}`}
                        </Text>
                    </View>
                  </View>
                  <View style={styles.separator} />
                  <View style={styles.detailsContainer}>
                     <View style={styles.detailRow}>
                         <AntDesign name={user.role === 'patient' ? "solution1" : "user"} size={16} color="#34495e" style={styles.iconMargin} />
                         <Text style={styles.detailText}>{personName}</Text>
                     </View>
                     {typeof person === 'object' && person !== null && user.role === 'patient' && item.status === 'confirmed' && (
                       <>
                         <View style={styles.detailRow}>
                            <AntDesign name="mail" size={16} color="#34495e" style={styles.iconMargin} />
                            <Text style={styles.detailText}>{personEmail}</Text>
                         </View>
                         <View style={styles.detailRow}>
                            <AntDesign name="phone" size={16} color="#34495e" style={styles.iconMargin} />
                            <Text style={styles.detailText}>{personPhone}</Text>
                         </View>
                       </>
                     )}
                     {typeof person === 'object' && person !== null && user.role === 'doctor' && item.status === 'confirmed' && (
                         <View style={styles.detailRow}>
                            <AntDesign name="phone" size={16} color="#34495e" style={styles.iconMargin} />
                            <Text style={styles.detailText}>{personPhone}</Text>
                         </View>
                     )}
                     <View style={styles.detailRow}>
                         <AntDesign name="medicinebox" size={16} color="#34495e" style={styles.iconMargin} />
                         <Text style={styles.detailText}>{item.serviceType}</Text>
                     </View>
                   </View>
                   <View style={styles.footerContainer}>
                      <View style={[styles.statusChip, { borderColor: getStatusBorderColor(item.status) }]}>
                        {getStatusIcon(item.status)}
                        <Text style={[styles.statusText, { color: getStatusBorderColor(item.status) }]}>{item.status}</Text>
                      </View>
                      {/* Render actions based on user role */}
                      {user.role === 'doctor' ? renderDoctorActions(item) : renderPatientActions(item)}
                   </View>

                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Reusable Confirmation Alert */}
      <CustomAlert
        visible={alertConfig.visible && !!alertConfig.confirmAction} // Show only if confirmAction is set
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={[
          { text: 'Cancel', onPress: hideAlert, style: 'cancel' },
          { text: 'Confirm', onPress: async () => { // Make the onPress async
              if (alertConfig.confirmAction) {
                await alertConfig.confirmAction(); // Await the action
              }
              hideAlert(); // Hide alert after action
            }, style: 'default'
          },
        ]}
        onDismiss={hideAlert}
      />

       {/* Simple OK Alert */}
      <CustomAlert
        visible={alertConfig.visible && !alertConfig.confirmAction} // Show only if confirmAction is NOT set
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={[{ text: 'OK', onPress: hideAlert, style: 'default' }]}
        onDismiss={hideAlert}
      />
    </>
  );
};

const getStatusBorderColor = (status: string) => {
  switch (status) {
    case 'scheduled':
      return '#3498db'; // Blue
    case 'confirmed':
      return '#2ecc71'; // Green
    case 'cancelled':
      return '#e74c3c'; // Red
    case 'completed':
      return '#27ae60'; // Darker Green
    default:
      return '#7f8c8d'; // Grey
  }
};

export default AppointmentList;