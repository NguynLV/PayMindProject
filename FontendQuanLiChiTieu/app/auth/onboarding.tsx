import React, { useRef, useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    Dimensions, FlatList, Animated, Image,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const slides = [
    {
        key: '1',
        bg: '#FFF5F5',
        imageBg: '#4ECDC4',
        image: require('../../assets/images/onboard1.png'),
        badge1: { icon: 'wallet-outline' as const, color: '#2DD4BF' },
        badge2: { icon: 'cube-outline' as const, color: '#F59E0B' },
        titleLine1: 'Ghi chép "vèo" cái là',
        titleLine2: 'xong! 🚀',
        titleColor: '#111827',
        subtitle: 'Quên nỗi lo viêm màng túi đi. Theo dõi chi tiêu mượt như cách bạn lướt tóp tóp luôn!',
        btnText: 'Tiếp theo  →',
        btnColor: '#FF6B6B',
        dotActiveColor: '#FF6B6B',
    },
    {
        key: '2',
        bg: '#FAFFF5',
        imageBg: '#4ECDC4',
        image: require('../../assets/images/onboard2.png'),
        badge1: { icon: 'pie-chart-outline' as const, color: '#EF4444' },
        badge2: { icon: 'trending-up-outline' as const, color: '#3B82F6' },
        titleLine1: 'Nhìn biểu đồ,',
        titleLine2: 'thấu túi tiền! 🧐',
        titleColor: '#3B82F6',
        subtitle: 'Không còn đau đầu với con số. Xem biểu đồ cực nghệ, biết ngay tiền bay đi đâu!',
        btnText: 'Tiếp theo nào  →',
        btnColor: '#FBBF24',
        dotActiveColor: '#3B82F6',
    },
    {
        key: '3',
        bg: '#FFFBEB',
        imageBg: '#F5E4CA',
        image: require('../../assets/images/onboard3.png'),
        badge1: { icon: 'cash-outline' as const, color: '#F59E0B' },
        badge2: { icon: 'trophy-outline' as const, color: '#10B981' },
        titleLine1: 'Tiết kiệm kiểu',
        titleLine2: '"Pro"!',
        titleColor: '#F59E0B',
        subtitle: 'Đặt mục tiêu tậu Laptop, đi du đưa hay ăn sập quán quen. Lập ngân sách "vèo" cái là xong, săn ngay huy hiệu cực chất!',
        btnText: 'KHÁM PHÁ NGAY',
        btnColor: '#F59E0B',
        dotActiveColor: '#2DD4BF',
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
            router.replace('/(tabs)');
        }
    };

    const renderSlide = ({ item }: { item: typeof slides[0] }) => (
        <View style={[styles.slide, { backgroundColor: item.bg }]}>
            {/* Skip button */}
            <TouchableOpacity style={styles.skipBtn} onPress={() => router.replace('/(tabs)')}>
                <Text style={styles.skipText}>Bỏ qua</Text>
            </TouchableOpacity>

            {/* Image card */}
            <View style={styles.imageCard}>
                <View style={[styles.imageBg, { backgroundColor: item.imageBg }]}>
                    <Image source={item.image} style={styles.heroImg} resizeMode="cover" />
                </View>
                {/* Badge top-right */}
                <View style={[styles.badge, styles.badgeTR, { backgroundColor: item.badge1.color }]}>
                    <Ionicons name={item.badge1.icon} size={22} color="#fff" />
                </View>
                {/* Badge left */}
                <View style={[styles.badge, styles.badgeML, { backgroundColor: item.badge2.color }]}>
                    <Ionicons name={item.badge2.icon} size={20} color="#fff" />
                </View>
                {/* Decorative circles */}
                <View style={[styles.decoCircle, styles.decoTL]} />
                <View style={[styles.decoCircle, styles.decoBR]} />
            </View>

            {/* Text section */}
            <View style={styles.textSection}>
                <Text style={styles.titleEmoji}>✦</Text>
                <Text style={[styles.title, { color: item.titleColor }]}>
                    {item.titleLine1}{'\n'}{item.titleLine2}
                </Text>
                <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.root}>
            <Stack.Screen options={{ headerShown: false }} />

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
                                i === currentIndex && [styles.dotActive, { backgroundColor: slides[currentIndex].dotActiveColor }],
                            ]}
                        />
                    ))}
                </View>

                {/* Next button */}
                <TouchableOpacity
                    style={[styles.nextBtn, { backgroundColor: slides[currentIndex].btnColor }]}
                    onPress={goNext}
                    activeOpacity={0.85}
                >
                    <Text style={styles.nextBtnText}>{slides[currentIndex].btnText}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    slide: { width, flex: 1, alignItems: 'center', paddingTop: 60 },
    skipBtn: {
        position: 'absolute', top: 56, right: 24,
        backgroundColor: '#fff', borderRadius: 20,
        paddingHorizontal: 16, paddingVertical: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
    },
    skipText: { fontSize: 14, color: '#374151', fontWeight: '600' },

    // Image card
    imageCard: {
        width: width * 0.78,
        height: height * 0.38,
        marginTop: 50,
        borderRadius: 28,
        overflow: 'visible',
        position: 'relative',
    },
    imageBg: {
        width: '100%', height: '100%',
        borderRadius: 28, overflow: 'hidden',
        borderWidth: 3, borderColor: '#1F2937',
    },
    heroImg: { width: '100%', height: '100%' },

    badge: {
        position: 'absolute', width: 48, height: 48, borderRadius: 24,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2, shadowRadius: 6, elevation: 5,
    },
    badgeTR: { top: -12, right: -16 },
    badgeML: { top: '40%', left: -20 },

    decoCircle: {
        position: 'absolute', width: 28, height: 28, borderRadius: 14,
        borderWidth: 3, borderColor: '#FCD34D', backgroundColor: 'transparent',
    },
    decoTL: { top: -14, left: 20 },
    decoBR: { bottom: -10, right: 30, borderColor: '#F9A8D4' },

    // Text
    textSection: { paddingHorizontal: 28, marginTop: 32, alignItems: 'center' },
    titleEmoji: { fontSize: 14, color: '#9CA3AF', marginBottom: 4 },
    title: {
        fontSize: 28, fontWeight: '800', textAlign: 'center',
        lineHeight: 36, marginBottom: 14,
    },
    subtitle: {
        fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22,
    },

    // Bottom
    bottomBar: {
        paddingHorizontal: 24, paddingBottom: 44,
        alignItems: 'center', backgroundColor: 'transparent',
    },
    dots: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    dot: {
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: '#D1D5DB',
    },
    dotActive: { width: 24, borderRadius: 4 },
    nextBtn: {
        width: '100%', height: 54, borderRadius: 27,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2, shadowRadius: 8, elevation: 5,
    },
    nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
});
