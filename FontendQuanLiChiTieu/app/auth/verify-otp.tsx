import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, SafeAreaView, StatusBar, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AuthService from '@/services/auth.service';
import { saveToken } from '@/services/api';

export default function VerifyOtpScreen() {
    const router = useRouter();
    const { email } = useLocalSearchParams<{ email: string }>();
    const [otpCode, setOtpCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleVerify = async () => {
        if (!otpCode || !email) {
            Alert.alert('Error', 'Missing information');
            return;
        }

        const trimmedOtp = otpCode.trim();
        if (trimmedOtp.length !== 6) {
            Alert.alert('Lỗi', 'Vui lòng nhập đủ 6 chữ số mã OTP.');
            return;
        }

        setLoading(true);
        try {
            const response = await AuthService.verifyOtp({ email, otpCode: trimmedOtp });
            setLoading(false);

            if (response.authenticated) {
                // Lưu token để duy trì đăng nhập sau onboarding
                await saveToken(response.token);
                router.replace('/auth/register-success');
            } else {
                Alert.alert('Thất bại', 'Mã OTP không đúng. Vui lòng thử lại.');
            }
        } catch (error: any) {
            setLoading(false);
            const errorMsg = error?.response?.data?.message || error.message || 'Xác thực thất bại';
            Alert.alert('Lỗi', errorMsg);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
                    {/* Header Section */}
                    <View style={styles.headerContainer}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => router.back()}
                        >
                            <Ionicons name="arrow-back" size={24} color="#111827" />
                        </TouchableOpacity>
                        <Text style={styles.title}>Xác thực Email</Text>
                        <Text style={styles.subtitle}>
                            Mã OTP đã được gửi đến{'\n'}
                            <Text style={styles.emailText}>{email}</Text>
                        </Text>
                    </View>

                    {/* Form Card */}
                    <View style={styles.card}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Nhập mã OTP (6 chữ số)</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="key-outline" size={22} color="#9CA3AF" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="• • • • • •"
                                    placeholderTextColor="#D1D5DB"
                                    value={otpCode}
                                    onChangeText={setOtpCode}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    textAlign="center"
                                />
                            </View>
                        </View>

                        <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={loading}>
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Xác nhận mã</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => router.back()} style={styles.linkContainer}>
                            <Text style={styles.linkText}>Quay lại trang Đăng ký</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    flex: { flex: 1 },
    scrollContent: { flexGrow: 1 },
    headerContainer: {
        paddingTop: 60,
        paddingBottom: 40,
        paddingHorizontal: 24,
        backgroundColor: '#ffffff',
    },
    backButton: {
        width: 40,
        height: 40,
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
        lineHeight: 24,
    },
    emailText: {
        color: '#4F46E5',
        fontWeight: '700',
    },
    card: {
        backgroundColor: '#ffffff',
        marginHorizontal: 20,
        borderRadius: 24,
        padding: 24,
        paddingBottom: 40,
    },
    inputGroup: {
        marginBottom: 30,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
        textAlign: 'center',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 64,
    },
    inputIcon: {
        marginRight: 0,
        position: 'absolute',
        left: 16,
    },
    input: {
        flex: 1,
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
        letterSpacing: 8,
    },
    button: {
        backgroundColor: '#4F46E5',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    linkContainer: {
        marginTop: 24,
        alignItems: 'center',
    },
    linkText: {
        color: '#6B7280',
        fontSize: 15,
        fontWeight: '500',
    },
});
