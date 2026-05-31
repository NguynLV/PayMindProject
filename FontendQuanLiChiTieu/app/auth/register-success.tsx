import React, { useEffect, useRef } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    Animated, Dimensions, StatusBar, Platform, SafeAreaView
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
        <SafeAreaView style={styles.root}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* Background gradient blobs */}
            <View style={styles.blobTop} />
            <View style={styles.blobBottom} />

            {/* Confetti decorations */}
            <Text style={[styles.deco, { top: height * 0.28, left: width * 0.18 }]}>🎉</Text>
            <Text style={[styles.deco, { top: height * 0.22, right: width * 0.2 }]}>⭐</Text>
            <Text style={[styles.deco, { top: height * 0.38, right: width * 0.15 }]}>✨</Text>

            {/* Green check circle */}
            <Animated.View style={[styles.outerRing, { transform: [{ scale }] }]}>
                <View style={styles.innerCircle}>
                    <Ionicons name="checkmark" size={48} color="#FFFFFF" />
                </View>
            </Animated.View>

            {/* Text message */}
            <Animated.View style={{ opacity, alignItems: 'center', paddingHorizontal: 32 }}>
                <Text style={styles.title}>Đăng ký thành công!</Text>
                <Text style={styles.subtitle}>
                    Chào mừng bạn đến với PayMind. Hãy sẵn sàng bắt đầu hành trình quản lý tài chính thông minh và hiệu quả hơn kể từ hôm nay!
                </Text>
            </Animated.View>

            {/* Bottom Actions */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.startBtn}
                    onPress={() => router.replace('/auth/onboarding')}
                    activeOpacity={0.85}
                >
                    <Text style={styles.startBtnText}>Bắt đầu ngay</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.skipBtn}
                    onPress={() => router.replace('/auth/set-wallet-balance')}
                    activeOpacity={0.6}
                >
                    <Text style={styles.skipText}>Bỏ qua phần giới thiệu</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    blobTop: {
        position: 'absolute', top: -60, left: -60,
        width: 220, height: 220, borderRadius: 110,
        backgroundColor: 'rgba(99,102,241,0.06)',
    },
    blobBottom: {
        position: 'absolute', bottom: -60, right: -50,
        width: 180, height: 180, borderRadius: 90,
        backgroundColor: 'rgba(16,185,129,0.06)',
    },
    deco: { position: 'absolute', fontSize: 24 },
    outerRing: {
        width: 120, height: 120, borderRadius: 60,
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 28,
    },
    innerCircle: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: '#10B981',
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
    },
    title: {
        fontSize: 24, fontWeight: '800', color: '#1F2937',
        marginBottom: 12, textAlign: 'center',
    },
    subtitle: {
        fontSize: 13, color: '#64748B', lineHeight: 20,
        textAlign: 'center', fontWeight: '500',
    },
    footer: {
        position: 'absolute', bottom: Platform.OS === 'ios' ? 40 : 28,
        left: 24, right: 24, alignItems: 'center',
    },
    startBtn: {
        width: '100%', height: 50, borderRadius: 16,
        backgroundColor: '#6366F1',
        flexDirection: 'row',
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
        marginBottom: 12,
    },
    startBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
    skipBtn: { paddingVertical: 8 },
    skipText: { fontSize: 13, color: '#94A3B8', fontWeight: '600' },
});
