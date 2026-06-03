import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import Constants from 'expo-constants';
import { DebtService, DebtRequest } from '@/services/debt.service';
import { useToast } from '@/components/common/Toast';
import { CustomDatePicker } from '@/components/common/CustomDatePicker';
import { formatDate } from '@/utils/date';

const formatNumber = (n: string) => {
    const num = n.replace(/[^0-9]/g, '');
    if (!num) return '';
    return new Intl.NumberFormat('vi-VN').format(Number(num));
};

export default function DebtFormScreen() {
    const router = useRouter();
    const toast = useToast();
    const params = useLocalSearchParams();
    const isEdit = !!params.id;

    const [debtorName, setDebtorName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [amount, setAmount] = useState('');
    const [itemType, setItemType] = useState<'CASH' | 'MILK_TEA' | 'COFFEE' | 'LUNCH' | 'OTHER'>('CASH');
    const [itemDescription, setItemDescription] = useState('');
    const [type, setType] = useState<'LENT' | 'BORROWED'>('LENT');
    const [status, setStatus] = useState<'UNPAID' | 'PAID' | 'DEFAULTED'>('UNPAID');
    const [note, setNote] = useState('');
    const [dueDate, setDueDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);

    useEffect(() => {
        if (params.type === 'BORROWED') {
            setType('BORROWED');
        } else {
            setType('LENT');
        }

        if (isEdit) {
            loadDebtDetail();
        }
    }, [params.id, params.type]);

    const loadDebtDetail = async () => {
        try {
            setFetching(true);
            const detail = await DebtService.getDebtById(Number(params.id));
            if (detail) {
                setDebtorName(detail.debtorName || '');
                setPhoneNumber(detail.phoneNumber || '');
                setAmount(detail.amount ? String(detail.amount) : '');
                setItemType(detail.itemType || 'CASH');
                setItemDescription(detail.itemDescription || '');
                setType(detail.type || 'LENT');
                setStatus(detail.status || 'UNPAID');
                setNote(detail.note || '');
                if (detail.dueDate) {
                    setDueDate(new Date(detail.dueDate));
                }
            }
        } catch (error) {
            console.error('Failed to load debt:', error);
            toast.error('Lỗi!', 'Không thể tải chi tiết khoản vay/nợ.');
            router.back();
        } finally {
            setFetching(false);
        }
    };

    // Pre-filled amount suggestions based on the item type
    const getSuggestions = () => {
        switch (itemType) {
            case 'MILK_TEA':
                return [
                    { label: 'Bình dân 🥤', amount: 35000 },
                    { label: 'Phúc Long 🍵', amount: 65000 },
                    { label: 'Gong Cha 🍼', amount: 75000 }
                ];
            case 'COFFEE':
                return [
                    { label: 'Cà phê sữa đá ☕', amount: 20000 },
                    { label: 'Highlands 🥤', amount: 45000 },
                    { label: 'The Coffee House ☕', amount: 55000 }
                ];
            case 'LUNCH':
                return [
                    { label: 'Cơm tấm sườn 🍛', amount: 35000 },
                    { label: 'Phở bò tái nạm 🍲', amount: 50000 },
                    { label: 'Bún chả 🍜', amount: 45000 }
                ];
            case 'CASH':
            default:
                return [
                    { label: '50k 💵', amount: 50000 },
                    { label: '100k 💸', amount: 100000 },
                    { label: '200k 🤑', amount: 200000 },
                    { label: '500k 🏦', amount: 500000 }
                ];
        }
    };

    const handleSave = async () => {
        if (!debtorName.trim()) {
            toast.error('Thiếu thông tin!', 'Vui lòng nhập tên người nợ hoặc người cho vay.');
            return;
        }

        const numericAmount = Number(amount.replace(/[^0-9]/g, ''));
        if (isNaN(numericAmount) || numericAmount <= 0) {
            toast.error('Số tiền không hợp lệ!', 'Số tiền nợ phải lớn hơn 0.');
            return;
        }

        if (phoneNumber.trim() && !/(84|0[3|5|7|8|9])+([0-9]{8})\b/.test(phoneNumber.trim())) {
            toast.error('Sai định dạng!', 'Số điện thoại không hợp lệ.');
            return;
        }

        try {
            setLoading(true);
            const formattedDueDate = dueDate.toISOString().split('T')[0];

            const requestData: DebtRequest = {
                debtorName: debtorName.trim(),
                phoneNumber: phoneNumber.trim() || undefined,
                amount: numericAmount,
                itemType,
                itemDescription: itemDescription.trim() || undefined,
                type,
                status,
                note: note.trim() || undefined,
                dueDate: formattedDueDate
            };

            if (isEdit) {
                await DebtService.updateDebt(Number(params.id), requestData);
                toast.success('Thành công!', 'Đã cập nhật khoản nợ thành công! 🎉');
                setTimeout(() => router.back(), 1200);
            } else {
                await DebtService.createDebt(requestData);
                toast.success('Ghi nhận thành công!', 'Đã thêm khoản nợ mới vào sổ nợ! 📓✍️');
                setTimeout(() => router.back(), 1200);
            }
        } catch (error: any) {
            console.error('Save error:', error);
            toast.error('Có lỗi xảy ra!', error.response?.data?.message || 'Vui lòng thử lại sau.');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#7C3AED" />
                    <Text style={styles.loaderText}>Đang tải chi tiết sổ nợ...</Text>
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
                <Text style={styles.title}>{isEdit ? 'Cập nhật khoản nợ ✏️' : 'Ghi nhận vay/nợ mới ✍️'}</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    
                    {/* Tab Selector */}
                    <Text style={styles.sectionLabel}>Tính chất giao dịch</Text>
                    <View style={styles.typeRow}>
                        <TouchableOpacity 
                            style={[styles.typeBtn, type === 'LENT' && styles.lentBtnActive]}
                            onPress={() => setType('LENT')}
                        >
                            <Ionicons name="gift-outline" size={18} color={type === 'LENT' ? '#065F46' : '#6B7280'} />
                            <Text style={[styles.typeBtnText, type === 'LENT' && styles.lentBtnTextActive]}>
                                Cho vay (Đang cho vay) 💸
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.typeBtn, type === 'BORROWED' && styles.borrowedBtnActive]}
                            onPress={() => setType('BORROWED')}
                        >
                            <Ionicons name="card-outline" size={18} color={type === 'BORROWED' ? '#991B1B' : '#6B7280'} />
                            <Text style={[styles.typeBtnText, type === 'BORROWED' && styles.borrowedBtnTextActive]}>
                                Đi vay (Đang nợ) 📉
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Debtor Details Card */}
                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>{type === 'LENT' ? 'Người vay' : 'Người cho vay'}</Text>
                        <View style={styles.inputRow}>
                            <Ionicons name="person-outline" size={18} color="#7C3AED" style={styles.inputIcon} />
                            <TextInput
                                style={styles.textInput}
                                placeholder={type === 'LENT' ? "Ví dụ: Nguyễn Văn A..." : "Ví dụ: Trần Văn B..."}
                                placeholderTextColor="#9CA3AF"
                                value={debtorName}
                                onChangeText={setDebtorName}
                                maxLength={50}
                            />
                        </View>
                        <View style={[styles.inputRow, { marginTop: 12 }]}>
                            <Ionicons name="call-outline" size={18} color="#7C3AED" style={styles.inputIcon} />
                            <TextInput
                                style={styles.textInput}
                                placeholder="Số điện thoại (không bắt buộc)"
                                placeholderTextColor="#9CA3AF"
                                value={phoneNumber}
                                onChangeText={setPhoneNumber}
                                keyboardType="phone-pad"
                                maxLength={15}
                            />
                        </View>
                    </View>

                    {/* Item Type & Description */}
                    <Text style={styles.sectionLabel}>Lý do nợ (Món nợ là gì?)</Text>
                    <View style={styles.itemTypeContainer}>
                        {(['CASH', 'MILK_TEA', 'COFFEE', 'LUNCH', 'OTHER'] as const).map((t) => {
                            const isSelected = itemType === t;
                            let label = '';
                            let icon = '';
                            if (t === 'CASH') { label = 'Tiền mặt'; icon = '💵'; }
                            else if (t === 'MILK_TEA') { label = 'Trà sữa'; icon = '🥤'; }
                            else if (t === 'COFFEE') { label = 'Cà phê'; icon = '☕'; }
                            else if (t === 'LUNCH') { label = 'Ăn trưa'; icon = '🍛'; }
                            else { label = 'Khác'; icon = '📦'; }

                            return (
                                <TouchableOpacity
                                    key={t}
                                    style={[styles.itemTypeBtn, isSelected && styles.itemTypeBtnActive]}
                                    onPress={() => setItemType(t)}
                                >
                                    <Text style={styles.itemTypeIcon}>{icon}</Text>
                                    <Text style={[styles.itemTypeLabel, isSelected && styles.itemTypeLabelActive]}>{label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {itemType !== 'CASH' && (
                        <View style={styles.card}>
                            <Text style={styles.cardLabel}>Chi tiết món nợ</Text>
                            <View style={styles.inputRow}>
                                <Ionicons name="fast-food-outline" size={18} color="#7C3AED" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Ví dụ: Trà sữa Phúc Long size L, Cơm sườn 2 trứng..."
                                    placeholderTextColor="#9CA3AF"
                                    value={itemDescription}
                                    onChangeText={setItemDescription}
                                    maxLength={100}
                                />
                            </View>
                        </View>
                    )}

                    {/* Amount */}
                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>Quy đổi ra số tiền</Text>
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

                        {/* Amount Suggestions */}
                        <View style={styles.suggestHeader}>
                            <Ionicons name="sparkles" size={15} color="#7C3AED" />
                            <Text style={styles.suggestTitle}> Gợi ý nhanh</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestScroll}>
                            {getSuggestions().map((s, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    style={styles.suggestionItem}
                                    onPress={() => setAmount(String(s.amount))}
                                >
                                    <Text style={styles.suggestionLabel}>{s.label}</Text>
                                    <Text style={styles.suggestionVal}>{new Intl.NumberFormat('vi-VN').format(s.amount)}đ</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Due Date picker */}
                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>Hạn thanh toán (Khi nào trả?)</Text>
                        <TouchableOpacity
                            style={styles.dateSelector}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Ionicons name="calendar-outline" size={20} color="#7C3AED" style={{ marginRight: 10 }} />
                            <Text style={styles.dateValue}>{formatDate(dueDate)}</Text>
                            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                        </TouchableOpacity>
                    </View>

                    <CustomDatePicker
                        visible={showDatePicker}
                        onClose={() => setShowDatePicker(false)}
                        initialDate={dueDate}
                        onSelect={(selectedDate) => {
                            setDueDate(selectedDate);
                        }}
                    />

                    {/* Status selection if edit */}
                    {isEdit && (
                        <View style={styles.card}>
                            <Text style={styles.cardLabel}>Trạng thái nợ</Text>
                            <View style={styles.statusContainer}>
                                {([
                                    { key: 'UNPAID', text: 'Chưa thanh toán 🚨', color: '#EF4444', activeBg: '#FEF2F2', activeBorder: '#EF4444' },
                                    { key: 'PAID', text: 'Đã thanh toán 🥳', color: '#10B981', activeBg: '#F0FDF4', activeBorder: '#10B981' },
                                    { key: 'DEFAULTED', text: 'Nợ quá hạn / Khó đòi ⏳', color: '#6B7280', activeBg: '#F3F4F6', activeBorder: '#6B7280' }
                                ] as const).map((s) => {
                                    const isSelected = status === s.key;
                                    return (
                                        <TouchableOpacity
                                            key={s.key}
                                            style={[
                                                styles.statusBtn,
                                                isSelected && { backgroundColor: s.activeBg, borderColor: s.activeBorder, borderWidth: 1.5 }
                                            ]}
                                            onPress={() => setStatus(s.key)}
                                        >
                                            <Text style={[styles.statusText, { color: isSelected ? s.color : '#4B5563', fontWeight: isSelected ? '700' : '500' }]}>
                                                {s.text}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    )}

                    {/* Note */}
                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>Lời nhắn gửi (Ghi chú)</Text>
                        <TextInput
                            style={styles.noteInput}
                            placeholder="Nhập ghi chú nợ..."
                            placeholderTextColor="#9CA3AF"
                            value={note}
                            onChangeText={setNote}
                            multiline={true}
                            numberOfLines={3}
                            maxLength={200}
                        />
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>

                {/* Footer Save Button */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.saveBtn, (!debtorName.trim() || !amount) && styles.saveBtnDisabled]}
                        onPress={handleSave}
                        disabled={!debtorName.trim() || !amount || loading}
                        activeOpacity={0.85}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={styles.saveBtnText}>{isEdit ? 'Cập nhật khoản nợ' : 'Lưu khoản vay/nợ'}</Text>
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
    
    typeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', gap: 6 },
    typeBtnText: { fontSize: 12, fontWeight: '700', color: '#4B5563' },
    lentBtnActive: { backgroundColor: '#D1FAE5', borderColor: '#10B981' },
    lentBtnTextActive: { color: '#065F46' },
    borrowedBtnActive: { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
    borrowedBtnTextActive: { color: '#991B1B' },
    
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1, borderWidth: 1, borderColor: '#F3F4F6' },
    cardLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 10 },
    inputRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 8 },
    inputIcon: { marginRight: 8 },
    textInput: { flex: 1, fontSize: 15, color: '#111827', padding: 0 },
    
    itemTypeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    itemTypeBtn: { flex: 1, minWidth: '30%', backgroundColor: '#fff', borderRadius: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB' },
    itemTypeBtnActive: { borderColor: '#7C3AED', backgroundColor: '#F5F3FF' },
    itemTypeIcon: { fontSize: 24, marginBottom: 4 },
    itemTypeLabel: { fontSize: 11, fontWeight: '600', color: '#4B5563' },
    itemTypeLabelActive: { color: '#7C3AED', fontWeight: '700' },
    
    amountRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: 4 },
    currencySymbol: { fontSize: 28, fontWeight: '700', color: '#7C3AED', marginRight: 6 },
    amountInput: { flex: 1, fontSize: 32, fontWeight: '700', color: '#7C3AED', paddingVertical: 0 },
    
    suggestHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 14, marginBottom: 10 },
    suggestTitle: { fontSize: 13, fontWeight: '700', color: '#7C3AED' },
    suggestScroll: { gap: 10, paddingBottom: 4 },
    suggestionItem: { backgroundColor: '#F9FAFB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
    suggestionLabel: { fontSize: 11, color: '#6B7280', marginBottom: 2 },
    suggestionVal: { fontSize: 13, fontWeight: '700', color: '#111827' },
    
    dateSelector: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    dateValue: { flex: 1, fontSize: 15, color: '#111827', fontWeight: '600' },
    
    statusContainer: { flexDirection: 'row', gap: 8 },
    statusBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#fff', alignItems: 'center' },
    statusText: { fontSize: 12 },
    
    noteInput: { fontSize: 14, color: '#111827', padding: 10, backgroundColor: '#F9FAFB', borderRadius: 10, minHeight: 60, textAlignVertical: 'top' },
    
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
    saveBtn: { backgroundColor: '#7C3AED', borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
    saveBtnDisabled: { backgroundColor: '#C4B5FD', shadowOpacity: 0 },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
