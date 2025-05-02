// frontend/components/ChatPanel.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, SafeAreaView,
  InteractionManager, // Keep InteractionManager (used by useAutoScroll)
} from 'react-native';
import { AntDesign, FontAwesome5 } from '@expo/vector-icons';
// --- Import Hooks ---
import { useUserData } from '../hooks/useUserData';
import { useChatMessages } from '../hooks/useChatMessages';
import { useChatApi } from '../hooks/useChatApi';
import { useAutoScroll } from '../hooks/useAutoScroll';
import { useChatAlerts } from '../hooks/useChatAlerts';
// --- Import Components and Types ---
import DoctorCard from './DoctorCard';
import FreeSlotCard from './FreeSlotCard';
import AdviceCard from './AdviceCard';
import AppointmentCard from './AppointmentCard';
import CustomAlert from './CustomAlert';
import { renderRichText } from './RichTextRenderer';
import {
  ChatMessage, ChatHistoryItem, DoctorRecommendation, User, Appointment, Availability, AuthUser
} from '../types'; // Adjust path

interface ChatPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

const INITIAL_MESSAGE = 'Hello! How can I help you today? Please describe your symptoms or ask about appointments.';

const ChatPanel: React.FC<ChatPanelProps> = ({ isVisible, onClose }) => {
  // --- Use Hooks ---
  const { currentUser, loadUserData, isLoadingUser } = useUserData();
  const { messages, history, addMessage, setHistory, initializeMessages, clearChat } = useChatMessages();
  const { sendMessage, isLoading: isLoadingApi } = useChatApi({ addMessage, setHistory });
  const { flatListRef, triggerScroll, handleContentSizeChange, handleScroll, handleTouchStart, handleTouchEnd, onMomentumScrollBegin, onMomentumScrollEnd } = useAutoScroll();
  const { alertConfig, showAlert, hideAlert } = useChatAlerts();

  // --- Local State for Input ---
  const [inputText, setInputText] = useState<string>('');

  // --- Effects ---
  useEffect(() => {
    if (isVisible) {
      // console.log("[ChatPanel] Becoming visible.");
      loadUserData().catch(err => {
        showAlert('error', 'User Error', 'Could not load user profile. Please try again.');
        // Consider closing the panel if user data is essential
        // onClose();
      });
      if (messages.length === 0) {
        initializeMessages(INITIAL_MESSAGE);
      }
      // Trigger scroll after messages likely updated
       setTimeout(() => triggerScroll(false), 150);
    } else {
    //   console.log("[ChatPanel] Becoming hidden.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, loadUserData, initializeMessages, triggerScroll]); // Add dependencies

  useEffect(() => {
     // When messages change, trigger scroll. useAutoScroll handles debouncing/timing.
     if (messages.length > 0) {
         triggerScroll();
     }
  }, [messages, triggerScroll]);


  // --- Event Handlers ---
  const handleSend = async () => {
    const trimmedInput = inputText.trim();
    if (!trimmedInput || isLoadingApi || isLoadingUser) { // Check both loading states
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, // Simplified ID gen
      role: 'user',
      text: trimmedInput,
      timestamp: Date.now(),
    };

    addMessage(userMessage); // Add user message to UI state immediately
    setInputText('');
    triggerScroll(); // Scroll after adding user message

    await sendMessage(trimmedInput, history); // Call API hook

    triggerScroll(); // Scroll after API response is processed (handled within hook's addMessage)
  };

  const handleClearChat = () => {
    Alert.alert("Clear Chat", "Are you sure you want to clear the chat history?",
      [ { text: "Cancel", style: "cancel" },
        { text: "Clear", onPress: () => {
            clearChat(INITIAL_MESSAGE);
            triggerScroll(false);
          }, style: "destructive", },
      ]
    );
  };

  const handleAppointmentBooked = useCallback((bookedAppointment: Appointment) => {
    const doctor = bookedAppointment.doctorId as User | undefined;
    const doctorName = (doctor && doctor.firstName) ? `Dr. ${doctor.firstName} ${doctor.lastName}` : 'the doctor';
    const confirmationMessage: ChatMessage = {
      id: `bot-confirm-${Date.now()}`,
      role: 'model',
      text: `Great! Your appointment with ${doctorName} is confirmed. See details below.`,
      timestamp: Date.now(),
      createdAppointment: bookedAppointment,
    };
    addMessage(confirmationMessage);
    showAlert('success', 'Booking Confirmed', `Appointment with ${doctorName} is confirmed!`);
    triggerScroll();
  }, [addMessage, showAlert, triggerScroll]); // Dependencies

  const handleAppointmentUpdate = useCallback((updatedAppointment: Appointment) => {
     let updateText = `Okay, the appointment status is now '${updatedAppointment.status}'.`;
     let alertType: 'success' | 'info' = 'success';
     let alertTitle = 'Appointment Updated';

     if (updatedAppointment.status.toLowerCase() === 'cancelled') {
          updateText = `Okay, the appointment has been cancelled.`;
          alertType = 'info';
          alertTitle = 'Appointment Cancelled';
     }
     const updateMsg: ChatMessage = {
       id: `bot-update-${Date.now()}`,
       role: 'model',
       text: updateText,
       timestamp: Date.now(),
       updatedAppointment: updatedAppointment,
     };
     addMessage(updateMsg);
     showAlert(alertType, alertTitle, updateText);
     triggerScroll();
  }, [addMessage, showAlert, triggerScroll]); // Dependencies

  // --- Defensive Render Item ---
  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isBot = item.role === 'model';
    const trimmedText = item.text?.trim() ?? '';
    const adviceText = item.advice?.trim() ?? null;
    const hasAdvice = !!adviceText;

    const recommendations = Array.isArray(item.recommendations) ? item.recommendations : [];
    const foundAppointments = Array.isArray(item.foundAppointments) ? item.foundAppointments : [];
    const foundSlots = Array.isArray(item.foundSlots) ? item.foundSlots : [];

    const hasRecs = recommendations.length > 0;
    const hasFoundAppointmentsList = foundAppointments.length > 0;
    const hasSlotsList = foundSlots.length > 0;

    const hasBookingConfirmationCard = !!item.createdAppointment?._id;
    const hasUpdateConfirmationCard = !!item.updatedAppointment?._id;
    const errorText = item.error?.trim() ?? null;
    const hasError = !!errorText;

    const hasAnyCard = hasAdvice || hasRecs || hasFoundAppointmentsList || hasSlotsList || hasBookingConfirmationCard || hasUpdateConfirmationCard;

    // Determine display text (prefer detailed error over generic error message)
    const genericErrorMatcher = /Sorry, I encountered an error/i;
    const textToDisplay = (hasError && trimmedText && genericErrorMatcher.test(trimmedText) && errorText)
                         ? errorText
                         : trimmedText;
    const shouldRenderTextComponent = textToDisplay.length > 0;

    if (!shouldRenderTextComponent && !hasAnyCard && !hasError) {
        return null; // Skip rendering empty messages
    }

    const messageContainerStyle = [ styles.messageBubbleContainer, isBot ? styles.botBubbleContainer : styles.userBubbleContainer ];
    const messageBubbleStyle = [ styles.messageBubble, isBot ? styles.botBubble : styles.userBubble, isBot && hasAnyCard && styles.botBubbleFullWidth ];

    let elementAbove = false;

    return (
        <View style={messageContainerStyle}>
            <View style={messageBubbleStyle}>
                {/* 1. Text */}
                {shouldRenderTextComponent && (
                    <View style={[styles.textBlock, isBot ? styles.botTextContainer : styles.userTextContainer]}>
                        {renderRichText(textToDisplay, isBot ? styles.botText : styles.userText)}
                        {elementAbove = true}
                    </View>
                )}
                {/* 2. Advice Card */}
                {hasAdvice && adviceText && (
                    <View style={[styles.cardItemContainer, elementAbove && styles.elementSpacing]}>
                        <AdviceCard advice={adviceText} />
                        {elementAbove = true}
                    </View>
                )}
                {/* 3. Recommendations */}
                {hasRecs && (
                    <View style={[styles.cardSection, elementAbove && styles.elementSpacing]}>
                        {recommendations.map((rec, index) => {
                            const doctor = rec.doctor as User | undefined;
                            const slots = Array.isArray(rec.availabilitySlots) ? rec.availabilitySlots : [];
                            const doctorIdForSlot = doctor?._id ?? `unknown-rec-${item.id}-${index}`;
                            return (
                                <View key={`rec-${item.id}-${index}`} style={styles.cardItemContainer}>
                                    {doctor ? <DoctorCard doctor={doctor} /> : <View style={styles.placeholderCard}><Text>Doctor info missing.</Text></View>}
                                    {slots.length > 0 && (
                                    <View style={styles.slotsSubSection}>
                                        {slots.map((slot, slotIndex) => (
                                        <FreeSlotCard key={`rec-slot-${slot._id}-${slotIndex}`} slot={slot} doctorId={doctorIdForSlot} onAppointmentBooked={handleAppointmentBooked} />
                                        ))}
                                    </View>
                                    )}
                                </View>
                            );
                        })}
                        {elementAbove = true}
                    </View>
                )}
                {/* 4. Found Appointments List */}
                {hasFoundAppointmentsList && currentUser && !hasBookingConfirmationCard && !hasUpdateConfirmationCard && (
                    <View style={[styles.cardSection, elementAbove && styles.elementSpacing]}>
                        {foundAppointments.map((appt: Appointment, index) => (
                            <View key={`found-appt-${appt._id}-${index}`} style={styles.cardItemContainer}>
                                <AppointmentCard appointment={appt} user={currentUser} onUpdate={handleAppointmentUpdate}/>
                            </View>
                        ))}
                        {elementAbove = true}
                    </View>
                )}
                {/* 5. Standalone Found Slots */}
                {hasSlotsList && !hasRecs && (
                    <View style={[styles.cardSection, elementAbove && styles.elementSpacing]}>
                        {foundSlots.map((slot: Availability, index) => (
                            <View key={`found-slot-${slot._id}-${index}`} style={styles.cardItemContainer}>
                                <FreeSlotCard slot={slot} doctorId={String(slot.doctorId)} onAppointmentBooked={handleAppointmentBooked} />
                            </View>
                        ))}
                        {elementAbove = true}
                    </View>
                )}
                {/* 6. Booking Confirmation Card */}
                {hasBookingConfirmationCard && item.createdAppointment && currentUser && (
                    <View style={[styles.cardSection, elementAbove && styles.elementSpacing]}>
                        <View key={`confirm-appt-${item.createdAppointment._id}`} style={styles.cardItemContainer}>
                            <AppointmentCard appointment={item.createdAppointment} user={currentUser} onUpdate={handleAppointmentUpdate} />
                        </View>
                        {elementAbove = true}
                    </View>
                )}
                {/* 7. Update Confirmation Card */}
                {hasUpdateConfirmationCard && item.updatedAppointment && currentUser && (
                    <View style={[styles.cardSection, elementAbove && styles.elementSpacing]}>
                        <View key={`update-appt-${item.updatedAppointment._id}`} style={styles.cardItemContainer}>
                            <AppointmentCard appointment={item.updatedAppointment} user={currentUser} onUpdate={handleAppointmentUpdate} />
                        </View>
                        {elementAbove = true}
                    </View>
                )}
                {/* 8. Detailed Error Text (if present and not already shown as main text) */}
                {hasError && errorText && textToDisplay !== errorText && (
                    <View style={[styles.errorBlock, elementAbove && styles.elementSpacing]}>
                        <Text style={styles.errorText}>{errorText}</Text>
                    </View>
                )}
            </View>
        </View>
    );
}; // End renderMessageItem


  // --- Main Component JSX ---
  if (!isVisible) return null;

  return (
    <SafeAreaView style={styles.fullScreenSafeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0} // Adjust offset as needed
      >
        <View style={styles.panelContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>MediBot Assistant</Text>
            <TouchableOpacity onPress={handleClearChat} style={styles.clearButton} accessibilityLabel="Clear chat history">
              <AntDesign name="delete" size={22} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityLabel="Close chat panel">
              <AntDesign name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Message List */}
           {isLoadingUser ? (
               <ActivityIndicator size="large" color="#007AFF" style={styles.fullScreenLoader} />
           ) : (
              <FlatList
                  ref={flatListRef}
                  data={messages}
                  renderItem={renderMessageItem}
                  keyExtractor={(item) => item.id}
                  style={styles.messageList}
                  contentContainerStyle={styles.messageListContent}
                  initialNumToRender={10} // Start lower
                  maxToRenderPerBatch={5} // Render smaller batches
                  windowSize={7}          // Reduce window size
                  keyboardShouldPersistTaps="handled"
                  onContentSizeChange={handleContentSizeChange}
                  // --- Pass scroll handling props ---
                  onScroll={handleScroll}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  onMomentumScrollBegin={onMomentumScrollBegin}
                  onMomentumScrollEnd={onMomentumScrollEnd}
                  scrollEventThrottle={16} // Standard throttle
                  // --- End scroll handling props ---
                />
           )}

          {/* Typing Indicator */}
          {isLoadingApi && ( // Use API loading state
            <View style={styles.typingIndicatorContainer}>
              <FontAwesome5 name="robot" size={16} color="#6B7280" style={{ marginRight: 8 }} />
              <Text style={styles.typingIndicator}>MediBot is thinking...</Text>
              <ActivityIndicator size="small" color="#6B7280" />
            </View>
          )}

          {/* Input Area */}
          <View style={styles.inputArea}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Describe symptoms or ask..."
              placeholderTextColor="#9CA3AF"
              multiline
              editable={!isLoadingApi && !isLoadingUser} // Disable input while loading API or user
              selectionColor={'#007AFF'}
            />
            <TouchableOpacity
              style={[styles.sendButton, (isLoadingApi || isLoadingUser || !inputText.trim()) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={isLoadingApi || isLoadingUser || !inputText.trim()}
              accessibilityLabel="Send message"
            >
              <AntDesign name="arrowup" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Alert Component */}
        <CustomAlert
          visible={alertConfig.visible}
          type={alertConfig.type}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={[{ text: 'OK', onPress: hideAlert }]}
          onDismiss={hideAlert}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// --- Styles (Keep existing styles - Use the ones provided in the prompt) ---
const styles = StyleSheet.create({
  fullScreenSafeArea: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#F8F9FA', zIndex: 100, paddingTop: Platform.OS === 'android' ? 25 : 50 },
  keyboardAvoidingView: { flex: 1, },
  panelContainer: { flex: 1, backgroundColor: '#F8F9FA', },
  header: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#FFFFFF', position: 'relative', },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', },
  clearButton: { position: 'absolute', left: 16, padding: 5, zIndex: 1, top: '50%', transform: [{ translateY: -11 }], },
  closeButton: { position: 'absolute', right: 16, padding: 5, zIndex: 1, top: '50%', transform: [{ translateY: -12 }], },
  messageList: { flex: 1, paddingHorizontal: 10, paddingTop: 10, },
  messageListContent: { paddingBottom: 10, },
  fullScreenLoader: { flex: 1, justifyContent: 'center', alignItems: 'center'},
  messageBubbleContainer: { flexDirection: 'row', marginBottom: 12, },
  userBubbleContainer: { justifyContent: 'flex-end', alignSelf: 'flex-end', paddingLeft: '20%', maxWidth: '80%', },
  botBubbleContainer: { justifyContent: 'flex-start', alignSelf: 'flex-start', maxWidth: '95%', }, // Allow bot bubbles to be wider
  messageBubble: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18, minWidth: 40, },
  userBubble: { backgroundColor: '#007AFF', borderBottomRightRadius: 4, },
  botBubble: { backgroundColor: '#E5E7EB', borderBottomLeftRadius: 4, },
  botBubbleFullWidth: { width: '100%', maxWidth: '100%', alignSelf: 'stretch' },
  textBlock: {},
  userTextContainer: {},
  botTextContainer: {},
  userText: { color: '#FFFFFF', fontSize: 15, lineHeight: 21, },
  botText: { color: '#1F2937', fontSize: 15, lineHeight: 21, },
  elementSpacing: { marginTop: 10, },
  cardSection: { },
  cardItemContainer: { marginBottom: 8, }, // Space below each card
  slotsSubSection: { marginTop: 8, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: '#D1D5DB' },
  placeholderCard: { padding: 15, backgroundColor: '#F3F4F6', borderRadius: 8, alignItems: 'center', justifyContent: 'center', minHeight: 60, },
  placeholderText: { color: '#6B7280', fontSize: 14, fontStyle: 'italic', textAlign: 'center', },
  errorBlock: { marginTop: 8, padding: 8, backgroundColor: '#FEE2E2', borderRadius: 4 },
  errorText: { color: '#DC2626', fontSize: 14, fontWeight: '500', },
  typingIndicatorContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB', },
  typingIndicator: { fontSize: 14, color: '#6B7280', fontStyle: 'italic', marginRight: 5, },
  inputArea: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 10, paddingVertical: 8, paddingBottom: Platform.OS === 'ios' ? 25 : 12, borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: '#FFFFFF', },
  textInput: { flex: 1, minHeight: 42, maxHeight: 120, backgroundColor: '#F3F4F6', borderRadius: 21, paddingHorizontal: 18, paddingVertical: Platform.OS === 'ios' ? 10 : 8, paddingTop: Platform.OS === 'ios' ? 10 : 12, fontSize: 15, lineHeight: 20, marginRight: 10, color: '#1F2937', },
  sendButton: { backgroundColor: '#007AFF', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: Platform.OS === 'ios' ? 0 : 1, },
  sendButtonDisabled: { backgroundColor: '#B0D7FF', }, // Lighter blue when disabled
});

export default ChatPanel;