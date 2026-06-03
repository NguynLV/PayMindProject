import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Platform, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { DebtService, DebtResponse } from '@/services/debt.service';
import { useToast } from '@/components/common/Toast';

const formatVND = (n: number) => {
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(n) + ' đ';
};

const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Không có hạn';
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

export default function DebtScreen() {
    const router = useRouter();
    const toast = useToast();
    const [debts, setDebts] = useState<DebtResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'LENT' | 'BORROWED'>('LENT');
    
    // Đòi nợ khéo modal state
    const [selectedDebtForReminder, setSelectedDebtForReminder] = useState<DebtResponse | null>(null);
    const [showReminderModal, setShowReminderModal] = useState(false);

    const loadDebts = async () => {
        try {
            setLoading(true);
            const data = await DebtService.getMyDebts();
            setDebts(data || []);
        } catch (error) {
            console.error('Failed to load debts:', error);
            toast.error('Lỗi tải dữ liệu', 'Không thể tải danh sách sổ nợ lúc này.');
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadDebts();
        }, [])
    );

    const filteredDebts = debts.filter(d => d.type === activeTab);

    // Get stats
    const totalUnpaid = filteredDebts
        .filter(d => d.status === 'UNPAID')
        .reduce((sum, d) => sum + (d.amount || 0), 0);

    const totalPaid = filteredDebts
        .filter(d => d.status === 'PAID')
        .reduce((sum, d) => sum + (d.amount || 0), 0);

    const handleUpdateStatus = async (id: number, status: 'UNPAID' | 'PAID' | 'DEFAULTED') => {
        try {
            await DebtService.updateDebtStatus(id, status);
            loadDebts();
        } catch (error) {
            toast.error('Cập nhật thất bại', 'Không thể thay đổi trạng thái.');
        }
    };

    const handleDeleteDebt = (id: number) => {
        toast.confirm(
            'Xóa khoản nợ này?',
            'Dữ liệu về khoản vay/nợ này sẽ bị xóa vĩnh viễn và không thể khôi phục.',
            async () => {
                try {
                    await DebtService.deleteDebt(id);
                    loadDebts();
                } catch (error) {
                    toast.error('Xóa thất bại!', 'Không thể xóa khoản vay/nợ.');
                }
            },
            'Xóa',
            'Hủy bỏ'
        );
    };

    const getItemIcon = (itemType: string) => {
        switch (itemType) {
            case 'MILK_TEA': return '🥤';
            case 'COFFEE': return '☕';
            case 'LUNCH': return '🍛';
            case 'CASH': return '💵';
            default: return '📦';
        }
    };

    const getItemName = (itemType: string, customDesc?: string) => {
        if (customDesc) return customDesc;
        switch (itemType) {
            case 'MILK_TEA': return 'Trà sữa';
            case 'COFFEE': return 'Cà phê';
            case 'LUNCH': return 'Ăn trưa';
            case 'CASH': return 'Tiền mặt';
            default: return 'Khác';
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'UNPAID':
                return { text: 'Chưa thanh toán', color: '#EF4444', bg: '#FEF2F2' };
            case 'PAID':
                return { text: 'Đã thanh toán', color: '#10B981', bg: '#F0FDF4' };
            case 'DEFAULTED':
                return { text: 'Khó thu hồi', color: '#6B7280', bg: '#F3F4F6' };
            default:
                return { text: 'Chưa rõ', color: '#F59E0B', bg: '#FFFBEB' };
        }
    };

    const getReminderTemplates = (debt: DebtResponse) => {
        const debtorName = debt.debtorName || 'bạn';
        const amountStr = debt.amount ? formatVND(debt.amount) : '';
        const itemStr = getItemName(debt.itemType, debt.itemDescription);
        const detailStr = amountStr ? `${amountStr} (${itemStr})` : itemStr;

        return [
            `Chào ${debtorName}, bạn xem giúp mình khoản thanh toán ${detailStr} hôm trước nhé. Cảm ơn bạn!`,
            `Gửi ${debtorName}, bạn kiểm tra và sắp xếp hoàn thành giúp mình khoản tiền ${detailStr} này nhé. Cảm ơn bạn nhiều!`,
            `Bạn ơi, khi nào tiện thì chuyển khoản giúp mình khoản ${detailStr} này nhé. Chúc bạn một ngày tốt lành!`,
            `Mình gửi tin nhắn nhắc nhẹ về khoản thanh toán ${detailStr} trước đó nhé. Cảm ơn bạn đã quan tâm!`,
            `Chào bạn, gửi bạn lời nhắc thân thiện về khoản tiền ${detailStr}. Khi nào tiện bạn xem qua giúp mình nha!`
        ];
    };

    const copyToClipboard = async (text: string) => {
        await Clipboard.setStringAsync(text);
        setShowReminderModal(false);
        toast.success('Đã sao chép!', 'Đã sao chép tin nhắn nhắc nợ thành công.');
    };

    const renderDebtCard = ({ item }: { item: DebtResponse }) => {
        const badge = getStatusBadge(item.status);
        const icon = getItemIcon(item.itemType);
        const displayName = getItemName(item.itemType, item.itemDescription);

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.iconContainer}>
                        <Text style={styles.avatarText}>{icon}</Text>
                    </View>
                    <View style={styles.cardInfo}>
                        <Text style={styles.debtorName}>{item.debtorName}</Text>
                        <Text style={styles.debtDetail}>{displayName} • {formatDate(item.dueDate || '')}</Text>
                    </View>
                    <View style={styles.amountContainer}>
                        <Text style={[styles.amountText, item.type === 'BORROWED' && styles.borrowedAmount]}>
                            {item.type === 'LENT' ? '+' : '-'}{formatVND(item.amount || 0)}
                        </Text>
                        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                            <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
                        </View>
                    </View>
                </View>

                {item.note ? (
                    <View style={styles.noteBox}>
                        <Text style={styles.noteText}>📝 {item.note}</Text>
                    </View>
                ) : null}

                <View style={styles.cardActions}>
                    {/* Status actions */}
                    {item.status === 'UNPAID' && (
                        <>
                            <TouchableOpacity 
                                style={[styles.actionButton, styles.successAction]}
                                onPress={() => handleUpdateStatus(item.id, 'PAID')}
                            >
                                <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
                                <Text style={styles.successActionText}>{item.type === 'BORROWED' ? 'Đã trả' : 'Đã nhận'}</Text>
                            </TouchableOpacity>

                            {item.type === 'LENT' && (
                                <TouchableOpacity 
                                    style={[styles.actionButton, styles.reminderAction]}
                                    onPress={() => {
                                        setSelectedDebtForReminder(item);
                                        setShowReminderModal(true);
                                    }}
                                >
                                    <Ionicons name="megaphone-outline" size={16} color="#7C3AED" />
                                    <Text style={styles.reminderActionText}>Nhắc nợ</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity 
                                style={[styles.actionButton, styles.defaultedAction]}
                                onPress={() => handleUpdateStatus(item.id, 'DEFAULTED')}
                            >
                                <Ionicons name="time-outline" size={16} color="#6B7280" />
                                <Text style={styles.defaultedActionText}>Khó thu hồi</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {item.status !== 'UNPAID' && (
                        <TouchableOpacity 
                            style={[styles.actionButton, styles.undoAction]}
                            onPress={() => handleUpdateStatus(item.id, 'UNPAID')}
                        >
                            <Ionicons name="refresh-outline" size={16} color="#3B82F6" />
                            <Text style={styles.undoActionText}>{item.type === 'BORROWED' ? 'Đánh dấu chưa trả' : 'Đánh dấu chưa nhận'}</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity 
                        style={[styles.actionButton, styles.editAction]}
                        onPress={() => router.push({
                            pathname: '/debt/form',
                            params: { id: item.id }
                        })}
                    >
                        <Ionicons name="create-outline" size={16} color="#4B5563" />
                        <Text style={styles.editActionText}>Sửa</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.actionButton, styles.deleteAction]}
                        onPress={() => handleDeleteDebt(item.id)}
                    >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
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
                <Text style={styles.title}>Quản lý Sổ Nợ</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Quick Summary */}
            <View style={styles.summaryContainer}>
                <View style={styles.summaryCard}>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>{activeTab === 'LENT' ? 'Tổng cho vay' : 'Tổng đi vay'}</Text>
                        <Text style={[styles.summaryValue, activeTab === 'LENT' ? styles.summaryLent : styles.summaryBorrowed]}>
                            {formatVND(totalUnpaid)}
                        </Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Đã thanh toán</Text>
                        <Text style={styles.summaryValueSub}>{formatVND(totalPaid)}</Text>
                    </View>
                </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabContainer}>
                <TouchableOpacity 
                    style={[styles.tabButton, activeTab === 'LENT' && styles.activeLentTab]}
                    onPress={() => setActiveTab('LENT')}
                >
                    <Text style={[styles.tabText, activeTab === 'LENT' && styles.activeLentTabText]}>
                        Cho vay
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tabButton, activeTab === 'BORROWED' && styles.activeBorrowedTab]}
                    onPress={() => setActiveTab('BORROWED')}
                >
                    <Text style={[styles.tabText, activeTab === 'BORROWED' && styles.activeBorrowedTabText]}>
                        Đi vay
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Debt List */}
            {loading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#7C3AED" />
                </View>
            ) : (
                <FlatList
                    data={filteredDebts}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderDebtCard}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyIcon}>{activeTab === 'LENT' ? '🏜️' : '🎉'}</Text>
                            <Text style={styles.emptyText}>
                                {activeTab === 'LENT' 
                                    ? 'Không có khoản cho vay nào.' 
                                    : 'Không có khoản đi vay nào.'}
                            </Text>
                        </View>
                    )}
                />
            )}

            {/* FAB */}
            <TouchableOpacity 
                style={styles.fab} 
                onPress={() => router.push({
                    pathname: '/debt/form',
                    params: { type: activeTab }
                })}
            >
                <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>

            {/* Đòi nợ khéo Modal */}
            <Modal
                visible={showReminderModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowReminderModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Mẫu tin nhắn nhắc nợ</Text>
                            <TouchableOpacity onPress={() => setShowReminderModal(false)}>
                                <Ionicons name="close" size={24} color="#4B5563" />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView style={styles.templateList} showsVerticalScrollIndicator={false}>
                            <Text style={styles.modalDesc}>
                                Chọn một mẫu tin nhắn nhắc nợ lịch sự bên dưới để sao chép.
                            </Text>
                            
                            {selectedDebtForReminder && getReminderTemplates(selectedDebtForReminder).map((text, idx) => (
                                <TouchableOpacity 
                                    key={idx}
                                    style={styles.templateItem}
                                    onPress={() => copyToClipboard(text)}
                                >
                                    <Text style={styles.templateText}>{text}</Text>
                                    <View style={styles.copyBadge}>
                                        <Ionicons name="copy-outline" size={14} color="#7C3AED" />
                                        <Text style={styles.copyBadgeText}> Copy</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FB', paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
    title: { fontSize: 18, fontWeight: '800', color: '#111827' },
    
    summaryContainer: { padding: 16 },
    summaryCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 1 },
    summaryItem: { flex: 1, alignItems: 'center' },
    summaryLabel: { fontSize: 11, fontWeight: '600', color: '#6B7280', marginBottom: 6, textAlign: 'center' },
    summaryValue: { fontSize: 18, fontWeight: '800' },
    summaryLent: { color: '#10B981' },
    summaryBorrowed: { color: '#EF4444' },
    summaryValueSub: { fontSize: 16, fontWeight: '700', color: '#4B5563' },
    summaryDivider: { width: 1, height: 40, backgroundColor: '#E5E7EB' },
    
    tabContainer: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
    tabButton: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
    tabText: { fontSize: 12, fontWeight: '700', color: '#4B5563', textAlign: 'center' },
    activeLentTab: { backgroundColor: '#D1FAE5', borderWidth: 1, borderColor: '#10B981' },
    activeLentTabText: { color: '#065F46' },
    activeBorrowedTab: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#EF4444' },
    activeBorrowedTabText: { color: '#991B1B' },
    
    listContent: { paddingHorizontal: 16, paddingBottom: 100 },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1, borderWidth: 1, borderColor: '#F3F4F6' },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    iconContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarText: { fontSize: 22 },
    cardInfo: { flex: 1 },
    debtorName: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
    debtDetail: { fontSize: 12, color: '#6B7280' },
    amountContainer: { alignItems: 'flex-end' },
    amountText: { fontSize: 15, fontWeight: '800', color: '#10B981', marginBottom: 4 },
    borrowedAmount: { color: '#EF4444' },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    badgeText: { fontSize: 10, fontWeight: '700' },
    
    noteBox: { marginTop: 10, padding: 8, backgroundColor: '#F9FAFB', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#7C3AED' },
    noteText: { fontSize: 12, color: '#4B5563', fontStyle: 'italic' },
    
    cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
    actionButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: '#F3F4F6', gap: 4 },
    successAction: { backgroundColor: '#ECFDF5' },
    successActionText: { fontSize: 11, fontWeight: '700', color: '#10B981' },
    reminderAction: { backgroundColor: '#F5F3FF' },
    reminderActionText: { fontSize: 11, fontWeight: '700', color: '#7C3AED' },
    defaultedAction: { backgroundColor: '#F9FAFB' },
    defaultedActionText: { fontSize: 11, fontWeight: '700', color: '#4B5563' },
    undoAction: { backgroundColor: '#EFF6FF' },
    undoActionText: { fontSize: 11, fontWeight: '700', color: '#3B82F6' },
    editAction: { backgroundColor: '#F9FAFB' },
    editActionText: { fontSize: 11, fontWeight: '700', color: '#4B5563' },
    deleteAction: { backgroundColor: '#FEF2F2', paddingHorizontal: 8 },
    
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyText: { fontSize: 13, color: '#6B7280', textAlign: 'center', paddingHorizontal: 24, lineHeight: 18, fontWeight: '500' },
    
    fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#7C3AED', justifyContent: 'center', alignItems: 'center', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
    modalDesc: { fontSize: 13, color: '#6B7280', marginBottom: 16, lineHeight: 18 },
    templateList: { marginBottom: 10 },
    templateItem: { padding: 14, backgroundColor: '#F9FAFB', borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6' },
    templateText: { fontSize: 13, color: '#111827', lineHeight: 18, marginBottom: 8 },
    copyBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', backgroundColor: '#F5F3FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    copyBadgeText: { fontSize: 11, fontWeight: '700', color: '#7C3AED' }
});
