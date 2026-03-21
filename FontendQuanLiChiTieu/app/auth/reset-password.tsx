import React, { useState } from 'react';
import {
    StyleSheet, View, Text, TextInput, TouchableOpacity,
    Alert, ActivityIndicator, KeyboardAvoidingView,
    Platform, ScrollView, SafeAreaView, StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AuthService from '@/services/auth.service';

export default function ResetPasswordScreen() {
    const router = useRouter();
    const { email } = useLocalSearchParams<{ email: string }>();

    const [otpCode, setOtpCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Verify OTP, 2: Reset Password

    const handleVerifyOtp = async () => {
        if (otpCode.length !== 6) {
            Alert.alert('Lỗi', 'Vui lòng nhập mã OTP chính xác (6 chữ số).');
            return;
        }
        setLoading(true);
        try {
            const trimmedOtp = otpCode.trim();
            await AuthService.verifyResetOtp({ email: email ?? '', otpCode: trimmedOtp });
            setStep(2);
        } catch (error: any) {
            const errorMsg = error?.response?.data?.message || error.message || 'Mã OTP không hợp lệ hoặc đã hết hạn.';
            Alert.alert('Lỗi', errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async () => {
        if (!newPassword || !confirmNewPassword) {
            Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin mật khẩu.');
            return;
        }
        if (newPassword !== confirmNewPassword) {
            Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp.');
            return;
        }
        if (newPassword.length < 8) {
            Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 8 ký tự.');
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
            Alert.alert(
                'Thành công! 🎉',
                'Mật khẩu của bạn đã được đặt lại. Vui lòng đăng nhập lại.',
                [{ text: 'Đăng nhập', onPress: () => router.replace('/auth/login') }]
            );
        } catch (error: any) {
            const errorMsg = error?.response?.data?.message || error.message || 'Có lỗi xảy ra, vui lòng thử lại.';
            Alert.alert('Lỗi', errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
                    {/* Header */}
                    <View style={styles.header}>
                        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
                        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={24} color="#111827" />
                        </TouchableOpacity>
                        <View style={styles.iconWrap}>
                            <Ionicons
                                name={step === 1 ? "mail-open-outline" : "shield-checkmark-outline"}
                                size={44} color="#4F46E5"
                            />
                        </View>
                        <Text style={styles.title}>
                            {step === 1 ? 'Xác minh OTP' : 'Mật khẩu mới'}
                        </Text>
                        <Text style={styles.subtitle}>
                            {step === 1 ? 'Nhập mã OTP vừa được gửi đến email' : 'Vui lòng nhập mật khẩu mới bảo mật hơn'}
                        </Text>
                    </View>

                    {/* Card */}
                    <View style={styles.card}>
                        {email ? (
                            <View style={styles.emailBadge}>
                                <Ionicons name="mail-outline" size={16} color="#4F46E5" />
                                <Text style={styles.emailText}> {email}</Text>
                            </View>
                        ) : null}

                        {step === 1 ? (
                            <>
                                {/* OTP */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Mã OTP (6 chữ số)</Text>
                                    <View style={styles.inputRow}>
                                        <Ionicons name="key-outline" size={20} color="#9CA3AF" style={styles.icon} />
                                        <TextInput
                                            key="otp-input"
                                            style={[styles.input, styles.otpInput]}
                                            placeholder="• • • • • •"
                                            placeholderTextColor="#D1D5DB"
                                            value={otpCode}
                                            onChangeText={setOtpCode}
                                            keyboardType="number-pad"
                                            maxLength={6}
                                        />
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={[styles.btn, loading && styles.btnDisabled]}
                                    onPress={handleVerifyOtp}
                                    disabled={loading}
                                >
                                    {loading
                                        ? <ActivityIndicator color="#fff" size="small" />
                                        : <Text style={styles.btnText}>Tiếp tục</Text>
                                    }
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                {/* New password */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Mật khẩu mới</Text>
                                    <View style={styles.inputRow}>
                                        <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.icon} />
                                        <TextInput
                                            key="new-password-input"
                                            style={styles.input}
                                            placeholder="Tối thiểu 8 ký tự"
                                            placeholderTextColor="#9CA3AF"
                                            value={newPassword}
                                            onChangeText={setNewPassword}
                                            secureTextEntry={!showPass}
                                        />
                                        <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                                            <Ionicons
                                                name={showPass ? 'eye-outline' : 'eye-off-outline'}
                                                size={20} color="#9CA3AF"
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Confirm password */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Xác nhận mật khẩu</Text>
                                    <View style={styles.inputRow}>
                                        <Ionicons name="shield-outline" size={20} color="#9CA3AF" style={styles.icon} />
                                        <TextInput
                                            key="confirm-password-input"
                                            style={styles.input}
                                            placeholder="Nhập lại mật khẩu mới"
                                            placeholderTextColor="#9CA3AF"
                                            value={confirmNewPassword}
                                            onChangeText={setConfirmNewPassword}
                                            secureTextEntry={!showPass}
                                        />
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={[styles.btn, loading && styles.btnDisabled]}
                                    onPress={handleReset}
                                    disabled={loading}
                                >
                                    {loading
                                        ? <ActivityIndicator color="#fff" size="small" />
                                        : <Text style={styles.btnText}>Đặt lại mật khẩu</Text>
                                    }
                                </TouchableOpacity>
                            </>
                        )}

                        <TouchableOpacity style={styles.backLink} onPress={() => router.replace('/auth/login')}>
                            <Ionicons name="arrow-back-outline" size={16} color="#4F46E5" />
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
    safeArea: { flex: 1, backgroundColor: '#ffffff' },
    scrollContent: { flexGrow: 1 },
    header: {
        backgroundColor: '#ffffff',
        paddingTop: 60,
        paddingBottom: 60,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
    },
    backBtn: {
        width: 40, height: 40,
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    iconWrap: {
        width: 80, height: 80,
        backgroundColor: '#EEF2FF',
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: { fontSize: 28, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
    subtitle: { fontSize: 16, color: '#6B7280' },
    card: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginTop: 0,
        borderRadius: 24,
        padding: 24,
        paddingBottom: 40,
        marginBottom: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
    },
    emailBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EEF2FF',
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 14,
        marginBottom: 24,
        alignSelf: 'flex-start',
    },
    emailText: { color: '#4F46E5', fontSize: 14, fontWeight: '600' },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginLeft: 4 },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
    },
    icon: { marginRight: 10 },
    input: { flex: 1, fontSize: 16, color: '#111827', height: '100%', letterSpacing: 0 },
    otpInput: { fontSize: 22, fontWeight: '700', letterSpacing: 8 },
    btn: {
        backgroundColor: '#4F46E5',
        borderRadius: 16,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
        elevation: 5,
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    btnDisabled: { backgroundColor: '#818CF8', elevation: 0, shadowOpacity: 0 },
    btnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
    backLink: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    backLinkText: { color: '#4F46E5', fontSize: 15, fontWeight: '600' },
});
