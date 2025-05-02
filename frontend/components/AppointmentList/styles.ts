// frontend/components/AppointmentList/styles.ts
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent', // Match parent background
  },
  appointmentsContainer: {
    paddingBottom: 10,
  },
  item: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15, // Slightly reduced padding
    marginBottom: 15, // Increased spacing
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, // Softer shadow
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e9ecef', // Lighter border
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', // Align items vertically
    marginBottom: 10,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconMargin: {
    marginRight: 5,
  },
  date: {
    fontSize: 15, // Slightly smaller date
    fontWeight: '600',
    color: '#495057', // Dark grey
  },
  time: {
    fontSize: 14,
    color: '#6c757d', // Medium grey
  },
  separator: {
    height: 1,
    backgroundColor: '#e9ecef', // Lighter separator
    marginVertical: 10,
  },
  detailsContainer: {
    marginBottom: 10,
  },
  detailRow: {
     flexDirection: 'row',
     alignItems: 'center',
     marginBottom: 8, // Space between details
  },
  detailText: {
     fontSize: 15,
     color: '#495057',
     textTransform: 'capitalize',
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  statusChip: {
    borderWidth: 1.5, // Slightly thicker border
    borderRadius: 16, // More rounded
    paddingVertical: 5,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: 6,
    fontSize: 13, // Slightly smaller status text
    fontWeight: '500', // Medium weight
    textTransform: 'capitalize',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20, // Rounded buttons
    marginLeft: 8,
    elevation: 2,
     shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  confirmButton: {
    backgroundColor: '#2ecc71', // Green
  },
  cancelButton: {
    backgroundColor: '#e74c3c', // Red
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  emptyStateContainer: {
     flex: 1,
     justifyContent: 'center',
     alignItems: 'center',
     paddingVertical: 60,
     opacity: 0.7,
  },
  empty: {
    fontSize: 17,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 15,
    fontWeight: '500',
  },
});

export default styles;