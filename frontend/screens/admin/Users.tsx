// frontend/screens/admin/Users.tsx
import React, { useState, useEffect, useCallback, ComponentType } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Image, ImageBackground } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import userApi from '../../api/userApi';
import { User } from '../../types/user';
import CustomAlert from '../../components/CustomAlert';
import { AntDesign, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { SERVER_ROOT_URL } from '../../api/config';
import { IconProps } from '@expo/vector-icons/build/createIconSet';

type ActionType = 'block' | 'unblock' | 'delete' | null;
type IconComponentType = ComponentType<IconProps<any>>;
interface SectionIconConfig {
    name: string;
    library: IconComponentType;
    color: string;
}

const Users = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | 'patient' | 'doctor' | 'admin'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'unverified' | 'blocked'>('all');
    const [alertConfig, setAlertConfig] = useState({
        visible: false,
        type: 'error' as 'error' | 'success' | 'warning' | 'info',
        title: '',
        message: '',
        confirmAction: null as (() => Promise<void>) | null,
        userIdToAction: null as string | null,
        actionType: null as ActionType,
    });

    const fetchUsers = useCallback(async () => {
         if (!refreshing) setIsLoading(true);
        try {
            const fetchedUsers = await userApi.getAllUsers();
            setUsers(fetchedUsers);
            filterUsers(fetchedUsers, searchTerm, roleFilter, statusFilter);
        } catch (error: any) {
            showAlert('error', 'Error', error.message || 'Failed to load users.');
            setUsers([]);
            setFilteredUsers([]);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [refreshing, searchTerm, roleFilter, statusFilter]);

    const filterUsers = (sourceUsers: User[], currentSearchTerm: string, currentRoleFilter: string, currentStatusFilter: string) => {
        let result = sourceUsers;
        const lowerCaseSearchTerm = currentSearchTerm.toLowerCase();

        if (currentSearchTerm) {
            result = result.filter(user =>
                `${user.firstName} ${user.lastName}`.toLowerCase().includes(lowerCaseSearchTerm) ||
                user.email.toLowerCase().includes(lowerCaseSearchTerm)
            );
        }
        if (currentRoleFilter !== 'all') {
            result = result.filter(user => user.role === currentRoleFilter);
        }
        if (currentStatusFilter !== 'all') {
            result = result.filter(user => user.status === currentStatusFilter);
        }
        setFilteredUsers(result);
    };

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    useEffect(() => {
        filterUsers(users, searchTerm, roleFilter, statusFilter);
    }, [searchTerm, roleFilter, statusFilter, users]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchUsers();
    }, [fetchUsers]);

    const showAlert = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string, confirmAction: (() => Promise<void>) | null = null, userId: string | null = null, actionType: ActionType = null) => {
        setAlertConfig({ visible: true, type, title, message, confirmAction, userIdToAction: userId, actionType });
    };

    const hideAlert = () => {
        setAlertConfig({ visible: false, type: 'error', title: '', message: '', confirmAction: null, userIdToAction: null, actionType: null });
    };

    const handleBlockUser = async (userId: string) => {
        showAlert('warning', 'Confirm Block', 'Block this user?', async () => {
            try {
                await userApi.blockUser(userId);
                showAlert('success', 'Success', 'User blocked.');
                fetchUsers();
            } catch (error: any) {
                showAlert('error', 'Error', error.message || 'Failed to block user.');
            }
        }, userId, 'block');
    };

    const handleUnblockUser = async (userId: string) => {
         showAlert('warning', 'Confirm Unblock', 'Unblock this user?', async () => {
            try {
                await userApi.unblockUser(userId);
                showAlert('success', 'Success', 'User unblocked.');
                fetchUsers();
            } catch (error: any) {
                showAlert('error', 'Error', error.message || 'Failed to unblock user.');
            }
        }, userId, 'unblock');
    };

     const getStatusBadgeStyle = (status: string) => {
        switch (status) {
          case 'verified': return { backgroundColor: '#DCFCE7', textColor: '#166534', icon: 'checkcircleo' as const, iconColor: '#16A34A' };
          case 'unverified': return { backgroundColor: '#FEF9C3', textColor: '#854D0E', icon: 'infocirlceo' as const, iconColor: '#D97706' };
          case 'blocked': return { backgroundColor: '#FEE2E2', textColor: '#991B1B', icon: 'closecircleo' as const, iconColor: '#DC2626' };
          default: return { backgroundColor: '#E5E7EB', textColor: '#4B5563', icon: 'questioncircleo' as const, iconColor: '#6B7280' };
        }
    };

     const getRoleIcon = (role: string) => {
        const size = 16;
        const color = '#6B7280';
        switch (role) {
            case 'patient': return <FontAwesome5 name="user-alt" size={size} color={color} />;
            case 'doctor': return <FontAwesome5 name="user-md" size={size} color={color} />;
            case 'admin': return <MaterialCommunityIcons name="shield-crown-outline" size={size} color={color} />;
            default: return <AntDesign name="question" size={size} color={color} />;
        }
    };

     const sectionIcons: Record<string, SectionIconConfig> = {
        userManagement: { name: "users", library: FontAwesome5, color: "#8a2be2" },
        filters: { name: "filter", library: AntDesign, color: "#6B7280" }
    };

    // Use the same chip style as Dashboard.tsx
    const renderSectionHeader = (title: string, iconKey: string) => {
        const sectionIconInfo = sectionIcons[iconKey];
        if (!sectionIconInfo) return null;
        const IconComponent = sectionIconInfo.library;
        return (
            // Use the chip style from Dashboard
            <View style={styles.sectionHeaderChip}>
                <IconComponent name={sectionIconInfo.name} size={18} color={sectionIconInfo.color} style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>{title}</Text>
            </View>
        );
    };

    const renderUserItem = ({ item }: { item: User }) => {
        const statusStyle = getStatusBadgeStyle(item.status);
        const imageUri = item.profilePicture ? `${SERVER_ROOT_URL}${item.profilePicture}` : null;

        return (
            <View style={styles.userCard}>
                <Image
                    source={imageUri ? { uri: imageUri } : require('../../assets/placeholder-user.jpg')}
                    style={styles.profileImage}
                    resizeMode="cover"
                />
                <View style={styles.userInfo}>
                    <Text style={styles.userName} numberOfLines={1}>{item.firstName} {item.lastName}</Text>
                    <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
                     <View style={styles.metaRow}>
                         <View style={styles.metaItem}>
                            {getRoleIcon(item.role)}
                            <Text style={styles.metaText}>{item.role}</Text>
                         </View>
                        <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
                            <AntDesign name={statusStyle.icon} size={11} color={statusStyle.iconColor} />
                            <Text style={[styles.statusText, { color: statusStyle.textColor }]}>{item.status}</Text>
                        </View>
                    </View>
                </View>
                <View style={styles.userActions}>
                    {item.status !== 'blocked' && item.role !== 'admin' && (
                        <TouchableOpacity style={[styles.actionButton, styles.blockButton]} onPress={() => handleBlockUser(item._id)}>
                            <AntDesign name="closecircle" size={18} color="#fff" />
                        </TouchableOpacity>
                    )}
                    {item.status === 'blocked' && (
                        <TouchableOpacity style={[styles.actionButton, styles.unblockButton]} onPress={() => handleUnblockUser(item._id)}>
                            <AntDesign name="checkcircle" size={18} color="#fff" />
                        </TouchableOpacity>
                    )}

                </View>
            </View>
        );
    };

    return (
        <>
         <ImageBackground
            source={require('../../assets/common.jpg')}
            style={styles.backgroundImage}
            resizeMode="cover"
         >
            <View style={styles.container}>
                 {renderSectionHeader("User Management", "userManagement")}

                 <View style={styles.sectionWrapper}>
                      {renderSectionHeader("Filters & Search", "filters")}
                      <TextInput
                          style={styles.searchInput}
                          placeholder="Search by Name or Email..."
                          value={searchTerm}
                          onChangeText={setSearchTerm}
                          placeholderTextColor="#999"
                      />
                     <View style={styles.filterRow}>
                        <View style={styles.pickerWrapper}>
                            <Picker
                                selectedValue={roleFilter}
                                style={styles.picker}
                                onValueChange={(itemValue) => setRoleFilter(itemValue as any)}
                                mode="dropdown"
                                dropdownIconColor="#8a2be2"
                            >
                                <Picker.Item label="All Roles" value="all" style={styles.pickerItem} />
                                <Picker.Item label="Patient" value="patient" style={styles.pickerItem} />
                                <Picker.Item label="Doctor" value="doctor" style={styles.pickerItem} />
                                <Picker.Item label="Admin" value="admin" style={styles.pickerItem} />
                            </Picker>
                        </View>
                        <View style={styles.pickerWrapper}>
                            <Picker
                                selectedValue={statusFilter}
                                style={styles.picker}
                                onValueChange={(itemValue) => setStatusFilter(itemValue as any)}
                                mode="dropdown"
                                dropdownIconColor="#8a2be2"
                            >
                                <Picker.Item label="All Statuses" value="all" style={styles.pickerItem} />
                                <Picker.Item label="Verified" value="verified" style={styles.pickerItem} />
                                <Picker.Item label="Unverified" value="unverified" style={styles.pickerItem} />
                                <Picker.Item label="Blocked" value="blocked" style={styles.pickerItem} />
                            </Picker>
                        </View>
                    </View>
                 </View>


                <View style={[styles.listWrapper, { flex: 1 }]}>
                    {isLoading ? (
                        <ActivityIndicator size="large" color="#8a2be2" style={styles.loader} />
                    ) : (
                        <FlatList
                            data={filteredUsers}
                            renderItem={renderUserItem}
                            keyExtractor={(item) => item._id}
                            ListEmptyComponent={<Text style={styles.emptyText}>No users match the criteria.</Text>}
                            refreshControl={
                                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#8a2be2"]} tintColor={"#8a2be2"} />
                            }
                            contentContainerStyle={{ paddingBottom: 20 }}
                        />
                    )}
                 </View>
            </View>
         </ImageBackground>


            <CustomAlert
                visible={alertConfig.visible && !!alertConfig.confirmAction}
                type={alertConfig.type}
                title={alertConfig.title}
                message={alertConfig.message}
                buttons={[
                    { text: 'Cancel', onPress: hideAlert, style: 'cancel' },
                    { text: 'Confirm', onPress: async () => {
                         if (alertConfig.confirmAction) {
                            await alertConfig.confirmAction();
                         }
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
    backgroundImage: {
        flex: 1,
    },
    container: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 15,
        paddingBottom: 80,
        backgroundColor: 'transparent',
    },
    sectionWrapper: {
        backgroundColor: 'rgba(255, 255, 255, 0.97)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 4,
    },
    // Use the 'Chip' style for all section headers now
    sectionHeaderChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF', // White background for chip
        borderRadius: 20,          // Rounded corners for chip
        paddingVertical: 8,       // Vertical padding inside chip
        paddingHorizontal: 12,    // Horizontal padding inside chip
        alignSelf: 'flex-start',   // Chip takes only needed width
        marginBottom: 16,          // Space below the chip
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.15,
        shadowRadius: 2.0,
        elevation: 2,
    },
    sectionIcon: {
        marginRight: 10,
    },
    sectionTitle: {
        fontSize: 17, // Keep font size consistent
        fontWeight: '600',
        color: '#374151', // Keep color consistent
    },
    searchInput: {
        height: 50,
        borderColor: '#D1D5DB',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        marginBottom: 12,
        backgroundColor: '#F9FAFB',
        fontSize: 16,
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
        backgroundColor: '#F9FAFB',
        justifyContent: 'center',
        paddingLeft: 5,
        paddingRight: 5,
    },
    picker: {
        height: 50,
        width: '100%',
    },
     pickerItem: {
        fontSize: 15,
    },
    listWrapper: {
        flex: 1,
        backgroundColor: 'transparent',
        marginTop: 0,
    },

    userCard: {
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    profileImage: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#E5E7EB',
        marginRight: 12,
    },
     profileImagePlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#9CA3AF',
        justifyContent: 'center',
        alignItems: 'center',
         marginRight: 12,
    },
    userInfo: {
        flex: 1,
        justifyContent: 'center',
        marginRight: 8,
    },
    userName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 2,
    },
    userEmail: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 4,
    },
     metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        flexWrap: 'wrap',
     },
     metaItem: {
         flexDirection: 'row',
         alignItems: 'center',
         marginRight: 12,
         marginBottom: 4,
     },
     metaText: {
        fontSize: 12,
        color: '#4B5563',
        marginLeft: 5,
        textTransform: 'capitalize',
     },
     statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 12,
        marginBottom: 4,
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
        marginLeft: 4,
        textTransform: 'uppercase',
    },
    userActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        padding: 8,
        borderRadius: 18,
        marginLeft: 6,
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 1,
    },
    blockButton: {
        backgroundColor: '#EF4444',
    },
    unblockButton: {
        backgroundColor: '#10B981',
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        textAlign: 'center',
        paddingVertical: 40,
        fontSize: 15,
        color: '#6B7280',
        fontStyle: 'italic',
    },
    // Add the sectionHeader style here, copied from Dashboard styles
    sectionHeader: { // Renamed from sectionHeaderChip for consistency within this file
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 12,
        alignSelf: 'flex-start', // Keep chip sizing
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2.0,
        elevation: 2,
    },
});

export default Users;