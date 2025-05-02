// frontend/components/FloatingIconsAnimator.tsx
import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons'; // Keep for default

// Props passed to the individual icon render functions
interface FloatingIconProps {
    size: number;
    color: string; // Typically the icon color (e.g., '#fff')
}

// Type for the icon renderer function
type IconRenderer = (props: FloatingIconProps) => React.ReactNode;

interface FloatingIconsAnimatorProps {
    count: number;
    // Accepts an array of render functions. One is chosen randomly per icon instance.
    iconRenderers?: IconRenderer[];
    isVisible: boolean;
    size?: number;
    containerColor?: string; // Background color of the animated container
    iconColor?: string;    // Color passed to the icon renderer (usually contrast)
    basePosition: { x: number; y: number };
    // How far icons can drift horizontally *during* animation
    horizontalDriftRadius?: number;
    // How tightly clustered the icons start horizontally around basePosition.x
    originClusterRadius?: number;
    startYOffset?: number;
    minDuration?: number;
    maxDuration?: number;
    minDistance?: number;
    maxDistance?: number;
    maxStartDelay?: number;
}

// Default Icon Renderer (now in an array)
const defaultIconRenderers: IconRenderer[] = [
    ({ size, color }) => <FontAwesome5 name="plus" size={size * 0.6} color={color} />,
];

const FloatingIconsAnimator: React.FC<FloatingIconsAnimatorProps> = ({
    count,
    iconRenderers = defaultIconRenderers, // Use default array
    isVisible,
    size = 18,
    containerColor = 'teal',
    iconColor = '#fff', // Default icon color
    basePosition,
    horizontalDriftRadius = 30, // Reduced default drift
    originClusterRadius = 10, // Start close together horizontally
    startYOffset = 5,
    minDuration = 2500,
    maxDuration = 4000,
    minDistance = 40,
    maxDistance = 70,
    maxStartDelay = 1500,
}) => {
    const visibilityAnim = useRef(new Animated.Value(isVisible ? 1 : 0)).current;

    const iconAnimations = useMemo(() => {
        // Ensure we have renderers to choose from
        const renderers = iconRenderers.length > 0 ? iconRenderers : defaultIconRenderers;

        return Array.from({ length: count }).map((_, index) => {
            const duration = minDuration + Math.random() * (maxDuration - minDuration);
            const distance = minDistance + Math.random() * (maxDistance - minDistance);
            const delay = Math.random() * maxStartDelay;

            // --- Start Position Calculation (Clustered Origin) ---
            // Start X close to the base position, with slight random offset
            const startX = basePosition.x + (Math.random() - 0.5) * 2 * originClusterRadius - size / 2;
            // Start Y remains based on offset from base Y
            const startY = basePosition.y - startYOffset - size / 2;

            // --- Horizontal Drift Calculation ---
            // Calculate the total horizontal distance the icon will drift left or right
            const horizontalDrift = (Math.random() - 0.5) * 2 * horizontalDriftRadius;

            // --- Select a random icon renderer ---
            const selectedRenderer = renderers[Math.floor(Math.random() * renderers.length)];

            return {
                loopAnim: new Animated.Value(0),
                renderer: selectedRenderer, // Store the chosen renderer
                config: { duration, distance, delay, startX, startY, horizontalDrift },
                key: `icon-${index}-${Math.random()}`,
            };
        });
        // Dependencies: Recalculate if count or base position changes.
        // iconRenderers array reference itself changing would also trigger recalc.
    }, [count, basePosition.x, basePosition.y, iconRenderers, size, originClusterRadius, horizontalDriftRadius, startYOffset, minDuration, maxDuration, minDistance, maxDistance, maxStartDelay]);


    // Effect for starting/stopping loops (remains the same)
    useEffect(() => {
        const runningAnimations: Animated.CompositeAnimation[] = [];
        const timeouts: NodeJS.Timeout[] = [];

        iconAnimations.forEach(({ loopAnim, config }) => {
            const sequence = Animated.sequence([
                Animated.timing(loopAnim, {
                    toValue: 1, duration: config.duration, easing: Easing.bezier(0.42, 0, 0.58, 1), useNativeDriver: true,
                }),
                Animated.timing(loopAnim, {
                    toValue: 0, duration: 0, useNativeDriver: true,
                }),
            ]);
            const timeoutId = setTimeout(() => {
                const loop = Animated.loop(sequence);
                runningAnimations.push(loop);
                loop.start();
            }, config.delay);
            timeouts.push(timeoutId);
        });
        return () => {
            timeouts.forEach(clearTimeout);
            runningAnimations.forEach(anim => anim.stop());
            iconAnimations.forEach(({ loopAnim }) => loopAnim.stopAnimation());
        };
    }, [iconAnimations]); // Depends only on the generated animation array

    // Effect for overall visibility (remains the same)
    useEffect(() => {
        Animated.timing(visibilityAnim, {
            toValue: isVisible ? 1 : 0, duration: 300, easing: Easing.ease, useNativeDriver: true,
        }).start();
    }, [isVisible, visibilityAnim]);

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {iconAnimations.map(({ loopAnim, renderer, config, key }) => {
                const animatedStyle = {
                    opacity: Animated.multiply(
                        visibilityAnim,
                        loopAnim.interpolate({
                            inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 1, 1, 0], extrapolate: 'clamp',
                        })
                    ),
                    transform: [
                        { // Vertical movement
                            translateY: loopAnim.interpolate({
                                inputRange: [0, 1], outputRange: [0, -config.distance],
                            }),
                        },
                        { // Horizontal Drift
                            translateX: loopAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, config.horizontalDrift], // Move from startX towards drift target
                            }),
                        }
                    ],
                };

                return (
                    <Animated.View
                        key={key}
                        style={[
                            styles.iconContainer,
                            {
                                width: size,
                                height: size,
                                borderRadius: size / 2,
                                backgroundColor: containerColor, // Use container color prop
                                left: config.startX, // Use calculated start X
                                bottom: config.startY, // Use calculated start Y
                            },
                            animatedStyle,
                        ]}
                    >
                        {/* Call the specific renderer chosen for this icon instance */}
                        {renderer({ size: size, color: iconColor })}
                    </Animated.View>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    iconContainer: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.5,
        elevation: 2,
    },
});

export default FloatingIconsAnimator;