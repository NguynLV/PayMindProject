import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function FloatingAssistant() {
    const router = useRouter();
    const pathname = usePathname();
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Pulse animation for AI feeling
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.15,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    // Hide on assistant page or auth pages
    const hiddenRoutes = ['/assistant', '/auth'];
    if (hiddenRoutes.some(route => pathname.includes(route))) {
        return null;
    }

    const handlePress = () => {
        router.push('/assistant');
    };

    return (
        <Animated.View 
            style={[
                styles.container, 
                { transform: [{ scale: pulseAnim }] }
            ]}
        >
            <TouchableOpacity 
                activeOpacity={0.8} 
                onPress={handlePress}
                style={styles.touchable}
            >
                <LinearGradient
                    colors={['#4F46E5', '#818CF8']}
                    style={styles.bubble}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Ionicons name="sparkles" size={22} color="#ffffff" />
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 90,
        right: 16,
        zIndex: 9999,
        elevation: 10,
    },
    touchable: {
        borderRadius: 25,
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    bubble: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#ffffff',
    },
});
