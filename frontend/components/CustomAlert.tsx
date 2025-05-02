import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface CustomAlertProps {
    visible: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    buttons?: {
        text: string;
        onPress: () => void;
        style?: 'default' | 'cancel';
    }[];
    onDismiss?: () => void;
}

const CustomAlert: React.FC<CustomAlertProps> = ({
    visible,
    type,
    title,
    message,
    buttons = [{ text: 'OK', onPress: () => {}, style: 'default' }],
    onDismiss
}) => {
    const getIconName = () => {
        switch (type) {
            case 'success':
                return 'check-circle';
            case 'error':
                return 'error';
            case 'warning':
                return 'warning';
            case 'info':
                return 'info';
            default:
                return 'info';
        }
    };

    const getIconColor = () => {
        switch (type) {
            case 'success':
                return '#4CAF50';
            case 'error':
                return '#F44336';
            case 'warning':
                return '#FF9800';
            case 'info':
                return '#2196F3';
            default:
                return '#2196F3';
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onDismiss}
        >
            <View style={styles.overlay}>
                <View style={styles.alertContainer}>
                    <View style={[styles.iconContainer, { backgroundColor: getIconColor() }]}>
                        <MaterialIcons name={getIconName()} size={40} color="white" />
                    </View>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>
                    <View style={styles.buttonContainer}>
                        {buttons.map((button, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.button,
                                    button.style === 'cancel' ? styles.cancelButton : styles.defaultButton,
                                    { backgroundColor: getIconColor() }
                                ]}
                                onPress={button.onPress}
                            >
                                <Text style={styles.buttonText}>{button.text}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    alertContainer: {
        width: Dimensions.get('window').width * 0.85,
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20,
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    iconContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
        color: '#666',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%',
    },
    button: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 40,
        marginHorizontal: 5,
        minWidth: 100,
    },
    defaultButton: {
        backgroundColor: '#2196F3',
    },
    cancelButton: {
        backgroundColor: '#666',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        textAlign: 'center',
        fontWeight: '500',
    },
});

export default CustomAlert;
