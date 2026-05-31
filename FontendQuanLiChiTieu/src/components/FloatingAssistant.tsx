import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, Platform, PanResponder, Dimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function FloatingAssistant() {
    const router = useRouter();
    const pathname = usePathname();
    const pulseAnim = useRef(new Animated.Value(1)).current;
    
    // Position offset of the bubble relative to its initial location (bottom: 90, right: 16)
    const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

    // Get screen dimensions
    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

    // Pulse animation for AI feeling
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.12,
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

    // Create PanResponder
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (evt, gestureState) => {
                // Respond to drag movements larger than 3px
                return Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
            },
            onPanResponderGrant: () => {
                // @ts-ignore
                pan.setOffset({ x: pan.x._value, y: pan.y._value });
                pan.setValue({ x: 0, y: 0 });
            },
            onPanResponderMove: Animated.event(
                [null, { dx: pan.x, dy: pan.y }],
                { useNativeDriver: false } // Native driver is not supported for layout values in PanResponder
            ),
            onPanResponderRelease: (evt, gestureState) => {
                pan.flattenOffset();

                const distance = Math.sqrt(gestureState.dx * gestureState.dx + gestureState.dy * gestureState.dy);
                
                // If it was just a click/tap (small movement), trigger the assistant screen transition
                if (distance < 8) {
                    handlePress();
                    return;
                }

                // Snap-to-edge logic: glide to left or right screen edge
                // Start position relative to right side is right: 16.
                // Absolute X position is: screenWidth - 16 - 50 (bubble width) + pan.x
                // @ts-ignore
                const currentAbsoluteX = screenWidth - 16 - 50 + pan.x._value;
                let targetX = 0; // Default right edge (offset x = 0)

                if (currentAbsoluteX < screenWidth / 2) {
                    // Snap to left edge: X absolute position should be 16
                    // width - 16 - 50 + pan.x = 16 => pan.x = 16 + 16 + 50 - width
                    targetX = 82 - screenWidth;
                } else {
                    // Snap to right edge: pan.x = 0
                    targetX = 0;
                }

                // Clamp Y coordinate so it doesn't go off-screen
                // bottom: 90 is initial position.
                // absolute Y: screenHeight - 90 - 50 + pan.y.
                // We want to limit absolute Y between 60 (status bar) and screenHeight - 110 (tab bar).
                // @ts-ignore
                const currentYVal = pan.y._value;
                const absoluteY = screenHeight - 140 + currentYVal;
                let targetY = currentYVal;

                if (absoluteY < 60) {
                    // Snap back down: height - 140 + targetY = 60 => targetY = 200 - height
                    targetY = 200 - screenHeight;
                } else if (absoluteY > screenHeight - 110) {
                    // Snap back up: height - 140 + targetY = height - 110 => targetY = 30
                    targetY = 30;
                }

                // Smooth spring animation to snap positions
                Animated.parallel([
                    Animated.spring(pan.x, {
                        toValue: targetX,
                        useNativeDriver: false,
                        bounciness: 6,
                    }),
                    Animated.spring(pan.y, {
                        toValue: targetY,
                        useNativeDriver: false,
                        bounciness: 6,
                    })
                ]).start();
            }
        })
    ).current;

    // Hide on assistant page, auth pages, add transaction, create diary, or form screens
    const hiddenRoutes = ['/assistant', '/auth', '/add', '/diary/create', 'form'];
    if (hiddenRoutes.some(route => pathname.includes(route))) {
        return null;
    }

    const handlePress = () => {
        router.push('/assistant');
    };

    return (
        <Animated.View 
            {...panResponder.panHandlers}
            style={[
                styles.container, 
                { 
                    transform: [
                        { translateX: pan.x }, 
                        { translateY: pan.y },
                    ] 
                }
            ]}
        >
            <Animated.View style={[styles.touchable, { transform: [{ scale: pulseAnim }] }]}>
                <LinearGradient
                    colors={['#4F46E5', '#818CF8']}
                    style={styles.bubble}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Ionicons name="sparkles" size={22} color="#ffffff" />
                </LinearGradient>
            </Animated.View>
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
