// frontend/screens/admin/Dashboard.tsx
import React, { useState, useEffect, useCallback, ComponentType } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TextInput, Image, ImageBackground } from 'react-native'; // Import ImageBackground
import { Picker } from '@react-native-picker/picker';
import { format, parseISO } from 'date-fns';
import appointmentApi from '../../api/appointmentApi';
import availabilityApi from '../../api/availabilityApi';
import userApi from '../../api/userApi';
import { Appointment, Availability, User } from '../../types';
import { AntDesign, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { IconProps } from '@expo/vector-icons/build/createIconSet';
import { SERVER_ROOT_URL } from '../../api/config';

type IconComponentType = ComponentType<IconProps<any>>;
interface SectionIconConfig {
    name: string;
    library: IconComponentType;
    color: string;
}

const Dashboard = () => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [availabilities, setAvailabilities] = useState<Availability[]>([]);
    const [doctors, setDoctors] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [appointmentFilterStatus, setAppointmentFilterStatus] = useState<string>('all');
    const [appointmentFilterDoctor, setAppointmentFilterDoctor] = useState<string>('all');
    const [availabilityFilterDoctor, setAvailabilityFilterDoctor] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = useCallback(async () => {
        if (!refreshing) setIsLoading(true);
        try {
            const [fetchedAppointments, fetchedAvailabilities, fetchedDoctors] = await Promise.all([
                appointmentApi.getAllAppointments(),
                availabilityApi.getAllAvailabilities(),
                userApi.getDoctors()
            ]);
            setAppointments(fetchedAppointments);
            setAvailabilities(fetchedAvailabilities);
            setDoctors(fetchedDoctors);
        } catch (error: any) {
            console.error("Error fetching admin data:", error);

        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [refreshing]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData();
    }, [fetchData]);

    const filterAppointments = () => {
         return appointments.filter(app => {
            const doctorMatch = appointmentFilterDoctor === 'all' || (typeof app.doctorId === 'object' && app.doctorId?._id === appointmentFilterDoctor);
            const statusMatch = appointmentFilterStatus === 'all' || app.status === appointmentFilterStatus;
            const searchTermLower = searchTerm.toLowerCase();
            const patientName = typeof app.patientId === 'object' ? `${app.patientId?.firstName ?? ''} ${app.patientId?.lastName ?? ''}`.toLowerCase() : '';
            const doctorName = typeof app.doctorId === 'object' ? `${app.doctorId?.firstName ?? ''} ${app.doctorId?.lastName ?? ''}`.toLowerCase() : '';
            const searchMatch = !searchTerm || patientName.includes(searchTermLower) || doctorName.includes(searchTermLower);
            return doctorMatch && statusMatch && searchMatch;
        });
    };

    const filterAvailabilities = () => {
         return availabilities.filter(avail => {
            const isFree = !avail.isBooked;
            const doctorMatch = availabilityFilterDoctor === 'all' || avail.doctorId === availabilityFilterDoctor;
            const searchTermLower = searchTerm.toLowerCase();
            const doctor = doctors.find(d => d._id === avail.doctorId);
            const doctorName = doctor ? `${doctor.firstName} ${doctor.lastName}`.toLowerCase() : '';
            const searchMatch = !searchTerm || doctorName.includes(searchTermLower);
            return isFree && doctorMatch && searchMatch;
        });
    };

    const filteredAppointments = filterAppointments();
    const filteredAvailabilities = filterAvailabilities();


     const getStatusIcon = (status: string) => {
        const color = getStatusColor(status);
        switch (status) {
            case 'scheduled': return <AntDesign name="clockcircleo" size={14} color={color} />;
            case 'confirmed': return <AntDesign name="checkcircleo" size={14} color={color} />;
            case 'cancelled': return <AntDesign name="closecircleo" size={14} color={color} />;
            case 'completed': return <AntDesign name="check" size={14} color={color} />;
            default: return <AntDesign name="questioncircleo" size={14} color={color} />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'scheduled': return '#3498db';
            case 'confirmed': return '#2ecc71';
            case 'cancelled': return '#e74c3c';
            case 'completed': return '#27ae60';
            default: return '#7f8c8d';
        }
    };

    const renderDoctorPickerItems = () => {
        return [
            <Picker.Item key="all-doctors" label="All Doctors" value="all" style={styles.pickerItem} />,
            ...doctors.map(doc => (
                <Picker.Item key={doc._id} label={`${doc.firstName} ${doc.lastName}`} value={doc._id} style={styles.pickerItem}/>
            ))
        ];
    };

     const sectionIcons: Record<string, SectionIconConfig> = {
        appointments: { name: "calendar-check", library: FontAwesome5, color: "#8a2be2" },
        freeSlots: { name: "calendar-plus", library: FontAwesome5, color: "#10B981" },
        filters: { name: "filter", library: AntDesign, color: "#6B7280" }
    };

    const renderSectionHeader = (title: string, iconKey: string, count?: number) => {
        const sectionIconInfo = sectionIcons[iconKey];
        if (!sectionIconInfo) return null;
        const IconComponent = sectionIconInfo.library;

        return (
            <View style={styles.sectionHeaderChip}>
                <IconComponent name={sectionIconInfo.name} size={18} color={sectionIconInfo.color} style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>{title}</Text>
                {count !== undefined && (
                     <View style={styles.countChip}>
                        <Text style={styles.countText}>
                             {count}
                        </Text>
                    </View>
                )}
            </View>
        );
    };

     const renderProfileImage = (user: User | string | undefined | null, size: number = 40) => {
         let imageUri: string | null = null;
         let fallbackIcon: React.ReactNode = <AntDesign name="user" size={size * 0.5} color="#fff" />;

         if (typeof user === 'object' && user !== null) {
             const profilePicture = user.profilePicture;
             imageUri = profilePicture
                 ? profilePicture.startsWith('/')
                     ? `${SERVER_ROOT_URL}${profilePicture}`
                     : profilePicture
                 : null;
             if (!imageUri) {
                 if (user.role === 'doctor') fallbackIcon = <FontAwesome5 name="user-md" size={size * 0.5} color="#fff" />;
                 else if (user.role === 'patient') fallbackIcon = <FontAwesome5 name="user-injured" size={size * 0.5} color="#fff" />;
             }
         }

         return imageUri ? (
             <Image
                 source={{ uri: imageUri }}
                 style={[styles.profileImage, { width: size, height: size, borderRadius: size / 2 }]}
                 resizeMode="cover"
                 onError={(e) => console.warn("Img load error (Admin Dash):", imageUri, e.nativeEvent.error)}
             />
         ) : (
             <View style={[styles.profileImagePlaceholder, { width: size, height: size, borderRadius: size / 2 }]}>
                 {fallbackIcon}
             </View>
         );
     };


    const isCombinedLoading = isLoading && !refreshing;
    const showEmptyAppointments = !isLoading && filteredAppointments.length === 0;
    const showEmptyAvailabilities = !isLoading && filteredAvailabilities.length === 0;

    return (
        <ImageBackground // Wrap content with ImageBackground
            source={require('../../assets/common.jpg')}
            style={styles.backgroundImage}
            resizeMode="cover"
        >
            <ScrollView
                style={styles.container} // Ensure container has transparent background
                contentContainerStyle={styles.scrollViewContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#8a2be2"]} tintColor={"#8a2be2"} />}
                keyboardShouldPersistTaps="handled"
            >
                {renderSectionHeader("Filters & Search", "filters")}
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by Patient or Doctor Name..."
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                    placeholderTextColor="#999"
                />
                 <View style={[styles.filterRow, { marginBottom: 30 }]}>
                    <View style={styles.pickerWrapper}>
                        <Picker
                            selectedValue={appointmentFilterStatus}
                            style={styles.picker}
                            onValueChange={(itemValue) => setAppointmentFilterStatus(itemValue)}
                            mode="dropdown"
                            dropdownIconColor="#8a2be2"
                        >
                            <Picker.Item label="Appointment Status" value="all" style={styles.pickerItem}/>
                            <Picker.Item label="Scheduled" value="scheduled" style={styles.pickerItem}/>
                            <Picker.Item label="Confirmed" value="confirmed" style={styles.pickerItem}/>
                            <Picker.Item label="Cancelled" value="cancelled" style={styles.pickerItem}/>
                            <Picker.Item label="Completed" value="completed" style={styles.pickerItem}/>
                        </Picker>
                    </View>
                    <View style={styles.pickerWrapper}>
                        <Picker
                            selectedValue={appointmentFilterDoctor}
                            style={styles.picker}
                            onValueChange={(itemValue) => setAppointmentFilterDoctor(itemValue)}
                            enabled={!isLoading}
                            mode="dropdown"
                            dropdownIconColor="#8a2be2"
                        >
                             {renderDoctorPickerItems()}
                        </Picker>
                    </View>
                </View>


                {renderSectionHeader("Appointments", "appointments", appointments.length)}
                {isCombinedLoading ? (
                    <ActivityIndicator size="large" color="#8a2be2" style={styles.loader} />
                ) : showEmptyAppointments ? (
                    <Text style={styles.emptyText}>No appointments match the criteria.</Text>
                ) : (

                    filteredAppointments.map(app => {
                        const patient = typeof app.patientId === 'object' ? app.patientId : null;
                        const doctor = typeof app.doctorId === 'object' ? app.doctorId : null;
                        return (
                            <View key={app._id} style={[styles.card, { borderLeftColor: getStatusColor(app.status)}]}>
                                <View style={styles.cardHeader}>
                                    <View style={styles.personInfoContainer}>
                                        {renderProfileImage(patient, 36)}
                                        <View style={styles.personTextContainer}>
                                            <Text style={styles.cardTitle} numberOfLines={1}>
                                                {patient ? `${patient.firstName} ${patient.lastName}` : 'N/A'}
                                            </Text>
                                            <Text style={styles.roleLabel}>(Patient)</Text>
                                        </View>
                                    </View>
                                    <View style={[styles.statusChip, { borderColor: getStatusColor(app.status), backgroundColor: `${getStatusColor(app.status)}1A` }]}>
                                        {getStatusIcon(app.status)}
                                        <Text style={[styles.statusText, { color: getStatusColor(app.status)}]}>{app.status}</Text>
                                    </View>
                                </View>
                                <View style={styles.cardDivider} />
                                <View style={styles.cardBody}>
                                    <View style={[styles.personInfoContainer, styles.cardBodyRow]}>
                                        {renderProfileImage(doctor, 36)}
                                        <View style={styles.personTextContainer}>
                                            <Text style={styles.cardDetailTextBold} numberOfLines={1}>
                                                Dr. {doctor ? `${doctor.firstName} ${doctor.lastName}` : 'N/A'}
                                            </Text>
                                            {doctor?.specialization && <Text style={styles.specializationText}>{doctor.specialization}</Text>}
                                        </View>
                                    </View>
                                    <View style={styles.cardBodyRow}>
                                        <AntDesign name="calendar" size={14} color="#6B7280" style={styles.detailIcon}/>
                                        <Text style={styles.cardDetailText}>{format(parseISO(app.availability.startTime), 'MMM dd, yyyy')}</Text>
                                    </View>
                                    <View style={styles.cardBodyRow}>
                                        <AntDesign name="clockcircleo" size={14} color="#6B7280" style={styles.detailIcon}/>
                                        <Text style={styles.cardDetailText}>{format(parseISO(app.availability.startTime), 'p')} - {format(parseISO(app.availability.endTime), 'p')}</Text>
                                    </View>
                                </View>
                            </View>
                        );
                    })
                )}


                <View style={{ height: 30 }} />


                {renderSectionHeader("Available Slots", "freeSlots", availabilities.filter(a => !a.isBooked).length)}
                 <View style={[styles.filterRow, { marginBottom: 16 }]}>
                    <View style={styles.pickerWrapper}>
                        <Picker
                            selectedValue={availabilityFilterDoctor}
                            style={styles.picker}
                            onValueChange={(itemValue) => setAvailabilityFilterDoctor(itemValue)}
                            enabled={!isLoading}
                            mode="dropdown"
                            dropdownIconColor="#8a2be2"
                        >
                            {renderDoctorPickerItems()}
                        </Picker>
                    </View>
                    <View style={{ flex: 1 }}/>
                </View>

                {isCombinedLoading ? (
                    <ActivityIndicator size="large" color="#8a2be2" style={styles.loader}/>
                ) : showEmptyAvailabilities ? (
                    <Text style={styles.emptyText}>No available slots match the criteria.</Text>
                ) : (

                    filteredAvailabilities.map(avail => {
                            const doctor = doctors.find(d => d._id === avail.doctorId);
                            return (
                            <View key={avail._id} style={[styles.card, styles.freeSlotCard]}>
                                <View style={styles.cardHeader}>
                                    <View style={styles.personInfoContainer}>
                                        {renderProfileImage(doctor, 36)}
                                        <View style={styles.personTextContainer}>
                                            <Text style={styles.cardTitle} numberOfLines={1}>
                                                Dr. {doctor ? `${doctor.firstName} ${doctor.lastName}` : 'N/A'}
                                            </Text>
                                            {doctor?.specialization && <Text style={styles.specializationText}>{doctor.specialization}</Text> }
                                        </View>
                                    </View>
                                    <View style={[styles.statusChip, { borderColor: getStatusColor('confirmed'), backgroundColor: `${getStatusColor('confirmed')}1A` }]}>
                                        <AntDesign name="checkcircleo" size={14} color={getStatusColor('confirmed')} />
                                        <Text style={[styles.statusText, { color: getStatusColor('confirmed')}]}>Available</Text>
                                    </View>
                                </View>
                                <View style={styles.cardDivider} />
                                 <View style={styles.cardBody}>
                                    <View style={styles.cardBodyRow}>
                                        <FontAwesome5 name="calendar-day" size={14} color="#6B7280" style={styles.detailIcon} />
                                        <Text style={styles.cardDetailText}>{avail.dayOfWeek}, {format(parseISO(avail.startTime), 'MMM dd, yyyy')}</Text>
                                    </View>
                                    <View style={styles.cardBodyRow}>
                                        <AntDesign name="clockcircleo" size={14} color="#6B7280" style={styles.detailIcon} />
                                        <Text style={styles.cardDetailText}>{format(parseISO(avail.startTime), 'p')} - {format(parseISO(avail.endTime), 'p')}</Text>
                                    </View>
                                 </View>
                            </View>
                        );
                    })
                )}
            </ScrollView>
        </ImageBackground> // Close ImageBackground
    );
};

const styles = StyleSheet.create({
    backgroundImage: { // Style for the background image
        flex: 1, // Make it fill the container
    },
    container: {
        flex: 1,
        backgroundColor: 'transparent', // Make ScrollView background transparent
    },
    scrollViewContent: {
        padding: 16,
        paddingBottom: 90,
    },
    sectionHeaderChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 12,
        alignSelf: 'flex-start',
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2.0,
        elevation: 2,
    },
    sectionIcon: {
        marginRight: 10,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#374151',
        flexShrink: 1,
    },
    countChip: {
        backgroundColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 3,
        marginLeft: 8,
    },
    countText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#4B5563',
    },
    searchInput: {
        height: 50,
        borderColor: '#D1D5DB',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        marginBottom: 12,
        backgroundColor: '#fff',
        fontSize: 16,
        elevation: 1,
    },
    filterRow: {
        flexDirection: 'row',
        gap: 12,
    },
     pickerWrapper: {
        flex: 1,
        height: 50,
        borderColor: '#D1D5DB',
        borderWidth: 1,
        borderRadius: 8,
        backgroundColor: '#fff',
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    picker: {
        height: 50,
        width: '100%',
    },
     pickerItem: {
        fontSize: 15,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 16,
        marginBottom: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderLeftWidth: 5,
    },
    freeSlotCard: {
        borderLeftColor: '#4caf50',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    personInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8,
    },
    profileImage: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#E5E7EB',
        marginRight: 10,
    },
    profileImagePlaceholder: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#9CA3AF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    personTextContainer: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 1,
    },
    roleLabel: {
        fontSize: 12,
        color: '#6B7280',
        fontStyle: 'italic',
    },
    specializationText: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 1,
    },
    cardDivider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginVertical: 8,
    },
    cardBody: {
        marginTop: 8,
    },
    cardBodyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    detailIcon: {
        marginRight: 8,
        width: 16,
        textAlign: 'center',
        color: '#6B7280',
    },
    cardDetailText: {
        fontSize: 14,
        color: '#4B5563',
        flex: 1,
    },
    cardDetailTextBold: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
        flex: 1,
    },
    statusChip: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 4,
        paddingHorizontal: 8,
        alignSelf: 'flex-start',
    },
     statusText: {
        marginLeft: 5,
        fontSize: 11,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    loader: {
        marginVertical: 40,
        alignSelf: 'center',
    },
    emptyText: {
        textAlign: 'center',
        paddingVertical: 30,
        fontSize: 15,
        color: '#6B7280',
        fontStyle: 'italic',
    },
});

export default Dashboard;