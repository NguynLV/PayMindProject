import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    SafeAreaView,
    StatusBar,
    Platform,
    KeyboardAvoidingView,
    ScrollView,
    Dimensions
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WalletService, WalletResponse } from '../../src/services/wallet.service';
import { useToast } from '../../src/components/common/Toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function SetWalletBalanceScreen() {
    const router = useRouter();
    const toast = useToast();
    const insets = useSafeAreaInsets();
    
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [defaultWallet, setDefaultWallet] = useState<WalletResponse | null>(null);
    
    const [walletName, setWalletName] = useState('Tiền mặt');
    const [balanceStr, setBalanceStr] = useState('');
    const [isNameFocused, setIsNameFocused] = useState(false);
    const [isBalanceFocused, setIsBalanceFocused] = useState(false);

    useEffect(() => {
        loadDefaultWallet();
    }, []);

    const loadDefaultWallet = async () => {
        try {
            setLoading(true);
            // Calling getMyWallets will trigger backend to auto-generate the default wallet "Tiền mặt" if none exists.
            const wallets = await WalletService.getMyWallets();
            if (wallets && wallets.length > 0) {
                // Find default wallet or fallback to the first one
                const def = wallets.find(w => w.isDefault) || wallets[0];
                setDefaultWallet(def);
                setWalletName(def.name);
                if (def.balance > 0) {
                    setBalanceStr(def.balance.toString());
                }
            }
        } catch (error: any) {
            console.log("Error loading default wallet:", error);
            toast.error('Lỗi tải ví tiền', 'Không thể kết nối với máy chủ. Thử lại sau nhé!');
        } finally {
            setLoading(false);
        }
    };

    const handleFormatAmount = (text: string) => {
        const numeric = text.replace(/[^0-9]/g, '');
        setBalanceStr(numeric);
    };

    const getDisplayAmount = () => {
        if (!balanceStr) return '0';
        return new Intl.NumberFormat('vi-VN').format(Number(balanceStr));
    };

    const handleSubmit = async () => {
        if (!walletName.trim()) {
            toast.error('Nhập tên ví nhé!', 'Vui lòng đặt tên cho ví tiền của bạn.');
            return;
        }

        const balance = balanceStr ? Number(balanceStr) : 0;
        if (isNaN(balance) || balance < 0) {
            toast.error('Ủa sai rồi!', 'Vui lòng nhập số tiền ví hợp lệ.');
            return;
        }

        if (!defaultWallet) {
            toast.error('Lỗi dữ liệu!', 'Không tìm thấy thông tin ví mặc định. Vui lòng tải lại trang.');
            return;
        }

        try {
            setSubmitting(true);
            // Update the default wallet with the configured name and balance
            await WalletService.updateWallet(defaultWallet.id, {
                name: walletName.trim(),
                balance: balance
            });

            toast.success('Thiết lập ví thành công! 🎉', 'Bạn đã sẵn sàng sử dụng PayMind.');
            
            // Redirect to main home dashboard
            setTimeout(() => {
                router.replace('/(tabs)');
            }, 1000);
        } catch (error: any) {
            console.log("Error updating wallet balance:", error);
            const msg = error.response?.data?.message || error.message || 'Không thể thiết lập ví lúc này.';
            toast.error('Lỗi thiết lập ví 😅', msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* Background elements */}
            <View style={styles.blobTop} />
            <View style={styles.blobBottom} />

            <KeyboardAvoidingView
                style={styles.keyboardAvoiding}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView 
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header */}
                    <View style={styles.headerContainer}>
                        <View style={styles.sparkIconBox}>
                            <Ionicons name="sparkles" size={16} color="#6366F1" />
                        </View>
                        <Text style={styles.title}>Bật nguồn ví tiền! 💳</Text>
                        <Text style={styles.subtitle}>
                            Hãy nhập số dư ban đầu cho ví của bạn để bắt đầu hành trình ghi chép và theo dõi tài chính.
                        </Text>
                    </View>

                    {loading ? (
                        <View style={styles.loaderContainer}>
                            <ActivityIndicator size="large" color="#6366F1" />
                            <Text style={styles.loaderText}>Đang tạo ví tiền của bạn... 🤖✨</Text>
                        </View>
                    ) : (
                        <View style={styles.formContainer}>
                            {/* Card Display Mockup */}
                            <LinearGradient
                                colors={['#6366F1', '#4F46E5']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.walletCardMockup}
                            >
                                <View style={styles.cardHeader}>
                                    <Text style={styles.cardBrand}>PAYMIND WALLET</Text>
                                    <Ionicons name="wallet-outline" size={24} color="#FFFFFF" />
                                </View>
                                <View style={styles.cardBody}>
                                    <Text style={styles.cardBalanceLabel}>SỐ DƯ HIỆN TẠI</Text>
                                    <Text style={styles.cardBalanceValue} numberOfLines={1} adjustsFontSizeToFit>
                                        {getDisplayAmount()} đ
                                    </Text>
                                </View>
                                <View style={styles.cardFooter}>
                                    <Text style={styles.cardName}>{walletName || 'Tên ví của bạn'}</Text>
                                    <Text style={styles.cardChip}>•••• 8888</Text>
                                </View>
                            </LinearGradient>

                            {/* Wallet Name Input */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Tên ví tiền</Text>
                                <View style={[styles.inputContainer, isNameFocused && styles.inputContainerFocused]}>
                                    <Ionicons name="create-outline" size={18} color={isNameFocused ? '#6366F1' : '#94A3B8'} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        value={walletName}
                                        onChangeText={setWalletName}
                                        placeholder="Ví dụ: Tiền mặt, Ví ATM, Momo..."
                                        placeholderTextColor="#94A3B8"
                                        maxLength={40}
                                        onFocus={() => setIsNameFocused(true)}
                                        onBlur={() => setIsNameFocused(false)}
                                    />
                                </View>
                            </View>

                            {/* Balance Input */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Số tiền ban đầu trong ví</Text>
                                <View style={[styles.inputContainer, isBalanceFocused && styles.inputContainerFocused]}>
                                    <Ionicons name="cash-outline" size={18} color={isBalanceFocused ? '#6366F1' : '#94A3B8'} style={styles.inputIcon} />
                                    <TextInput
                                        style={[styles.input, styles.balanceInput]}
                                        value={balanceStr}
                                        onChangeText={handleFormatAmount}
                                        placeholder="0"
                                        placeholderTextColor="#94A3B8"
                                        keyboardType="numeric"
                                        onFocus={() => setIsBalanceFocused(true)}
                                        onBlur={() => setIsBalanceFocused(false)}
                                    />
                                    <Text style={styles.currencySuffix}>đ</Text>
                                </View>
                            </View>

                            {/* Submit Button */}
                            <TouchableOpacity
                                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                                onPress={handleSubmit}
                                disabled={submitting}
                                activeOpacity={0.85}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                    <>
                                        <Text style={styles.submitBtnText}>Xác nhận & Bắt đầu</Text>
                                        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
    keyboardAvoiding: { flex: 1 },
    scrollContent: { flexGrow: 1, paddingBottom: 40 },
    blobTop: {
        position: 'absolute', top: -60, left: -60,
        width: 220, height: 220, borderRadius: 110,
        backgroundColor: 'rgba(99,102,241,0.05)',
    },
    blobBottom: {
        position: 'absolute', bottom: -60, right: -50,
        width: 180, height: 180, borderRadius: 90,
        backgroundColor: 'rgba(16,185,129,0.05)',
    },
    headerContainer: {
        paddingTop: Platform.OS === 'android' ? 24 : 12,
        paddingBottom: 16,
        paddingHorizontal: 24,
        alignItems: 'center',
    },
    sparkIconBox: {
        width: 32, height: 32, borderRadius: 10,
        backgroundColor: '#EEF2FF', justifyContent: 'center',
        alignItems: 'center', marginBottom: 12,
    },
    title: { fontSize: 22, fontWeight: '800', color: '#1F2937', marginBottom: 8, textAlign: 'center' },
    subtitle: { fontSize: 13, color: '#64748B', lineHeight: 18, fontWeight: '500', textAlign: 'center', paddingHorizontal: 12 },
    
    loaderContainer: { paddingVertical: 80, alignItems: 'center', justifyContent: 'center' },
    loaderText: { marginTop: 16, fontSize: 13, fontWeight: '600', color: '#64748B' },

    formContainer: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 20,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
        elevation: 2,
    },
    walletCardMockup: {
        width: '100%',
        height: 160,
        borderRadius: 20,
        padding: 18,
        justifyContent: 'space-between',
        marginBottom: 24,
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 4,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardBrand: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    cardBody: { gap: 4 },
    cardBalanceLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
    cardBalanceValue: { color: '#FFFFFF', fontSize: 28, fontWeight: '800' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardName: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
    cardChip: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600' },

    inputGroup: { marginBottom: 18 },
    label: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 8, marginLeft: 2 },
    inputContainer: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
        borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14,
        paddingHorizontal: 12, height: 50,
    },
    inputContainerFocused: { borderColor: '#6366F1' },
    inputIcon: { marginRight: 8 },
    input: { flex: 1, fontSize: 14, color: '#1F2937', height: '100%', fontWeight: '500' },
    balanceInput: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
    currencySuffix: { fontSize: 14, fontWeight: '700', color: '#64748B', paddingLeft: 6 },

    submitBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#6366F1', borderRadius: 14, height: 50, marginTop: 10,
        shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
    },
    submitBtnDisabled: { backgroundColor: '#A5B4FC', shadowOpacity: 0, elevation: 0 },
    submitBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' }
});
