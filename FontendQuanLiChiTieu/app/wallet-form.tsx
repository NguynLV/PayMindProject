import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { WalletService } from '@/services/wallet.service';
import { useToast } from '@/components/common/Toast';
import UserService, { UserProfile } from '@/services/user.service';

export default function WalletFormScreen() {
    const router = useRouter();
    const toast = useToast();
    const params = useLocalSearchParams();
    const isEdit = !!params.id;

    const [name, setName] = useState('');
    const [balance, setBalance] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Focused states for style highlights
    const [isNameFocused, setIsNameFocused] = useState(false);
    const [isBalanceFocused, setIsBalanceFocused] = useState(false);

    const [user, setUser] = useState<UserProfile | null>(null);
    const [existingWalletsCount, setExistingWalletsCount] = useState(0);

    useFocusEffect(
        React.useCallback(() => {
            // Fetch profile and wallets count
            UserService.getMyProfile().then(setUser).catch(console.warn);
            WalletService.getMyWallets().then(list => setExistingWalletsCount(list?.length || 0)).catch(console.warn);

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
            toast.error('Thiếu thông tin', 'Vui lòng nhập tên ví.');
            return;
        }

        const numericBalance = Number(balance.replace(/[^0-9]/g, ''));
        if (isNaN(numericBalance)) {
            toast.error('Ủa sai rồi! 🥲', 'Số dư không hợp lệ, kiểm tra lại xem');
            return;
        }

        // Limit free users to maximum 2 wallets
        if (!isEdit && user && !user.isPremium && existingWalletsCount >= 2) {
            toast.error('Đạt giới hạn tạo ví! 👑', 'Tài khoản thường chỉ được tạo tối đa 2 ví. Vui lòng nâng cấp Premium để quản lý không giới hạn.');
            router.push('/premium');
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
            toast.error('Có lỗi xảy ra! ❌', error.response?.data?.message || `Không thể ${isEdit ? 'cập nhật' : 'thêm'} ví lúc này`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                    <Ionicons name="close" size={22} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.title}>{isEdit ? 'Cấu hình thẻ / ví' : 'Tạo thẻ / ví mới'}</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
                    
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Tên tài khoản / ví</Text>
                        <TextInput
                            style={[
                                styles.input, 
                                isNameFocused && styles.inputFocused
                            ]}
                            placeholder="Ví dụ: Thẻ Visa, Ví MoMo, Tiền mặt..."
                            placeholderTextColor="#9CA3AF"
                            value={name}
                            onChangeText={setName}
                            maxLength={30}
                            onFocus={() => setIsNameFocused(true)}
                            onBlur={() => setIsNameFocused(false)}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Số dư {isEdit ? 'hiện tại' : 'ban đầu'}</Text>
                        <View style={[
                            styles.amountInputContainer,
                            isBalanceFocused && styles.amountInputContainerFocused
                        ]}>
                            <TextInput
                                style={styles.amountInput}
                                placeholder="0"
                                placeholderTextColor="#9CA3AF"
                                value={balance ? new Intl.NumberFormat('en-US').format(Number(balance)) : ''}
                                onFocus={() => setIsBalanceFocused(true)}
                                onBlur={() => setIsBalanceFocused(false)}
                                onChangeText={(text) => {
                                    const numeric = text.replace(/[^0-9]/g, '');
                                    setBalance(numeric);
                                }}
                                keyboardType="numeric"
                            />
                            <Text style={styles.currencyLabel}>đ</Text>
                        </View>
                    </View>

                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[
                            styles.saveBtn, 
                            (!name.trim() || !balance) && styles.saveBtnDisabled
                        ]}
                        onPress={handleSave}
                        disabled={!name.trim() || !balance || loading}
                        activeOpacity={0.9}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.saveBtnText}>Lưu cấu hình</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF', paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 16, fontWeight: '700', color: '#111827' },

    formContainer: { padding: 20 },

    inputGroup: { marginBottom: 24 },
    label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8, letterSpacing: 0.2 },
    
    input: { 
        backgroundColor: '#FFFFFF', 
        borderWidth: 1, 
        borderColor: '#E5E7EB', 
        borderRadius: 14, 
        paddingHorizontal: 16, 
        paddingVertical: 14, 
        fontSize: 14, 
        color: '#111827',
        fontWeight: '500'
    },
    inputFocused: {
        borderColor: '#6366F1',
    },

    amountInputContainer: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#FFFFFF', 
        borderWidth: 1, 
        borderColor: '#E5E7EB', 
        borderRadius: 14, 
        paddingHorizontal: 16 
    },
    amountInputContainerFocused: {
        borderColor: '#6366F1',
    },
    amountInput: { 
        flex: 1, 
        paddingVertical: 14, 
        fontSize: 16, 
        color: '#111827', 
        fontWeight: '700',
        fontVariant: ['tabular-nums']
    },
    currencyLabel: { fontSize: 14, fontWeight: '700', color: '#6B7280', paddingLeft: 8 },

    footer: { padding: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
    saveBtn: { 
        backgroundColor: '#6366F1', 
        borderRadius: 14, 
        paddingVertical: 14, 
        alignItems: 'center',
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2
    },
    saveBtnDisabled: { backgroundColor: '#9CA3AF', shadowOpacity: 0, elevation: 0 },
    saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' }
});
