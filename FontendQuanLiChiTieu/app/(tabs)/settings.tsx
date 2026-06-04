import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, ScrollView, Switch, Platform, Alert, StatusBar } from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UserService, { UserProfile } from '../../src/services/user.service';
import api, { removeToken, getToken, getFullImageUrl } from '../../src/services/api';
import { WalletService, WalletResponse } from '../../src/services/wallet.service';
import { TransactionService, TransactionResponse } from '../../src/services/transaction.service';
import { BudgetService, BudgetResponse } from '../../src/services/budget.service';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Buffer } from 'buffer';
import { useToast } from '../../src/components/common/Toast';
import * as Updates from 'expo-updates';

const formatVND = (n: number) => {
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(n) + ' ₫';
};

function Avatar({ firstName, lastName, avatarUrl, onEdit, isPremium }: { firstName: string; lastName: string; avatarUrl?: string; onEdit: () => void; isPremium?: boolean }) {
    const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
    return (
        <TouchableOpacity style={styles.avatarContainer} onPress={onEdit} activeOpacity={0.9}>
            {avatarUrl ? (
                <Image source={{ uri: getFullImageUrl(avatarUrl) }} style={[styles.avatarImg, isPremium && styles.avatarImgPremium]} />
            ) : (
                <View style={[styles.avatarImg, isPremium && styles.avatarImgPremium, { backgroundColor: isPremium ? '#EEF2FF' : '#F1F5F9', justifyContent: 'center', alignItems: 'center' }]}>
                    {initials ? (
                        <Text style={[styles.avatarText, isPremium && styles.avatarTextPremium]}>{initials}</Text>
                    ) : (
                        <Ionicons name="person" size={40} color={isPremium ? '#6366F1' : '#64748B'} />
                    )}
                </View>
            )}
            <View style={[styles.editAvatarBtn, isPremium && styles.editAvatarBtnPremium]}>
                <Ionicons name="pencil" size={12} color="#FFFFFF" />
            </View>
        </TouchableOpacity>
    );
}

export default function ProfileScreen() {
    const router = useRouter();
    const toast = useToast();
    const insets = useSafeAreaInsets();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [wallets, setWallets] = useState<WalletResponse[]>([]);
    const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
    const [budgets, setBudgets] = useState<BudgetResponse[]>([]);
    const [budgetAlerts, setBudgetAlerts] = useState(true);

    useFocusEffect(
        useCallback(() => {
            getToken().then(token => {
                if (!token) return;

                Promise.all([
                    UserService.getMyProfile(),
                    WalletService.getMyWallets(),
                    TransactionService.getMyTransactions(),
                    BudgetService.getMyBudgets(),
                ]).then(([u, w, t, b]) => {
                    setUser(u);
                    setWallets(w);
                    setTransactions(t);
                    setBudgets(b);
                }).catch(console.warn);
            });
        }, [])
    );

    const handleLogout = () => {
        toast.confirm(
            'Đăng xuất thôi à? 👋',
            'Bạn có chắc muốn thoát không? Tụi mình sẽ nhớ bạn đấy!',
            async () => { await removeToken(); router.replace('/auth/login'); },
            'Đăng xuất',
            'Ở lại'
        );
    };

    const handleShowPremiumInfo = async () => {
        try {
            let activationDateStr = await AsyncStorage.getItem('premium_activation_date');
            let packageType = await AsyncStorage.getItem('premium_package_type');

            if (!activationDateStr) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                activationDateStr = yesterday.toISOString();
                packageType = 'MONTHLY';
            }

            const activationDate = new Date(activationDateStr);
            const expiryDate = new Date(activationDate);
            if (packageType === 'YEARLY') {
                expiryDate.setDate(expiryDate.getDate() + 365);
            } else {
                expiryDate.setDate(expiryDate.getDate() + 30);
            }

            const formatDate = (date: Date) => {
                const d = date.getDate();
                const m = date.getMonth() + 1;
                const y = date.getFullYear();
                return `${d < 10 ? '0' + d : d}/${m < 10 ? '0' + m : m}/${y}`;
            };

            Alert.alert(
                "Thông tin Premium 👑",
                `• Trạng thái: Đã kích hoạt\n• Gói dịch vụ: ${packageType === 'YEARLY' ? 'Hàng năm (190.000đ/năm)' : 'Hàng tháng (19.000đ/tháng)'}\n• Ngày đăng ký: ${formatDate(activationDate)}\n• Hạn dùng đến: ${formatDate(expiryDate)}\n\nCảm ơn bạn đã tin dùng PayMind! ✨`,
                [{ text: "Đóng", style: "cancel" }]
            );
        } catch (err) {
            console.warn("Error reading premium info:", err);
            toast.error("Lỗi", "Không thể lấy thông tin gói Premium.");
        }
    };

    const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
    const activeBudgets = budgets.filter(b => b.isActive);
    const hasBudgets = activeBudgets.length > 0;
    const totalBudgetLimit = hasBudgets ? activeBudgets.reduce((sum, b) => sum + b.amount, 0) : 0;
    const totalBudgetSpent = hasBudgets ? activeBudgets.reduce((sum, b) => sum + b.spentAmount, 0) : 0;
    const budgetRemaining = Math.max(0, totalBudgetLimit - totalBudgetSpent);
    const budgetRatio = totalBudgetLimit > 0 ? (totalBudgetSpent / totalBudgetLimit) : 0;

    const handleExportExcel = async () => {
        if (user && !user.isPremium) {
            toast.error('Chức năng Premium', 'Vui lòng nâng cấp Premium để sử dụng tính năng này.');
            setTimeout(() => {
                router.push('/premium');
            }, 1500);
            return;
        }
        try {
            const token = await getToken();
            if (!token) {
                toast.error('Chưa đăng nhập', 'Vui lòng đăng nhập lại.');
                return;
            }

            const response = await api.get('/transactions/export', {
                responseType: 'arraybuffer',
                headers: {
                    'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                }
            });

            if (response.status !== 200) {
                throw new Error("Download failed");
            }

            const base64 = Buffer.from(response.data, 'binary').toString('base64');
            // @ts-ignore
            const fileUri = (FileSystem.cacheDirectory || FileSystem.documentDirectory) + `TatCaGiaoDich_${new Date().getTime()}.xlsx`;

            await FileSystem.writeAsStringAsync(fileUri, base64, {
                // @ts-ignore
                encoding: 'base64'
            });

            await Sharing.shareAsync(fileUri, {
                mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                dialogTitle: 'Xuất dữ liệu giao dịch',
                UTI: 'com.microsoft.excel.xlsx'
            });

        } catch (error) {
            console.warn("Export error:", error);
            toast.error('Xuất thất bại', 'Không thể xuất file Excel lúc này. Vui lòng thử lại sau.');
        }
    };

    const handleCheckForUpdate = async () => {
        if (__DEV__) {
            toast.info('Chế độ phát triển', 'Tính năng cập nhật OTA không hoạt động ở chế độ development.');
            return;
        }
        
        try {
            toast.info('Đang kiểm tra...', 'Đang tìm kiếm bản cập nhật mới nhất...');
            const update = await Updates.checkForUpdateAsync();
            
            if (update.isAvailable) {
                toast.info('Đang tải...', 'Tìm thấy bản cập nhật mới. Đang tải về...');
                await Updates.fetchUpdateAsync();
                Alert.alert(
                    'Đã tải xong! 🎉',
                    'Bản cập nhật đã sẵn sàng. Bạn có muốn khởi động lại ứng dụng để áp dụng ngay không?',
                    [
                        { text: 'Để sau', style: 'cancel' },
                        { text: 'Khởi động lại ngay', onPress: () => Updates.reloadAsync() }
                    ]
                );
            } else {
                toast.success('Đã cập nhật', 'Ứng dụng của bạn đang ở phiên bản mới nhất!');
            }
        } catch (error) {
            console.warn("Update error:", error);
            toast.error('Lỗi kiểm tra', 'Không thể kiểm tra cập nhật lúc này. Vui lòng thử lại sau.');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 12 : 8 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Hồ Sơ & Cài Đặt</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Profile Card Info */}
                <View style={styles.profileCard}>
                    <Avatar
                        firstName={user?.firstName ?? ''}
                        lastName={user?.lastName ?? ''}
                        avatarUrl={user?.avatarUrl}
                        onEdit={() => router.push({ pathname: '/edit-profile', params: { user: JSON.stringify(user) } })}
                        isPremium={user?.isPremium}
                    />
                    <Text style={styles.userName}>{user?.firstName} {user?.lastName}</Text>
                    <Text style={styles.userEmail}>{user?.email}</Text>
                    
                    {user?.isPremium ? (
                        <TouchableOpacity style={[styles.badge, styles.premiumBadge]} onPress={handleShowPremiumInfo} activeOpacity={0.85}>
                            <Ionicons name="sparkles" size={12} color="#D97706" style={{ marginRight: 4 }} />
                            <Text style={styles.badgeTextPremium}>PREMIUM MEMBER 👑</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={[styles.badge, styles.basicBadge]} onPress={() => router.push('/premium')} activeOpacity={0.85}>
                            <Text style={styles.badgeTextBasic}>Nâng cấp Premium ⚡</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Financial Bento Box Overview */}
                <Text style={styles.sectionTitle}>Tổng quan tài chính</Text>
                <View style={styles.cardsRow}>
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View style={[styles.cardIconBox, { backgroundColor: '#ECFDF5' }]}>
                                <Ionicons name="wallet-outline" size={14} color="#10B981" />
                            </View>
                            <Text style={styles.cardLabel}>TỔNG SỐ DƯ</Text>
                        </View>
                        <Text style={styles.cardAmount} numberOfLines={1} adjustsFontSizeToFit>{formatVND(totalBalance)}</Text>
                        <View style={styles.cardFooter}>
                            <Ionicons name="trending-up" size={12} color="#10B981" />
                            <Text style={styles.cardFooterTextPositive}>Kiểm soát tốt</Text>
                        </View>
                    </View>

                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View style={[styles.cardIconBox, { backgroundColor: '#EEF2FF' }]}>
                                <Ionicons name="pie-chart-outline" size={14} color="#6366F1" />
                            </View>
                            <Text style={styles.cardLabel}>CÒN LẠI</Text>
                        </View>
                        <Text style={styles.cardAmount} numberOfLines={1} adjustsFontSizeToFit>{formatVND(budgetRemaining)}</Text>
                        <Text style={styles.cardSubText}>
                            {totalBudgetLimit > 0 ? `${formatVND(totalBudgetSpent)} / ${formatVND(totalBudgetLimit)}` : 'Chưa cài đặt ngân sách'}
                        </Text>
                        <View style={styles.progressBarBg}>
                            <View style={[
                                styles.progressBarFill,
                                {
                                    width: `${Math.min(100, budgetRatio * 100)}%`,
                                    backgroundColor: budgetRatio > 0.9 ? '#EF4444' : budgetRatio > 0.7 ? '#F59E0B' : '#10B981'
                                }
                            ]} />
                        </View>
                    </View>
                </View>

                {/* Settings Menu */}
                <Text style={styles.sectionTitle}>Quản lý tài khoản</Text>
                <View style={styles.menuGroup}>
                    <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile')} activeOpacity={0.6}>
                        <Ionicons name="person-outline" size={20} color="#64748B" />
                        <Text style={styles.menuItemText}>Thông tin cá nhân</Text>
                        <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/wallet')} activeOpacity={0.6}>
                        <Ionicons name="card-outline" size={20} color="#64748B" />
                        <Text style={styles.menuItemText}>Danh sách ví liên kết</Text>
                        <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/categories')} activeOpacity={0.6}>
                        <Ionicons name="grid-outline" size={20} color="#64748B" />
                        <Text style={styles.menuItemText}>Quản lý nhóm thu chi</Text>
                        <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                    <View style={styles.divider} />

                    <View style={styles.menuItem}>
                        <Ionicons name="notifications-outline" size={20} color="#64748B" />
                        <Text style={styles.menuItemText}>Nhắc nhở ngân sách</Text>
                        <Switch
                            value={budgetAlerts}
                            onValueChange={setBudgetAlerts}
                            trackColor={{ false: '#E2E8F0', true: '#6366F1' }}
                            thumbColor="#FFFFFF"
                            ios_backgroundColor="#E2E8F0"
                        />
                    </View>
                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.menuItem} onPress={handleExportExcel} activeOpacity={0.6}>
                        <Ionicons name="cloud-download-outline" size={20} color="#64748B" />
                        <Text style={styles.menuItemText}>Xuất dữ liệu Excel</Text>
                        {!user?.isPremium && (
                            <View style={styles.lockBadge}>
                                <Ionicons name="lock-closed" size={10} color="#D97706" />
                                <Text style={{ fontSize: 10, fontWeight: '700', color: '#D97706', marginLeft: 2 }}>PRO</Text>
                            </View>
                        )}
                        <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.menuItem} onPress={handleCheckForUpdate} activeOpacity={0.6}>
                        <Ionicons name="cloud-download-outline" size={20} color="#64748B" />
                        <Text style={styles.menuItemText}>Kiểm tra bản cập nhật mới</Text>
                        <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                </View>

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
                    <Ionicons name="log-out-outline" size={18} color="#EF4444" style={{ marginRight: 6 }} />
                    <Text style={styles.logoutBtnText}>Đăng xuất tài khoản</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC', paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },

    scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

    profileCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 24 },
    avatarContainer: { position: 'relative', marginBottom: 14 },
    avatarImg: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: '#EEF2FF' },
    avatarImgPremium: { borderColor: '#F59E0B' },
    avatarText: { fontSize: 32, fontWeight: '700', color: '#4B5563' },
    avatarTextPremium: { color: '#B45309' },
    editAvatarBtn: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#6366F1',
        width: 26,
        height: 26,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    editAvatarBtnPremium: {
        backgroundColor: '#F59E0B',
    },
    userName: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
    userEmail: { fontSize: 13, color: '#64748B', fontWeight: '500', marginBottom: 12 },

    sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 12, marginTop: 4 },

    cardsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    card: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#F1F5F9' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    cardIconBox: { width: 24, height: 24, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
    cardLabel: { fontSize: 10, fontWeight: '700', color: '#64748B', letterSpacing: 0.5 },
    cardAmount: { fontSize: 16, fontWeight: '800', color: '#1F2937', marginBottom: 4, fontVariant: ['tabular-nums'] },

    cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    cardFooterTextPositive: { fontSize: 11, fontWeight: '600', color: '#10B981' },

    cardSubText: { fontSize: 11, color: '#64748B', fontWeight: '600', marginBottom: 8, fontVariant: ['tabular-nums'] },
    progressBarBg: { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 3 },

    menuGroup: { backgroundColor: '#FFFFFF', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 16, marginBottom: 24, borderWidth: 1, borderColor: '#F1F5F9' },
    menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
    menuItemText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1F2937' },
    divider: { height: 1, backgroundColor: '#F1F5F9' },

    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2', paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: '#FEE2E2' },
    logoutBtnText: { fontSize: 14, fontWeight: '700', color: '#EF4444' },

    badge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    premiumBadge: {
        backgroundColor: '#FEF3C7',
        borderWidth: 1,
        borderColor: '#F59E0B',
    },
    basicBadge: {
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    badgeTextPremium: {
        fontSize: 10,
        fontWeight: '800',
        color: '#B45309',
        letterSpacing: 0.5,
    },
    badgeTextBasic: {
        fontSize: 11,
        fontWeight: '700',
        color: '#6366F1',
    },
    lockBadge: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
        marginRight: 4,
        flexDirection: 'row',
        alignItems: 'center',
    },
});
