import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface CustomNumpadProps {
    value: string;
    onValueChange: (newValue: string) => void;
    onSubmit: () => void;
}

export default function CustomNumpad({ value, onValueChange, onSubmit }: CustomNumpadProps) {

    const handlePress = (key: string) => {
        if (value === '0' && key !== '.' && !['+', '-', '*', '/'].includes(key)) {
            // Replace initial 0 with the number
            onValueChange(key);
            return;
        }

        // Prevent multiple consecutive operators
        const lastChar = value.slice(-1);
        const operators = ['+', '-', '*', '/'];
        
        if (operators.includes(key) && operators.includes(lastChar)) {
            onValueChange(value.slice(0, -1) + key);
            return;
        }

        // Handle . (decimal point) - prevent multiple dots in one number
        if (key === '.') {
            const parts = value.split(/[\+\-\*\/]/);
            const currentPart = parts[parts.length - 1];
            if (currentPart.includes('.')) return;
            if (value === '' || operators.includes(lastChar)) {
                onValueChange(value + '0.');
                return;
            }
        }

        onValueChange(value + key);
    };

    const handleClear = () => {
        onValueChange('0');
    };

    const handleBackspace = () => {
        if (value.length <= 1) {
            onValueChange('0');
        } else {
            onValueChange(value.slice(0, -1));
        }
    };

    const renderButton = (
        content: React.ReactNode,
        type: 'default' | 'operator' | 'clear' | 'submit' | 'zero',
        onPress: () => void
    ) => {
        const isSubmit = type === 'submit';
        const isZero = type === 'zero';
        const isOperator = type === 'operator';

        return (
            <TouchableOpacity 
                style={[
                    styles.button,
                    isZero && styles.buttonZero,
                    isOperator && styles.buttonOperator,
                    isSubmit && styles.buttonSubmit,
                ]} 
                onPress={onPress}
                activeOpacity={0.7}
            >
                {typeof content === 'string' ? (
                    <Text style={[
                        styles.buttonText,
                        type === 'clear' && styles.textClear,
                        type === 'operator' && styles.textOperator,
                        type === 'submit' && styles.textSubmit,
                    ]}>
                        {content}
                    </Text>
                ) : (
                    content
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.row}>
                {renderButton('C', 'clear', handleClear)}
                {renderButton(<Ionicons name="backspace-outline" size={24} color="#D1D5DB" />, 'default', handleBackspace)}
                {renderButton('000', 'default', () => handlePress('000'))}
                {renderButton('÷', 'operator', () => handlePress('/'))}
            </View>
            <View style={styles.row}>
                {renderButton('7', 'default', () => handlePress('7'))}
                {renderButton('8', 'default', () => handlePress('8'))}
                {renderButton('9', 'default', () => handlePress('9'))}
                {renderButton('×', 'operator', () => handlePress('*'))}
            </View>
            <View style={styles.row}>
                {renderButton('4', 'default', () => handlePress('4'))}
                {renderButton('5', 'default', () => handlePress('5'))}
                {renderButton('6', 'default', () => handlePress('6'))}
                {renderButton('-', 'operator', () => handlePress('-'))}
            </View>
            <View style={styles.row}>
                {renderButton('1', 'default', () => handlePress('1'))}
                {renderButton('2', 'default', () => handlePress('2'))}
                {renderButton('3', 'default', () => handlePress('3'))}
                {renderButton('+', 'operator', () => handlePress('+'))}
            </View>
            <View style={styles.row}>
                {renderButton('0', 'zero', () => handlePress('0'))}
                {renderButton('.', 'default', () => handlePress('.'))}
                {renderButton(<Ionicons name="checkmark" size={28} color="#FFF" />, 'submit', onSubmit)}
            </View>
        </View>
    );
}

const SPACING = 8;
const BTN_SIZE = (width - SPACING * 5) / 4;

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#111111',
        padding: SPACING,
        paddingBottom: 20,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING,
    },
    button: {
        width: BTN_SIZE,
        height: BTN_SIZE * 0.9,
        backgroundColor: '#2A2A2E',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonZero: {
        width: BTN_SIZE * 2 + SPACING,
    },
    buttonOperator: {
        backgroundColor: '#352525', // Slight reddish tint
    },
    buttonSubmit: {
        backgroundColor: '#E87979', // Light red/pink
    },
    buttonText: {
        fontSize: 24,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    textClear: {
        color: '#FF8A8A',
    },
    textOperator: {
        color: '#FF8A8A',
        fontSize: 28,
        fontWeight: '500',
    },
    textSubmit: {
        color: '#FFFFFF',
    }
});
