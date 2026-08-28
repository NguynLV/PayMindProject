import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
    TextInput, ActivityIndicator, Platform, ScrollView, useWindowDimensions, StatusBar, Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { BudgetService } from '@/services/budget.service';
import { CategoryService, CategoryResponse } from '@/services/category.service';
import { formatDate } from '@/utils/date';
import { CustomDatePicker } from '@/components/common/CustomDatePicker';
import { useToast } from '@/components/common/Toast';

const { width: windowWidth } = Dimensions.get('window');

const formatNumber = (n: string) => {
    const num = n.replace(/[^0-9]/g, '');
    if (!num) return '';
    return new Intl.NumberFormat('vi-VN').format(Number(num));
};

export default function BudgetFormScreen() {
    const router = useRouter();
    const toast = useToast();
    const insets = useSafeAreaInsets();
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

    const [isNameFocused, setIsNameFocused] = useState(false);
    const [isAmountFocused, setIsAmountFocused] = useState(false);

    const isInitializedRef = React.useRef(false);

    useFocusEffect(
        React.useCallback(() => {
            if (!isInitializedRef.current) {
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
                    setName(params.name?.toString() || '');
                    setAmount(params.amount?.toString() || '');
                    setCategoryId(params.categoryId ? Number(params.categoryId) : undefined);
                    
                    const rawPeriod = (params.period as string)?.toLowerCase();
                    if (rawPeriod === 'weekly') setPeriod('Weekly');
                    else if (rawPeriod === 'daily') setPeriod('Daily');
                    else setPeriod('Monthly');
                    
                    setDate(new Date());
                }
                isInitializedRef.current = true;
            }

            loadCategories();
        }, [isEdit, params.name, params.amount, params.categoryId, params.period, params.periodValue, params.year])
    );

    const [categories, setCategories] = useState<CategoryResponse[]>([]);
    const [loading, setLoading] = useState(false);

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const smartSuggestions = [
        { label: 'Mức thấp', amount: 800000, badge: 'Tiết kiệm', badgeIcon: 'leaf-outline' as const, badgeColor: '#10B981', bg: '#F0FDF4' },
        { label: 'Dựa trên tháng trước', amount: 1500000, badge: 'Đề xuất AI', badgeIcon: 'sparkles-outline' as const, badgeColor: '#6366F1', bg: '#EEF2FF' },
        { label: 'Mức trung bình', amount: 2000000, badge: 'Phổ biến nhất', badgeIcon: 'analytics-outline' as const, badgeColor: '#3B82F6', bg: '#EFF6FF' },
        { label: 'Mức cao', amount: 3000000, badge: 'Thoải mái', badgeIcon: 'star-outline' as const, badgeColor: '#F59E0B', bg: '#FFFBEB' },
    ];

    const loadCategories = async () => {
        try {
            const expenseCats = await CategoryService.getMyCategories('EXPENSE');
            setCategories(prev => {
                if (prev.length > 0 && expenseCats.length > prev.length) {
                    const newCat = expenseCats.find(c => !prev.some(p => p.id === c.id));
                    if (newCat) {
                        setCategoryId(newCat.id);
                        toast.success('Đã chọn danh mục mới', `Đã tự động chọn "${newCat.name}" cho ngân sách.`);
                    }
                }
                return expenseCats;
            });
        } catch (error) {
            console.warn('Failed to load categories', error);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error('Thiếu thông tin', 'Vui lòng nhập tên ngân sách.');
            return;
        }

        const numericAmount = Number(amount.replace(/[^0-9]/g, ''));
        if (isNaN(numericAmount) || numericAmount <= 0) {
            toast.error('Số tiền không hợp lệ', 'Số tiền không hợp lệ, vui lòng thử lại.');
            return;
        }

        if (period === 'Daily') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const selectedDate = new Date(date);
            selectedDate.setHours(0, 0, 0, 0);

            if (selectedDate < today) {
                toast.error('Ngày không hợp lệ', 'Không thể chọn ngày trong quá khứ.');
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
            toast.error('Có lỗi xảy ra! ❌', error.response?.data?.message || `Không thể ${isEdit ? 'cập nhật' : 'tạo'} ngân sách rồi`);
        } finally {
            setLoading(false);
        }
    };

    const renderCategoryIcon = (cat: CategoryResponse) => {
        const isSelected = categoryId === cat.id;
        const iconName = (cat.icon || 'grid-outline') as any;
        const catColor = cat.color || '#6366F1';
        return (
            <TouchableOpacity
                key={cat.id}
                style={styles.catItem}
                onPress={() => setCategoryId(isSelected ? undefined : cat.id)}
                activeOpacity={0.8}
            >
                <View style={[
                    styles.catCircle,
                    { backgroundColor: isSelected ? catColor + '15' : '#F8FAFC' },
                    isSelected ? { borderColor: catColor, borderWidth: 2 } : { borderColor: '#E2E8F0', borderWidth: 1 }
                ]}>
                    <Ionicons
                        name={iconName}
                        size={22}
                        color={isSelected ? catColor : '#6B7280'}
                    />
                    {isSelected && (
                        <View style={[styles.checkBadge, { backgroundColor: catColor }]}>
                            <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                        </View>
                    )}
                </View>
                <Text style={[styles.catLabel, isSelected && { color: catColor, fontWeight: '700' }]} numberOfLines={1}>
                    {cat.name}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.title}>{isEdit ? 'Sửa Ngân Sách' : 'Thêm Ngân Sách'}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView 
                contentContainerStyle={[styles.formContainer, { paddingBottom: Math.max(insets.bottom + 24, 36) }]} 
                keyboardShouldPersistTaps="handled" 
                showsVerticalScrollIndicator={false}
            >
                {/* Budget Name */}
                <View style={[styles.card, isNameFocused && styles.cardFocused]}>
                    <Text style={styles.cardLabel}>Tên ngân sách</Text>
                    <View style={styles.inputRow}>
                        <Ionicons name="document-text-outline" size={20} color={isNameFocused ? '#6366F1' : '#9CA3AF'} style={{ marginRight: 10 }} />
                        <TextInput
                            style={styles.nameInput}
                            placeholder="Ví dụ: Ăn uống tháng 6, Mua sắm quần áo..."
                            placeholderTextColor="#9CA3AF"
                            value={name}
                            onChangeText={setName}
                            maxLength={100}
                            onFocus={() => setIsNameFocused(true)}
                            onBlur={() => setIsNameFocused(false)}
                        />
                    </View>
                </View>

                {/* Amount */}
                <View style={[styles.card, isAmountFocused && styles.cardFocused]}>
                    <Text style={styles.cardLabel}>Hạn mức tối đa</Text>
                    <View style={styles.amountRow}>
                        <Text style={[styles.currencySymbol, (amount || isAmountFocused) && { color: '#6366F1' }]}>₫</Text>
                        <TextInput
                            style={[styles.amountInput, (amount || isAmountFocused) && { color: '#6366F1' }]}
                            placeholder="0"
                            placeholderTextColor="#D1D5DB"
                            value={amount ? formatNumber(amount) : ''}
                            onChangeText={(text) => setAmount(text.replace(/[^0-9]/g, ''))}
                            keyboardType="numeric"
                            onFocus={() => setIsAmountFocused(true)}
                            onBlur={() => setIsAmountFocused(false)}
                        />
                    </View>

                    {/* Smart Suggestions */}
                    <View style={styles.suggestHeader}>
                        <Ionicons name="sparkles" size={14} color="#6366F1" />
                        <Text style={styles.suggestTitle}>Gợi ý hạn mức nhanh</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                        {smartSuggestions.map((s, i) => (
                            <TouchableOpacity
                                key={i}
                                style={[styles.suggestionCard, { backgroundColor: s.bg }]}
                                onPress={() => setAmount(String(s.amount))}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.suggestSubLabel}>{s.label}</Text>
                                <Text style={styles.suggestAmount}>{new Intl.NumberFormat('vi-VN').format(s.amount)} ₫</Text>
                                <View style={styles.suggestBadge}>
                                    <Ionicons name={s.badgeIcon} size={11} color={s.badgeColor} />
                                    <Text style={[styles.suggestBadgeText, { color: s.badgeColor }]}> {s.badge}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Period Toggle */}
                <Text style={styles.sectionLabel}>Tần suất lặp lại</Text>
                <View style={styles.periodRow}>
                    <TouchableOpacity
                        style={[styles.periodBtn, period === 'Monthly' && styles.periodBtnActive]}
                        onPress={() => setPeriod('Monthly')}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="calendar-outline" size={16} color={period === 'Monthly' ? '#6366F1' : '#6B7280'} />
                        <Text style={[styles.periodBtnText, period === 'Monthly' && styles.periodBtnTextActive]}>Hàng tháng</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.periodBtn, period === 'Weekly' && styles.periodBtnActive]}
                        onPress={() => setPeriod('Weekly')}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="git-commit-outline" size={16} color={period === 'Weekly' ? '#6366F1' : '#6B7280'} />
                        <Text style={[styles.periodBtnText, period === 'Weekly' && styles.periodBtnTextActive]}>Hàng tuần</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.periodBtn, period === 'Daily' && styles.periodBtnActive]}
                        onPress={() => setPeriod('Daily')}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="today-outline" size={16} color={period === 'Daily' ? '#6366F1' : '#6B7280'} />
                        <Text style={[styles.periodBtnText, period === 'Daily' && styles.periodBtnTextActive]}>Một ngày</Text>
                    </TouchableOpacity>
                </View>

                {/* Date Picker for Daily Period */}
                {period === 'Daily' && (
                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>Ngày hiệu lực hạn mức</Text>
                        <TouchableOpacity
                            style={styles.dateSelector}
                            onPress={() => setShowDatePicker(true)}
                            activeOpacity={0.6}
                        >
                            <Ionicons name="calendar-outline" size={20} color="#6366F1" style={{ marginRight: 10 }} />
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
                <Text style={styles.sectionLabel}>Áp dụng cho danh mục nào?</Text>
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
                                <View key={pageIndex} style={{ width: windowWidth - 32, paddingHorizontal: 16 }}>
                                    <View style={styles.catGrid}>
                                        {page.map((item, idx) => {
                                            if (item.type === 'category') {
                                                return renderCategoryIcon(item.data);
                                            } else if (item.type === 'all') {
                                                const isAllSelected = categoryId === undefined;
                                                return (
                                                    <TouchableOpacity key="all-cat" style={styles.catItem} onPress={() => setCategoryId(undefined)} activeOpacity={0.8}>
                                                        <View style={[
                                                            styles.catCircle,
                                                            { backgroundColor: isAllSelected ? '#6366F115' : '#F8FAFC' },
                                                            isAllSelected ? { borderColor: '#6366F1', borderWidth: 2 } : { borderColor: '#E2E8F0', borderWidth: 1 }
                                                        ]}>
                                                            <Ionicons
                                                                name="grid-outline"
                                                                size={22}
                                                                color={isAllSelected ? '#6366F1' : '#6B7280'}
                                                            />
                                                            {isAllSelected && (
                                                                <View style={[styles.checkBadge, { backgroundColor: '#6366F1' }]}>
                                                                    <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                                                                </View>
                                                            )}
                                                        </View>
                                                        <Text style={[styles.catLabel, isAllSelected && { color: '#6366F1', fontWeight: '700' }]}>Tất cả</Text>
                                                    </TouchableOpacity>
                                                );
                                            } else {
                                                return (
                                                    <TouchableOpacity
                                                        key="add-cat-btn"
                                                        style={styles.catItem}
                                                        onPress={() => router.push('/category-form?type=EXPENSE' as any)}
                                                        activeOpacity={0.8}
                                                    >
                                                        <View style={[styles.catCircle, { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderStyle: 'dashed' }]}>
                                                            <Ionicons name="add" size={22} color="#6B7280" />
                                                        </View>
                                                        <Text style={styles.catLabel} numberOfLines={1}>Thêm mới</Text>
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

                {/* Footer Button */}
                <View style={styles.footerContainer}>
                    <TouchableOpacity
                        style={[styles.saveBtn, (!name.trim() || !amount) && styles.saveBtnDisabled]}
                        onPress={handleSave}
                        disabled={!name.trim() || !amount || loading}
                        activeOpacity={0.85}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={styles.saveBtnText}>{isEdit ? 'Lưu Thay Đổi' : 'Kích Hoạt Ngân Sách'}</Text>
                                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC', paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, backgroundColor: '#F8FAFC' },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
    title: { fontSize: 18, fontWeight: '700', color: '#1F2937' },

    formContainer: { paddingHorizontal: 16, paddingTop: 8 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
    cardFocused: { borderColor: '#6366F1' },
    cardLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 8 },

    inputRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
    nameInput: { flex: 1, fontSize: 15, color: '#1F2937', fontWeight: '500' },

    amountRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
    currencySymbol: { fontSize: 28, fontWeight: '700', color: '#CBD5E1', marginRight: 8 },
    amountInput: { flex: 1, fontSize: 32, fontWeight: '700', color: '#1F2937', paddingVertical: 0, fontVariant: ['tabular-nums'] },

    suggestHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 12 },
    suggestTitle: { fontSize: 13, fontWeight: '700', color: '#6366F1', marginLeft: 6 },
    suggestionCard: { width: 130, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9' },
    suggestSubLabel: { fontSize: 11, color: '#6B7280', marginBottom: 4, fontWeight: '500' },
    suggestAmount: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 6, fontVariant: ['tabular-nums'] },
    suggestBadge: { flexDirection: 'row', alignItems: 'center' },
    suggestBadgeText: { fontSize: 10, fontWeight: '600' },

    sectionLabel: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 12, marginTop: 4 },

    periodRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    periodBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
    periodBtnActive: { borderColor: '#6366F1', backgroundColor: '#EEF2FF' },
    periodBtnText: { fontSize: 13, fontWeight: '600', color: '#4B5563', marginLeft: 4 },
    periodBtnTextActive: { color: '#6366F1' },

    dateSelector: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    dateValue: { flex: 1, fontSize: 15, color: '#1F2937', fontWeight: '600' },

    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    catItem: { width: (windowWidth - 32 - 36) / 4, alignItems: 'center', marginBottom: 12 },
    catCircle: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginBottom: 6, position: 'relative' },
    checkBadge: { position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#FFFFFF' },
    catLabel: { fontSize: 11, color: '#6B7280', textAlign: 'center', fontWeight: '500' },

    footerContainer: { marginTop: 24, marginBottom: 12 },
    saveBtn: { backgroundColor: '#6366F1', borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
    saveBtnDisabled: { backgroundColor: '#A5B4FC', shadowOpacity: 0 },
    saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

    paginationDots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10, marginBottom: -10 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E2E8F0', marginHorizontal: 3 },
    dotActive: { backgroundColor: '#6366F1', width: 14 },
});
