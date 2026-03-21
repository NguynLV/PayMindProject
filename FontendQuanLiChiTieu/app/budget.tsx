import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Alert, Platform, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { BudgetService, BudgetResponse } from '../src/services/budget.service';
import { CategoryService, CategoryResponse } from '../src/services/category.service';
import { AiService, BudgetSuggestion } from '../src/services/ai.service';
import { Modal, ActivityIndicator, ScrollView } from 'react-native';

const formatVND = (n: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(n) + ' VNĐ';

export default function BudgetScreen() {
    const router = useRouter();
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
            Alert.alert('Lỗi', 'Không thể tải danh sách ngân sách');
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
            const res = await AiService.suggestBudgets();
            if (res.suggestions) {
                setSuggestions(res.suggestions);
                setShowAiModal(true);
            }
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể lấy gợi ý từ AI');
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
        if (percent < 50) return '#10B981'; // Green
        if (percent < 80) return '#F59E0B'; // Yellow
        if (percent < 100) return '#EF4444'; // Red
        return '#B91C1C'; // Dark Red (Exceeded)
    };

    const confirmDelete = (budget: BudgetResponse) => {
        Alert.alert('Xóa ngân sách', `Bạn có chắc chắn muốn xóa ngân sách "${budget.name}" không?`, [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Xóa',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await BudgetService.deleteBudget(budget.id);
                        loadBudgets();
                    } catch (e: any) {
                        Alert.alert('Lỗi', e.response?.data?.message || 'Không thể xóa');
                    }
                }
            }
        ]);
    };

    const renderRightActions = (dragX: Animated.AnimatedInterpolation<number>, budget: BudgetResponse) => {
        const trans = dragX.interpolate({
            inputRange: [-80, 0],
            outputRange: [1, 0],
            extrapolate: 'clamp',
        });
        return (
            <TouchableOpacity style={styles.deleteAction} onPress={() => confirmDelete(budget)}>
                <Animated.View style={[styles.deleteTextContainer, { transform: [{ scale: trans }] }]}>
                    <Ionicons name="trash-outline" size={24} color="#fff" />
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
                            <Ionicons name="pie-chart" size={24} color="#8B5CF6" />
                        </View>
                        <View style={styles.info}>
                            <Text style={styles.name}>{item.name}</Text>
                            <Text style={styles.category}>
                                {item.categoryName} • {
                                    item.period?.toLowerCase() === 'daily' ? 'Ngày' :
                                        item.period?.toLowerCase() === 'weekly' ? 'Tuần' : 'Tháng'
                                } {item.periodValue}/{item.year}
                            </Text>
                        </View>
                        <View style={styles.actions}>
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
                            >
                                <Ionicons name="pencil" size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.progressSection}>
                        <View style={styles.progressLabels}>
                            <Text style={styles.spentText}>Đã chi: {formatVND(spent)}</Text>
                            <Text style={styles.totalText}>{formatVND(total)}</Text>
                        </View>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${percent}%`, backgroundColor: progressColor }]} />
                        </View>
                        <View style={styles.progressFooter}>
                            <Text style={[styles.percentText, { color: progressColor }]}>
                                {percent.toFixed(1)}%
                            </Text>
                            <Text style={styles.remainingText}>
                                Còn lại: {formatVND(Math.max(total - spent, 0))}
                            </Text>
                        </View>
                    </View>
                </View>
            </Swipeable>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.title}>Quản lý ngân sách</Text>
                <TouchableOpacity onPress={handleAIsuggest} style={styles.aiBtn} disabled={isSuggesting}>
                    {isSuggesting ? (
                        <ActivityIndicator size="small" color="#8B5CF6" />
                    ) : (
                        <Ionicons name="flash" size={22} color="#8B5CF6" />
                    )}
                </TouchableOpacity>
            </View>

            <FlatList
                data={budgets}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderBudget}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="pie-chart-outline" size={64} color="#D1D5DB" />
                        <Text style={styles.emptyText}>Chưa có ngân sách nào</Text>
                        <Text style={styles.emptySubText}>Tạo ngân sách để quản lý chi tiêu tốt hơn</Text>
                    </View>
                )}
            />

            <View style={styles.fabWrapper}>
                <TouchableOpacity style={styles.fab} onPress={() => router.push('/budget-form')}>
                    <Ionicons name="add" size={32} color="#fff" />
                </TouchableOpacity>
            </View>

            <Modal
                visible={showAiModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowAiModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>AI Gợi ý Ngân sách</Text>
                            <TouchableOpacity onPress={() => setShowAiModal(false)}>
                                <Ionicons name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.modalSubTitle}>
                                Dựa trên lịch sử chi tiêu 3 tháng qua, AI đề xuất bạn thiết lập các hạn mức sau:
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
    container: { flex: 1, backgroundColor: '#F3F4F6', paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16, backgroundColor: '#fff' },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
    aiBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F3FF', borderRadius: 20 },
    title: { fontSize: 18, fontWeight: '700', color: '#111827' },

    listContainer: { padding: 16, paddingBottom: 100 },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    iconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3F0FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    info: { flex: 1 },
    name: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
    category: { fontSize: 13, color: '#6B7280' },
    actions: { flexDirection: 'row', gap: 8 },
    actionBtn: { padding: 8 },

    progressSection: {},
    progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    spentText: { fontSize: 14, fontWeight: '600', color: '#374151' },
    totalText: { fontSize: 14, color: '#6B7280' },

    progressBarBg: { height: 10, backgroundColor: '#F3F4F6', borderRadius: 5, overflow: 'hidden', marginBottom: 8 },
    progressBarFill: { height: '100%', borderRadius: 5 },

    progressFooter: { flexDirection: 'row', justifyContent: 'space-between' },
    percentText: { fontSize: 13, fontWeight: '700' },
    remainingText: { fontSize: 13, color: '#6B7280' },

    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    emptyText: { fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 16, marginBottom: 8 },
    emptySubText: { fontSize: 14, color: '#6B7280', textAlign: 'center' },

    fabWrapper: { position: 'absolute', bottom: 30, right: 20 },
    fab: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#8B5CF6', justifyContent: 'center', alignItems: 'center', shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },

    swipeableContainer: { marginBottom: 16, borderRadius: 16 },
    deleteAction: { backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', width: 80, borderRadius: 16, marginBottom: 16, marginLeft: 10 },
    deleteTextContainer: { justifyContent: 'center', alignItems: 'center' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
    modalSubTitle: { fontSize: 14, color: '#6B7280', marginBottom: 20, lineHeight: 20 },
    suggestionCard: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#8B5CF6', flexDirection: 'row', alignItems: 'center' },
    suggestionInfo: { flex: 1, marginRight: 12 },
    suggestionCat: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
    suggestionAmount: { fontSize: 18, fontWeight: '700', color: '#8B5CF6', marginBottom: 8 },
    suggestionReason: { fontSize: 13, color: '#4B5563', fontStyle: 'italic' },
    applyBtn: { backgroundColor: '#8B5CF6', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12 },
    applyBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
