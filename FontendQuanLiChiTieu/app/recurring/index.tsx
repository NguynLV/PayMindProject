import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Platform, ActivityIndicator, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import Constants from 'expo-constants';
import { RecurringService, RecurringTransactionResponse } from '@/services/recurring.service';
import { formatDate } from '@/utils/date';
import { useToast } from '@/components/common/Toast';

const formatVND = (n: number) => {
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(n) + ' đ';
};

export default function RecurringScreen() {
    const router = useRouter();
    const toast = useToast();
    const [recurrings, setRecurrings] = useState<RecurringTransactionResponse[]>([]);
    const [loading, setLoading] = useState(true);

    const loadRecurrings = async () => {
        try {
            setLoading(true);
            const data = await RecurringService.getMyRecurringTransactions();
            setRecurrings(data || []);
        } catch (error) {
            console.error('Failed to load recurrings:', error);
            toast.error('Có lỗi xảy ra', 'Không thể tải danh sách giao dịch định kỳ lúc này.');
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadRecurrings();
        }, [])
    );

    // Calculate total monthly leakage
    const getMonthlyLeakage = () => {
        return recurrings
            .filter(r => r.isActive && r.type === 'EXPENSE')
            .reduce((sum, r) => {
                const amt = r.amount || 0;
                switch (r.cycle) {
                    case 'DAILY':
                        return sum + amt * 30;
                    case 'WEEKLY':
                        return sum + amt * 4;
                    case 'YEARLY':
                        return sum + amt / 12;
                    case 'MONTHLY':
                    default:
                        return sum + amt;
                }
            }, 0);
    };

    const getDueDateReminder = (nextRunDateStr: string | null) => {
        if (!nextRunDateStr) return null;
        const nextRun = new Date(nextRunDateStr);
        const today = new Date();
        
        // Clear time components for clean day diff
        nextRun.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        
        const diffTime = nextRun.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
            return { text: `Quá hạn ${Math.abs(diffDays)} ngày ⚠️`, color: '#EF4444', bg: '#FEF2F2' };
        } else if (diffDays === 0) {
            return { text: 'Đến hạn hôm nay! ⚠️', color: '#EF4444', bg: '#FEF2F2' };
        } else if (diffDays === 1) {
            return { text: 'Đến hạn ngày mai! ⏳', color: '#F59E0B', bg: '#FFFBEB' };
        } else if (diffDays <= 3) {
            return { text: `Còn ${diffDays} ngày ⏳`, color: '#3B82F6', bg: '#EFF6FF' };
        } else {
            return { text: `Còn ${diffDays} ngày`, color: '#6B7280', bg: '#F3F4F6' };
        }
    };

    const handleToggleActive = async (item: RecurringTransactionResponse) => {
        try {
            const updated = {
                walletId: item.wallet?.id,
                categoryId: item.category?.id,
                type: item.type,
                amount: item.amount,
                description: item.description,
                cycle: item.cycle,
                nextRunDate: item.nextRunDate,
                isActive: !item.isActive
            };
            await RecurringService.updateRecurringTransaction(item.id, updated);
            loadRecurrings();
        } catch (error) {
            toast.error('Cập nhật thất bại', 'Không thể thay đổi trạng thái giao dịch.');
        }
    };

    const handleManualTrigger = async (id: number) => {
        toast.confirm(
            'Ghi nhận giao dịch ngay? ⚡',
            'Hệ thống sẽ lập tức tạo 1 giao dịch cho kỳ này. Bạn có muốn tiếp tục?',
            async () => {
                try {
                    setLoading(true);
                    await RecurringService.triggerRecurringTransaction(id);
                    toast.success('Thành công! 🎉', 'Giao dịch định kỳ đã được ghi nhận thành công.');
                    loadRecurrings();
                } catch (error) {
                    setLoading(false);
                    toast.error('Thất bại', 'Không thể thực hiện ghi nhận giao dịch định kỳ.');
                }
            },
            'Thực hiện',
            'Hủy bỏ'
        );
    };

    const handleDelete = (id: number) => {
        toast.confirm(
            'Dừng giao dịch định kỳ? 🛑',
            'Hệ thống sẽ ngừng tự động ghi nhận giao dịch này trong tương lai. Xác nhận dừng?',
            async () => {
                try {
                    await RecurringService.deleteRecurringTransaction(id);
                    loadRecurrings();
                } catch (error) {
                    toast.error('Thất bại', 'Không thể xóa giao dịch định kỳ.');
                }
            },
            'Xác nhận dừng',
            'Quay lại'
        );
    };

    // Style presets for popular subscription brands
    const getBrandPreset = (description: string) => {
        const desc = description.toLowerCase();
        if (desc.includes('netflix')) {
            return { color: '#E50914', bg: '#FEE2E2', icon: 'logo-youtube', label: 'Netflix' };
        }
        if (desc.includes('spotify')) {
            return { color: '#1DB954', bg: '#DCFCE7', icon: 'musical-notes', label: 'Spotify' };
        }
        if (desc.includes('youtube') || desc.includes('premium')) {
            return { color: '#FF0000', bg: '#FEE2E2', icon: 'logo-youtube', label: 'YouTube' };
        }
        if (desc.includes('icloud') || desc.includes('apple')) {
            return { color: '#000000', bg: '#F3F4F6', icon: 'logo-apple', label: 'iCloud / Apple' };
        }
        if (desc.includes('chatgpt') || desc.includes('openai') || desc.includes('gpt')) {
            return { color: '#10A37F', bg: '#D1FAE5', icon: 'flash', label: 'ChatGPT' };
        }
        if (desc.includes('canva')) {
            return { color: '#00C4CC', bg: '#E0F7FA', icon: 'color-palette', label: 'Canva' };
        }
        return { color: '#7C3AED', bg: '#F5F3FF', icon: 'calendar', label: 'Định kỳ' };
    };

    const renderRecurringCard = ({ item }: { item: RecurringTransactionResponse }) => {
        const preset = getBrandPreset(item.description || '');
        const cycleText = item.cycle === 'DAILY' ? 'Hàng ngày' :
                          item.cycle === 'WEEKLY' ? 'Hàng tuần' :
                          item.cycle === 'MONTHLY' ? 'Hàng tháng' : 'Hàng năm';

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={[styles.iconContainer, { backgroundColor: preset.bg }]}>
                        <Ionicons name={preset.icon as any} size={24} color={preset.color} />
                    </View>
                    <View style={styles.cardInfo}>
                        <Text style={styles.descriptionText}>{item.description}</Text>
                        <Text style={styles.detailText}>
                            {cycleText} • Ví: {item.wallet?.name || 'Chính'}
                        </Text>
                        <Text style={styles.categoryText}>
                            🏷️ {item.category?.name || 'Khác'}
                        </Text>
                    </View>
                    <View style={styles.amountContainer}>
                        <Text style={[styles.amountText, item.type === 'EXPENSE' && styles.expenseAmount]}>
                            {item.type === 'INCOME' ? '+' : '-'}{formatVND(item.amount || 0)}
                        </Text>
                        <View style={styles.switchWrapper}>
                            <Switch
                                value={item.isActive}
                                onValueChange={() => handleToggleActive(item)}
                                trackColor={{ false: '#D1D5DB', true: '#C4B5FD' }}
                                thumbColor={item.isActive ? '#7C3AED' : '#F3F4F6'}
                                ios_backgroundColor="#D1D5DB"
                            />
                        </View>
                    </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardFooter}>
                    <View style={{ flexDirection: 'column', gap: 4 }}>
                        <View style={styles.nextRunBox}>
                            <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                            <Text style={styles.nextRunText}>
                                Ngày thanh toán: {formatDate(item.nextRunDate || '')}
                            </Text>
                        </View>
                        {item.isActive && (() => {
                            const reminder = getDueDateReminder(item.nextRunDate);
                            if (!reminder) return null;
                            return (
                                <View style={[styles.reminderBadge, { backgroundColor: reminder.bg }]}>
                                    <Text style={[styles.reminderBadgeText, { color: reminder.color }]}>
                                        {reminder.text}
                                    </Text>
                                </View>
                            );
                        })()}
                    </View>
                    <View style={styles.actionsContainer}>
                        {item.isActive && (
                            <TouchableOpacity 
                                style={[styles.actionBtn, styles.triggerBtn]}
                                onPress={() => handleManualTrigger(item.id)}
                            >
                                <Ionicons name="flash-outline" size={14} color="#7C3AED" />
                                <Text style={styles.triggerBtnText}>Ghi nhận ngay</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity 
                            style={[styles.actionBtn, styles.editBtn]}
                            onPress={() => router.push({
                                pathname: '/recurring/form',
                                params: { id: item.id }
                            })}
                        >
                            <Ionicons name="create-outline" size={14} color="#4B5563" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.actionBtn, styles.deleteBtn]}
                            onPress={() => handleDelete(item.id)}
                        >
                            <Ionicons name="trash-outline" size={14} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.title}>Giao Dịch Định Kỳ 📅</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Cash Leak Summary */}
            <View style={styles.summaryContainer}>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Tổng chi tiêu định kỳ hàng tháng 📅</Text>
                    <Text style={styles.summaryValue}>{formatVND(getMonthlyLeakage())}</Text>
                    <Text style={styles.summarySubtext}>Tổng chi phí từ các dịch vụ đăng ký định kỳ đang hoạt động</Text>
                </View>
            </View>

            {/* List */}
            {loading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#7C3AED" />
                </View>
            ) : (
                <FlatList
                    data={recurrings}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderRecurringCard}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyIcon}>🛡️✨</Text>
                            <Text style={styles.emptyText}>
                                Không có giao dịch định kỳ nào được thiết lập.
                            </Text>
                        </View>
                    )}
                />
            )}

            {/* FAB */}
            <TouchableOpacity 
                style={styles.fab} 
                onPress={() => router.push('/recurring/form')}
            >
                <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FB', paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
    title: { fontSize: 18, fontWeight: '800', color: '#111827' },

    summaryContainer: { padding: 16 },
    summaryCard: { backgroundColor: '#1E1B4B', borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 3 },
    summaryLabel: { fontSize: 13, fontWeight: '700', color: '#C7D2FE', marginBottom: 8 },
    summaryValue: { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 8 },
    summarySubtext: { fontSize: 11, color: '#9CA3AF', textAlign: 'center' },

    listContent: { paddingHorizontal: 16, paddingBottom: 100 },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1, borderWidth: 1, borderColor: '#F3F4F6' },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    iconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    cardInfo: { flex: 1 },
    descriptionText: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
    detailText: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
    categoryText: { fontSize: 11, color: '#7C3AED', fontWeight: '600' },
    amountContainer: { alignItems: 'flex-end', justifyContent: 'center' },
    amountText: { fontSize: 15, fontWeight: '800', color: '#10B981', marginBottom: 6 },
    expenseAmount: { color: '#EF4444' },
    switchWrapper: { transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] },

    cardDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },

    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    nextRunBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    nextRunText: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
    actionsContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    actionBtn: { padding: 6, borderRadius: 8, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
    triggerBtn: { flexDirection: 'row', backgroundColor: '#F5F3FF', paddingHorizontal: 10, gap: 4 },
    triggerBtnText: { fontSize: 11, fontWeight: '700', color: '#7C3AED' },
    editBtn: { backgroundColor: '#F9FAFB' },
    deleteBtn: { backgroundColor: '#FEF2F2' },

    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyText: { fontSize: 13, color: '#6B7280', textAlign: 'center', paddingHorizontal: 24, lineHeight: 18, fontWeight: '500' },

    fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#7C3AED', justifyContent: 'center', alignItems: 'center', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    reminderBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginTop: 2 },
    reminderBadgeText: { fontSize: 10, fontWeight: '700' }
});
