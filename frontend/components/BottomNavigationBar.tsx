import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { AntDesign } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface NavBarItem {
  icon: React.ComponentType<any> | string;
  label: string;
  route: string;
  onPress: () => void;
}

interface BottomNavBarProps {
  items: NavBarItem[];
  activeRoute?: string;
  onItemPress?: (item: NavBarItem) => void;
  backgroundColor?: string;
  textColor?: string;
  activeTextColor?: string;
  iconColor?: string;
  activeIconColor?: string;
  iconSize?: number;
  style?: any;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({
  items,
  activeRoute,
  onItemPress,
  backgroundColor = '#f0f0f0',
  textColor = '#000',
  activeTextColor = '#007bff',
  iconColor = '#000',
  activeIconColor = '#007bff',
  iconSize = 24,
  style,
}) => {
  const handlePress = (item: NavBarItem) => {
    if (onItemPress) {
      onItemPress(item);
    }

    if (item.onPress) {
      item.onPress();
      return;
    }
  };

  const renderIcon = (icon: NavBarItem['icon'], isActive: boolean) => {
    if (typeof icon === 'string') {
      return <AntDesign name={icon as any} size={iconSize} color={isActive ? activeIconColor : iconColor} />;
    } else if (React.isValidElement(icon)) {
      return icon;
    } else if (typeof icon === 'function') {
      const IconComponent = icon;
      return <IconComponent size={iconSize} color={isActive ? activeIconColor : iconColor} />;
    }
    return null;
  };

  return (
    <View style={[styles.container, { backgroundColor }, style]}>
      {items.map((item, index) => {
        const isActive = activeRoute === item.route;

        return (
          <TouchableOpacity
            key={index}
            style={styles.itemContainer}
            onPress={() => handlePress(item)}
          >
            {renderIcon(item.icon, isActive)}
            <Text style={[styles.label, { color: isActive ? activeTextColor : textColor }]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    width: width,
    position: 'absolute',
    bottom: 0,
  },
  itemContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    marginTop: 4,
  },
});

export default BottomNavBar;