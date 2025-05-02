// screens/Splash.js

import React, { useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    Text,
    Image,
    Animated,
    Easing,
    Dimensions,
    ImageBackground,
    Platform,
    Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation.types';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;
const PRIMARY_TEXT_COLOR = '#00695C';
const SECONDARY_TEXT_COLOR = '#546E7A';
// const PRIMARY_TEXT_COLOR = '#FFFFFF';
// const SECONDARY_TEXT_COLOR = '#E0E0E0';

const LOGO_SIZE = Math.min(Dimensions.get('window').width * 0.4, 160);
const SPLASH_TOTAL_DURATION = 2800;
const ANIMATION_DURATION = 800;


// !!! IMPORTANT: VERIFY THIS PATH !!!
const backgroundImageSource = require('../assets/splash.jpg');
const logoImageSource = require('../assets/logo.jpg');


type SplashScreenProps = NativeStackScreenProps<RootStackParamList, 'Splash'>;


const Splash = ({ navigation }: SplashScreenProps) => {
    const contentOpacity = useRef(new Animated.Value(0)).current;
    const contentScale = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        const entranceAnimation = Animated.parallel([
            Animated.timing(contentOpacity, {
                toValue: 1,
                duration: ANIMATION_DURATION,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(contentScale, {
                toValue: 1,
                duration: ANIMATION_DURATION,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
        ]);

        const exitAnimation = Animated.parallel([
            Animated.timing(contentOpacity, {
                toValue: 0,
                duration: ANIMATION_DURATION * 0.8,
                easing: Easing.in(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(contentScale, {
                toValue: 0.7,
                duration: ANIMATION_DURATION * 0.8,
                easing: Easing.in(Easing.ease),
                useNativeDriver: true,
            }),
        ]);

        entranceAnimation.start(() => {
            const holdDuration = SPLASH_TOTAL_DURATION - (ANIMATION_DURATION * 2);
            const exitTimer = setTimeout(() => {
                exitAnimation.start(() => {
                    navigation.replace('Login');
                });
            }, Math.max(holdDuration, 100));

            return () => clearTimeout(exitTimer);
        });

        return () => {
            contentOpacity.stopAnimation();
            contentScale.stopAnimation();
        };
    }, [navigation]);

    const animatedContentStyle = {
        opacity: contentOpacity,
        transform: [{ scale: contentScale }],
    };

    return (
        <ImageBackground
            source={backgroundImageSource}
            style={styles.container}
            resizeMode="cover"
            onError={(error) => {
                console.error("ImageBackground loading error:", error.nativeEvent.error);
                Alert.alert("Image Load Error", `Failed to load background image. Check path and file.\nError: ${error.nativeEvent.error}`);
            }}
        >
                <Animated.View style={[styles.contentContainer, animatedContentStyle]}>
                    <Image
                        source={logoImageSource}
                        style={styles.logo}
                        onError={(error) => console.error("Logo loading error:", error.nativeEvent.error)}
                    />
                    <Text style={styles.appNameText}>MEDIAPP</Text>
                    <Text style={styles.poweredByText}>Powered by University</Text>
                </Animated.View>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: SCREEN_HEIGHT * 0.1,
        backgroundColor: 'transparent',
    },
    logo: {
        width: LOGO_SIZE,
        height: LOGO_SIZE,
        borderRadius: LOGO_SIZE / 2,
        marginBottom: 35,
        resizeMode: 'cover',
    },
    appNameText: {
        fontSize: 42,
        fontWeight: '700',
        color: PRIMARY_TEXT_COLOR,
        letterSpacing: 2,
        marginBottom: 12,
        textAlign: 'center',
    },
    poweredByText: {
        fontSize: 16,
        fontWeight: '400',
        color: SECONDARY_TEXT_COLOR,
        textAlign: 'center',
    },
});

export default Splash;