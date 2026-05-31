import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
    ScrollView, Image, ActivityIndicator, Platform, Dimensions,
    Modal, TouchableWithoutFeedback, Linking, InteractionManager, StatusBar
} from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from '../src/components/common/Toast';
import UserService, { UserProfile } from '../src/services/user.service';
import api from '../src/services/api';

const { width } = Dimensions.get('window');

export default function PremiumScreen() {
    const router = useRouter();
    const toast = useToast();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [selectedTier, setSelectedTier] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
    const [showCelebration, setShowCelebration] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(false);

    // Bank Account Details
    const bankAccount = {
        bankName: 'MBBank (Ngân hàng Quân Đội)',
        accountNo: '0868369069',
        accountName: 'LE VINH NGUYEN', // Matching owner name
    };

    const getAmount = () => selectedTier === 'YEARLY' ? 190000 : 19000;
    const getTransferMemo = () => {
        if (!user) return 'PAYMIND PREMIUM';
        return `PAYMIND PREMIUM ${selectedTier === 'YEARLY' ? 'YEARLY' : 'MONTHLY'} ${user.email}`;
    };

    // VietQR code generation URL memoized
    const qrCodeUrl = React.useMemo(() => {
        const amount = selectedTier === 'YEARLY' ? 190000 : 19000;
        const memo = encodeURIComponent(getTransferMemo());
        return `https://img.vietqr.io/image/MB-${bankAccount.accountNo}-compact2.png?amount=${amount}&addInfo=${memo}`;
    }, [selectedTier, user]);



    useEffect(() => {
        const task = InteractionManager.runAfterInteractions(() => {
            UserService.getMyProfile()
                .then(u => {
                    setUser(u);
                })
                .catch(err => {
                    console.warn("Failed to load profile in PremiumScreen:", err);
                    toast.error("Không thể lấy thông tin!", "Vui lòng kiểm tra kết nối mạng nha.");
                })
                .finally(() => {
                    setLoadingProfile(false);
                });
        });
        return () => task.cancel();
    }, []);

    // Polling to automatically check for premium activation when this screen is active
    useEffect(() => {
        if (!user || user.isPremium) return;
        const interval = setInterval(() => {
            checkPremiumStatus(true);
        }, 5000);
        return () => clearInterval(interval);
    }, [user]);

    const copyToClipboard = async (text: string, label: string) => {
        await Clipboard.setStringAsync(text);
        toast.success("Sao chép thành công! 📋", `Đã copy ${label} vào khay nhớ tạm.`);
    };



    const checkPremiumStatus = async (silent = false) => {
        try {
            if (!silent) setCheckingStatus(true);
            const freshProfile = await UserService.getMyProfile();
            if (freshProfile && freshProfile.isPremium) {
                const now = new Date().toISOString();
                try {
                    await AsyncStorage.setItem('premium_activation_date', now);
                    await AsyncStorage.setItem('premium_package_type', selectedTier);
                } catch (e) {
                    console.warn("AsyncStorage save error:", e);
                }
                
                toast.success("Đăng ký thành công! 👑🎉", "Gói Premium của bạn đã được kích hoạt.");
                setShowCelebration(true);
                setTimeout(() => {
                    router.replace('/(tabs)/settings');
                }, 3000);
            } else {
                if (!silent) {
                    toast.info("Chưa nhận được thanh toán ⏳", "Hệ thống chưa ghi nhận giao dịch của bạn. Vui lòng đợi 10-30 giây và thử lại.");
                }
            }
        } catch (error: any) {
            console.warn("Failed to check status:", error);
            if (!silent) {
                toast.error("Lỗi kết nối 😅", "Không thể kiểm tra trạng thái thanh toán lúc này.");
            }
        } finally {
            if (!silent) setCheckingStatus(false);
        }
    };



    // Render static layout instantly for zero transition delay

    if (showCelebration) {
        return (
            <SafeAreaView style={[styles.container,
                styles.celebrationOverlay]}>
                <View style={styles.celebrationContent}>
                    <FontAwesome5 name="crown" size={80} color="#FBBF24" style={styles.celebratingCrown} />
                    <Text style={styles.celebrationTitle}>VIP HOMIE ACTIVATED! 👑✨</Text>
                    <Text style={styles.celebrationName}>{user?.firstName} {user?.lastName}</Text>
                    <Text style={styles.celebrationDesc}>
                        Đã nâng cấp tài khoản lên Premium thành công! Trải nghiệm trọn vẹn trợ lý AI Assistant, các báo cáo phân tích nâng cao và xuất Excel không giới hạn.
                    </Text>
                    <ActivityIndicator size="small" color="#FBBF24" style={{ marginTop: 24 }} />
                    <Text style={styles.celebrationRedirect}>Đang dẫn bạn về trang cá nhân...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <Stack.Screen options={{ headerShown: false }} />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Nâng cấp Premium</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* Intro Title */}
                <View style={styles.introContainer}>
                    <FontAwesome5 name="crown" size={48} color="#FFB800" style={styles.introCrown} />
                    <Text style={styles.introTitle}>Mở Khóa Siêu Năng Lực</Text>
                    <Text style={styles.introSubtitle}>Nhận mọi đặc quyền tốt nhất từ PayMind</Text>
                </View>

                {/* Features List */}
                <View style={styles.featuresList}>
                    <View style={styles.featureItem}>
                        <View style={[styles.featureIconBox, { backgroundColor: 'rgba(124,58,237,0.15)' }]}>
                            <MaterialCommunityIcons name="robot" size={20} color="#8B5CF6" />
                        </View>
                        <View style={styles.featureTextCol}>
                            <Text style={styles.featureTitle}>Trợ lý tài chính AI Assistant</Text>
                            <Text style={styles.featureDesc}>Trò chuyện, phân tích hóa đơn và đưa ra ngân sách thông minh tức thì.</Text>
                        </View>
                    </View>

                    <View style={styles.featureItem}>
                        <View style={[styles.featureIconBox, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                            <Ionicons name="stats-chart" size={20} color="#10B981" />
                        </View>
                        <View style={styles.featureTextCol}>
                            <Text style={styles.featureTitle}>Báo cáo nâng cao & Excel</Text>
                            <Text style={styles.featureDesc}>Biểu đồ chi tiết, phân tích thói quen và xuất dữ liệu ra file Excel.</Text>
                        </View>
                    </View>

                    <View style={styles.featureItem}>
                        <View style={[styles.featureIconBox, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
                            <Ionicons name="grid" size={20} color="#EF4444" />
                        </View>
                        <View style={styles.featureTextCol}>
                            <Text style={styles.featureTitle}>Danh mục tùy chỉnh không giới hạn</Text>
                            <Text style={styles.featureDesc}>Tự do tạo danh mục chi tiêu, cấu trúc dòng tiền theo sở thích cá nhân.</Text>
                        </View>
                    </View>
                </View>

                {/* Subscription Tiers Select */}
                <Text style={styles.sectionTitle}>Chọn gói dịch vụ</Text>
                <View style={styles.tiersList}>
                    
                    {/* Monthly Option */}
                    <TouchableOpacity
                        style={[styles.tierCard, selectedTier === 'MONTHLY' && styles.tierCardActive]}
                        onPress={() => setSelectedTier('MONTHLY')}
                        activeOpacity={0.9}
                    >
                        <View style={styles.tierLeft}>
                            <View style={[styles.tierCheckCircle, selectedTier === 'MONTHLY' && styles.tierCheckCircleActive]}>
                                {selectedTier === 'MONTHLY' && <Ionicons name="checkmark" size={14} color="#000" />}
                            </View>
                            <View style={styles.tierInfo}>
                                <Text style={styles.tierTitleText}>Hàng tháng</Text>
                                <Text style={styles.tierDescText}>Hủy bất cứ lúc nào</Text>
                            </View>
                        </View>
                        <View style={styles.tierRight}>
                            <Text style={[styles.tierPriceText, selectedTier === 'MONTHLY' && styles.tierPriceTextActive]}>19.000đ</Text>
                            <Text style={styles.tierPriceUnit}>/Tháng</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Yearly Option */}
                    <TouchableOpacity
                        style={[styles.tierCard, selectedTier === 'YEARLY' && styles.tierCardActive]}
                        onPress={() => setSelectedTier('YEARLY')}
                        activeOpacity={0.9}
                    >
                        <View style={styles.recommendedBadge}>
                            <Text style={styles.recommendedBadgeText}>ĐỀ XUẤT</Text>
                        </View>
                        
                        <View style={styles.tierLeft}>
                            <View style={[styles.tierCheckCircle, selectedTier === 'YEARLY' && styles.tierCheckCircleActive]}>
                                {selectedTier === 'YEARLY' && <Ionicons name="checkmark" size={14} color="#000" />}
                            </View>
                            <View style={styles.tierInfo}>
                                <Text style={styles.tierTitleText}>Hàng năm</Text>
                                <Text style={[styles.tierDescText, { color: '#10B981' }]}>3 ngày dùng thử miễn phí</Text>
                            </View>
                        </View>
                        <View style={styles.tierRight}>
                            <Text style={styles.freeTrialText}>MIỄN PHÍ</Text>
                            <Text style={styles.tierPriceSubText}>sau đó 190.000đ/năm</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Bank Transfer QR Info */}
                <Text style={styles.sectionTitle}>Thông tin Chuyển khoản (VietQR)</Text>
                <View style={styles.qrCard}>
                    
                    {/* VietQR Image Container */}
                    <View style={styles.qrImageWrapper}>
                        <Image 
                            source={{ uri: qrCodeUrl }} 
                            style={styles.qrImage}
                            resizeMode="contain"
                        />
                        <Text style={styles.qrScanHint}>Quét mã QR bằng App ngân hàng để thanh toán</Text>
                    </View>

                    {/* Bank Details Table */}
                    <View style={styles.detailsTable}>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Ngân hàng</Text>
                            <Text style={styles.detailValue}>{bankAccount.bankName}</Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Số tài khoản</Text>
                            <View style={styles.detailValRow}>
                                <Text style={styles.detailValue}>{bankAccount.accountNo}</Text>
                                <TouchableOpacity 
                                    onPress={() => copyToClipboard(bankAccount.accountNo, 'Số tài khoản')}
                                    style={styles.copyTinyBtn}
                                >
                                    <Ionicons name="copy-outline" size={14} color="#FFB800" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Chủ tài khoản</Text>
                            <Text style={styles.detailValue}>{bankAccount.accountName}</Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Số tiền</Text>
                            <Text style={[styles.detailValue, { color: '#FFB800', fontWeight: '800' }]}>
                                {getAmount().toLocaleString('vi-VN')} đ
                            </Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Nội dung</Text>
                            <View style={styles.detailValRow}>
                                <Text style={[styles.detailValue, { color: '#38BDF8', fontSize: 12 }]} numberOfLines={1}>
                                    {getTransferMemo()}
                                </Text>
                                <TouchableOpacity 
                                    onPress={() => copyToClipboard(getTransferMemo(), 'Nội dung chuyển khoản')}
                                    style={styles.copyTinyBtn}
                                >
                                    <Ionicons name="copy-outline" size={14} color="#FFB800" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    center: { justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, fontSize: 14, color: '#4B5563', fontWeight: '600' },
    
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16, borderBottomWidth: 1, borderColor: '#F3F4F6' },
    backBtn: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
    
    scrollContent: { paddingHorizontal: 20, paddingTop: 16 },
    
    introContainer: { alignItems: 'center', marginVertical: 20 },
    introCrown: { marginBottom: 12, textShadowColor: 'rgba(255, 184, 0, 0.2)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 8 },
    introTitle: { fontSize: 24, fontWeight: '900', color: '#111827', textAlign: 'center', letterSpacing: 0.5 },
    introSubtitle: { fontSize: 13, color: '#4B5563', marginTop: 4, fontWeight: '500' },

    featuresList: { backgroundColor: '#F9FAFB', borderRadius: 20, padding: 18, marginBottom: 28, borderWidth: 1, borderColor: '#E5E7EB' },
    featureItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginVertical: 10 },
    featureIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    featureTextCol: { flex: 1, gap: 2 },
    featureTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
    featureDesc: { fontSize: 12, color: '#4B5563', lineHeight: 17 },

    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 16, letterSpacing: 0.2 },

    tiersList: { gap: 14, marginBottom: 28 },
    tierCard: { 
        position: 'relative',
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        backgroundColor: '#F9FAFB', 
        borderRadius: 20, 
        paddingHorizontal: 20, 
        paddingVertical: 18, 
        borderWidth: 2, 
        borderColor: '#E5E7EB' 
    },
    tierCardActive: {
        borderColor: '#FFB800',
        backgroundColor: '#FFFDF5'
    },
    tierLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    tierCheckCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
    tierCheckCircleActive: { backgroundColor: '#FFB800', borderColor: '#FFB800' },
    tierInfo: { gap: 3 },
    tierTitleText: { color: '#111827', fontSize: 15, fontWeight: '700' },
    tierDescText: { color: '#6B7280', fontSize: 11, fontWeight: '500' },
    tierRight: { alignItems: 'flex-end', justifyContent: 'center' },
    tierPriceText: { color: '#4B5563', fontSize: 18, fontWeight: '800' },
    tierPriceTextActive: { color: '#FFB800' },
    tierPriceUnit: { color: '#6B7280', fontSize: 10, fontWeight: '600', marginTop: 2 },
    freeTrialText: { color: '#10B981', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
    tierPriceSubText: { color: '#6B7280', fontSize: 10, fontWeight: '600', marginTop: 2 },
    recommendedBadge: { position: 'absolute', top: -9, right: 20, backgroundColor: '#FFB800', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, zIndex: 10 },
    recommendedBadgeText: { color: '#000', fontSize: 8, fontWeight: '900' },

    qrCard: { backgroundColor: '#F9FAFB', borderRadius: 24, padding: 18, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 28, alignItems: 'center' },
    qrImageWrapper: { width: 200, height: 200, backgroundColor: '#fff', borderRadius: 16, padding: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', borderWidth: 1, borderColor: '#E5E7EB' },
    qrImage: { width: '100%', height: '100%' },
    qrScanHint: { color: '#6B7280', fontSize: 11, fontWeight: '500', marginTop: 12, textAlign: 'center', paddingHorizontal: 10 },

    detailsTable: { width: '100%', marginTop: 20, borderTopWidth: 1, borderColor: '#E5E7EB', paddingTop: 8 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderColor: '#E5E7EB' },
    detailLabel: { color: '#6B7280', fontSize: 12, fontWeight: '500' },
    detailValue: { color: '#111827', fontSize: 13, fontWeight: '700', textAlign: 'right' },
    detailValRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    copyTinyBtn: { padding: 4, backgroundColor: 'rgba(255,184,0,0.1)', borderRadius: 6 },

    actionBlock: { gap: 14, marginBottom: 20 },
    primaryPayBtn: { backgroundColor: '#FFB800', borderRadius: 24, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#FFB800', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 3 },
    primaryPayBtnText: { color: '#000', fontSize: 15, fontWeight: '800' },
    applePayBtn: { backgroundColor: '#000', borderRadius: 24, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#333' },
    applePayBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    checkStatusBtn: { backgroundColor: '#6366F1', borderRadius: 24, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 3 },
    checkStatusBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    sheetTitle: {
        color: '#111827',
        fontSize: 16,
        fontWeight: '800'
    },
    
    // Bottom Sheet: Bank app selection
    bottomSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 18, paddingBottom: Platform.OS === 'ios' ? 40 : 24, minHeight: 280, borderTopWidth: 1, borderColor: '#E5E7EB' },
    sheetCloseBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
    sheetDesc: { color: '#6B7280', fontSize: 12, lineHeight: 18, marginTop: 8, marginBottom: 20, fontWeight: '500' },
    bankAppsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', paddingBottom: 10 },
    bankAppItem: { width: (width - 52) / 2, backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#E5E7EB' },
    bankAppIconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    bankAppName: { color: '#111827', fontSize: 13, fontWeight: '700' },

    // Apple Pay Simulation Layout
    applePaySheet: { backgroundColor: '#1c1c1e', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 16, paddingBottom: Platform.OS === 'ios' ? 44 : 24, minHeight: 330 },
    applePayTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
    applePayCard: { backgroundColor: '#2c2c2e', borderRadius: 16, padding: 16, marginTop: 14 },
    appMetadataRow: { flexDirection: 'row', gap: 14 },
    appLogoContainer: { width: 50, height: 50, borderRadius: 10, overflow: 'hidden', backgroundColor: '#000', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)' },
    appLogoImg: { width: '100%', height: '100%' },
    appTitleCol: { flex: 1, gap: 1 },
    appNameText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    appCategoryText: { color: '#8e8e93', fontSize: 10, fontWeight: '500' },
    signUpLabelText: { color: '#0ea5e9', fontSize: 10, fontWeight: '700', marginTop: 3 },
    sheetDivider: { height: 0.5, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 12 },
    applePriceRow: { alignItems: 'flex-start' },
    applePriceText: { color: '#fff', fontSize: 20, fontWeight: '800' },
    appleLegalText: { color: '#8e8e93', fontSize: 10.5, lineHeight: 14.5, marginTop: 8, fontWeight: '500' },
    appleAccountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    appleAccountLabel: { color: '#8e8e93', fontSize: 11, fontWeight: '500' },
    appleAccountEmail: { color: '#fff', fontSize: 11, fontWeight: '600' },

    appleInteractionArea: { height: 75, marginTop: 18, alignItems: 'center', justifyContent: 'center' },
    interactionTapHint: { color: 'rgba(255,255,255,0.15)', fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
    faceIdContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    faceIdText: { color: '#0ea5e9', fontSize: 13, fontWeight: '600' },
    successPayContainer: { alignItems: 'center', gap: 6 },
    checkmarkOuter: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' },
    successPayText: { color: '#10b981', fontSize: 13, fontWeight: '700' },

    appleCloseBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#2c2c2e', alignItems: 'center', justifyContent: 'center' },

    celebrationOverlay: { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    celebrationContent: { alignItems: 'center', justifyContent: 'center' },
    celebratingCrown: { marginBottom: 24, textShadowColor: 'rgba(255, 184, 0, 0.4)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 16 },
    celebrationTitle: { fontSize: 22, fontWeight: '900', color: '#111827', textAlign: 'center', marginBottom: 8, letterSpacing: 0.5 },
    celebrationName: { fontSize: 18, fontWeight: '700', color: '#FFB800', marginBottom: 16 },
    celebrationDesc: { fontSize: 14, color: '#4B5563', textAlign: 'center', lineHeight: 22, paddingHorizontal: 12 },
    celebrationRedirect: { marginTop: 12, fontSize: 11, color: '#FFB800', fontWeight: '600' },
});
