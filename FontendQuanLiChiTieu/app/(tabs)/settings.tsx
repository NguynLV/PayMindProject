import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, Alert, ScrollView, Switch, Platform } from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter, useFocusEffect } from 'expo-router';
import UserService, { UserProfile } from '../../src/services/user.service';
import api, { removeToken, getToken } from '../../src/services/api';
import { WalletService, WalletResponse } from '../../src/services/wallet.service';
import { TransactionService, TransactionResponse } from '../../src/services/transaction.service';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Buffer } from 'buffer';

const formatVND = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

function Avatar({ firstName, lastName, avatarUrl, onEdit }: { firstName: string; lastName: string; avatarUrl?: string; onEdit: () => void }) {
    const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
    return (
        <TouchableOpacity style={styles.avatarContainer} onPress={onEdit} activeOpacity={0.9}>
            {avatarUrl
                ? <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
                : <View style={[styles.avatarImg, { backgroundColor: '#E0CCBC', justifyContent: 'center', alignItems: 'center' }]}>
                    {initials ? <Text style={styles.avatarText}>{initials}</Text> : <Ionicons name="person" size={50} color="#fff" />}
                </View>
            }
            <View style={styles.editAvatarBtn}>
                <MaterialCommunityIcons name="pencil" size={10} color="#fff" />
            </View>
        </TouchableOpacity>
    );
}

export default function ProfileScreen() {
    const router = useRouter();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [wallets, setWallets] = useState<WalletResponse[]>([]);
    const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
    const [budgetAlerts, setBudgetAlerts] = useState(true);

    useFocusEffect(
        useCallback(() => {
            getToken().then(token => {
                if (!token) return;

                Promise.all([
                    UserService.getMyProfile(),
                    WalletService.getMyWallets(),
                    TransactionService.getMyTransactions(),
                ]).then(([u, w, t]) => {
                    setUser(u);
                    setWallets(w);
                    setTransactions(t);
                }).catch(console.warn);
            });
        }, [])
    );

    const handleLogout = () => {
        Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất không?', [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Đăng xuất', style: 'destructive',
                onPress: async () => { await removeToken(); router.replace('/auth/login'); },
            },
        ]);
    };

    const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
    const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
    const mockBudget = 5000000; // Fake budget for UI
    const budgetRemaining = Math.max(0, mockBudget - totalExpense);

    const handleExportExcel = async () => {
        try {
            const token = await getToken();
            if (!token) {
                Alert.alert("Lỗi", "Vui lòng đăng nhập lại");
                return;
            }

            // Using our existing axios instance 'api' for reliability
            const response = await api.get('/transactions/export', {
                responseType: 'arraybuffer',
                headers: {
                    'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                }
            });

            if (response.status !== 200) {
                throw new Error("Download failed");
            }

            // Convert arraybuffer to base64
            const base64 = Buffer.from(response.data, 'binary').toString('base64');

            // @ts-ignore
            const fileUri = (FileSystem.cacheDirectory || FileSystem.documentDirectory) + `TatCaGiaoDich_${new Date().getTime()}.xlsx`;

            // Save file
            await FileSystem.writeAsStringAsync(fileUri, base64, {
                // @ts-ignore
                encoding: 'base64'
            });

            // Share file
            await Sharing.shareAsync(fileUri, {
                mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                dialogTitle: 'Xuất dữ liệu giao dịch',
                UTI: 'com.microsoft.excel.xlsx'
            });

        } catch (error) {
            console.warn("Export error:", error);
            Alert.alert("Lỗi", "Không thể xuất file Excel lúc này. Vui lòng thử lại sau.");
        }
    };


    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.topWhiteBg}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtnWrapper}>
                        <Ionicons name="arrow-back" size={24} color="#111827" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Hồ sơ</Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* Profile Info */}
                <View style={styles.profileSection}>
                    <Avatar
                        firstName={user?.firstName ?? ''}
                        lastName={user?.lastName ?? ''}
                        avatarUrl={user?.avatarUrl}
                        onEdit={() => router.push({ pathname: '/edit-profile', params: { user: JSON.stringify(user) } })}
                    />
                    <Text style={styles.userName}>{user?.firstName} {user?.lastName}</Text>
                    <Text style={styles.userEmail}>{user?.email}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Financial Overview */}
                <Text style={styles.sectionTitle}>Tổng quan tài chính</Text>
                <View style={styles.cardsRow}>
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View style={[styles.cardIconBox, { backgroundColor: '#D1FAE5' }]}>
                                <FontAwesome5 name="piggy-bank" size={14} color="#059669" />
                            </View>
                            <Text style={styles.cardLabel}>TIẾT KIỆM</Text>
                        </View>
                        <Text style={styles.cardAmount} numberOfLines={1} adjustsFontSizeToFit>{formatVND(totalBalance)}đ</Text>
                        <View style={styles.cardFooter}>
                            <Ionicons name="trending-up" size={14} color="#10B981" />
                            <Text style={styles.cardFooterTextPositive}>+12% <Text style={styles.cardFooterTextSub}>so với{'\n'}tháng trước</Text></Text>
                        </View>
                    </View>

                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View style={[styles.cardIconBox, { backgroundColor: '#DBEAFE' }]}>
                                <Ionicons name="wallet" size={14} color="#2563EB" />
                            </View>
                            <Text style={styles.cardLabel}>NGÂN SÁCH</Text>
                        </View>
                        <Text style={styles.cardAmount} numberOfLines={1} adjustsFontSizeToFit>{formatVND(budgetRemaining)}đ</Text>
                        <Text style={styles.cardSubText}>{formatVND(totalExpense)}đ / {formatVND(mockBudget)}đ</Text>
                        <View style={styles.progressBarBg}>
                            <View style={[
                                styles.progressBarFill,
                                {
                                    width: `${Math.min(100, (totalExpense / mockBudget) * 100)}%`,
                                    backgroundColor: (totalExpense / mockBudget) > 0.9 ? '#EF4444' : (totalExpense / mockBudget) > 0.7 ? '#F59E0B' : '#10B981'
                                }
                            ]} />
                        </View>
                    </View>
                </View>

                {/* Settings Menu */}
                <Text style={styles.sectionTitle}>Cài đặt</Text>
                <View style={styles.menuGroup}>
                    <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile')}>
                        <Ionicons name="person" size={20} color="#6B7280" />
                        <Text style={styles.menuItemText}>Thông tin tài khoản</Text>
                        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                    <View style={styles.divider} />

                    <View style={styles.menuItem}>
                        <Ionicons name="notifications" size={20} color="#6B7280" />
                        <Text style={styles.menuItemText}>Thông báo ngân sách</Text>
                        <Switch
                            value={budgetAlerts}
                            onValueChange={setBudgetAlerts}
                            trackColor={{ false: '#E5E7EB', true: '#10B981' }}
                            thumbColor="#fff"
                        />
                    </View>
                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.menuItem} onPress={handleExportExcel}>
                        <Ionicons name="download" size={20} color="#6B7280" />
                        <Text style={styles.menuItemText}>Xuất dữ liệu</Text>
                        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                </View>

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <MaterialCommunityIcons name="logout" size={20} color="#EF4444" />
                    <Text style={styles.logoutBtnText}>Đăng xuất</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F5F7', paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0 },

    topWhiteBg: { backgroundColor: '#fff', paddingBottom: 24 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
    backBtnWrapper: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },

    scrollContent: { paddingHorizontal: 20, paddingTop: 20 },

    profileSection: { alignItems: 'center' },
    avatarContainer: { position: 'relative', marginBottom: 16 },
    avatarImg: { width: 104, height: 104, borderRadius: 52, borderWidth: 4, borderColor: '#DCFCE7' },
    avatarText: { fontSize: 36, fontWeight: '700', color: '#6B7280' },
    editAvatarBtn: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        backgroundColor: '#10B981',
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    userName: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4 },
    userEmail: { fontSize: 14, color: '#6B7280' },

    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 },

    cardsRow: { flexDirection: 'row', gap: 14, marginBottom: 28 },
    card: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    cardIconBox: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    cardLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280', letterSpacing: 0.5 },
    cardAmount: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 4 },

    cardFooter: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 4 },
    cardFooterTextPositive: { fontSize: 12, fontWeight: '700', color: '#10B981', lineHeight: 14 },
    cardFooterTextSub: { color: '#9CA3AF', fontWeight: '500', fontSize: 11 },

    cardSubText: { fontSize: 13, color: '#6B7280', marginBottom: 12 },
    progressBarBg: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: '#10B981', borderRadius: 3 },

    menuGroup: { backgroundColor: '#fff', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 20, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
    menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 16 },
    menuItemText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#111827' },
    menuRightInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    menuValue: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
    divider: { height: 1, backgroundColor: '#F3F4F6' },

    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FFF0F0', paddingVertical: 16, borderRadius: 16 },
    logoutBtnText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
});
