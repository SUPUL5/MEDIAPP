// frontend/screens/doctor/Dashboard.tsx
import React, { useState, useEffect, useCallback, ComponentType, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, ImageBackground, Image, TouchableOpacity, NativeSyntheticEvent, NativeScrollEvent, ImageSourcePropType } from 'react-native';
import { Card, Title, Paragraph } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format, parseISO, isFuture } from 'date-fns';

import appointmentApi from '../../api/appointmentApi';
import availabilityApi from '../../api/availabilityApi';
import { Appointment, Availability, AuthUser, User } from '../../types';
import { RootStackParamList } from '../../types/navigation.types';
import AppointmentCard from '../../components/AppointmentCard';
import CustomAlert from '../../components/CustomAlert';
import { AntDesign, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { IconProps } from '@expo/vector-icons/build/createIconSet';


const CARD_WIDTH = 180;
const GAP = 20;
const HORIZONTAL_PADDING = 20;
const EFFECTIVE_ITEM_WIDTH = CARD_WIDTH + GAP;

interface AutoCenterScrollOptions {
    idleTimeout?: number;
    autoPlay?: boolean;
    autoPlayInterval?: number;
    initialDelay?: number;
}

const useAutoCenterScroll = (
    itemCount: number,
    options: AutoCenterScrollOptions = {}
) => {
    const {
        idleTimeout = 1000,
        autoPlay = false,
        autoPlayInterval = 4000,
        initialDelay = 500,
    } = options;

    const scrollViewRef = useRef<ScrollView>(null);
    const [scrollViewWidth, setScrollViewWidth] = useState(0);
    const interactionTimerRef = useRef<NodeJS.Timeout | null>(null);
    const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isManualScrolling = useRef(false);
    const currentScrollX = useRef(0);
    const currentIndexRef = useRef(0);

    const getTargetScrollX = useCallback((index: number): number => {
        if (scrollViewWidth <= 0 || itemCount === 0) return 0;
        const targetCardCenterX = HORIZONTAL_PADDING + index * EFFECTIVE_ITEM_WIDTH + CARD_WIDTH / 2;
        let targetScrollX = targetCardCenterX - scrollViewWidth / 2;
        const contentWidth = HORIZONTAL_PADDING * 2 + itemCount * CARD_WIDTH + Math.max(0, itemCount - 1) * GAP;
        const maxScrollX = Math.max(0, contentWidth - scrollViewWidth);
        return Math.max(0, Math.min(targetScrollX, maxScrollX));
    }, [scrollViewWidth, itemCount]);

    const scrollToIndex = useCallback((index: number, animated: boolean = true) => {
        if (!scrollViewRef.current || itemCount === 0) return;
        const targetX = getTargetScrollX(index);
        if (Math.abs(currentScrollX.current - targetX) > 1) {
             scrollViewRef.current.scrollTo({ x: targetX, animated });
        }
        currentIndexRef.current = index;
    }, [getTargetScrollX, itemCount]);

    const centerNearestItem = useCallback(() => {
        if (!scrollViewRef.current || scrollViewWidth <= 0 || itemCount === 0 || isManualScrolling.current) return;
        const viewportCenterX = currentScrollX.current + scrollViewWidth / 2;
        let closestIndex = 0;
        let minDistance = Infinity;
        for (let i = 0; i < itemCount; i++) {
            const cardCenterX = HORIZONTAL_PADDING + i * EFFECTIVE_ITEM_WIDTH + CARD_WIDTH / 2;
            const distance = Math.abs(viewportCenterX - cardCenterX);
            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = i;
            }
        }
        scrollToIndex(closestIndex, true);
    }, [scrollViewWidth, itemCount, scrollToIndex]);

    const stopInteractionTimer = useCallback(() => {
        if (interactionTimerRef.current) {
            clearTimeout(interactionTimerRef.current);
            interactionTimerRef.current = null;
        }
    }, []);

    const stopAutoPlayTimer = useCallback(() => {
        if (autoPlayTimerRef.current) {
            clearTimeout(autoPlayTimerRef.current);
            autoPlayTimerRef.current = null;
        }
    }, []);

    const runAutoPlay = useCallback(() => {
        stopAutoPlayTimer();
        if (!autoPlay || itemCount <= 1 || isManualScrolling.current) return;
        autoPlayTimerRef.current = setTimeout(() => {
            if (isManualScrolling.current) return;
            const nextIndex = (currentIndexRef.current + 1) % itemCount;
            scrollToIndex(nextIndex, true);
            runAutoPlay();
        }, autoPlayInterval);
    }, [autoPlay, itemCount, autoPlayInterval, scrollToIndex, stopAutoPlayTimer]);

    const startOrRestartSequence = useCallback(() => {
        stopInteractionTimer();
        interactionTimerRef.current = setTimeout(() => {
            if (!isManualScrolling.current) {
                centerNearestItem();
                if (autoPlay && itemCount > 1) {
                    runAutoPlay();
                }
            }
        }, idleTimeout);
    }, [centerNearestItem, autoPlay, itemCount, idleTimeout, runAutoPlay, stopInteractionTimer]);

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        currentScrollX.current = event.nativeEvent.contentOffset.x;
        if (isManualScrolling.current) {
           stopInteractionTimer();
           stopAutoPlayTimer();
        }
    };

    const handleTouchStart = () => {
        isManualScrolling.current = true;
        stopInteractionTimer();
        stopAutoPlayTimer();
    };

    const handleMomentumScrollBegin = () => {
        isManualScrolling.current = true;
        stopInteractionTimer();
        stopAutoPlayTimer();
    };

    const handleMomentumScrollEnd = () => {
        isManualScrolling.current = false;
        startOrRestartSequence();
    };

    const handleTouchEnd = () => {
        isManualScrolling.current = false;
        startOrRestartSequence();
    };

    const handleLayout = (event: { nativeEvent: { layout: { width: number } } }) => {
        const newWidth = event.nativeEvent.layout.width;
        if (newWidth > 0 && newWidth !== scrollViewWidth) {
            stopInteractionTimer();
            stopAutoPlayTimer();
            setScrollViewWidth(newWidth);
            setTimeout(() => scrollToIndex(currentIndexRef.current, false), 0);
            if (!isManualScrolling.current && autoPlay && itemCount > 1) {
                 setTimeout(runAutoPlay, idleTimeout + initialDelay);
            }
        }
    };

    useEffect(() => {
        let initialTimerId: NodeJS.Timeout | null = null;
        if (autoPlay && itemCount > 1 && scrollViewWidth > 0) {
            initialTimerId = setTimeout(() => {
                if (!isManualScrolling.current) {
                    if (currentIndexRef.current === 0 && currentScrollX.current === 0) {
                         scrollToIndex(0, true);
                    }
                    runAutoPlay();
                }
            }, initialDelay);
        }
        return () => {
            if (initialTimerId) clearTimeout(initialTimerId);
        };
    }, [autoPlay, itemCount, scrollViewWidth, initialDelay, runAutoPlay, scrollToIndex]);

    useEffect(() => {
        return () => {
            stopInteractionTimer();
            stopAutoPlayTimer();
        };
    }, [stopInteractionTimer, stopAutoPlayTimer]);

     useEffect(() => {
        stopInteractionTimer();
        stopAutoPlayTimer();
        if (itemCount > 0 && scrollViewWidth > 0) {
            currentIndexRef.current = 0;
            scrollToIndex(0, false);
            if (autoPlay && itemCount > 1) {
                const restartTimer = setTimeout(() => {
                    if (!isManualScrolling.current) runAutoPlay();
                }, initialDelay);
                return () => clearTimeout(restartTimer);
            }
        } else {
             stopAutoPlayTimer();
             stopInteractionTimer();
        }
    }, [itemCount, autoPlay, scrollViewWidth, initialDelay, scrollToIndex, runAutoPlay, stopAutoPlayTimer, stopInteractionTimer]);

    return {
        scrollViewRef,
        handleLayout,
        handleScroll,
        onTouchStart: handleTouchStart,
        onTouchEnd: handleTouchEnd,
        onMomentumScrollBegin: handleMomentumScrollBegin,
        onMomentumScrollEnd: handleMomentumScrollEnd,
    };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type IconComponentType = ComponentType<IconProps<any>>;
interface SectionIconConfig {
    name: string;
    library: IconComponentType;
    color: string;
}
interface ImageCardData {
    id: string;
    title: string;
    text: string;
    image: ImageSourcePropType;
}

const InfoCard: React.FC<{ title: string, content: string, date?: string, time?: string }> = ({ title, content, date, time }) => (
    <Card style={styles.infoCardStyle}>
        <Card.Content>
            <Title style={styles.cardTitle}>{title}</Title>
            {/* Wrap text strings in <Text> component inside Paragraph */}
            {date && (
                <Paragraph style={styles.cardDetail}>
                    <AntDesign name="calendar" size={14} /> <Text>{date}</Text>
                </Paragraph>
            )}
            {time && (
                <Paragraph style={styles.cardDetail}>
                    <AntDesign name="clockcircleo" size={14} /> <Text>{time}</Text>
                </Paragraph>
            )}
            <Paragraph style={styles.cardParagraph}>{content}</Paragraph>
        </Card.Content>
    </Card>
);


const Dashboard = () => {
    const navigation = useNavigation<NavigationProp>();
    const [user, setUser] = useState<AuthUser | null>(null);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [availabilities, setAvailabilities] = useState<Availability[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [alertConfig, setAlertConfig] = useState({
        visible: false,
        type: 'error' as 'error' | 'success' | 'warning' | 'info',
        title: '',
        message: ''
    });

    const showAlert = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
        setAlertConfig({ visible: true, type, title, message });
    };

    const hideAlert = () => {
        setAlertConfig(prev => ({ ...prev, visible: false }));
    };

    const loadData = useCallback(async () => {
        if (!refreshing) setIsLoading(true);
        try {
            const userDataString = await AsyncStorage.getItem('user');
            if (userDataString) {
                const currentUser = JSON.parse(userDataString);
                setUser(currentUser);
                const [fetchedAppointments, fetchedAvailabilities] = await Promise.all([
                    appointmentApi.getMyAllAppointment(),
                    availabilityApi.getMyAvailabilities()
                ]);
                setAppointments(fetchedAppointments);
                setAvailabilities(fetchedAvailabilities);

            } else {
                navigation.replace('Login');
            }
        } catch (error: any) {
            console.error("Error loading doctor dashboard data:", error);
            showAlert('error', 'Error', error.message || 'Failed to load data.');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [refreshing, navigation]);

    useEffect(() => {
        loadData();
    }, [loadData]);

     useFocusEffect(
      useCallback(() => {
        loadData();
      }, [loadData])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData();
    }, [loadData]);

    const handleUpdateAppointment = useCallback((updatedAppointment: Appointment) => {
        setAppointments(prevAppointments => {
            const index = prevAppointments.findIndex(appt => appt._id === updatedAppointment._id);
            if (index !== -1) {
                const newAppointments = [...prevAppointments];
                newAppointments[index] = updatedAppointment;
                return newAppointments.sort((a, b) =>
                    new Date(a.availability.startTime).getTime() - new Date(b.availability.startTime).getTime()
                );
            }
            return prevAppointments;
        });
    }, []);

    const getUpcomingAppointments = () => {
        const now = new Date();
        return appointments
            .filter(app => (app.status === 'scheduled' || app.status === 'confirmed') && new Date(app.availability.startTime) >= now)
            .sort((a, b) => new Date(a.availability.startTime).getTime() - new Date(b.availability.startTime).getTime());
    };

    const getUpcomingFreeSlots = () => {
        const now = new Date();
        return availabilities
            .filter(avail => !avail.isBooked && isFuture(parseISO(avail.startTime)))
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    };

    const upcomingAppointments = getUpcomingAppointments();
    const upcomingFreeSlots = getUpcomingFreeSlots();

    const sectionIcons: Record<string, SectionIconConfig> = {
        freeSlots: { name: "calendar-plus", library: FontAwesome5, color: "#10B981" },
        appointments: { name: "calendar-check", library: FontAwesome5, color: "#3B82F6" },
        assignments: { name: "clipboard-list", library: FontAwesome5, color: "#F59E0B" },
        notices: { name: "university", library: FontAwesome5, color: "#8B5CF6" },
        guidelines: { name: "book-medical", library: FontAwesome5, color: "#6B7280" },
    };

    const renderSectionHeader = (title: string, iconKey: string, count?: number) => {
        const sectionIconInfo = sectionIcons[iconKey];
        if (!sectionIconInfo) return null;
        const IconComponent = sectionIconInfo.library;

        return (
            <View style={styles.sectionHeaderChip}>
                <IconComponent name={sectionIconInfo.name} size={18} color={sectionIconInfo.color} style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>{title}</Text>
                {count !== undefined && count > 0 && (
                     <View style={styles.countChip}>
                        <Text style={styles.countText}>
                             {count}
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    const mockAssignments: ImageCardData[] = [
        { id: 'a1', title: 'Patient Report Review', text: "Review John Doe's latest lab results by EOD Friday.", image: require('../../assets/assign1.jpg') },
        { id: 'a2', title: 'Consultation Prep', text: "Prepare notes for Jane Smith's follow-up consultation on Monday.", image: require('../../assets/assign2.jpg') },
        { id: 'a3', title: 'Case Study Analysis', text: "Analyze the rare case presentation for grand rounds next week.", image: require('../../assets/assign3.jpg') },
    ];
    const mockNotices: ImageCardData[] = [
        { id: 'n1', title: 'Faculty Meeting', text: "Mandatory faculty meeting on Nov 3rd, 1:00 PM in Room 201.", image: require('../../assets/notice1.jpg') },
        { id: 'n2', title: 'Research Grant Deadline', text: "Internal research grant application deadline is Nov 15th.", image: require('../../assets/notice2.jpg') },
        { id: 'n3', title: 'Updated Protocols', text: "New patient intake protocols effective immediately. See memo.", image: require('../../assets/notice3.jpg') },
    ];
    const mockGuidelines: ImageCardData[] = [
        { id: 'g1', title: 'HIPAA Compliance', text: "Ensure all patient communication adheres to HIPAA regulations.", image: require('../../assets/guide1.jpg') },
        { id: 'g2', title: 'Telemedicine Best Practices', text: "Review the updated guidelines for virtual consultations.", image: require('../../assets/guide2.jpg') },
        { id: 'g3', title: 'Prescription Policy', text: "Follow the university's policy on prescribing controlled substances.", image: require('../../assets/guide3.jpg') },
    ];

    const scrollOptions: AutoCenterScrollOptions = {
        autoPlay: true,
        autoPlayInterval: 4500,
        idleTimeout: 1000,
        initialDelay: 700,
    };

    const freeSlotsScrollProps = useAutoCenterScroll(upcomingFreeSlots.length, {...scrollOptions, autoPlay: upcomingFreeSlots.length > 1});
    const appointmentScrollProps = useAutoCenterScroll(upcomingAppointments.length, { ...scrollOptions, autoPlay: upcomingAppointments.length > 1 });
    const assignmentScrollProps = useAutoCenterScroll(mockAssignments.length, {...scrollOptions, autoPlay: mockAssignments.length > 1});
    const noticeScrollProps = useAutoCenterScroll(mockNotices.length, {...scrollOptions, autoPlay: mockNotices.length > 1});
    const guidelineScrollProps = useAutoCenterScroll(mockGuidelines.length, {...scrollOptions, autoPlay: mockGuidelines.length > 1});


    return (
        <ImageBackground
            source={require('../../assets/common.jpg')}
            style={styles.backgroundImage}
            resizeMode="cover"
        >
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#007bff"]} tintColor={"#007bff"} />}
            >
                <View style={styles.section}>
                    {renderSectionHeader("Upcoming Free Slots", "freeSlots", upcomingFreeSlots.length)}
                     {isLoading ? (
                        <ActivityIndicator size="large" color="#fff" style={styles.loader}/>
                     ) : upcomingFreeSlots.length === 0 ? (
                         <Text style={styles.emptySectionText}>No upcoming free slots.</Text>
                    ) : (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.cardRow}
                            ref={freeSlotsScrollProps.scrollViewRef}
                            onLayout={freeSlotsScrollProps.handleLayout}
                            onScroll={freeSlotsScrollProps.handleScroll}
                            onTouchStart={freeSlotsScrollProps.onTouchStart}
                            onTouchEnd={freeSlotsScrollProps.onTouchEnd}
                            onMomentumScrollBegin={freeSlotsScrollProps.onMomentumScrollBegin}
                            onMomentumScrollEnd={freeSlotsScrollProps.onMomentumScrollEnd}
                            scrollEventThrottle={16}
                        >
                             {upcomingFreeSlots.map(slot => (
                                <InfoCard
                                    key={slot._id}
                                    title={`${slot.dayOfWeek}`}
                                    date={format(parseISO(slot.startTime), 'MMM dd, yyyy')}
                                    time={`${format(parseISO(slot.startTime), 'p')} - ${format(parseISO(slot.endTime), 'p')}`}
                                    content="Available"
                                />
                            ))}
                        </ScrollView>
                     )}
                </View>

                <View style={styles.section}>
                    {renderSectionHeader("Upcoming Appointments", "appointments", upcomingAppointments.length)}
                     {isLoading ? (
                        <ActivityIndicator size="large" color="#fff" style={styles.loader}/>
                     ) : upcomingAppointments.length === 0 ? (
                         <Text style={styles.emptySectionText}>No upcoming appointments.</Text>
                     ) : (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.cardRow}
                            ref={appointmentScrollProps.scrollViewRef}
                            onLayout={appointmentScrollProps.handleLayout}
                            onScroll={appointmentScrollProps.handleScroll}
                            onTouchStart={appointmentScrollProps.onTouchStart}
                            onTouchEnd={appointmentScrollProps.onTouchEnd}
                            onMomentumScrollBegin={appointmentScrollProps.onMomentumScrollBegin}
                            onMomentumScrollEnd={appointmentScrollProps.onMomentumScrollEnd}
                            scrollEventThrottle={16}
                        >
                             {user && upcomingAppointments.map(app => (
                                <AppointmentCard
                                    key={app._id}
                                    appointment={app}
                                    user={user}
                                    onUpdate={handleUpdateAppointment}
                                />
                            ))}
                        </ScrollView>
                     )}
                </View>

                <View style={styles.section}>
                    {renderSectionHeader("Upcoming Assignments", "assignments", mockAssignments.length)}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.cardRow}
                        ref={assignmentScrollProps.scrollViewRef}
                        onLayout={assignmentScrollProps.handleLayout}
                        onScroll={assignmentScrollProps.handleScroll}
                        onTouchStart={assignmentScrollProps.onTouchStart}
                        onTouchEnd={assignmentScrollProps.onTouchEnd}
                        onMomentumScrollBegin={assignmentScrollProps.onMomentumScrollBegin}
                        onMomentumScrollEnd={assignmentScrollProps.onMomentumScrollEnd}
                        scrollEventThrottle={16}
                    >
                        {mockAssignments.map(item => (
                           <ImageBackground
                                key={item.id}
                                source={item.image}
                                style={styles.cardImageBackground}
                                imageStyle={styles.cardImageStyle}
                            >
                                <View style={styles.cardOverlay}>
                                     <Title style={styles.cardTitleOverlay}>{item.title}</Title>
                                     <Paragraph style={styles.cardParagraphOverlay}>{item.text}</Paragraph>
                                </View>
                            </ImageBackground>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.section}>
                    {renderSectionHeader("University Notices", "notices", mockNotices.length)}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.cardRow}
                        ref={noticeScrollProps.scrollViewRef}
                        onLayout={noticeScrollProps.handleLayout}
                        onScroll={noticeScrollProps.handleScroll}
                        onTouchStart={noticeScrollProps.onTouchStart}
                        onTouchEnd={noticeScrollProps.onTouchEnd}
                        onMomentumScrollBegin={noticeScrollProps.onMomentumScrollBegin}
                        onMomentumScrollEnd={noticeScrollProps.onMomentumScrollEnd}
                        scrollEventThrottle={16}
                    >
                         {mockNotices.map(item => (
                           <ImageBackground
                                key={item.id}
                                source={item.image}
                                style={styles.cardImageBackground}
                                imageStyle={styles.cardImageStyle}
                            >
                                <View style={styles.cardOverlay}>
                                     <Title style={styles.cardTitleOverlay}>{item.title}</Title>
                                     <Paragraph style={styles.cardParagraphOverlay}>{item.text}</Paragraph>
                                </View>
                            </ImageBackground>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.section}>
                     {renderSectionHeader("General Guidelines", "guidelines", mockGuidelines.length)}
                     <ScrollView
                         horizontal
                         showsHorizontalScrollIndicator={false}
                         contentContainerStyle={styles.cardRow}
                         ref={guidelineScrollProps.scrollViewRef}
                         onLayout={guidelineScrollProps.handleLayout}
                         onScroll={guidelineScrollProps.handleScroll}
                         onTouchStart={guidelineScrollProps.onTouchStart}
                         onTouchEnd={guidelineScrollProps.onTouchEnd}
                         onMomentumScrollBegin={guidelineScrollProps.onMomentumScrollBegin}
                         onMomentumScrollEnd={guidelineScrollProps.onMomentumScrollEnd}
                         scrollEventThrottle={16}
                     >
                         {mockGuidelines.map(item => (
                             <ImageBackground
                                key={item.id}
                                source={item.image}
                                style={styles.cardImageBackground}
                                imageStyle={styles.cardImageStyle}
                            >
                                <View style={styles.cardOverlay}>
                                     <Title style={styles.cardTitleOverlay}>{item.title}</Title>
                                     <Paragraph style={styles.cardParagraphOverlay}>{item.text}</Paragraph>
                                </View>
                            </ImageBackground>
                        ))}
                    </ScrollView>
                </View>

                 <CustomAlert
                    visible={alertConfig.visible}
                    type={alertConfig.type}
                    title={alertConfig.title}
                    message={alertConfig.message}
                    buttons={[{ text: 'OK', onPress: hideAlert }]}
                    onDismiss={hideAlert}
                />
            </ScrollView>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 25,
  },
   sectionHeaderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginHorizontal: HORIZONTAL_PADDING,
    marginBottom: 15,
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
    marginRight: 8,
  },
   countChip: {
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginLeft: 4,
  },
  countText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#4B5563',
  },
  cardRow: {
    paddingHorizontal: HORIZONTAL_PADDING,
    gap: GAP,
    paddingVertical:5
  },
  appointmentCardStyle: {
    width: CARD_WIDTH,
    height: 180,
    elevation: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  infoCardStyle: {
    width: CARD_WIDTH,
    height: 180,
    elevation: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
     padding: 5,
     justifyContent: 'center',
  },
  cardImageBackground: {
      width: CARD_WIDTH,
      height: 180,
      elevation: 3,
      borderRadius: 12,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      justifyContent: 'flex-end',
  },
  cardImageStyle: {
      borderRadius: 12,
      resizeMode: 'cover',
  },
  cardOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 12,
  },
  cardTitleOverlay: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  cardParagraphOverlay: {
    fontSize: 13,
    color: '#E5E7EB',
    lineHeight: 18,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#1F2937',
  },
   cardDetail: {
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardParagraph: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  loader: {
      marginVertical: 30,
      alignSelf: 'center',
  },
  emptySectionText: {
    textAlign: 'center',
    color: '#FEFEFE',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    marginTop: 5,
    marginBottom: 10,
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'center',
    marginHorizontal: HORIZONTAL_PADDING,
  },
});

export default Dashboard;