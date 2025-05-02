// frontend/components/CustomTabBar.tsx
import React, { useState, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { AntDesign, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons'; // Added MaterialCommunityIcons
import FloatingIconsAnimator from './FloatingIconsAnimator'; // Keep this import

const { width } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 65;
const FAB_SIZE = 60;
const FAB_MARGIN_BOTTOM = 15; // How much the FAB sits *above* the bar visually
const FAB_VISUAL_BOTTOM = TAB_BAR_HEIGHT / 2 - 10; // Center FAB vertically relative to the bar

// --- Floating Icon Parameters (Keep these as they were) ---
const FLOATING_ICON_COUNT = 7;
const FLOATING_ICON_SIZE = 16;
const FLOATING_ICON_CONTAINER_COLOR = 'teal';
const FLOATING_ICON_SYMBOL_COLOR = '#fff';
const FLOATING_ICON_ORIGIN_SPREAD = 15;
const FLOATING_ICON_DRIFT_RADIUS = 40;
const FLOATING_ICON_MIN_DURATION = 3000;
const FLOATING_ICON_MAX_DURATION = 5000;
const FLOATING_ICON_MIN_DISTANCE = 50;
const FLOATING_ICON_MAX_DISTANCE = 80;
const FLOATING_ICON_MAX_DELAY = 2500;

const iconRenderers = [
    ({ size, color }: { size: number, color: string }) => <FontAwesome5 name="heartbeat" size={size * 0.6} color={color} />,
    ({ size, color }: { size: number, color: string }) => <FontAwesome5 name="star-of-life" size={size * 0.6} color={color} />,
    ({ size, color }: { size: number, color: string }) => <FontAwesome5 name="plus-square" size={size * 0.6} color={color} />,
    ({ size, color }: { size: number, color: string }) => <AntDesign name="medicinebox" size={size * 0.6} color={color} />,
];
// --- End Parameters ---

// Add Props needed from Parent (PatientHome)
interface CustomTabBarWithChatProps extends BottomTabBarProps {
    isChatPanelVisible: boolean;
    toggleChatPanel: () => void;
}

const CustomTabBar = ({
    state,
    descriptors,
    navigation,
    isChatPanelVisible, // Receive visibility state
    toggleChatPanel      // Receive toggle function
}: CustomTabBarWithChatProps) => { // Use the extended props interface

    // State for floating icons is internal to this component
    const [showFloatingIcons, setShowFloatingIcons] = useState(true); // Keep track of animation visibility

    const handleFabPress = () => {
        // This FAB now *only* controls the chat panel
        toggleChatPanel();
        // Optionally toggle floating icons based on chat panel state too
        // setShowFloatingIcons(!isChatPanelVisible); // Show icons when chat is closed? Or toggle independently? Decide behavior.
        // For simplicity, let's keep floating icons toggling independently for now if needed,
        // or tie it directly to chat visibility:
        setShowFloatingIcons(!isChatPanelVisible); // Show icons only when chat is closed
        console.log('FAB Pressed! Toggling Chat Panel.');
    };

    const fabCenterX = width / 2;
    const fabCenterYFromBottom = FAB_VISUAL_BOTTOM + FAB_SIZE / 2 + TAB_BAR_HEIGHT/2 + 5; // Adjusted Y position relative to screen bottom
    const floatingIconBasePosition = useMemo(() => ({
        x: fabCenterX,
        y: fabCenterYFromBottom
    }), [fabCenterX, fabCenterYFromBottom]);

    const requiredWrapperHeight = useMemo(() => {
        // Calculate height needed for tab bar, FAB offset, and animation travel distance
        return TAB_BAR_HEIGHT + FAB_VISUAL_BOTTOM + FLOATING_ICON_MAX_DISTANCE + FLOATING_ICON_SIZE;
    }, []);

    return (
        // Container to hold both the tab bar and the absolutely positioned animator + FAB
        <View style={[styles.containerWrapper, { height: requiredWrapperHeight }]} pointerEvents="box-none">
            {/* Floating Icons Animator (positioned absolutely relative to containerWrapper) */}
            <FloatingIconsAnimator
                count={FLOATING_ICON_COUNT}
                iconRenderers={iconRenderers}
                isVisible={showFloatingIcons && !isChatPanelVisible} // Show only when FAB is active AND chat is closed
                size={FLOATING_ICON_SIZE}
                containerColor={FLOATING_ICON_CONTAINER_COLOR}
                iconColor={FLOATING_ICON_SYMBOL_COLOR}
                basePosition={floatingIconBasePosition}
                originClusterRadius={FLOATING_ICON_ORIGIN_SPREAD}
                horizontalDriftRadius={FLOATING_ICON_DRIFT_RADIUS}
                minDuration={FLOATING_ICON_MIN_DURATION}
                maxDuration={FLOATING_ICON_MAX_DURATION}
                minDistance={FLOATING_ICON_MIN_DISTANCE}
                maxDistance={FLOATING_ICON_MAX_DISTANCE}
                maxStartDelay={FLOATING_ICON_MAX_DELAY}
            />

             {/* The actual tab bar structure */}
             <View style={styles.tabBarContainer} pointerEvents="box-none">
                <View style={styles.tabBar}>
                    {state.routes.map((route, index) => {
                        const { options } = descriptors[route.key];
                        const isFocused = state.index === index;
                        const onPress = () => {
                             const event = navigation.emit({
                                type: 'tabPress',
                                target: route.key,
                                canPreventDefault: true,
                             });

                             if (!isFocused && !event.defaultPrevented) {
                                // Close chat panel if navigating away
                                if (isChatPanelVisible) {
                                    toggleChatPanel();
                                }
                                navigation.navigate(route.name, route.params);
                            }
                        };
                        const onLongPress = () => {
                            navigation.emit({
                                type: 'tabLongPress',
                                target: route.key,
                            });
                        };
                        const defaultIcon = () => <AntDesign name="question" size={24} color="#ccc" />;
                        const IconComponent = options.tabBarIcon ?? defaultIcon;

                        // Add margin to items around the center to make space for FAB
                        const isCenterAdjacent = Math.abs(index - Math.floor(state.routes.length / 2)) < 1.5; // Adjust logic if more tabs

                        return (
                            <TouchableOpacity
                                key={route.key}
                                accessibilityRole="button"
                                accessibilityState={isFocused ? { selected: true } : {}}
                                accessibilityLabel={options.tabBarAccessibilityLabel}
                                onPress={onPress}
                                onLongPress={onLongPress}
                                style={[styles.tabItem, isCenterAdjacent ? styles.tabItemSpaced : {}]} // Apply spacing style
                            >
                                <IconComponent focused={isFocused} color={isFocused ? 'teal' : '#999'} size={24} />
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Floating Action Button */}
                <TouchableOpacity style={styles.fab} onPress={handleFabPress} activeOpacity={0.8}>
                    <MaterialCommunityIcons
                        name={isChatPanelVisible ? "close" : "robot-excited-outline"} // Toggle icon based on chat visibility
                        size={30}
                        color="#fff"
                    />
                </TouchableOpacity>
             </View>
        </View>
    );
};

// --- Styles (Restored and adjusted) ---
const styles = StyleSheet.create({
    containerWrapper: {
       position: 'absolute',
       bottom: 0,
       left: 0,
       right: 0,
       zIndex: 1,
       // Height calculated dynamically
       // backgroundColor: 'rgba(255,0,0,0.05)', // DEBUG: Wrapper area
   },
   tabBarContainer: { // Sits at the bottom of the wrapper
       position: 'absolute',
       bottom: 0,
       left: 0,
       right: 0,
       height: TAB_BAR_HEIGHT + FAB_MARGIN_BOTTOM, // Height needed for bar + FAB offset
       alignItems: 'center', // Center FAB horizontally if needed (depends on positioning)
       zIndex: 10, // Above floating icons but below FAB if needed
       // backgroundColor: 'rgba(0,255,0,0.05)', // DEBUG: Container area
   },
   tabBar: {
       position: 'absolute',
       bottom: 0,
       left: 0,
       right: 0,
       flexDirection: 'row',
       height: TAB_BAR_HEIGHT,
       width: '100%',
       backgroundColor: '#ffffff',
       borderTopWidth: 1,
       borderTopColor: '#eee',
       alignItems: 'center', // Align icons vertically
       justifyContent: 'space-around',
       paddingHorizontal: 5,
       borderTopLeftRadius: 25,
       borderTopRightRadius: 25,
       shadowColor: "#000",
       shadowOffset: { width: 0, height: -3 },
       shadowOpacity: 0.1,
       shadowRadius: 4,
       elevation: 8,
       zIndex: 15, // Above animator
   },
   tabItem: {
       flex: 1,
       alignItems: 'center',
       justifyContent: 'center',
       height: '100%',
   },
   tabItemSpaced: {
        // Add horizontal margin to push items away from the center FAB
        // Adjust this value based on FAB size and desired spacing
        marginHorizontal: 15, // Example spacing
   },
   fab: {
       position: 'absolute',
       // Position relative to the tabBarContainer
       bottom: FAB_VISUAL_BOTTOM, // How far the *bottom* of the FAB is from the *bottom* of the tabBarContainer
       // Center horizontally:
       left: width / 2 - FAB_SIZE / 2, // Center based on screen width
       width: FAB_SIZE,
       height: FAB_SIZE,
       borderRadius: FAB_SIZE / 2,
       backgroundColor: 'teal', // Keep the original color
       justifyContent: 'center',
       alignItems: 'center',
       zIndex: 20, // Highest element
       shadowColor: '#000',
       shadowOffset: { width: 0, height: 2 },
       shadowOpacity: 0.25,
       shadowRadius: 3.84,
       elevation: 5,
   },
});

export default CustomTabBar;