// frontend/components/DoctorSearch.tsx
import React, { useState, useEffect, memo } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Image } from 'react-native'; // Added Image
import { UserResponse, User } from '../types';
import userApi from '../api/userApi';
import { AntDesign } from '@expo/vector-icons';
import { SERVER_ROOT_URL } from '../api/config'; // Import server root URL

interface DoctorSearchProps {
  onDoctorSelect: (doctorId: string) => void;
}

const DoctorSearchComponent: React.FC<DoctorSearchProps> = ({ onDoctorSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [doctors, setDoctors] = useState<User[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [alertVisible, setAlertVisible] = useState(false);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const response: User[] = await userApi.getDoctors();
        if (response && response.length > 0) {
          setDoctors(response as User[]);
          setFilteredDoctors(response as User[]);
        } else {
          setDoctors([]);
          setFilteredDoctors([]);
        }
      } catch (e: any) {
        setError(e.message);
        setAlertVisible(true);
        setDoctors([]);
        setFilteredDoctors([]);
      }
    };

    fetchDoctors();
  }, []);

  useEffect(() => {
    const filtered = doctors.filter((doctor) =>
      `${doctor.firstName} ${doctor.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doctor.specialization && doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredDoctors(filtered);
  }, [searchTerm, doctors]);

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Search by name or specialization"
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholderTextColor="#888"
        />
        <AntDesign name="search1" size={20} color="#888" style={styles.icon} />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {filteredDoctors.length === 0 && !error && searchTerm.length > 0 ? (
        <View style={styles.noDoctorsContainer}>
          <AntDesign name="infocirlceo" size={50} color="#888" style={styles.noDoctorsIcon} />
          <Text style={styles.noDoctorsText}>No doctors found matching "{searchTerm}"</Text>
        </View>
      ) : null}
      <View style={styles.doctorsContainer}>
        {filteredDoctors.map((item) => {
           const imageUri = item.profilePicture
             ? item.profilePicture.startsWith('/')
               ? `${SERVER_ROOT_URL}${item.profilePicture}`
               : item.profilePicture
             : null;

           return (
              <TouchableOpacity style={styles.item} key={item._id} onPress={() => onDoctorSelect(item._id)}>
                <View style={styles.itemContent}>
                  {imageUri ? (
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.profileImage}
                      resizeMode="cover"
                      onError={(e) => console.warn("Failed to load doctor image:", imageUri, e.nativeEvent.error)}
                    />
                  ) : (
                    // Fallback icon
                    <View style={styles.profileImagePlaceholder}>
                      <AntDesign name="user" size={24} color="#FFF" />
                    </View>
                  )}
                  <View style={styles.itemTextContainer}>
                    <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
                    {item.specialization ? <Text style={styles.specialization}>{item.specialization}</Text> : null}
                     {item.hospital && <Text style={styles.hospital}>{item.hospital}</Text>}
                  </View>
                </View>
              </TouchableOpacity>
           );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  label: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    color: '#2c3e50',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 5,
    marginBottom: 20,
    marginHorizontal: 5,
    elevation: 3,
  },
  input: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333',
  },
  icon: {
    marginLeft: 10,
  },
  item: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    elevation: 3,
    marginHorizontal: 5,
     shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    backgroundColor: '#e0e0e0', // Placeholder background
  },
  profileImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    backgroundColor: '#007bff', // Use a theme color for placeholder
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemTextContainer: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  specialization: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  hospital: {
    fontSize: 13,
    color: '#95a5a6',
  },
  noDoctorsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  noDoctorsIcon: {
    marginBottom: 15,
    color: '#bdc3c7',
  },
  noDoctorsText: {
    fontSize: 16,
    color: '#95a5a6',
    textAlign: 'center',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
  doctorsContainer: {
    flexDirection: 'column',
  },
});

const DoctorSearch = memo(DoctorSearchComponent);

export default DoctorSearch;