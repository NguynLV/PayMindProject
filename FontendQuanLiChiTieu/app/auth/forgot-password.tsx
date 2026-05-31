import React, { useState } from 'react';
import {
    StyleSheet, View, Text, TextInput, TouchableOpacity,
    ActivityIndicator, KeyboardAvoidingView,
    Platform, ScrollView, SafeAreaView, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AuthService from '@/services/auth.service';
import { useToast } from '@/components/common/Toast';

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const toast = useToast();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [isEmailFocused, setIsEmailFocused] = useState(false);

    const validateEmail = (text: string) => {
        setEmail(text);
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (text.trim() && !emailRegex.test(text.trim())) {
            setEmailError('Email không đúng định dạng');
        } else {
            setEmailError('');
        }
    };

    const handleSend = async () => {
        if (!email.trim()) {
            toast.error('Thiếu thông tin kìa! 😅', 'Vui lòng nhập địa chỉ email của bạn nha');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            setEmailError('Email không đúng định dạng');
            toast.error('Ủa sai rồi! 🥲', 'Email không đúng định dạng, kiểm tra lại nha');
            return;
        }

        setLoading(true);
        try {
            await AuthService.forgotPassword({ email });
            setLoading(false);
            toast.success('Xịn sò! 🎉', 'Mã OTP đã được gửi, kiểm tra hộp thư nha!');
            setTimeout(() => router.push({ pathname: '/auth/reset-password', params: { email } }), 1200);
        } catch (error: any) {
            setLoading(false);
            toast.error('Có lỗi xảy ra! ❌', error?.response?.data?.message || 'Email không tồn tại trong hệ thống nha');
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
                            <Ionicons name="lock-open-outline" size={36} color="#6366F1" />
                        </View>
                        <Text style={styles.title}>Quên mật khẩu?</Text>
                        <Text style={styles.subtitle}>Nhập địa chỉ email tài khoản để khôi phục mật khẩu</Text>
                    </View>

                    {/* Card Container */}
                    <View style={styles.card}>
                        <Text style={styles.desc}>
                            Hệ thống sẽ gửi mã OTP gồm 6 chữ số đến hộp thư của bạn nhằm xác thực danh tính chủ tài khoản.
                        </Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Địa chỉ Email</Text>
                            <View style={[styles.inputRow, isEmailFocused && styles.inputRowFocused]}>
                                <Ionicons name="mail-outline" size={18} color={isEmailFocused ? '#6366F1' : '#94A3B8'} style={styles.icon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Nhập email của bạn"
                                    placeholderTextColor="#94A3B8"
                                    value={email}
                                    onChangeText={validateEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    onFocus={() => setIsEmailFocused(true)}
                                    onBlur={() => setIsEmailFocused(false)}
                                />
                            </View>
                            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.btn,
                                (loading || !email.trim() || !!emailError) && styles.btnDisabled
                            ]}
                            onPress={handleSend}
                            disabled={loading || !email.trim() || !!emailError}
                            activeOpacity={0.85}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.btnText}>Gửi mã xác minh</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.backLink} onPress={() => router.back()} activeOpacity={0.6}>
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
    desc: { fontSize: 13, color: '#64748B', lineHeight: 20, marginBottom: 20, fontWeight: '500' },
    inputGroup: { marginBottom: 20 },
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
    input: { flex: 1, fontSize: 14, color: '#1F2937', height: '100%', fontWeight: '500' },
    btn: {
        backgroundColor: '#6366F1',
        borderRadius: 14,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
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
    errorText: { color: '#EF4444', fontSize: 11, marginTop: 4, marginLeft: 4, fontWeight: '600' },
});
