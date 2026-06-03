import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, SafeAreaView, StatusBar, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AuthService from '@/services/auth.service';
import { saveToken } from '@/services/api';
import { useToast } from '@/components/common/Toast';

export default function VerifyOtpScreen() {
    const router = useRouter();
    const { email } = useLocalSearchParams<{ email: string }>();
    const toast = useToast();
    const [otpCode, setOtpCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const handleVerify = async () => {
        if (!otpCode || !email) {
            toast.error('Thiếu thông tin', 'Không tìm thấy thông tin email.');
            return;
        }

        const trimmedOtp = otpCode.trim();
        if (trimmedOtp.length !== 6) {
            toast.error('Mã OTP không hợp lệ', 'Vui lòng nhập đủ 6 chữ số của mã OTP.');
            return;
        }

        setLoading(true);
        try {
            const response = await AuthService.verifyOtp({ email, otpCode: trimmedOtp });
            setLoading(false);

            if (response.authenticated) {
                await saveToken(response.token);
                router.replace('/auth/register-success');
            } else {
                toast.error('Mã OTP không chính xác', 'Mã OTP không chính xác. Vui lòng kiểm tra lại.');
            }
        } catch (error: any) {
            setLoading(false);
            const errorMsg = error?.response?.data?.message || error.message || 'Xác thực thất bại';
            toast.error('Xác thực thất bại', errorMsg);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} bounces={false} keyboardShouldPersistTaps="handled">
                    {/* Header Section */}
                    <View style={styles.headerContainer}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => router.back()}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="chevron-back" size={24} color="#1F2937" />
                        </TouchableOpacity>
                        <Text style={styles.title}>Xác thực Email</Text>
                        <Text style={styles.subtitle}>
                            Mã OTP xác thực đã được gửi đến địa chỉ email:{'\n'}
                            <Text style={styles.emailText}>{email}</Text>
                        </Text>
                    </View>

                    {/* Verification Card */}
                    <View style={styles.card}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Nhập mã OTP gồm 6 chữ số</Text>
                            <View style={[styles.inputWrapper, isFocused && styles.inputWrapperFocused]}>
                                <Ionicons name="key-outline" size={18} color={isFocused ? '#6366F1' : '#94A3B8'} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="• • • • • •"
                                    placeholderTextColor="#CBD5E1"
                                    value={otpCode}
                                    onChangeText={setOtpCode}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    textAlign="center"
                                    onFocus={() => setIsFocused(true)}
                                    onBlur={() => setIsFocused(false)}
                                />
                            </View>
                        </View>

                        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleVerify} disabled={loading} activeOpacity={0.85}>
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.buttonText}>Xác nhận mã</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => router.back()} style={styles.linkContainer} activeOpacity={0.6}>
                            <Text style={styles.linkText}>Quay lại trang Đăng ký</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
    flex: { flex: 1 },
    scrollContent: { flexGrow: 1 },
    headerContainer: {
        paddingTop: Platform.OS === 'android' ? 24 : 12,
        paddingBottom: 24,
        paddingHorizontal: 20,
        backgroundColor: '#FFFFFF',
    },
    backButton: {
        width: 40,
        height: 40,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1, borderColor: '#F1F5F9'
    },
    title: { fontSize: 24, fontWeight: '800', color: '#1F2937', marginBottom: 8 },
    subtitle: { fontSize: 13, color: '#64748B', lineHeight: 18, fontWeight: '500' },
    emailText: { color: '#6366F1', fontWeight: '700' },
    
    card: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        paddingBottom: 30,
    },
    inputGroup: { marginBottom: 24 },
    label: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 12, textAlign: 'center' },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 14,
        paddingHorizontal: 12,
        height: 52,
    },
    inputWrapperFocused: { borderColor: '#6366F1' },
    inputIcon: { position: 'absolute', left: 14 },
    input: {
        flex: 1,
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1F2937',
        letterSpacing: 8,
        paddingLeft: 24,
        fontVariant: ['tabular-nums']
    },
    button: {
        backgroundColor: '#6366F1',
        height: 50,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonDisabled: { backgroundColor: '#A5B4FC', shadowOpacity: 0, elevation: 0 },
    buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
    linkContainer: { marginTop: 20, alignItems: 'center' },
    linkText: { color: '#64748B', fontSize: 13, fontWeight: '600' },
});
