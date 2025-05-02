// frontend/components/DoctorCard.tsx
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { AntDesign, FontAwesome5 } from '@expo/vector-icons';
import { User } from '../types';
import { SERVER_ROOT_URL } from '../api/config';

interface DoctorCardProps {
  doctor: User;
  onPress?: () => void; // Optional press handler
}

const DoctorCard: React.FC<DoctorCardProps> = ({ doctor, onPress }) => {
  const imageUri = doctor.profilePicture
    ? doctor.profilePicture.startsWith('/')
      ? `${SERVER_ROOT_URL}${doctor.profilePicture}`
      : doctor.profilePicture
    : null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} disabled={!onPress} activeOpacity={0.8}>
      <View style={styles.imageContainer}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <FontAwesome5 name="user-md" size={24} color="#fff" />
          </View>
        )}
      </View>
      <View style={styles.detailsContainer}>
        <Text style={styles.name} numberOfLines={1}>Dr. {doctor.firstName} {doctor.lastName}</Text>
        {doctor.specialization && (
          <Text style={styles.specialization} numberOfLines={1}>{doctor.specialization}</Text>
        )}
        {doctor.hospital && (
          <View style={styles.hospitalContainer}>
            <FontAwesome5 name="hospital" size={12} color="#6B7280" style={styles.hospitalIcon}/>
            <Text style={styles.hospitalText} numberOfLines={1}>{doctor.hospital}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center', // Vertically align items
  },
  imageContainer: {
    marginRight: 12,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  placeholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF', // Placeholder color
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsContainer: {
    flex: 1, // Take remaining space
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  specialization: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 4,
  },
  hospitalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  hospitalIcon: {
     marginRight: 5,
  },
  hospitalText: {
    fontSize: 13,
    color: '#6B7280',
    flexShrink: 1, // Allow text to shrink if needed
  },
});

export default DoctorCard;