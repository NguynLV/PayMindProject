import React, { useEffect, useRef } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    Animated, Dimensions, Easing, StatusBar,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function RegisterSuccessScreen() {
    const router = useRouter();
    const scale = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 7 }),
            Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start();
    }, []);

    return (
        <View style={styles.root}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

            {/* Background gradient blobs */}
            <View style={styles.blobTop} />
            <View style={styles.blobBottom} />

            {/* Confetti decorations */}
            <Text style={[styles.deco, { top: height * 0.28, left: width * 0.18 }]}>🎉</Text>
            <Text style={[styles.deco, { top: height * 0.22, right: width * 0.2 }]}>⭐</Text>
            <Text style={[styles.deco, { top: height * 0.38, right: width * 0.15 }]}>❤️</Text>

            {/* Green check circle */}
            <Animated.View style={[styles.outerRing, { transform: [{ scale }] }]}>
                <View style={styles.innerCircle}>
                    <Ionicons name="checkmark" size={52} color="#fff" />
                </View>
            </Animated.View>

            {/* Text */}
            <Animated.View style={{ opacity, alignItems: 'center', paddingHorizontal: 32 }}>
                <Text style={styles.title}>Đăng ký thành công!</Text>
                <Text style={styles.subtitle}>
                    Chào mừng bạn đến với ứng dụng quản lý chi tiêu. Hãy bắt đầu hành trình tài chính thông minh của mình ngay hôm nay!
                </Text>
            </Animated.View>

            {/* Buttons at bottom */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.startBtn}
                    onPress={() => router.replace('/auth/onboarding')}
                    activeOpacity={0.85}
                >
                    <Text style={styles.startBtnText}>Bắt đầu ngay  →</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.skipBtn}
                    onPress={() => router.replace('/(tabs)')}
                >
                    <Text style={styles.skipText}>Bỏ qua giới thiệu</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    blobTop: {
        position: 'absolute', top: -80, left: -60,
        width: 260, height: 260, borderRadius: 130,
        backgroundColor: 'rgba(99,102,241,0.08)',
    },
    blobBottom: {
        position: 'absolute', bottom: -60, right: -50,
        width: 200, height: 200, borderRadius: 100,
        backgroundColor: 'rgba(16,185,129,0.08)',
    },
    deco: { position: 'absolute', fontSize: 26 },
    outerRing: {
        width: 140, height: 140, borderRadius: 70,
        backgroundColor: 'rgba(34,197,94,0.18)',
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 36,
    },
    innerCircle: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: '#22C55E',
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#22C55E', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
    },
    title: {
        fontSize: 28, fontWeight: '800', color: '#111827',
        marginBottom: 14, textAlign: 'center',
    },
    subtitle: {
        fontSize: 15, color: '#6B7280', lineHeight: 22,
        textAlign: 'center',
    },
    footer: {
        position: 'absolute', bottom: 44,
        left: 24, right: 24, alignItems: 'center',
    },
    startBtn: {
        width: '100%', height: 54, borderRadius: 27,
        backgroundColor: '#4F46E5',
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#3B5BDB', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35, shadowRadius: 8, elevation: 5,
        marginBottom: 14,
    },
    startBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
    skipBtn: { paddingVertical: 8 },
    skipText: { fontSize: 14, color: '#9CA3AF' },
});
