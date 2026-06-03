import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Platform, Animated, StatusBar } from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { WalletService, WalletResponse } from '../../src/services/wallet.service';
import { useToast } from '../../src/components/common/Toast';

const formatVND = (n: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(n) + ' đ';

export default function WalletScreen() {
    const router = useRouter();
    const toast = useToast();
    const [wallets, setWallets] = useState<WalletResponse[]>([]);
    const [loading, setLoading] = useState(true);

    const loadWallets = async () => {
        try {
            setLoading(true);
            const data = await WalletService.getMyWallets();
            setWallets(data);
        } catch (error) {
            toast.error('Không tải được!', 'Không thể tải danh sách ví lúc này.');
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadWallets();
        }, [])
    );

    const checkDelete = (wallet: WalletResponse) => {
        if (wallet.isDefault) {
            toast.warning('Không thể xóa', 'Không thể xóa ví mặc định.');
            return;
        }
        toast.confirm(
            `Xóa ví "${wallet.name}"?`,
            'Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa ví này không?',
            async () => {
                try {
                    await WalletService.deleteWallet(wallet.id);
                    loadWallets();
                    toast.success('Xóa thành công', `Ví "${wallet.name}" đã được xóa.`);
                } catch (e: any) {
                    toast.error('Xóa thất bại', e.response?.data?.message || 'Không thể xóa ví lúc này.');
                }
            },
            'Xóa thôi',
            'Thôi giữ lại'
        );
    };

    const getCardGradient = (index: number): [string, string] => {
        const gradients: [string, string][] = [
            ['#6366F1', '#4F46E5'],
            ['#10B981', '#059669'],
            ['#EC4899', '#DB2777'],
            ['#F59E0B', '#D97706'],
            ['#06B6D4', '#0891B2'],
            ['#8B5CF6', '#7C3AED']
        ];
        return gradients[index % gradients.length];
    };

    const renderRightActions = (progress: any, dragX: any, wallet: WalletResponse) => {
        if (wallet.isDefault) return null;

        const trans = dragX.interpolate({
            inputRange: [-100, 0],
            outputRange: [1, 0],
            extrapolate: 'clamp',
        });

        return (
            <TouchableOpacity
                style={styles.deleteAction}
                onPress={() => checkDelete(wallet)}
                activeOpacity={0.8}
            >
                <Animated.View style={{ transform: [{ scale: trans }] }}>
                    <Ionicons name="trash-outline" size={24} color="#FFF" />
                </Animated.View>
            </TouchableOpacity>
        );
    };

    const renderWallet = ({ item, index }: { item: WalletResponse, index: number }) => {
        const gradientColors = getCardGradient(index);
        return (
            <Swipeable
                renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
                containerStyle={styles.swipeableContainer}
            >
                <TouchableOpacity
                    onPress={() => router.push({ pathname: '/wallet-form', params: { id: item.id, name: item.name, balance: item.balance.toString() } })}
                    onLongPress={() => !item.isDefault && checkDelete(item)}
                    activeOpacity={0.95}
                >
                    <LinearGradient
                        colors={gradientColors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.walletCard}
                    >
                        <View style={styles.cardHeader}>
                            <View style={styles.cardLogoCol}>
                                <Ionicons name="card" size={24} color="#FFFFFF" style={{ opacity: 0.9 }} />
                                <Text style={styles.cardName}>{item.name}</Text>
                            </View>
                            <View style={styles.defaultBadge}>
                                <Text style={styles.defaultText}>
                                    {item.isDefault ? 'CHÍNH' : 'PHỤ'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.cardBody}>
                            <Text style={styles.cardBalanceLabel}>SỐ DƯ KHẢ DỤNG</Text>
                            <Text style={styles.cardBalance}>{formatVND(item.balance)}</Text>
                        </View>

                        <View style={styles.cardFooter}>
                            <Text style={styles.cardNumber}>•••• •••• •••• {item.id.toString().padStart(4, '0')}</Text>
                            <Text style={styles.cardSubtitle}>PayMind Card</Text>
                        </View>
                    </LinearGradient>
                </TouchableOpacity>
            </Swipeable>
        );
    };

    const renderHeader = () => {
        const total = wallets.reduce((acc, w) => acc + w.balance, 0);
        return (
            <View style={styles.overviewContainer}>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>TỔNG SỐ DƯ TÀI KHOẢN</Text>
                    <Text style={styles.summaryAmount}>{formatVND(total)}</Text>
                    
                    <View style={styles.trendWrap}>
                        <View style={styles.trendPill}>
                            <Ionicons name="trending-up" size={12} color="#10B981" />
                            <Text style={styles.trendText}>+12.5%</Text>
                        </View>
                        <Text style={styles.trendSubText}>Tăng trưởng so với tháng trước</Text>
                    </View>
                </View>

                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => router.push({ pathname: '/add', params: { initialType: 'INCOME' } })}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.actionIconContainer, { backgroundColor: '#EEF2FF' }]}>
                            <Ionicons name="add-circle" size={22} color="#6366F1" />
                        </View>
                        <Text style={styles.actionText}>Thêm thu nhập</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => router.push({ pathname: '/add', params: { initialType: 'EXPENSE' } })}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.actionIconContainer, { backgroundColor: '#FFF0F0' }]}>
                            <Ionicons name="remove-circle" size={22} color="#EF4444" />
                        </View>
                        <Text style={styles.actionText}>Thêm chi tiêu</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.accountsHeader}>
                    <Text style={styles.accountsTitle}>Danh sách thẻ & ví</Text>
                    <Text style={styles.accountsSubtitle}>Vuốt sang trái để xóa thẻ phụ</Text>
                </View>
            </View>
        );
    };

    const renderFooter = () => (
        <TouchableOpacity style={styles.addWalletBtn} onPress={() => router.push('/wallet-form')} activeOpacity={0.8}>
            <Ionicons name="add" size={20} color="#6366F1" />
            <Text style={styles.addWalletBtnText}>Thêm ví / thẻ mới</Text>
        </TouchableOpacity>
    );

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
                
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                        <Ionicons name="chevron-back" size={24} color="#111827" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Ví tiền của tôi</Text>
                    <TouchableOpacity style={styles.bellBtn} onPress={() => router.push('/notifications')} activeOpacity={0.7}>
                        <Ionicons name="notifications-outline" size={22} color="#111827" />
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={wallets}
                    keyExtractor={w => w.id.toString()}
                    renderItem={renderWallet}
                    ListHeaderComponent={renderHeader}
                    ListFooterComponent={renderFooter}
                    contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 20 }}
                    showsVerticalScrollIndicator={false}
                />
            </SafeAreaView>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF', paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16, backgroundColor: '#FFFFFF' },
    backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center' },
    bellBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 16, fontWeight: '700', color: '#111827' },

    overviewContainer: { paddingTop: 12 },
    summaryCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 10,
        elevation: 2,
    },
    summaryLabel: { color: '#9CA3AF', fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
    summaryAmount: { color: '#111827', fontSize: 30, fontWeight: '800', letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
    trendWrap: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
    trendPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    trendText: { color: '#10B981', fontSize: 11, fontWeight: '700', marginLeft: 4 },
    trendSubText: { color: '#6B7280', fontSize: 12, fontWeight: '500', marginLeft: 8 },

    actionRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    actionCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.01,
        shadowRadius: 4,
        elevation: 1,
        gap: 10
    },
    actionIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionText: { fontSize: 13, fontWeight: '700', color: '#374151' },

    accountsHeader: { marginBottom: 16, marginHorizontal: 2 },
    accountsTitle: { fontSize: 15, fontWeight: '800', color: '#1F2937' },
    accountsSubtitle: { fontSize: 11, color: '#9CA3AF', fontWeight: '500', marginTop: 2 },

    swipeableContainer: { marginBottom: 16, borderRadius: 20 },
    
    // Gradient Physical Card
    walletCard: {
        padding: 20,
        borderRadius: 20,
        height: 160,
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardLogoCol: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    cardName: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
    defaultBadge: { backgroundColor: 'rgba(255, 255, 255, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    defaultText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    
    cardBody: { gap: 4 },
    cardBalanceLabel: { color: 'rgba(255, 255, 255, 0.65)', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
    cardBalance: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', fontVariant: ['tabular-nums'] },
    
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardNumber: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 12, fontWeight: '500', letterSpacing: 0.5 },
    cardSubtitle: { color: 'rgba(255, 255, 255, 0.6)', fontSize: 11, fontWeight: '600' },

    deleteAction: {
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        height: 160,
        borderRadius: 20,
        marginLeft: 12,
    },

    addWalletBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        paddingVertical: 14,
        borderStyle: 'dashed',
        borderWidth: 1.5,
        borderColor: '#C7D2FE',
        marginTop: 8,
        backgroundColor: 'rgba(99, 102, 241, 0.02)'
    },
    addWalletBtnText: { fontSize: 13, fontWeight: '700', color: '#6366F1', marginLeft: 8 }
});
