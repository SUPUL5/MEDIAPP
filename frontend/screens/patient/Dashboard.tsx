// frontend/screens/patient/Dashboard.tsx
import React, { useState, useEffect, useCallback, ComponentType, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, ImageBackground, NativeSyntheticEvent, NativeScrollEvent, ImageSourcePropType } from 'react-native';
import { Card, Title, Paragraph } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import appointmentApi from '../../api/appointmentApi';
import { Appointment, AuthUser } from '../../types';
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
            scrollToIndex(currentIndexRef.current, false);
            if (!isManualScrolling.current && autoPlay && itemCount > 1) {
                 setTimeout(runAutoPlay, idleTimeout);
            }
        }
    };

    useEffect(() => {
        let initialTimerId: NodeJS.Timeout | null = null;
        if (autoPlay && itemCount > 1 && scrollViewWidth > 0) {
            initialTimerId = setTimeout(() => {
                if (!isManualScrolling.current) {
                    runAutoPlay();
                }
            }, initialDelay);
        }
        return () => {
            if (initialTimerId) clearTimeout(initialTimerId);
        };
    }, [autoPlay, itemCount, scrollViewWidth, initialDelay, runAutoPlay]);

    useEffect(() => {
        return () => {
            stopInteractionTimer();
            stopAutoPlayTimer();
        };
    }, [stopInteractionTimer, stopAutoPlayTimer]);

     useEffect(() => {
        stopInteractionTimer();
        stopAutoPlayTimer();
        if (autoPlay && itemCount > 1 && scrollViewWidth > 0) {
            currentIndexRef.current = 0;
            scrollToIndex(0, false);
             const restartTimer = setTimeout(() => {
                 if (!isManualScrolling.current) runAutoPlay();
             }, initialDelay);
             return () => clearTimeout(restartTimer);
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
type AppointmentCategoryKey = 'scheduled' | 'confirmed';
type IconComponentType = ComponentType<IconProps<any>>;
interface SectionIconConfig {
    name: string;
    library: IconComponentType;
    color: string;
}
interface NoticeCardData {
    id: string;
    title: string;
    text: string;
    image: ImageSourcePropType;
}
interface AdviceCardData {
    id: string;
    title: string;
    text: string;
    image: ImageSourcePropType;
}

const Dashboard = () => {
    const navigation = useNavigation<NavigationProp>();
    const [user, setUser] = useState<AuthUser | null>(null);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
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
                setUser(JSON.parse(userDataString));
                const fetchedAppointments = await appointmentApi.getMyAllAppointment();
                setAppointments(fetchedAppointments);
            } else {
                navigation.replace('Login');
            }
        } catch (error: any) {
            console.error("Error loading patient dashboard data:", error);
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

    const upcomingAppointments = getUpcomingAppointments();

    const noticeCards: NoticeCardData[] = [
        { id: 'n1', title: 'Exam Schedule Update', text: 'Mid-term exam schedule released. Check portal.', image: require('../../assets/notice1.jpg') },
        { id: 'n2', title: 'Campus Event', text: 'Annual Tech Fest \'Innovate 2024\' registration open.', image: require('../../assets/notice2.jpg') },
        { id: 'n3', title: 'Library Closure', text: 'Main library closed this Saturday for maintenance.', image: require('../../assets/notice3.jpg') },
        { id: 'n4', title: 'Workshop Alert', text: 'New workshop on AI Ethics announced.', image: require('../../assets/notice4.jpg') },
    ];
    const adviceCards: AdviceCardData[] = [
        { id: 'a1', title: 'Healthy Sleep', text: 'Aim for 7-9 hours. Maintain a consistent schedule.', image: require('../../assets/tip1.jpg') },
        { id: 'a2', title: 'Mental Well-being', text: 'Take breaks. Connect with others if overwhelmed.', image: require('../../assets/tip2.jpg') },
        { id: 'a3', title: 'Regular Exercise', text: 'Incorporate 30 mins of moderate activity most days.', image: require('../../assets/tip3.jpg') },
        { id: 'a4', title: 'Hydration Tips', text: 'Drink plenty of water throughout the day.', image: require('../../assets/tip4.jpg') },
    ];

    const scrollOptions: AutoCenterScrollOptions = {
        autoPlay: true,
        autoPlayInterval: 4000,
        idleTimeout: 500,
        initialDelay: 1000,
    };

    const noticeScrollProps = useAutoCenterScroll(noticeCards.length, scrollOptions);
    const appointmentScrollProps = useAutoCenterScroll(upcomingAppointments.length, {
        ...scrollOptions,
        autoPlayInterval: 5000,
        autoPlay: upcomingAppointments.length > 1,
    });
    const adviceScrollProps = useAutoCenterScroll(adviceCards.length, {
        ...scrollOptions,
        autoPlayInterval: 4500,
    });

    const sectionIcons: Record<string, SectionIconConfig> = {
        notices: { name: "notification", library: AntDesign, color: "#FFA500" },
        appointments: { name: "calendar-check", library: FontAwesome5, color: "#3B82F6" },
        advice: { name: "lightbulb-on-outline", library: MaterialCommunityIcons, color: "#10B981" },
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
                {/* University Notices/Guidelines */}
                <View style={styles.section}>
                    {renderSectionHeader("University Notices", "notices")}
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
                        {noticeCards.map(notice => (
                             <ImageBackground
                                key={notice.id}
                                source={notice.image}
                                style={styles.cardImageBackground}
                                imageStyle={styles.cardImageStyle} // Apply borderRadius to the image itself
                            >
                                <View style={styles.cardOverlay}>
                                     <Title style={styles.cardTitleOverlay}>{notice.title}</Title>
                                     <Paragraph style={styles.cardParagraphOverlay}>{notice.text}</Paragraph>
                                </View>
                            </ImageBackground>
                        ))}
                    </ScrollView>
                </View>

                {/* Upcoming Appointments */}
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

                {/* Medical Advice */}
                <View style={styles.section}>
                     {renderSectionHeader("Medical Advice", "advice")}
                     <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.cardRow}
                        ref={adviceScrollProps.scrollViewRef}
                        onLayout={adviceScrollProps.handleLayout}
                        onScroll={adviceScrollProps.handleScroll}
                        onTouchStart={adviceScrollProps.onTouchStart}
                        onTouchEnd={adviceScrollProps.onTouchEnd}
                        onMomentumScrollBegin={adviceScrollProps.onMomentumScrollBegin}
                        onMomentumScrollEnd={adviceScrollProps.onMomentumScrollEnd}
                        scrollEventThrottle={16}
                    >
                        {adviceCards.map(advice => (
                            <ImageBackground
                                key={advice.id}
                                source={advice.image}
                                style={styles.cardImageBackground}
                                imageStyle={styles.cardImageStyle} // Apply borderRadius to the image itself
                            >
                                <View style={styles.cardOverlay}>
                                    <Title style={styles.cardTitleOverlay}>{advice.title}</Title>
                                    <Paragraph style={styles.cardParagraphOverlay}>{advice.text}</Paragraph>
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
    marginHorizontal:10,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
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
  },
  // Style for AppointmentCard (standard Card)
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
    marginBottom: 5,
    overflow: 'hidden',
  },
  // Style for ImageBackground cards (Notices, Advice)
  cardImageBackground: {
      width: CARD_WIDTH,
      height: 180,
      elevation: 3,
      borderRadius: 12, // Apply borderRadius here for the container
      overflow: 'hidden', // Needed with borderRadius
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      marginBottom: 5,
      justifyContent: 'flex-end', // Align overlay content to bottom
  },
  cardImageStyle: {
      borderRadius: 12, // Apply borderRadius to the inner Image component
      resizeMode: 'cover',
  },
  cardOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Dark overlay for text contrast
    padding: 12,
    // No need for absolute positioning if ImageBackground uses justifyContent: 'flex-end'
  },
  cardTitleOverlay: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#FFFFFF', // White text for overlay
    lineHeight: 20,
  },
  cardParagraphOverlay: {
    fontSize: 13,
    color: '#E5E7EB', // Light gray text for overlay
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