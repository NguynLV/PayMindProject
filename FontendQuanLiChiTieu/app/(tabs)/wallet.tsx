import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Alert, Platform, Animated } from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { WalletService, WalletResponse } from '../../src/services/wallet.service';

const formatVND = (n: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(n) + ' đ';

export default function WalletScreen() {
    const router = useRouter();
    const [wallets, setWallets] = useState<WalletResponse[]>([]);
    const [loading, setLoading] = useState(true);

    const loadWallets = async () => {
        try {
            setLoading(true);
            const data = await WalletService.getMyWallets();
            setWallets(data);
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể tải danh sách ví');
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
            Alert.alert('Không thể xóa', 'Bạn không thể xóa ví mặc định.');
            return;
        }
        Alert.alert('Xóa ví', `Bạn có chắc chắn muốn xóa ví "${wallet.name}" không?`, [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Xóa',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await WalletService.deleteWallet(wallet.id);
                        loadWallets();
                    } catch (e: any) {
                        Alert.alert('Lỗi', e.response?.data?.message || 'Không thể xóa ví');
                    }
                }
            }
        ]);
    };

    const getWalletIconProps = (index: number) => {
        const colors = [
            { bg: '#DEF7EC', icon: '#059669', name: 'wallet-outline' as const },
            { bg: '#E1EFFE', icon: '#3F83F8', name: 'card-outline' as const },
            { bg: '#F3E8FF', icon: '#9061F9', name: 'cube-outline' as const },
            { bg: '#FFEDD5', icon: '#F97316', name: 'cash-outline' as const },
            { bg: '#FDF6B2', icon: '#E3A008', name: 'pie-chart-outline' as const },
            { bg: '#FEE2E2', icon: '#F05252', name: 'apps-outline' as const }
        ];
        return colors[index % colors.length];
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
            >
                <Animated.View style={{ transform: [{ scale: trans }] }}>
                    <Ionicons name="trash-outline" size={28} color="#fff" />
                </Animated.View>
            </TouchableOpacity>
        );
    };

    const renderWallet = ({ item, index }: { item: WalletResponse, index: number }) => {
        const iconProps = getWalletIconProps(index);
        return (
            <Swipeable
                renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
                containerStyle={styles.swipeableContainer}
            >
                <TouchableOpacity
                    style={styles.card}
                    onPress={() => router.push({ pathname: '/wallet-form', params: { id: item.id, name: item.name, balance: item.balance.toString() } })}
                    onLongPress={() => !item.isDefault && checkDelete(item)}
                    activeOpacity={0.9}
                >
                    <View style={[styles.iconContainer, { backgroundColor: iconProps.bg }]}>
                        <Ionicons name={iconProps.name} size={24} color={iconProps.icon} />
                    </View>
                    <View style={styles.info}>
                        <Text style={styles.name}>{item.name}</Text>
                        <Text style={styles.subtitle}>{item.isDefault ? 'Tài khoản chính' : 'Chi tiêu hàng ngày'}</Text>
                    </View>
                    <View style={styles.balanceWrap}>
                        <Text style={styles.balance}>{formatVND(item.balance)}</Text>
                        {item.isDefault && <Text style={styles.amountStar}>**** 8842</Text>}
                    </View>
                </TouchableOpacity>
            </Swipeable>
        );
    };

    const renderHeader = () => {
        const total = wallets.reduce((acc, w) => acc + w.balance, 0);
        return (
            <View style={{ paddingTop: 12 }}>
                <View style={styles.summaryContainer}>
                    <Text style={styles.summaryLabel}>Tổng số dư</Text>
                    <Text style={styles.summaryAmount}>{formatVND(total)}</Text>
                    <View style={styles.trendWrap}>
                        <View style={styles.trendPill}>
                            <Ionicons name="trending-up" size={14} color="#fff" />
                            <Text style={styles.trendText}>+12.5%</Text>
                        </View>
                        <Text style={styles.trendSubText}>so với tháng trước</Text>
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={styles.actionPill}
                        onPress={() => router.push({ pathname: '/add', params: { initialType: 'INCOME' } })}
                    >
                        <Ionicons name="add-circle" size={24} color="#3B82F6" />
                        <Text style={styles.actionPillText}>Thêm thu</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionPill}
                        onPress={() => router.push({ pathname: '/add', params: { initialType: 'EXPENSE' } })}
                    >
                        <Ionicons name="remove-circle" size={24} color="#EF4444" />
                        <Text style={styles.actionPillText}>Thêm chi</Text>
                    </TouchableOpacity>
                </View>

                {/* Accounts Title */}
                <View style={styles.accountsHeader}>
                    <Text style={styles.accountsTitle}>Tài khoản</Text>
                </View>
            </View>
        );
    };

    const renderFooter = () => (
        <TouchableOpacity style={styles.addWalletDashedBtn} onPress={() => router.push('/wallet-form')}>
            <Ionicons name="add" size={22} color="#3B82F6" />
            <Text style={styles.addWalletBtnText}>Thêm ví mới (Add New Wallet)</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.title}>Ví tiền của tôi</Text>
                <TouchableOpacity style={styles.bellBtn} onPress={() => router.push('/notifications')}>
                    <Ionicons name="notifications" size={22} color="#111827" />
                </TouchableOpacity>
            </View>

            <View style={styles.listContainer}>
                <FlatList
                    data={wallets}
                    keyExtractor={w => w.id.toString()}
                    renderItem={renderWallet}
                    ListHeaderComponent={renderHeader}
                    ListFooterComponent={renderFooter}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB', paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8, backgroundColor: '#F9FAFB' },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
    bellBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
    title: { fontSize: 18, fontWeight: '700', color: '#111827' },

    summaryContainer: { backgroundColor: '#4CA1FE', padding: 24, borderRadius: 24, elevation: 4, shadowColor: '#4CA1FE', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, marginBottom: 20 },
    summaryLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginBottom: 8 },
    summaryAmount: { color: '#ffffff', fontSize: 32, fontWeight: '800', marginBottom: 16 },
    trendWrap: { flexDirection: 'row', alignItems: 'center' },
    trendPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    trendText: { color: '#fff', fontSize: 12, fontWeight: '700', marginLeft: 4 },
    trendSubText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginLeft: 10 },

    actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
    actionPill: { flex: 1, flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, paddingVertical: 14, justifyContent: 'center', alignItems: 'center', marginHorizontal: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    actionPillText: { fontSize: 14, fontWeight: '600', color: '#111827', marginLeft: 8 },

    accountsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginHorizontal: 4 },
    accountsTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
    manageText: { fontSize: 15, color: '#3B82F6', fontWeight: '500' },

    listContainer: { flex: 1, paddingHorizontal: 20 },
    swipeableContainer: { marginBottom: 16, borderRadius: 20 },
    card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 20, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
    deleteAction: {
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        height: '100%',
        borderRadius: 20,
        marginLeft: 10,
    },
    iconContainer: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    info: { flex: 1 },
    name: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
    subtitle: { fontSize: 13, color: '#6B7280' },
    balanceWrap: { alignItems: 'flex-end' },
    balance: { fontSize: 16, fontWeight: '800', color: '#111827' },
    amountStar: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },

    addWalletDashedBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 24, paddingVertical: 18, borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#A5B4FC', marginTop: 8, backgroundColor: 'transparent' },
    addWalletBtnText: { fontSize: 15, fontWeight: '600', color: '#3B82F6', marginLeft: 8 }
});
