// frontend/components/TopBar.tsx
import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Image,
  ImageBackground,
  Animated,
  Easing,
  View,
  Text,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SERVER_ROOT_URL } from '../api/config';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);
const AnimatedText = Animated.createAnimatedComponent(Text); // Create Animated Text

interface TopBarProps {
  iconSize?: number;
  backgroundColor?: string;
  iconColor?: string;
  style?: any;
  onPressUserIcon?: () => void;
  profilePicture?: string | null;
}

const TopBar: React.FC<TopBarProps> = ({
  iconSize = 30,
  backgroundColor = 'transparent',
  iconColor = '#000',
  style,
  onPressUserIcon,
  profilePicture,
}) => {
  const profileContainerSize = iconSize + 10;
  const profileImageSize = profileContainerSize - 4;
  const logoContainerSize = iconSize + 10;
  const logoImageSize = logoContainerSize - 4;
  const gradientBorderHeight = 4;

  const imageUrl = profilePicture
    ? profilePicture.startsWith('/')
        ? `${SERVER_ROOT_URL}${profilePicture}`
        : profilePicture
    : null;

  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 5000, // Sync duration with border animation
        easing: Easing.linear,
        useNativeDriver: false, // Needed for color interpolation potentially
      })
    );
    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  // Interpolation for the bottom border gradient position
  const interpolatedStart = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-1, 2],
  });

  const interpolatedEnd = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 3],
  });

  // Gradient colors for border and text animation
  const gradientColors = ['#008080', '#40e0d0', '#008080']; // Teal shades

  // Interpolation for the text color
  // This will cycle the solid color of the text through the gradient colors
  const interpolatedTextColor = animatedValue.interpolate({
      inputRange: [0, 0.5, 1], // Points in the animation cycle
      outputRange: [gradientColors[0], gradientColors[1], gradientColors[2]], // Corresponding colors
  });


  return (
    <ImageBackground
      source={require('../assets/top-bg.jpg')}
      style={[styles.outerContainer, { backgroundColor }, style]}
      resizeMode="cover"
    >
      <View style={styles.contentContainer}>
        {/* Left Side: Logo and App Name */}
        <View style={styles.leftContainer}>
          <View
            style={[
              styles.logoContainer,
              {
                width: logoContainerSize,
                height: logoContainerSize,
                borderRadius: logoContainerSize / 2,
              },
            ]}
          >
            <Image
              source={require('../assets/logo.jpg')}
              style={{
                width: logoImageSize,
                height: logoImageSize,
                borderRadius: logoImageSize / 2,
              }}
              resizeMode="cover"
            />
          </View>
          {/* Text Container */}
          <View style={styles.textContainer}>
            {/* Use AnimatedText and apply interpolated color */}
            <AnimatedText style={[styles.appName, { color: interpolatedTextColor }]}>
              MEDIAPP
            </AnimatedText>
            <Text style={styles.subtitle}>powered by University</Text>
          </View>
        </View>

        {/* Right Side: User Profile Icon */}
        <TouchableOpacity
          onPress={onPressUserIcon}
          disabled={!onPressUserIcon}
          style={[
            styles.iconContainer,
            {
              width: profileContainerSize,
              height: profileContainerSize,
              borderRadius: profileContainerSize / 2,
              borderColor: '#008080',
            },
          ]}
        >
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={{
                width: profileImageSize,
                height: profileImageSize,
                borderRadius: profileImageSize / 2,
              }}
              resizeMode="cover"
              onError={(e) =>
                console.warn(
                  'Failed to load TopBar image:',
                  imageUrl,
                  e.nativeEvent.error
                )
              }
            />
          ) : (
            <AntDesign name="user" size={iconSize} color={'#008080'} />
          )}
        </TouchableOpacity>
      </View>

      {/* Animated Gradient Border at the bottom */}
      <AnimatedLinearGradient
        colors={gradientColors}
        start={{ x: interpolatedStart as any, y: 0.5 }}
        end={{ x: interpolatedEnd as any, y: 0.5 }}
        style={[styles.gradientBorder, { height: gradientBorderHeight }]}
      />
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    paddingTop: 45,
    paddingBottom: 4,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#008080',
    overflow: 'hidden',
    backgroundColor: '#e0e0e0',
    marginRight: 10,
  },
  textContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  appName: {
    fontSize: 20,
    fontWeight: 'bold',
    // Color is now applied dynamically via Animated.View style
  },
  subtitle: {
    fontSize: 10,
    color: '#4DB6AC', // Lighter Teal color remains static
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: '#e0e0e0',
  },
  gradientBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});

export default TopBar;