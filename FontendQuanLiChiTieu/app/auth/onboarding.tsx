import React, { useRef, useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    Dimensions, FlatList, Animated, Image, StatusBar, SafeAreaView, Platform
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const slides = [
    {
        key: '1',
        bg: '#FFFFFF',
        image: require('../../assets/images/onboard1.png'),
        badge1: { icon: 'wallet-outline' as const, color: '#10B981' },
        badge2: { icon: 'cube-outline' as const, color: '#F59E0B' },
        titleLine1: 'Ghi chép nhanh gọn',
        titleLine2: 'trong chớp mắt! ⚡',
        subtitle: 'Quên nỗi lo viêm màng túi đi. Theo theo chi tiêu mượt mà, trực quan ngay trên điện thoại của bạn!',
        btnText: 'Tiếp tục',
        btnColor: '#6366F1',
        dotActiveColor: '#6366F1',
    },
    {
        key: '2',
        bg: '#FFFFFF',
        image: require('../../assets/images/onboard2.png'),
        badge1: { icon: 'pie-chart-outline' as const, color: '#EF4444' },
        badge2: { icon: 'trending-up-outline' as const, color: '#3B82F6' },
        titleLine1: 'Báo cáo chi tiết,',
        titleLine2: 'dễ dàng thấu hiểu! 📊',
        subtitle: 'Nhìn biểu đồ là hiểu ngay túi tiền của mình. Thống kê thông minh giúp tối ưu hóa chi tiêu mỗi ngày!',
        btnText: 'Khám phá tiếp',
        btnColor: '#6366F1',
        dotActiveColor: '#6366F1',
    },
    {
        key: '3',
        bg: '#FFFFFF',
        image: require('../../assets/images/onboard3.png'),
        badge1: { icon: 'cash-outline' as const, color: '#F59E0B' },
        badge2: { icon: 'trophy-outline' as const, color: '#10B981' },
        titleLine1: 'Tích lũy tài sản',
        titleLine2: 'như một chuyên gia! 👑',
        subtitle: 'Đặt ngân sách mục tiêu, mua sắm thông minh và nhận huy hiệu tài chính cực cool cùng PayMind!',
        btnText: 'Bắt đầu ngay',
        btnColor: '#6366F1',
        dotActiveColor: '#6366F1',
    },
];

export default function OnboardingScreen() {
    const router = useRouter();
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const scrollX = useRef(new Animated.Value(0)).current;

    const goNext = () => {
        if (currentIndex < slides.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
            setCurrentIndex(currentIndex + 1);
        } else {
            router.replace('/auth/set-wallet-balance');
        }
    };

    const renderSlide = ({ item }: { item: typeof slides[0] }) => (
        <View style={[styles.slide, { backgroundColor: item.bg }]}>
            {/* Skip button */}
            <TouchableOpacity style={styles.skipBtn} onPress={() => router.replace('/auth/set-wallet-balance')} activeOpacity={0.7}>
                <Text style={styles.skipText}>Bỏ qua</Text>
            </TouchableOpacity>

            {/* Image card wrapper */}
            <View style={styles.imageCard}>
                <View style={styles.imageBg}>
                    <Image source={item.image} style={styles.heroImg} resizeMode="cover" />
                </View>
                {/* Badge top-right */}
                <View style={[styles.badge, styles.badgeTR, { backgroundColor: item.badge1.color }]}>
                    <Ionicons name={item.badge1.icon} size={20} color="#FFFFFF" />
                </View>
                {/* Badge left */}
                <View style={[styles.badge, styles.badgeML, { backgroundColor: item.badge2.color }]}>
                    <Ionicons name={item.badge2.icon} size={18} color="#FFFFFF" />
                </View>
            </View>

            {/* Text section */}
            <View style={styles.textSection}>
                <View style={styles.sparkIconBox}>
                    <Ionicons name="sparkles" size={14} color="#6366F1" />
                </View>
                <Text style={styles.title}>
                    {item.titleLine1}{'\n'}{item.titleLine2}
                </Text>
                <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.root}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <FlatList
                ref={flatListRef}
                data={slides}
                renderItem={renderSlide}
                keyExtractor={(item) => item.key}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
                onMomentumScrollEnd={(e) => {
                    setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width));
                }}
                scrollEventThrottle={16}
            />

            {/* Bottom bar */}
            <View style={styles.bottomBar}>
                {/* Dots */}
                <View style={styles.dots}>
                    {slides.map((s, i) => (
                        <View
                            key={i}
                            style={[
                                styles.dot,
                                i === currentIndex && [styles.dotActive, { backgroundColor: '#6366F1' }],
                            ]}
                        />
                    ))}
                </View>

                {/* Next button */}
                <TouchableOpacity
                    style={[styles.nextBtn, { backgroundColor: slides[currentIndex].btnColor }]}
                    onPress={goNext}
                    activeOpacity={0.9}
                >
                    <Text style={styles.nextBtnText}>{slides[currentIndex].btnText}</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#FFFFFF' },
    slide: { width, flex: 1, alignItems: 'center', paddingTop: 40 },
    skipBtn: {
        position: 'absolute', top: 20, right: 20,
        backgroundColor: '#F8FAFC', borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 8,
        borderWidth: 1, borderColor: '#F1F5F9'
    },
    skipText: { fontSize: 13, color: '#64748B', fontWeight: '600' },

    // Image card
    imageCard: {
        width: width * 0.76,
        height: height * 0.35,
        marginTop: 60,
        borderRadius: 24,
        position: 'relative',
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
    },
    imageBg: {
        width: '100%', height: '100%',
        borderRadius: 24, overflow: 'hidden',
        backgroundColor: '#F8FAFC',
        borderWidth: 1, borderColor: '#F1F5F9',
    },
    heroImg: { width: '100%', height: '100%' },

    badge: {
        position: 'absolute', width: 42, height: 42, borderRadius: 21,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1, shadowRadius: 6, elevation: 4,
    },
    badgeTR: { top: -10, right: -12 },
    badgeML: { top: '35%', left: -14 },

    // Text
    textSection: { paddingHorizontal: 24, marginTop: 40, alignItems: 'center' },
    sparkIconBox: { width: 28, height: 28, borderRadius: 10, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    title: {
        fontSize: 24, fontWeight: '800', textAlign: 'center',
        lineHeight: 32, marginBottom: 12, color: '#1F2937'
    },
    subtitle: {
        fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20, fontWeight: '500'
    },

    // Bottom
    bottomBar: {
        paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 28,
        alignItems: 'center', backgroundColor: '#FFFFFF',
    },
    dots: { flexDirection: 'row', gap: 6, marginBottom: 24 },
    dot: {
        width: 6, height: 6, borderRadius: 3,
        backgroundColor: '#E2E8F0',
    },
    dotActive: { width: 16, borderRadius: 3 },
    nextBtn: {
        width: '100%', height: 50, borderRadius: 16,
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
    },
    nextBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
