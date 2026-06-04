import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import Constants from 'expo-constants';
import { RecurringService, RecurringTransactionRequest } from '@/services/recurring.service';
import { WalletService, WalletResponse } from '@/services/wallet.service';
import { CategoryService, CategoryResponse } from '@/services/category.service';
import { CustomDatePicker } from '@/components/common/CustomDatePicker';
import { formatDate } from '@/utils/date';
import { useToast } from '@/components/common/Toast';

const formatNumber = (n: string) => {
    const num = n.replace(/[^0-9]/g, '');
    if (!num) return '';
    return new Intl.NumberFormat('vi-VN').format(Number(num));
};

export default function RecurringFormScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const toast = useToast();
    const isEdit = !!params.id;

    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
    const [cycle, setCycle] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>('MONTHLY');
    const [nextRunDate, setNextRunDate] = useState(new Date());
    const [isActive, setIsActive] = useState(true);

    const [walletId, setWalletId] = useState<number | null>(null);
    const [categoryId, setCategoryId] = useState<number | null>(null);

    const [wallets, setWallets] = useState<WalletResponse[]>([]);
    const [categories, setCategories] = useState<CategoryResponse[]>([]);

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);

    // Load wallets & categories
    useEffect(() => {
        loadMetadata();
    }, [type]);

    const loadMetadata = async () => {
        try {
            const listWallets = await WalletService.getMyWallets();
            setWallets(listWallets || []);
            if (listWallets && listWallets.length > 0 && !walletId) {
                // Pre-select default wallet
                const defaultW = listWallets.find(w => w.isDefault) || listWallets[0];
                setWalletId(defaultW.id);
            }

            const listCategories = await CategoryService.getMyCategories(type);
            setCategories(listCategories || []);
            if (listCategories && listCategories.length > 0 && !categoryId) {
                setCategoryId(listCategories[0].id);
            }
        } catch (error) {
            console.warn('Failed to load form metadata', error);
        }
    };

    // Load detail if Edit
    useEffect(() => {
        if (isEdit) {
            loadRecurringDetail();
        }
    }, [params.id]);

    const loadRecurringDetail = async () => {
        try {
            setFetching(true);
            const detail = await RecurringService.getRecurringTransactionById(Number(params.id));
            if (detail) {
                setDescription(detail.description || '');
                setAmount(detail.amount ? String(detail.amount) : '');
                setType(detail.type || 'EXPENSE');
                setCycle(detail.cycle || 'MONTHLY');
                setIsActive(detail.isActive ?? true);
                if (detail.wallet) setWalletId(detail.wallet.id);
                if (detail.category) setCategoryId(detail.category.id);
                if (detail.nextRunDate) setNextRunDate(new Date(detail.nextRunDate));
            }
        } catch (error) {
            console.error('Failed to load detail:', error);
            toast.error('Ối! Load thất bại 😵', 'Không thể tải chi tiết giao dịch, quay lại thôi!');
            router.back();
        } finally {
            setFetching(false);
        }
    };

    // Presets for popular Gen Z subscriptions
    const presets = [
        { label: 'Netflix 🍿', desc: 'Netflix Premium', amount: 260000, categoryName: 'Giải trí' },
        { label: 'Spotify 🎵', desc: 'Spotify Premium', amount: 59000, categoryName: 'Giải trí' },
        { label: 'iCloud ☁️', desc: 'iCloud 50GB Space', amount: 19000, categoryName: 'Dịch vụ' },
        { label: 'YouTube Premium 🔴', desc: 'YouTube Premium', amount: 79000, categoryName: 'Giải trí' },
        { label: 'ChatGPT Plus 🤖', desc: 'ChatGPT Plus Plus', amount: 480000, categoryName: 'Học tập' },
        { label: 'Canva Pro 🎨', desc: 'Canva Pro Premium', amount: 149000, categoryName: 'Học tập' }
    ];

    const handleApplyPreset = (preset: typeof presets[number]) => {
        setDescription(preset.desc);
        setAmount(String(preset.amount));
        setType('EXPENSE');
        setCycle('MONTHLY');

        // Look for matching category in state
        const matched = categories.find(c => c.name.toLowerCase().includes(preset.categoryName.toLowerCase()));
        if (matched) {
            setCategoryId(matched.id);
        }
    };

    const handleSave = async () => {
        if (!description.trim()) {
            toast.error('Thiếu thông tin! 📝', 'Vui lòng nhập tên dịch vụ (ví dụ: Netflix, Spotify...).');
            return;
        }

        const numericAmount = Number(amount.replace(/[^0-9]/g, ''));
        if (isNaN(numericAmount) || numericAmount <= 0) {
            toast.error('Số tiền không hợp lệ!', 'Số tiền giao dịch phải lớn hơn 0.');
            return;
        }

        if (!walletId) {
            toast.error('Chưa chọn ví! 👛', 'Vui lòng chọn ví để thực hiện giao dịch.');
            return;
        }

        if (!categoryId) {
            toast.error('Chưa chọn danh mục! 🏷️', 'Vui lòng chọn danh mục cho giao dịch này.');
            return;
        }

        try {
            setLoading(true);
            const formattedDate = nextRunDate.toISOString().split('T')[0];

            const requestData: RecurringTransactionRequest = {
                walletId,
                categoryId,
                type,
                amount: numericAmount,
                description: description.trim(),
                cycle,
                nextRunDate: formattedDate,
                isActive
            };

            if (isEdit) {
                await RecurringService.updateRecurringTransaction(Number(params.id), requestData);
                toast.success('Lưu thành công! 🎉', 'Cập nhật giao dịch định kỳ thành công.');
            } else {
                await RecurringService.createRecurringTransaction(requestData);
                toast.success('Tạo thành công! 🎉', 'Giao dịch định kỳ đã được thiết lập thành công.');
            }
            setTimeout(() => router.back(), 1200);
        } catch (error: any) {
            console.error('Save error:', error);
            toast.error('Lưu thất bại 😅', error.response?.data?.message || 'Đã xảy ra lỗi, vui lòng thử lại sau.');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#7C3AED" />
                    <Text style={styles.loaderText}>Đang đọc cài đặt dịch vụ...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.title}>{isEdit ? 'Cập nhật giao dịch định kỳ' : 'Thêm giao dịch định kỳ'}</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    
                    {/* Brand Presets List */}
                    {!isEdit && type === 'EXPENSE' && (
                        <>
                            <Text style={styles.sectionLabel}>Dịch vụ đăng ký phổ biến</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsScroll}>
                                {presets.map((preset, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        style={styles.presetCard}
                                        onPress={() => handleApplyPreset(preset)}
                                    >
                                        <Text style={styles.presetLabel}>{preset.label}</Text>
                                        <Text style={styles.presetAmount}>{new Intl.NumberFormat('vi-VN').format(preset.amount)}đ/tháng</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </>
                    )}

                    {/* Mode switch */}
                    <Text style={styles.sectionLabel}>Loại dòng tiền</Text>
                    <View style={styles.typeRow}>
                        <TouchableOpacity 
                            style={[styles.typeBtn, type === 'EXPENSE' && styles.expenseBtnActive]}
                            onPress={() => setType('EXPENSE')}
                        >
                            <Ionicons name="trending-down-outline" size={18} color={type === 'EXPENSE' ? '#991B1B' : '#6B7280'} />
                            <Text style={[styles.typeBtnText, type === 'EXPENSE' && styles.expenseBtnTextActive]}>
                                Chi tiêu định kỳ 💸
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.typeBtn, type === 'INCOME' && styles.incomeBtnActive]}
                            onPress={() => setType('INCOME')}
                        >
                            <Ionicons name="trending-up-outline" size={18} color={type === 'INCOME' ? '#065F46' : '#6B7280'} />
                            <Text style={[styles.typeBtnText, type === 'INCOME' && styles.incomeBtnTextActive]}>
                                Thu nhập định kỳ 📈
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Description card */}
                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>Tên dịch vụ / Nguồn tiền định kỳ</Text>
                        <View style={styles.inputRow}>
                            <Ionicons name="document-text-outline" size={18} color="#7C3AED" style={styles.inputIcon} />
                            <TextInput
                                style={styles.textInput}
                                placeholder="Ví dụ: Netflix, Spotify, Lương hàng tháng..."
                                placeholderTextColor="#9CA3AF"
                                value={description}
                                onChangeText={setDescription}
                                maxLength={100}
                            />
                        </View>
                    </View>

                    {/* Amount card */}
                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>Số tiền một chu kỳ</Text>
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
                    </View>

                    {/* Cycle row selector */}
                    <Text style={styles.sectionLabel}>Chu kỳ lặp lại</Text>
                    <View style={styles.cycleContainer}>
                        {([
                            { key: 'DAILY', label: 'Hằng ngày' },
                            { key: 'WEEKLY', label: 'Hằng tuần' },
                            { key: 'MONTHLY', label: 'Hằng tháng' },
                            { key: 'YEARLY', label: 'Hằng năm' }
                        ] as const).map((item) => {
                            const isSelected = cycle === item.key;
                            return (
                                <TouchableOpacity
                                    key={item.key}
                                    style={[styles.cycleBtn, isSelected && styles.cycleBtnActive]}
                                    onPress={() => setCycle(item.key)}
                                >
                                    <Text style={[styles.cycleLabel, isSelected && styles.cycleLabelActive]}>
                                        {item.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Next execution Date picker */}
                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>Ngày hiệu lực tiếp theo (Khi nào bắt đầu?)</Text>
                        <TouchableOpacity
                            style={styles.dateSelector}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Ionicons name="calendar-outline" size={20} color="#7C3AED" style={{ marginRight: 10 }} />
                            <Text style={styles.dateValue}>{formatDate(nextRunDate)}</Text>
                            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                        </TouchableOpacity>
                    </View>

                    <CustomDatePicker
                        visible={showDatePicker}
                        onClose={() => setShowDatePicker(false)}
                        initialDate={nextRunDate}
                        onSelect={(selectedDate) => {
                            setNextRunDate(selectedDate);
                        }}
                    />

                    {/* Wallet Select */}
                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>Chọn ví trừ/cộng tiền</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorScroll}>
                            {wallets.map((w) => {
                                const isSelected = walletId === w.id;
                                return (
                                    <TouchableOpacity
                                        key={w.id}
                                        style={[styles.selectorItem, isSelected && styles.selectorItemActive]}
                                        onPress={() => setWalletId(w.id)}
                                    >
                                        <Ionicons name="wallet-outline" size={16} color={isSelected ? '#7C3AED' : '#4B5563'} />
                                        <Text style={[styles.selectorText, isSelected && styles.selectorTextActive]}>
                                            {w.name} ({new Intl.NumberFormat('vi-VN').format(w.balance)}đ)
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>

                    {/* Category Select */}
                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>Chọn danh mục</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorScroll}>
                            {categories.map((c) => {
                                const isSelected = categoryId === c.id;
                                return (
                                    <TouchableOpacity
                                        key={c.id}
                                        style={[
                                            styles.selectorItem, 
                                            isSelected && { borderColor: c.color, backgroundColor: c.color + '15' }
                                        ]}
                                        onPress={() => setCategoryId(c.id)}
                                    >
                                        <Ionicons name={(c.icon || 'grid-outline') as any} size={16} color={isSelected ? c.color : '#4B5563'} />
                                        <Text style={[styles.selectorText, isSelected && { color: c.color, fontWeight: '700' }]}>
                                            {c.name}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>

                    {/* Active toggle */}
                    <View style={[styles.card, styles.toggleCard]}>
                        <View style={styles.toggleInfo}>
                            <Text style={styles.toggleTitle}>Tự động chạy định kỳ</Text>
                            <Text style={styles.toggleDesc}>Bật tính năng tự động ghi nhận giao dịch mỗi chu kỳ</Text>
                        </View>
                        <Switch
                            value={isActive}
                            onValueChange={setIsActive}
                            trackColor={{ false: '#D1D5DB', true: '#C4B5FD' }}
                            thumbColor={isActive ? '#7C3AED' : '#F3F4F6'}
                            ios_backgroundColor="#D1D5DB"
                        />
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>

                {/* Footer Save Button */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.saveBtn, (!description.trim() || !amount) && styles.saveBtnDisabled]}
                        onPress={handleSave}
                        disabled={!description.trim() || !amount || loading}
                        activeOpacity={0.85}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={styles.saveBtnText}>{isEdit ? 'Cập nhật giao dịch' : 'Kích hoạt giao dịch'}</Text>
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
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
    title: { fontSize: 18, fontWeight: '800', color: '#111827' },
    
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loaderText: { marginTop: 12, fontSize: 15, color: '#4B5563', fontWeight: '500' },
    
    formContainer: { paddingHorizontal: 16, paddingTop: 12 },
    sectionLabel: { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 10 },
    
    presetsScroll: { gap: 10, paddingBottom: 14 },
    presetCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', minWidth: 120, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 6, elevation: 1 },
    presetLabel: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 4 },
    presetAmount: { fontSize: 11, color: '#6B7280' },
    
    typeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', gap: 6 },
    typeBtnText: { fontSize: 12, fontWeight: '700', color: '#4B5563' },
    expenseBtnActive: { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
    expenseBtnTextActive: { color: '#991B1B' },
    incomeBtnActive: { backgroundColor: '#D1FAE5', borderColor: '#10B981' },
    incomeBtnTextActive: { color: '#065F46' },
    
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1, borderWidth: 1, borderColor: '#F3F4F6' },
    cardLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 10 },
    inputRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 8 },
    inputIcon: { marginRight: 8 },
    textInput: { flex: 1, fontSize: 15, color: '#111827', padding: 0 },
    
    amountRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: 4 },
    currencySymbol: { fontSize: 28, fontWeight: '700', color: '#7C3AED', marginRight: 6 },
    amountInput: { flex: 1, fontSize: 32, fontWeight: '700', color: '#7C3AED', paddingVertical: 0 },
    
    cycleContainer: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    cycleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
    cycleBtnActive: { borderColor: '#7C3AED', backgroundColor: '#F5F3FF' },
    cycleLabel: { fontSize: 11, fontWeight: '600', color: '#4B5563' },
    cycleLabelActive: { color: '#7C3AED', fontWeight: '700' },
    
    dateSelector: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    dateValue: { flex: 1, fontSize: 15, color: '#111827', fontWeight: '600' },
    
    selectorScroll: { gap: 10, paddingVertical: 2 },
    selectorItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
    selectorItemActive: { borderColor: '#7C3AED', backgroundColor: '#F5F3FF' },
    selectorText: { fontSize: 12, color: '#4B5563' },
    selectorTextActive: { color: '#7C3AED', fontWeight: '700' },
    
    toggleCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    toggleInfo: { flex: 1, marginRight: 16 },
    toggleTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
    toggleDesc: { fontSize: 11, color: '#6B7280' },
    
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
    saveBtn: { backgroundColor: '#7C3AED', borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
    saveBtnDisabled: { backgroundColor: '#C4B5FD', shadowOpacity: 0 },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
