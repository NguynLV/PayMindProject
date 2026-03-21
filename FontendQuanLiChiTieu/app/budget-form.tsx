import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
    TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, useWindowDimensions
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { BudgetService } from '@/services/budget.service';
import { CategoryService, CategoryResponse } from '@/services/category.service';
import { formatDate } from '@/utils/date';
import { CustomDatePicker } from '@/components/common/CustomDatePicker';

const formatNumber = (n: string) => {
    const num = n.replace(/[^0-9]/g, '');
    if (!num) return '';
    return new Intl.NumberFormat('vi-VN').format(Number(num));
};

export default function BudgetFormScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const isEdit = !!params.id;

    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
    const [period, setPeriod] = useState<'Monthly' | 'Weekly' | 'Daily'>('Monthly');
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const { width: windowWidth } = useWindowDimensions();
    const [currentCategoryPage, setCurrentCategoryPage] = useState(0);

    useFocusEffect(
        React.useCallback(() => {
            if (isEdit) {
                setName(params.name?.toString() || '');
                setAmount(params.amount?.toString() || '');
                setCategoryId(params.categoryId ? Number(params.categoryId) : undefined);

                const rawPeriod = (params.period as string)?.toLowerCase();
                let p: 'Monthly' | 'Weekly' | 'Daily' = 'Monthly';
                if (rawPeriod === 'weekly') p = 'Weekly';
                else if (rawPeriod === 'daily') p = 'Daily';

                setPeriod(p);

                if (p === 'Daily' && params.periodValue && params.year) {
                    const d = new Date();
                    d.setFullYear(Number(params.year));
                    d.setDate(Number(params.periodValue));
                    setDate(d);
                }
            } else if (params.name || params.amount || params.categoryId) {
                // Pre-fill from AI suggestion or other sources
                setName(params.name?.toString() || '');
                setAmount(params.amount?.toString() || '');
                setCategoryId(params.categoryId ? Number(params.categoryId) : undefined);
                
                const rawPeriod = (params.period as string)?.toLowerCase();
                if (rawPeriod === 'weekly') setPeriod('Weekly');
                else if (rawPeriod === 'daily') setPeriod('Daily');
                else setPeriod('Monthly');
                
                setDate(new Date());
            } else {
                // Truly new budget from FAB
                setName('');
                setAmount('');
                setCategoryId(undefined);
                setPeriod('Monthly');
                setDate(new Date());
            }
        }, [params.id, params.name, params.amount, params.categoryId, params.period, params.periodValue, params.year])
    );

    const [categories, setCategories] = useState<CategoryResponse[]>([]);
    const [loading, setLoading] = useState(false);

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Smart suggestions (sorted low → high)
    const smartSuggestions = [
        { label: 'Mức thấp', amount: 800_000, badge: 'Tiết kiệm nhất', badgeIcon: 'leaf' as const, badgeColor: '#10B981', bg: '#F0FDF4' },
        { label: 'Dựa trên tháng trước', amount: 1_500_000, badge: 'Tiết kiệm 10%', badgeIcon: 'trending-down' as const, badgeColor: '#10B981', bg: '#EEF2FF' },
        { label: 'Mức trung bình', amount: 2_000_000, badge: 'Phổ biến nhất', badgeIcon: 'information-circle' as const, badgeColor: '#3B82F6', bg: '#fff' },
        { label: 'Mức cao', amount: 3_000_000, badge: 'Mức thoải mái', badgeIcon: 'star' as const, badgeColor: '#F59E0B', bg: '#FFFBEB' },
    ];

    useFocusEffect(
        useCallback(() => {
            loadCategories();
        }, [])
    );

    const loadCategories = async () => {
        try {
            const expenseCats = await CategoryService.getMyCategories('EXPENSE');
            setCategories(expenseCats);
        } catch (error) {
            console.warn('Failed to load categories', error);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập tên ngân sách');
            return;
        }

        const numericAmount = Number(amount.replace(/[^0-9]/g, ''));
        if (isNaN(numericAmount) || numericAmount <= 0) {
            Alert.alert('Lỗi', 'Số tiền không hợp lệ');
            return;
        }

        // Validate date if Daily
        if (period === 'Daily') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const selectedDate = new Date(date);
            selectedDate.setHours(0, 0, 0, 0);

            if (selectedDate < today) {
                Alert.alert('Lỗi', 'Không được chọn ngày trong quá khứ');
                return;
            }
        }

        try {
            setLoading(true);
            const request = {
                name: name.trim(),
                amount: numericAmount,
                categoryId,
                period,
                periodValue: period === 'Monthly' ? currentMonth : (period === 'Daily' ? date.getDate() : 1),
                month: period === 'Daily' ? date.getMonth() + 1 : currentMonth,
                year: period === 'Daily' ? date.getFullYear() : currentYear
            };

            if (isEdit) {
                await BudgetService.updateBudget(Number(params.id), request);
            } else {
                await BudgetService.createBudget(request);
            }
            router.back();
        } catch (error: any) {
            Alert.alert('Lỗi', error.response?.data?.message || `Không thể ${isEdit ? 'cập nhật' : 'tạo'} ngân sách`);
        } finally {
            setLoading(false);
        }
    };

    const renderCategoryIcon = (cat: CategoryResponse) => {
        const isSelected = categoryId === cat.id;
        const iconName = (cat.icon || 'grid-outline') as any;
        // Use category color as background, or fallback grey
        const bgColor = cat.color || '#E5E7EB';
        const iconColor = '#fff';
        return (
            <TouchableOpacity
                key={cat.id}
                style={styles.catItem}
                onPress={() => setCategoryId(isSelected ? undefined : cat.id)}
                activeOpacity={0.8}
            >
                <View style={[
                    styles.catCircle,
                    { backgroundColor: isSelected ? cat.color + '40' : (cat.color || '#E5E7EB') + '15' },
                    isSelected && { borderColor: cat.color, borderWidth: 2.5 }
                ]}>
                    <Ionicons
                        name={iconName}
                        size={26}
                        color={isSelected ? cat.color : cat.color || '#6B7280'}
                    />
                    {isSelected && (
                        <View style={[styles.checkBadge, { backgroundColor: cat.color }]}>
                            <Ionicons name="checkmark" size={12} color="#fff" />
                        </View>
                    )}
                </View>
                <Text style={[styles.catLabel, isSelected && { color: '#7C3AED', fontWeight: '700' }]}>
                    {cat.name}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.title}>{isEdit ? 'Sửa ngân sách' : 'Thêm ngân sách'}</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

                    {/* Budget Name */}
                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>Tên ngân sách</Text>
                        <View style={styles.nameRow}>
                            <Ionicons name="pencil" size={18} color="#7C3AED" style={{ marginRight: 8 }} />
                            <TextInput
                                style={styles.nameInput}
                                placeholder="Ví dụ: Ăn uống, Mua sắm..."
                                placeholderTextColor="#9CA3AF"
                                value={name}
                                onChangeText={setName}
                                maxLength={100}
                            />
                        </View>
                    </View>

                    {/* Amount */}
                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>Số tiền hạn mức</Text>
                        <View style={styles.amountRow}>
                            <Text style={styles.currencySymbol}>đ</Text>
                            <TextInput
                                style={styles.amountInput}
                                placeholder="0"
                                placeholderTextColor="#7C3AED"
                                value={amount ? formatNumber(amount) : ''}
                                onChangeText={(text) => setAmount(text.replace(/[^0-9]/g, ''))}
                                keyboardType="numeric"
                            />
                        </View>

                        {/* Smart Suggestions */}
                        <View style={styles.suggestHeader}>
                            <Ionicons name="sparkles" size={15} color="#7C3AED" />
                            <Text style={styles.suggestTitle}>  Gợi ý thông minh</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
                            {smartSuggestions.map((s, i) => (
                                <TouchableOpacity
                                    key={i}
                                    style={[styles.suggestionCard, { backgroundColor: s.bg, borderWidth: s.bg === '#fff' ? 1 : 0, borderColor: '#E5E7EB' }]}
                                    onPress={() => setAmount(String(s.amount))}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.suggestSubLabel}>{s.label}</Text>
                                    <Text style={styles.suggestAmount}>{new Intl.NumberFormat('vi-VN').format(s.amount)}đ</Text>
                                    <View style={styles.suggestBadge}>
                                        <Ionicons name={s.badgeIcon} size={12} color={s.badgeColor} />
                                        <Text style={[styles.suggestBadgeText, { color: s.badgeColor }]}> {s.badge}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Period Toggle */}
                    <Text style={styles.sectionLabel}>Khoảng thời gian</Text>
                    <View style={styles.periodRow}>
                        <TouchableOpacity
                            style={[styles.periodBtn, period === 'Monthly' && styles.periodBtnActive]}
                            onPress={() => setPeriod('Monthly')}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="calendar" size={16} color={period === 'Monthly' ? '#7C3AED' : '#9CA3AF'} />
                            <Text style={[styles.periodBtnText, period === 'Monthly' && styles.periodBtnTextActive]}>  Hàng tháng</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.periodBtn, period === 'Weekly' && styles.periodBtnActive]}
                            onPress={() => setPeriod('Weekly')}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="calendar-outline" size={16} color={period === 'Weekly' ? '#7C3AED' : '#9CA3AF'} />
                            <Text style={[styles.periodBtnText, period === 'Weekly' && styles.periodBtnTextActive]}>  Hàng tuần</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.periodBtn, period === 'Daily' && styles.periodBtnActive]}
                            onPress={() => setPeriod('Daily')}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="time-outline" size={16} color={period === 'Daily' ? '#7C3AED' : '#9CA3AF'} />
                            <Text style={[styles.periodBtnText, period === 'Daily' && styles.periodBtnTextActive]}>  Chọn ngày</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Date Picker for Daily Period */}
                    {period === 'Daily' && (
                        <View style={styles.card}>
                            <Text style={styles.cardLabel}>Ngày hiệu lực</Text>
                            <TouchableOpacity
                                style={styles.dateSelector}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Ionicons name="calendar-outline" size={20} color="#7C3AED" style={{ marginRight: 10 }} />
                                <Text style={styles.dateValue}>{formatDate(date)}</Text>
                                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                    )}

                    <CustomDatePicker
                        visible={showDatePicker}
                        onClose={() => setShowDatePicker(false)}
                        initialDate={date}
                        onSelect={(selectedDate) => {
                            setDate(selectedDate);
                        }}
                    />

                    {/* Category Grid */}
                    <Text style={styles.sectionLabel}>Chọn danh mục áp dụng</Text>
                    <View>
                        <ScrollView
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            onScroll={(e) => {
                                const offset = e.nativeEvent.contentOffset.x;
                                const width = e.nativeEvent.layoutMeasurement.width;
                                setCurrentCategoryPage(Math.round(offset / width));
                            }}
                            scrollEventThrottle={16}
                            style={{ marginHorizontal: -16 }}
                        >
                            {(() => {
                                const items = [
                                    { type: 'all' as const, data: null },
                                    ...categories.map(cat => ({ type: 'category' as const, data: cat })),
                                    { type: 'add' as const, data: null }
                                ];
                                const pages: any[][] = [];
                                for (let i = 0; i < items.length; i += 8) {
                                    pages.push(items.slice(i, i + 8));
                                }

                                return pages.map((page, pageIndex) => (
                                    <View key={pageIndex} style={{ width: windowWidth - 32, paddingHorizontal: 0 }}>
                                        <View style={styles.catGrid}>
                                            {page.map((item, idx) => {
                                                if (item.type === 'category') {
                                                    return renderCategoryIcon(item.data);
                                                } else if (item.type === 'all') {
                                                    return (
                                                        <TouchableOpacity key="all-cat" style={styles.catItem} onPress={() => setCategoryId(undefined)}>
                                                            <View style={[
                                                                styles.catCircle,
                                                                categoryId === undefined
                                                                    ? { backgroundColor: '#7C3AED40', borderColor: '#7C3AED', borderWidth: 2.5 }
                                                                    : { backgroundColor: '#F3F4F6' }
                                                            ]}>
                                                                <Ionicons
                                                                    name="apps-outline"
                                                                    size={26}
                                                                    color={categoryId === undefined ? '#7C3AED' : '#6B7280'}
                                                                />
                                                                {categoryId === undefined && (
                                                                    <View style={[styles.checkBadge, { backgroundColor: '#7C3AED' }]}>
                                                                        <Ionicons name="checkmark" size={12} color="#fff" />
                                                                    </View>
                                                                )}
                                                            </View>
                                                            <Text style={[styles.catLabel, categoryId === undefined && { color: '#7C3AED', fontWeight: '800' }]}>Tất cả</Text>
                                                        </TouchableOpacity>
                                                    );
                                                } else {
                                                    return (
                                                        <TouchableOpacity
                                                            key="add-cat-btn"
                                                            style={styles.catItem}
                                                            onPress={() => router.push('/category-form?type=EXPENSE' as any)}
                                                        >
                                                            <View style={[styles.catCircle, { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#D1D5DB', borderStyle: 'dashed' }]}>
                                                                <Ionicons name="add" size={26} color="#6B7280" />
                                                            </View>
                                                            <Text style={styles.catLabel} numberOfLines={1}>
                                                                Thêm mới
                                                            </Text>
                                                        </TouchableOpacity>
                                                    );
                                                }
                                            })}
                                        </View>
                                    </View>
                                ));
                            })()}
                        </ScrollView>

                        {/* Pagination Dots */}
                        {(categories.length + 2) > 8 && (
                            <View style={styles.paginationDots}>
                                {Array.from({ length: Math.ceil((categories.length + 2) / 8) }).map((_, i) => (
                                    <View
                                        key={i}
                                        style={[
                                            styles.dot,
                                            currentCategoryPage === i && styles.dotActive
                                        ]}
                                    />
                                ))}
                            </View>
                        )}
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>

                {/* Footer Button */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.saveBtn, (!name.trim() || !amount) && styles.saveBtnDisabled]}
                        onPress={handleSave}
                        disabled={!name.trim() || !amount || loading}
                        activeOpacity={0.85}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={styles.saveBtnText}>{isEdit ? 'Cập nhật ngân sách' : 'Tạo ngân sách'}</Text>
                                <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginLeft: 8 }} />
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FB', paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0 },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, backgroundColor: '#F8F9FB'
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
    title: { fontSize: 18, fontWeight: '700', color: '#111827' },

    formContainer: { paddingHorizontal: 16, paddingTop: 8 },

    card: {
        backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2
    },
    cardLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 10 },

    nameRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 8 },
    nameInput: { flex: 1, fontSize: 16, color: '#111827' },

    amountRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: 4 },
    currencySymbol: { fontSize: 28, fontWeight: '700', color: '#7C3AED', marginRight: 6 },
    amountInput: { flex: 1, fontSize: 32, fontWeight: '700', color: '#7C3AED', paddingVertical: 0 },

    suggestHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 10 },
    suggestTitle: { fontSize: 14, fontWeight: '700', color: '#7C3AED' },

    suggestions: { flexDirection: 'row', gap: 10 },
    suggestionCard: {
        width: 140, padding: 14, borderRadius: 12
    },
    suggestionBlue: { backgroundColor: '#EEF2FF' },
    suggestionWhite: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
    suggestSubLabel: { fontSize: 12, color: '#6B7280', marginBottom: 6 },
    suggestAmount: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
    suggestBadge: { flexDirection: 'row', alignItems: 'center' },
    suggestBadgeText: { fontSize: 12, color: '#10B981', fontWeight: '500' },

    sectionLabel: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12, marginTop: 4 },

    periodRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    periodBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 14, borderRadius: 14, backgroundColor: '#fff',
        borderWidth: 1.5, borderColor: '#E5E7EB',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1
    },
    periodBtnActive: { borderColor: '#7C3AED', backgroundColor: '#F5F3FF' },
    periodBtnText: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
    periodBtnTextActive: { color: '#7C3AED' },

    dateSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    dateValue: {
        flex: 1,
        fontSize: 16,
        color: '#111827',
        fontWeight: '600',
    },

    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    catItem: { width: 70, alignItems: 'center' },
    catCircle: {
        width: 60, height: 60, borderRadius: 30,
        justifyContent: 'center', alignItems: 'center', marginBottom: 6,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
        borderWidth: 2, borderColor: 'transparent'
    },
    catCircleSelected: {
        borderColor: '#7C3AED',
        borderWidth: 3,
    },
    checkBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#7C3AED',
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    catLabel: { fontSize: 12, color: '#6B7280', textAlign: 'center' },

    footer: { padding: 16, paddingBottom: Platform.OS === 'ios' ? 24 : 16 },
    saveBtn: {
        backgroundColor: '#7C3AED', borderRadius: 18, paddingVertical: 18,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 4
    },
    saveBtnDisabled: { backgroundColor: '#C4B5FD', shadowOpacity: 0 },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    // Pagination Dots
    paginationDots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10, marginBottom: -10 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5E7EB', marginHorizontal: 4 },
    dotActive: { backgroundColor: '#7C3AED', width: 20 },
});
