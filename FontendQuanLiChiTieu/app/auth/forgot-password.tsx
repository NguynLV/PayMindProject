import React, { useState } from 'react';
import {
    StyleSheet, View, Text, TextInput, TouchableOpacity,
    Alert, ActivityIndicator, KeyboardAvoidingView,
    Platform, ScrollView, SafeAreaView, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AuthService from '@/services/auth.service';

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [emailError, setEmailError] = useState('');

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
            Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ email của bạn.');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            setEmailError('Email không đúng định dạng');
            Alert.alert('Lỗi', 'Email không đúng định dạng. Vui lòng kiểm tra lại.');
            return;
        }

        setLoading(true);
        try {
            await AuthService.forgotPassword({ email });
            setLoading(false);
            Alert.alert(
                'Đã gửi mã OTP',
                'Kiểm tra hộp thư của bạn để lấy mã xác minh.',
                [{ text: 'OK', onPress: () => router.push({ pathname: '/auth/reset-password', params: { email } }) }]
            );
        } catch (error: any) {
            setLoading(false);
            Alert.alert('Lỗi', error?.response?.data?.message || 'Email không tồn tại trong hệ thống.');
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
                            <Ionicons name="lock-open-outline" size={44} color="#4F46E5" />
                        </View>
                        <Text style={styles.title}>Quên mật khẩu?</Text>
                        <Text style={styles.subtitle}>Nhập email để nhận mã xác minh</Text>
                    </View>

                    {/* Card */}
                    <View style={styles.card}>
                        <Text style={styles.desc}>
                            Chúng tôi sẽ gửi mã OTP gồm 6 chữ số đến email của bạn để xác minh danh tính.
                        </Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email</Text>
                            <View style={styles.inputRow}>
                                <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.icon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Nhập email đã đăng ký"
                                    placeholderTextColor="#9CA3AF"
                                    value={email}
                                    onChangeText={validateEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
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
                        >
                            {loading
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <Text style={styles.btnText}>Gửi mã xác minh</Text>
                            }
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
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
    desc: { fontSize: 14, color: '#6B7280', lineHeight: 22, marginBottom: 24 },
    inputGroup: { marginBottom: 24 },
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
    input: { flex: 1, fontSize: 16, color: '#111827', height: '100%' },
    btn: {
        backgroundColor: '#4F46E5',
        borderRadius: 16,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
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
    errorText: { color: '#EF4444', fontSize: 13, marginTop: 6, marginLeft: 4, fontWeight: '500' },
});
