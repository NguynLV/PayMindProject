import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { WalletService } from '@/services/wallet.service';

export default function WalletFormScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const isEdit = !!params.id;

    const [name, setName] = useState('');
    const [balance, setBalance] = useState('');
    const [loading, setLoading] = useState(false);
    const [isAmountFocused, setIsAmountFocused] = useState(false);

    useFocusEffect(
        React.useCallback(() => {
            if (isEdit) {
                setName(params.name?.toString() || '');
                setBalance(params.balance?.toString() || '');
            } else {
                setName('');
                setBalance('');
            }
        }, [params.id, params.name, params.balance])
    );

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập tên ví');
            return;
        }

        const numericBalance = Number(balance.replace(/[^0-9]/g, ''));
        if (isNaN(numericBalance)) {
            Alert.alert('Lỗi', 'Số dư không hợp lệ');
            return;
        }

        try {
            setLoading(true);
            const request = { name: name.trim(), balance: numericBalance };
            if (isEdit) {
                await WalletService.updateWallet(Number(params.id), request);
            } else {
                await WalletService.createWallet(request);
            }
            router.back();
        } catch (error: any) {
            Alert.alert('Lỗi', error.response?.data?.message || `Không thể ${isEdit ? 'cập nhật' : 'thêm'} ví`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="close" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.title}>{isEdit ? 'Sửa ví' : 'Thêm ví mới'}</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Tên ví</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="VD: Thẻ tín dụng, Ví MoMo..."
                            placeholderTextColor="#9CA3AF"
                            value={name}
                            onChangeText={setName}
                            maxLength={50}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Số dư {isEdit ? '' : 'ban đầu'}</Text>
                        <View style={styles.amountInputContainer}>
                            <TextInput
                                style={styles.amountInput}
                                placeholder="0"
                                placeholderTextColor="#9CA3AF"
                                value={balance ? new Intl.NumberFormat('en-US').format(Number(balance)) : ''}
                                onFocus={() => setIsAmountFocused(true)}
                                onBlur={() => setIsAmountFocused(false)}
                                onChangeText={(text) => {
                                    const numeric = text.replace(/[^0-9]/g, '');
                                    setBalance(numeric);
                                }}
                                keyboardType="numeric"
                            />
                            {!isAmountFocused && <Text style={styles.currencyLabel}>VNĐ</Text>}
                        </View>
                    </View>

                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.saveBtn, (!name.trim() || !balance) && styles.saveBtnDisabled]}
                        onPress={handleSave}
                        disabled={!name.trim() || !balance || loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.saveBtnText}>Lưu {isEdit ? 'thay đổi' : 'ví'}</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
    title: { fontSize: 18, fontWeight: '700', color: '#111827' },

    formContainer: { padding: 20 },

    inputGroup: { marginBottom: 24 },
    label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
    input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#111827' },

    amountInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16 },
    amountInput: { flex: 1, paddingVertical: 14, fontSize: 16, color: '#111827' },
    currencyLabel: { fontSize: 16, fontWeight: '600', color: '#6B7280', paddingLeft: 8 },

    footer: { padding: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
    saveBtn: { backgroundColor: '#4F46E5', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
    saveBtnDisabled: { backgroundColor: '#9CA3AF' },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' }
});
