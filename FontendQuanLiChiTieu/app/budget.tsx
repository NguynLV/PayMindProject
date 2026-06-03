import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Platform, Animated, StatusBar } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { BudgetService, BudgetResponse } from '../src/services/budget.service';
import { AiService, BudgetSuggestion } from '../src/services/ai.service';
import UserService from '../src/services/user.service';
import { Modal, ActivityIndicator, ScrollView } from 'react-native';
import { useToast } from '../src/components/common/Toast';

const formatVND = (n: number) => {
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(n) + ' ₫';
};

export default function BudgetScreen() {
    const router = useRouter();
    const toast = useToast();
    const [budgets, setBudgets] = useState<BudgetResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [suggestions, setSuggestions] = useState<BudgetSuggestion[]>([]);
    const [showAiModal, setShowAiModal] = useState(false);

    const loadBudgets = async () => {
        try {
            setLoading(true);
            const data = await BudgetService.getMyBudgets();
            setBudgets(data);
        } catch (error) {
            toast.error('Có lỗi xảy ra! ❌', 'Không thể tải danh sách ngân sách');
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadBudgets();
        }, [])
    );

    const handleAIsuggest = async () => {
        try {
            setIsSuggesting(true);
            const u = await UserService.getMyProfile();
            if (!u.isPremium) {
                toast.error('Yêu cầu tài khoản Premium', 'Vui lòng nâng cấp Premium để sử dụng tính năng đề xuất AI.');
                setTimeout(() => {
                    router.push('/premium');
                }, 1500);
                return;
            }
            
            const res = await AiService.suggestBudgets();
            if (res.suggestions) {
                setSuggestions(res.suggestions);
                setShowAiModal(true);
            }
        } catch (error) {
            toast.error('Có lỗi xảy ra! 🥲', 'Không thể lấy gợi ý từ AI lúc này');
        } finally {
            setIsSuggesting(false);
        }
    };

    const applySuggestion = (suggestion: BudgetSuggestion) => {
        setShowAiModal(false);
        router.push({
            pathname: '/budget-form',
            params: {
                name: `Ngân sách ${suggestion.categoryName}`,
                amount: suggestion.suggestedAmount.toString(),
                categoryId: suggestion.categoryId.toString(),
                period: 'MONTHLY'
            }
        });
    };

    const getProgressColor = (percent: number) => {
        if (percent < 50) return '#10B981'; // Emerald Green
        if (percent < 80) return '#F59E0B'; // Amber Orange
        if (percent < 100) return '#EF4444'; // Red
        return '#EF4444'; // Solid Red (Exceeded)
    };

    const confirmDelete = (budget: BudgetResponse) => {
        toast.confirm(
            'Xác nhận xóa',
            `Bạn có chắc chắn muốn xóa ngân sách "${budget.name}" không? Hành động này không thể hoàn tác.`,
            async () => {
                try {
                    await BudgetService.deleteBudget(budget.id);
                    loadBudgets();
                } catch (e: any) {
                    toast.error('Có lỗi xảy ra! ❌', e.response?.data?.message || 'Không thể xóa ngân sách này');
                }
            },
            'Xóa luôn!',
            'Thôi bỏ qua'
        );
    };

    const renderRightActions = (dragX: Animated.AnimatedInterpolation<number>, budget: BudgetResponse) => {
        const trans = dragX.interpolate({
            inputRange: [-80, 0],
            outputRange: [1, 0],
            extrapolate: 'clamp',
        });
        return (
            <TouchableOpacity style={styles.deleteAction} onPress={() => confirmDelete(budget)} activeOpacity={0.9}>
                <Animated.View style={[styles.deleteTextContainer, { transform: [{ scale: trans }] }]}>
                    <Ionicons name="trash-outline" size={22} color="#FFF" />
                </Animated.View>
            </TouchableOpacity>
        );
    };

    const renderBudget = ({ item }: { item: BudgetResponse }) => {
        const spent = item.spentAmount || 0;
        const total = item.amount;
        const percent = Math.min((spent / total) * 100, 100);
        const progressColor = getProgressColor(percent);

        return (
            <Swipeable
                renderRightActions={(_, dragX) => renderRightActions(dragX, item)}
                containerStyle={styles.swipeableContainer}
            >
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="pie-chart" size={20} color="#6366F1" />
                        </View>
                        <View style={styles.info}>
                            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                            <Text style={styles.category} numberOfLines={1}>
                                {item.categoryName} • {
                                    item.period?.toLowerCase() === 'daily' ? 'Ngày' :
                                        item.period?.toLowerCase() === 'weekly' ? 'Tuần' : 'Tháng'
                                } {item.periodValue}/{item.year}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => router.push({
                                pathname: '/budget-form',
                                params: {
                                    id: item.id,
                                    name: item.name,
                                    amount: item.amount.toString(),
                                    categoryId: item.categoryId?.toString(),
                                    period: item.period,
                                    periodValue: item.periodValue?.toString(),
                                    year: item.year?.toString()
                                }
                            })}
                            activeOpacity={0.6}
                        >
                            <Ionicons name="create-outline" size={20} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.progressSection}>
                        <View style={styles.progressLabels}>
                            <View>
                                <Text style={styles.spentLabel}>Đã chi tiêu</Text>
                                <Text style={styles.spentText}>{formatVND(spent)}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.totalLabel}>Hạn mức</Text>
                                <Text style={styles.totalText}>{formatVND(total)}</Text>
                            </View>
                        </View>
                        
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${percent}%`, backgroundColor: progressColor }]} />
                        </View>

                        <View style={styles.progressFooter}>
                            <View style={[styles.badge, { backgroundColor: progressColor + '10' }]}>
                                <Text style={[styles.percentText, { color: progressColor }]}>
                                    {percent.toFixed(1)}%
                                </Text>
                            </View>
                            <Text style={styles.remainingText}>
                                {total - spent >= 0 
                                    ? `Còn lại: ${formatVND(total - spent)}` 
                                    : `Vượt hạn mức: ${formatVND(spent - total)}`
                                }
                            </Text>
                        </View>
                    </View>
                </View>
            </Swipeable>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.title}>Hạn Mức Chi Tiêu</Text>
                <TouchableOpacity onPress={handleAIsuggest} style={styles.aiBtn} disabled={isSuggesting} activeOpacity={0.7}>
                    {isSuggesting ? (
                        <ActivityIndicator size="small" color="#6366F1" />
                    ) : (
                        <Ionicons name="sparkles" size={18} color="#6366F1" />
                    )}
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366F1" />
                </View>
            ) : (
                <FlatList
                    data={budgets}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderBudget}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconContainer}>
                                <Ionicons name="pie-chart-outline" size={48} color="#9CA3AF" />
                            </View>
                            <Text style={styles.emptyText}>Chưa lập ngân sách nào</Text>
                            <Text style={styles.emptySubText}>Tạo hạn mức chi tiêu giúp bạn kiểm soát dòng tiền tốt hơn, tránh chi tiêu hoang phí.</Text>
                            <TouchableOpacity style={styles.emptyCreateBtn} onPress={() => router.push('/budget-form')} activeOpacity={0.8}>
                                <Text style={styles.emptyCreateText}>Lập ngân sách ngay</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                />
            )}

            <TouchableOpacity style={styles.fab} onPress={() => router.push('/budget-form')} activeOpacity={0.95}>
                <Ionicons name="add" size={26} color="#FFFFFF" />
            </TouchableOpacity>

            <Modal
                visible={showAiModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowAiModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHandle} />
                        <View style={styles.modalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View style={styles.aiIconBadge}>
                                    <Ionicons name="sparkles" size={16} color="#6366F1" />
                                </View>
                                <Text style={styles.modalTitle}>AI Gợi ý Ngân sách</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowAiModal(false)} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
                            <Text style={styles.modalSubTitle}>
                                Dựa trên lịch sử chi tiêu 3 tháng gần nhất của bạn, AI đề xuất bạn thiết lập các hạn mức chi tiêu sau để tối ưu hóa tài chính cá nhân:
                            </Text>
                            {suggestions.map((item, index) => (
                                <View key={index} style={styles.suggestionCard}>
                                    <View style={styles.suggestionInfo}>
                                        <Text style={styles.suggestionCat}>{item.categoryName}</Text>
                                        <Text style={styles.suggestionAmount}>{formatVND(item.suggestedAmount)}</Text>
                                        <Text style={styles.suggestionReason}>{item.reason}</Text>
                                    </View>
                                    <TouchableOpacity 
                                        style={styles.applyBtn}
                                        onPress={() => applySuggestion(item)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.applyBtnText}>Áp dụng</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC', paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
    aiBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EEF2FF', borderRadius: 18 },
    title: { fontSize: 18, fontWeight: '700', color: '#1F2937' },

    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContainer: { padding: 16, paddingBottom: 100 },
    
    swipeableContainer: { marginBottom: 12, borderRadius: 16 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F1F5F9' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    iconContainer: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    info: { flex: 1 },
    name: { fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 2 },
    category: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
    actionBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', borderRadius: 8, backgroundColor: '#F8FAFC' },

    progressSection: {},
    progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    spentLabel: { fontSize: 11, color: '#6B7280', fontWeight: '500', marginBottom: 2 },
    spentText: { fontSize: 15, fontWeight: '700', color: '#1F2937', fontVariant: ['tabular-nums'] },
    totalLabel: { fontSize: 11, color: '#6B7280', fontWeight: '500', marginBottom: 2, textAlign: 'right' },
    totalText: { fontSize: 14, fontWeight: '600', color: '#4B5563', fontVariant: ['tabular-nums'], textAlign: 'right' },

    progressBarBg: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden', marginBottom: 12 },
    progressBarFill: { height: '100%', borderRadius: 4 },

    progressFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    percentText: { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
    remainingText: { fontSize: 12, fontWeight: '600', color: '#6B7280', fontVariant: ['tabular-nums'] },

    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 20 },
    emptyIconContainer: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    emptyText: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
    emptySubText: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 18, marginBottom: 24 },
    emptyCreateBtn: { backgroundColor: '#6366F1', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
    emptyCreateText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

    fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
    deleteAction: { backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', width: 72, borderRadius: 16, marginBottom: 12, marginLeft: 8 },
    deleteTextContainer: { justifyContent: 'center', alignItems: 'center' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 30, maxHeight: '80%', borderWidth: 1, borderColor: '#F1F5F9' },
    modalHandle: { width: 36, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginTop: 8, marginBottom: 16 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    aiIconBadge: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
    modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
    modalScroll: { paddingBottom: 20 },
    modalSubTitle: { fontSize: 13, color: '#6B7280', marginBottom: 20, lineHeight: 18, fontWeight: '500' },
    suggestionCard: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9', flexDirection: 'row', alignItems: 'center' },
    suggestionInfo: { flex: 1, marginRight: 12 },
    suggestionCat: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
    suggestionAmount: { fontSize: 16, fontWeight: '700', color: '#6366F1', marginBottom: 6, fontVariant: ['tabular-nums'] },
    suggestionReason: { fontSize: 12, color: '#4B5563', lineHeight: 16, fontWeight: '500' },
    applyBtn: { backgroundColor: '#6366F1', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
    applyBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
});
