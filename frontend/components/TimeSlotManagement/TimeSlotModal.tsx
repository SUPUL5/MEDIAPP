// frontend/components/TimeSlotManagement/TimeSlotModal.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Platform,
  ScrollView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format, parseISO, isValid as isValidDate } from 'date-fns'; // Keep parseISO, add isValid
import { styles } from './styles';
import { Availability, AvailabilityCreateRequest } from '../../types';
import CustomAlert from '../CustomAlert';

const daysOfWeek = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday',
  'Friday', 'Saturday', 'Sunday'
];

interface TimeSlotModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: AvailabilityCreateRequest | Partial<Availability>) => Promise<void>;
  editingSlot: Availability | null;
  initialDate: string | null;
}

const TimeSlotModal: React.FC<TimeSlotModalProps> = ({
  visible,
  onClose,
  onSave,
  editingSlot,
  initialDate,
}) => {
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [endTime, setEndTime] = useState<Date>(new Date(Date.now() + 30 * 60000));
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState('Monday');
  const [dayPickerVisible, setDayPickerVisible] = useState(false);
  const [isSaveAlertVisible, setIsSaveAlertVisible] = useState(false);
  const [validationAlert, setValidationAlert] = useState<{
    visible: boolean;
    message: string;
  }>({ visible: false, message: '' });

  useEffect(() => {
    if (visible) {
      let baseDate: Date;
      if (initialDate) {
        try {
          const parsedDate = parseISO(initialDate + "T00:00:00"); // Assume midnight in local timezone
          if (!isValidDate(parsedDate)) {
            throw new Error("Invalid date string");
          }
          baseDate = parsedDate;
        } catch (e) {
          console.warn("Invalid initialDate provided to TimeSlotModal:", initialDate, e);
          baseDate = new Date(); // Fallback to today
          baseDate.setHours(0, 0, 0, 0);
        }
      } else {
        baseDate = new Date();
        baseDate.setHours(0, 0, 0, 0);
      }

      if (editingSlot) {
        setStartTime(new Date(editingSlot.startTime));
        setEndTime(new Date(editingSlot.endTime));
        setDayOfWeek(editingSlot.dayOfWeek);
      } else {
        const defaultStartTime = new Date(baseDate);
        defaultStartTime.setHours(9, 0, 0, 0); // Default start at 9 AM
        const defaultEndTime = new Date(defaultStartTime);
        defaultEndTime.setMinutes(defaultStartTime.getMinutes() + 30); // Default 30 min slot
        setStartTime(defaultStartTime);
        setEndTime(defaultEndTime);
        const dayIndex = (baseDate.getDay() + 6) % 7; // 0 (Sun) -> 6, 1 (Mon) -> 0, etc.
        setDayOfWeek(daysOfWeek[dayIndex]);
      }
      // Reset picker states
      setShowStartTimePicker(false);
      setShowEndTimePicker(false);
      setDayPickerVisible(false);
      setIsSaveAlertVisible(false);
    }
  }, [visible, editingSlot, initialDate]);

  // Event Type fix: Use DateTimePickerEvent directly from the import
  const onChangeStartTime = (event: DateTimePickerEvent, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartTimePicker(false); // Hide immediately on Android
    }
    if (event.type === 'set' && selectedTime) {
      const newStartTime = new Date(startTime); // Keep original date part
      newStartTime.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
      setStartTime(newStartTime);
      // Adjust end time if start time is now after or equal to end time
      if (newStartTime >= endTime) {
        const newEndTime = new Date(newStartTime);
        newEndTime.setMinutes(newStartTime.getMinutes() + 30); // Default to 30 mins later
        setEndTime(newEndTime);
      }
    } else if (Platform.OS === 'ios') {
        // On iOS, the picker stays visible until dismissed, so hide it if 'set' wasn't the type
        setShowStartTimePicker(false);
    }
  };

  // Event Type fix: Use DateTimePickerEvent directly from the import
  const onChangeEndTime = (event: DateTimePickerEvent, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndTimePicker(false); // Hide immediately on Android
    }
    if (event.type === 'set' && selectedTime) {
      const newEndTime = new Date(endTime); // Keep original date part
      newEndTime.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
       if (newEndTime <= startTime) {
         setValidationAlert({
           visible: true,
           message: "End time must be after start time."
         });
       } else {
          setEndTime(newEndTime);
       }
    } else if (Platform.OS === 'ios') {
       // On iOS, hide if 'set' wasn't the type
       setShowEndTimePicker(false);
    }
  };

  // --- Platform Specific Time Picker Toggles ---
  // Removed the incorrect .open() calls. We now rely on conditionally
  // rendering the DateTimePicker component or using the correct
  // imperative API if one exists and is documented.
  // For simplicity and cross-platform consistency, we'll stick to
  // conditional rendering triggered by state (showStartTimePicker/showEndTimePicker).

  const toggleStartTimePicker = () => {
      setShowStartTimePicker(true);
      if (Platform.OS === 'ios') setShowEndTimePicker(false); // Close other picker on iOS
  };

  const toggleEndTimePicker = () => {
      setShowEndTimePicker(true);
      if (Platform.OS === 'ios') setShowStartTimePicker(false); // Close other picker on iOS
  };
  // --- End Platform Specific Time Picker Toggles ---


  const confirmSave = async () => {
    setIsSaveAlertVisible(false);
    try {
      const finalStartTime = new Date(startTime);
      const finalEndTime = new Date(endTime);

      // Apply the date from initialDate if available (for new slots)
       if (!editingSlot && initialDate) {
        try {
            const parsedDate = parseISO(initialDate + "T00:00:00"); // Assume midnight
             if (!isValidDate(parsedDate)) throw new Error("Invalid Date");
            finalStartTime.setFullYear(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
            finalEndTime.setFullYear(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
        } catch (e) {
            console.error("Error setting date from initialDate:", e);
             setValidationAlert({
               visible: true,
               message: "Invalid date selected. Please try again."
             });
             return;
        }
      }


      const saveData: AvailabilityCreateRequest | Partial<Availability> = {
        startTime: finalStartTime.toISOString(),
        endTime: finalEndTime.toISOString(),
        dayOfWeek: dayOfWeek,
      };

      await onSave(saveData);
      onClose();
    } catch (error: any) {
      setValidationAlert({
        visible: true,
        message: error.message || 'Failed to save time slot. Please try again.'
      });
    }
  };

  const handleSave = () => {
     if (!startTime || !endTime) {
       setValidationAlert({
         visible: true,
         message: "Please select both start and end times"
       });
       return;
     }

     if (endTime <= startTime) {
       setValidationAlert({
         visible: true,
         message: "End time must be after start time"
       });
       return;
     }

     setIsSaveAlertVisible(true);
  };

  const cancelSave = () => {
    setIsSaveAlertVisible(false);
  };

  return (
    <>
      <Modal
        animationType="slide"
        transparent={true}
        visible={visible}
        onRequestClose={onClose}
      >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>
            {editingSlot ? 'Edit Time Slot' : 'Add New Time Slot'}
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Day of Week</Text>
            <TouchableOpacity
              style={styles.daySelector}
              onPress={() => setDayPickerVisible(!dayPickerVisible)}
            >
              <Text style={styles.dayTextModal}>{dayOfWeek}</Text>
              <MaterialIcons name="arrow-drop-down" size={24} color="#333" />
            </TouchableOpacity>

            {dayPickerVisible && (
              <View style={styles.dayPickerContainer}>
                <ScrollView>
                  {daysOfWeek.map((day) => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.dayOption,
                        (day === dayOfWeek && styles.selectedDayOption) || null
                      ]}
                      onPress={() => {
                        setDayOfWeek(day);
                        setDayPickerVisible(false);
                      }}
                    >
                      <Text style={[
                        styles.dayOptionText,
                        (day === dayOfWeek && styles.selectedDayOptionText) || null
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Start Time Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Start Time</Text>
            <TouchableOpacity
              style={styles.timeSelector}
              onPress={toggleStartTimePicker} // Use toggle function
            >
              <Text style={styles.timeTextModal}>{format(startTime, 'h:mm a')}</Text>
              <MaterialIcons name="access-time" size={24} color="#333" />
            </TouchableOpacity>
            {/* Conditionally render DateTimePicker for both platforms */}
            {showStartTimePicker && (
              <DateTimePicker
                value={startTime}
                mode="time"
                is24Hour={false}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onChangeStartTime}
                // Removed Android-specific positive/negative buttons
              />
            )}
          </View>


          {/* End Time Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>End Time</Text>
            <TouchableOpacity
              style={styles.timeSelector}
               onPress={toggleEndTimePicker} // Use toggle function
            >
              <Text style={styles.timeTextModal}>{format(endTime, 'h:mm a')}</Text>
              <MaterialIcons name="access-time" size={24} color="#333" />
            </TouchableOpacity>
            {/* Conditionally render DateTimePicker for both platforms */}
            {showEndTimePicker && (
              <DateTimePicker
                value={endTime}
                mode="time"
                is24Hour={false}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onChangeEndTime}
                minimumDate={new Date(startTime.getTime() + 60000)} // 1 minute after start
                // Removed Android-specific positive/negative buttons
              />
            )}
          </View>


          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.button, styles.buttonCancel]}
              onPress={onClose}
            >
              <Text style={styles.buttonCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonSave]}
              onPress={handleSave}
            >
              <Text style={styles.buttonSaveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      </Modal>

      <CustomAlert
        visible={isSaveAlertVisible}
        type="info"
        title={editingSlot ? "Confirm Edit" : "Confirm Add"}
        message={`Are you sure you want to ${editingSlot ? 'update this' : 'add a new'} time slot for ${dayOfWeek} from ${format(startTime, 'h:mm a')} to ${format(endTime, 'h:mm a')}?`}
        buttons={[
          { text: 'Cancel', onPress: cancelSave, style: 'cancel' },
          { text: 'Confirm', onPress: confirmSave, style: 'default' },
        ]}
        onDismiss={cancelSave}
      />

      <CustomAlert
        visible={validationAlert.visible}
        type="error"
        title="Invalid Input"
        message={validationAlert.message}
        buttons={[
          { text: 'OK', onPress: () => setValidationAlert({ visible: false, message: '' }), style: 'default' }
        ]}
        onDismiss={() => setValidationAlert({ visible: false, message: '' })}
      />
    </>
  );
};

export default TimeSlotModal;