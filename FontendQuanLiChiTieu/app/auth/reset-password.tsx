import React, { useState } from 'react';
import {
    StyleSheet, View, Text, TextInput, TouchableOpacity,
    ActivityIndicator, KeyboardAvoidingView,
    Platform, ScrollView, SafeAreaView, StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AuthService from '@/services/auth.service';
import { useToast } from '@/components/common/Toast';

export default function ResetPasswordScreen() {
    const router = useRouter();
    const { email } = useLocalSearchParams<{ email: string }>();
    const toast = useToast();

    const [otpCode, setOtpCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Verify OTP, 2: Reset Password

    const [isOtpFocused, setIsOtpFocused] = useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);
    const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] = useState(false);

    const handleVerifyOtp = async () => {
        if (otpCode.length !== 6) {
            toast.error('Ủa thiếu số kìa!', 'Vui lòng nhập mã OTP chính xác (6 chữ số) nha.');
            return;
        }
        setLoading(true);
        try {
            const trimmedOtp = otpCode.trim();
            await AuthService.verifyResetOtp({ email: email ?? '', otpCode: trimmedOtp });
            setStep(2);
        } catch (error: any) {
            const errorMsg = error?.response?.data?.message || error.message || 'Mã OTP không hợp lệ hoặc đã hết hạn.';
            toast.error('Lỗi rồi bạn êi!', errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async () => {
        if (!newPassword || !confirmNewPassword) {
            toast.error('Thiếu thông tin!', 'Vui lòng điền đầy đủ thông tin mật khẩu nha.');
            return;
        }
        if (newPassword !== confirmNewPassword) {
            toast.error('Không trùng khớp!', 'Mật khẩu xác nhận chưa giống nhau nè.');
            return;
        }
        if (newPassword.length < 8) {
            toast.error('Mật khẩu yếu quá!', 'Mật khẩu phải có ít nhất 8 ký tự nha.');
            return;
        }

        setLoading(true);
        try {
            const trimmedOtp = otpCode.trim();
            await AuthService.resetPassword({
                email: email ?? '',
                otpCode: trimmedOtp,
                newPassword,
                confirmNewPassword,
            });
            toast.success('Xịn sò! 🎉', 'Mật khẩu của bạn đã được đặt lại rồi á. Đi đăng nhập ngay thôi!');
            setTimeout(() => {
                router.replace('/auth/login');
            }, 1500);
        } catch (error: any) {
            const errorMsg = error?.response?.data?.message || error.message || 'Có lỗi xảy ra, vui lòng thử lại.';
            toast.error('Có gì đó sai sai!', errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={styles.scrollContent} bounces={false} keyboardShouldPersistTaps="handled">
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
                            <Ionicons name="chevron-back" size={24} color="#1F2937" />
                        </TouchableOpacity>
                        
                        <View style={styles.iconWrap}>
                            <Ionicons
                                name={step === 1 ? "mail-open-outline" : "shield-checkmark-outline"}
                                size={36} color="#6366F1"
                            />
                        </View>
                        <Text style={styles.title}>
                            {step === 1 ? 'Xác minh OTP' : 'Mật khẩu mới'}
                        </Text>
                        <Text style={styles.subtitle}>
                            {step === 1 ? 'Nhập mã OTP khôi phục được gửi đến email' : 'Nhập mật khẩu mới bảo mật cho tài khoản của bạn'}
                        </Text>
                    </View>

                    {/* Card Container */}
                    <View style={styles.card}>
                        {email ? (
                            <View style={styles.emailBadge}>
                                <Ionicons name="mail-outline" size={14} color="#6366F1" />
                                <Text style={styles.emailText}> {email}</Text>
                            </View>
                        ) : null}

                        {step === 1 ? (
                            <>
                                {/* OTP input */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Nhập mã OTP (6 chữ số)</Text>
                                    <View style={[styles.inputRow, isOtpFocused && styles.inputRowFocused]}>
                                        <Ionicons name="key-outline" size={18} color={isOtpFocused ? '#6366F1' : '#94A3B8'} style={styles.icon} />
                                        <TextInput
                                            key="otp-input"
                                            style={[styles.input, styles.otpInput]}
                                            placeholder="• • • • • •"
                                            placeholderTextColor="#CBD5E1"
                                            value={otpCode}
                                            onChangeText={setOtpCode}
                                            keyboardType="number-pad"
                                            maxLength={6}
                                            onFocus={() => setIsOtpFocused(true)}
                                            onBlur={() => setIsOtpFocused(false)}
                                        />
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={[styles.btn, loading && styles.btnDisabled]}
                                    onPress={handleVerifyOtp}
                                    disabled={loading}
                                    activeOpacity={0.85}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#FFFFFF" />
                                    ) : (
                                        <Text style={styles.btnText}>Tiếp tục</Text>
                                    )}
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                {/* New password input */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Mật khẩu mới</Text>
                                    <View style={[styles.inputRow, isPasswordFocused && styles.inputRowFocused]}>
                                        <Ionicons name="lock-closed-outline" size={18} color={isPasswordFocused ? '#6366F1' : '#94A3B8'} style={styles.icon} />
                                        <TextInput
                                            key="new-password-input"
                                            style={styles.input}
                                            placeholder="Tối thiểu 8 ký tự"
                                            placeholderTextColor="#94A3B8"
                                            value={newPassword}
                                            onChangeText={setNewPassword}
                                            secureTextEntry={!showPass}
                                            onFocus={() => setIsPasswordFocused(true)}
                                            onBlur={() => setIsPasswordFocused(false)}
                                        />
                                        <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                                            <Ionicons
                                                name={showPass ? 'eye-outline' : 'eye-off-outline'}
                                                size={18} color="#94A3B8"
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Confirm password input */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Xác nhận lại mật khẩu</Text>
                                    <View style={[styles.inputRow, isConfirmPasswordFocused && styles.inputRowFocused]}>
                                        <Ionicons name="shield-outline" size={18} color={isConfirmPasswordFocused ? '#6366F1' : '#94A3B8'} style={styles.icon} />
                                        <TextInput
                                            key="confirm-password-input"
                                            style={styles.input}
                                            placeholder="Nhập lại mật khẩu mới"
                                            placeholderTextColor="#94A3B8"
                                            value={confirmNewPassword}
                                            onChangeText={setConfirmNewPassword}
                                            secureTextEntry={!showPass}
                                            onFocus={() => setIsConfirmPasswordFocused(true)}
                                            onBlur={() => setIsConfirmPasswordFocused(false)}
                                        />
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={[styles.btn, loading && styles.btnDisabled]}
                                    onPress={handleReset}
                                    disabled={loading}
                                    activeOpacity={0.85}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#FFFFFF" />
                                    ) : (
                                        <Text style={styles.btnText}>Đặt lại mật khẩu</Text>
                                    )}
                                </TouchableOpacity>
                            </>
                        )}

                        <TouchableOpacity style={styles.backLink} onPress={() => router.replace('/auth/login')} activeOpacity={0.6}>
                            <Ionicons name="arrow-back-outline" size={14} color="#6366F1" />
                            <Text style={styles.backLinkText}> Quay lại đăng nhập</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
    scrollContent: { flexGrow: 1 },
    header: {
        backgroundColor: '#FFFFFF',
        paddingTop: Platform.OS === 'android' ? 24 : 12,
        paddingBottom: 24,
        paddingHorizontal: 20,
    },
    backBtn: {
        width: 40, height: 40,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1, borderColor: '#F1F5F9'
    },
    iconWrap: {
        width: 72, height: 72,
        backgroundColor: '#EEF2FF',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1, borderColor: '#EEF2FF'
    },
    title: { fontSize: 24, fontWeight: '800', color: '#1F2937', marginBottom: 8 },
    subtitle: { fontSize: 13, color: '#64748B', lineHeight: 18, fontWeight: '500' },
    
    card: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        paddingBottom: 30,
    },
    emailBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EEF2FF',
        borderRadius: 10,
        paddingVertical: 6,
        paddingHorizontal: 12,
        marginBottom: 20,
        alignSelf: 'flex-start',
    },
    emailText: { color: '#6366F1', fontSize: 13, fontWeight: '700' },
    inputGroup: { marginBottom: 18 },
    label: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 8, marginLeft: 2 },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 14,
        paddingHorizontal: 12,
        height: 50,
    },
    inputRowFocused: { borderColor: '#6366F1' },
    icon: { marginRight: 8 },
    input: { flex: 1, fontSize: 14, color: '#1F2937', height: '100%', fontWeight: '500', letterSpacing: 0 },
    otpInput: { fontSize: 20, fontWeight: '700', letterSpacing: 8, paddingLeft: 24, fontVariant: ['tabular-nums'] },
    btn: {
        backgroundColor: '#6366F1',
        borderRadius: 14,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 6,
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    btnDisabled: { backgroundColor: '#A5B4FC', elevation: 0, shadowOpacity: 0 },
    btnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
    backLink: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    backLinkText: { color: '#6366F1', fontSize: 13, fontWeight: '700' },
});
