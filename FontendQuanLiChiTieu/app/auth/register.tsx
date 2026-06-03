import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Platform,
    KeyboardAvoidingView,
    ScrollView,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AuthService from '@/services/auth.service';

import { saveToken } from '@/services/api';
import { useToast } from '@/components/common/Toast';



export default function RegisterScreen() {
    const router = useRouter();
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');

    const [isFirstNameFocused, setIsFirstNameFocused] = useState(false);
    const [isLastNameFocused, setIsLastNameFocused] = useState(false);
    const [isEmailFocused, setIsEmailFocused] = useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);
    const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] = useState(false);

    const validateEmail = (text: string) => {
        setEmail(text);
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (text.trim() && !emailRegex.test(text.trim())) {
            setEmailError('Email không đúng định dạng');
        } else {
            setEmailError('');
        }
    };
    
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleRegister = async () => {
        if (!firstName || !lastName || !email || !password || !confirmPassword) {
            toast.error('Thiếu thông tin', 'Vui lòng điền đầy đủ các thông tin bắt buộc.');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Mật khẩu không khớp', 'Mật khẩu xác nhận không trùng khớp. Vui lòng kiểm tra lại.');
            return;
        }

        setLoading(true);
        try {
            await AuthService.register({
                firstName,
                lastName,
                email,
                password,
                confirmPassword,
            });

            setLoading(false);
            toast.success('Đăng ký thành công', 'Vui lòng xác thực email của bạn để tiếp tục.');
            setTimeout(() => router.push({ pathname: '/auth/verify-otp', params: { email } }), 1500);
        } catch (error: any) {
            setLoading(false);
            const errorMsg = error?.response?.data?.message || error.message || 'Đã có lỗi xảy ra';
            toast.error('Đăng ký thất bại', errorMsg);
        }
    };



    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                style={styles.keyboardAvoiding}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header Section */}
                    <View style={styles.headerContainer}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => router.back()}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="chevron-back" size={24} color="#1F2937" />
                        </TouchableOpacity>
                        <Text style={styles.title}>Đăng ký tài khoản</Text>
                        <Text style={styles.subtitle}>Tạo tài khoản và bắt đầu quản lý tài chính thông minh</Text>
                    </View>

                    {/* Step Progress Bar */}
                    <View style={styles.progressWrapper}>
                        {[1, 2].map((step) => (
                            <View key={step} style={styles.stepIndicatorContainer}>
                                <View style={[
                                    styles.stepDot,
                                    currentStep >= step && styles.stepDotActive,
                                    currentStep > step && styles.stepDotFinished
                                ]}>
                                    {currentStep > step ? (
                                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                                    ) : (
                                        <Text style={[styles.stepDotText, currentStep >= step && styles.stepDotTextActive]}>{step}</Text>
                                    )}
                                </View>
                                {step < 2 && <View style={[styles.stepLine, currentStep > step && styles.stepLineActive]} />}
                            </View>
                        ))}
                    </View>

                    {/* Step Content Card */}
                    <View style={styles.formContainer}>
                        {currentStep === 1 && (
                            <>
                                <Text style={styles.stepTitle}>Tài khoản & Mật khẩu</Text>
                                
                                {/* Email */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Địa chỉ Email</Text>
                                    <View style={[styles.inputContainer, isEmailFocused && styles.inputContainerFocused]}>
                                        <Ionicons name="mail-outline" size={18} color={isEmailFocused ? '#6366F1' : '#94A3B8'} style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            value={email}
                                            onChangeText={validateEmail}
                                            placeholder="john.doe@example.com"
                                            placeholderTextColor="#94A3B8"
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            onFocus={() => setIsEmailFocused(true)}
                                            onBlur={() => setIsEmailFocused(false)}
                                        />
                                    </View>
                                    {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
                                </View>

                                {/* Password */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Mật khẩu bảo mật</Text>
                                    <View style={[styles.inputContainer, isPasswordFocused && styles.inputContainerFocused]}>
                                        <Ionicons name="lock-closed-outline" size={18} color={isPasswordFocused ? '#6366F1' : '#94A3B8'} style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                                            placeholderTextColor="#94A3B8"
                                            value={password}
                                            onChangeText={setPassword}
                                            secureTextEntry={!showPassword}
                                            onFocus={() => setIsPasswordFocused(true)}
                                            onBlur={() => setIsPasswordFocused(false)}
                                        />
                                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                            <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={18} color="#94A3B8" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Confirm Password */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Xác nhận mật khẩu</Text>
                                    <View style={[styles.inputContainer, isConfirmPasswordFocused && styles.inputContainerFocused]}>
                                        <Ionicons name="shield-checkmark-outline" size={18} color={isConfirmPasswordFocused ? '#6366F1' : '#94A3B8'} style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Xác nhận lại mật khẩu vừa nhập"
                                            placeholderTextColor="#94A3B8"
                                            value={confirmPassword}
                                            onChangeText={setConfirmPassword}
                                            secureTextEntry={!showPassword}
                                            onFocus={() => setIsConfirmPasswordFocused(true)}
                                            onBlur={() => setIsConfirmPasswordFocused(false)}
                                        />
                                    </View>
                                </View>
                            </>
                        )}

                        {currentStep === 2 && (
                            <>
                                <Text style={styles.stepTitle}>Hồ sơ cá nhân</Text>
                                <View style={styles.formRow}>
                                    <View style={styles.inputGroupHalf}>
                                        <Text style={styles.label}>Họ của bạn</Text>
                                        <View style={[styles.inputContainer, isLastNameFocused && styles.inputContainerFocused]}>
                                            <TextInput 
                                                style={[styles.input, { paddingLeft: 0 }]} 
                                                value={lastName} 
                                                onChangeText={setLastName} 
                                                placeholder="Nguyễn" 
                                                placeholderTextColor="#94A3B8"
                                                onFocus={() => setIsLastNameFocused(true)}
                                                onBlur={() => setIsLastNameFocused(false)}
                                            />
                                        </View>
                                    </View>
                                    <View style={styles.inputGroupHalf}>
                                        <Text style={styles.label}>Tên của bạn</Text>
                                        <View style={[styles.inputContainer, isFirstNameFocused && styles.inputContainerFocused]}>
                                            <TextInput 
                                                style={[styles.input, { paddingLeft: 0 }]} 
                                                value={firstName} 
                                                onChangeText={setFirstName} 
                                                placeholder="Văn An" 
                                                placeholderTextColor="#94A3B8"
                                                onFocus={() => setIsFirstNameFocused(true)}
                                                onBlur={() => setIsFirstNameFocused(false)}
                                            />
                                        </View>
                                    </View>
                                </View>
                            </>
                        )}

                        {/* Step Navigation Action Row */}
                        <View style={styles.stepActions}>
                            {currentStep > 1 && (
                                <TouchableOpacity
                                    style={styles.backStepBtn}
                                    onPress={() => setCurrentStep(prev => prev - 1)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.backStepBtnText}>Quay lại</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={[
                                    styles.nextStepBtn,
                                    currentStep === 1 && { marginLeft: 0 },
                                    loading && styles.registerButtonDisabled
                                ]}
                                onPress={async () => {
                                    if (currentStep < 2) {
                                        if (currentStep === 1) {
                                            if (!email || !password || !confirmPassword) {
                                                toast.error('Thiếu thông tin', 'Vui lòng điền đầy đủ email và mật khẩu.');
                                                return;
                                            }
                                            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                            if (!emailRegex.test(email.trim())) {
                                                setEmailError('Email không đúng định dạng');
                                                toast.error('Email không hợp lệ', 'Email nhập vào chưa đúng định dạng. Vui lòng kiểm tra lại.');
                                                return;
                                            }
                                            if (password.length < 6) {
                                                toast.error('Mật khẩu không hợp lệ', 'Mật khẩu phải có ít nhất 6 ký tự.');
                                                return;
                                            }
                                            if (password !== confirmPassword) {
                                                toast.error('Mật khẩu không khớp', 'Mật khẩu xác nhận không trùng khớp. Vui lòng kiểm tra lại.');
                                                return;
                                            }
                                            setLoading(true);
                                            try {
                                                const exists = await AuthService.checkEmail(email.trim());
                                                if (exists) {
                                                    setLoading(false);
                                                    toast.error('Email đã tồn tại', 'Email này đã được đăng ký. Vui lòng sử dụng email khác hoặc đăng nhập.');
                                                    return;
                                                }
                                            } catch (error) {
                                                console.warn('Lỗi kiểm tra email:', error);
                                                setLoading(false);
                                                toast.error('Lỗi xác thực', 'Không thể kiểm tra email lúc này. Vui lòng thử lại sau.');
                                                return;
                                            }
                                            setLoading(false);
                                            setCurrentStep(2);
                                        }
                                    } else {
                                        if (!firstName.trim() || !lastName.trim()) {
                                            toast.error('Thiếu thông tin', 'Vui lòng điền đầy đủ họ và tên.');
                                            return;
                                        }
                                        handleRegister();
                                    }
                                }}
                                disabled={loading}
                                activeOpacity={0.85}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                    <Text style={styles.registerButtonText}>
                                        {currentStep === 2 ? "Xác nhận tạo tài khoản" : "Tiếp theo"}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>


                        {/* Login Navigation Link */}
                        {currentStep === 1 && (
                            <View style={styles.loginContainer}>
                                <Text style={styles.loginText}>Bạn đã có tài khoản? </Text>
                                <TouchableOpacity onPress={() => router.push('/auth/login')} activeOpacity={0.6}>
                                    <Text style={styles.loginLink}>Đăng nhập</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
    keyboardAvoiding: { flex: 1 },
    scrollContent: { flexGrow: 1, paddingBottom: 30 },
    headerContainer: {
        paddingTop: Platform.OS === 'android' ? 24 : 12, 
        paddingBottom: 24, 
        paddingHorizontal: 20,
        backgroundColor: '#FFFFFF',
    },
    backButton: {
        width: 40, height: 40, backgroundColor: '#F8FAFC',
        borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 20,
        borderWidth: 1, borderColor: '#F1F5F9'
    },
    title: { fontSize: 24, fontWeight: '800', color: '#1F2937', marginBottom: 8 },
    subtitle: { fontSize: 13, color: '#64748B', lineHeight: 18, fontWeight: '500' },

    formContainer: {
        backgroundColor: '#FFFFFF', 
        marginHorizontal: 16, 
        marginTop: 8,
        borderRadius: 24, 
        padding: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        paddingBottom: 30,
    },
    formRow: { flexDirection: 'row', justifyContent: 'space-between' },
    inputGroup: { marginBottom: 18 },
    inputGroupHalf: { marginBottom: 18, width: '48%' },
    label: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 8, marginLeft: 2 },
    inputContainer: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
        borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14,
        paddingHorizontal: 12, height: 50,
    },
    inputContainerFocused: { borderColor: '#6366F1' },
    inputIcon: { marginRight: 8 },
    input: { flex: 1, fontSize: 14, color: '#1F2937', height: '100%', fontWeight: '500' },
    eyeIcon: { padding: 5 },
    
    registerButtonDisabled: { backgroundColor: '#A5B4FC', shadowOpacity: 0, elevation: 0 },
    registerButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
    
    loginContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
    loginText: { color: '#64748B', fontSize: 13, fontWeight: '500' },
    loginLink: { color: '#6366F1', fontSize: 13, fontWeight: '700' },
    
    dividerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 18 },
    dividerLine: { flex: 1, height: 1, backgroundColor: '#F1F5F9' },
    dividerText: { color: '#94A3B8', paddingHorizontal: 12, fontSize: 10, fontWeight: '600' },
    
    googleBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0',
        borderRadius: 14, height: 50, gap: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    },
    googleBtnDisabled: { opacity: 0.5 },
    googleLogoImg: { width: 20, height: 20 },
    googleBtnText: { fontSize: 14, fontWeight: '700', color: '#374151' },
    errorText: { color: '#EF4444', fontSize: 11, marginTop: 4, marginLeft: 4, fontWeight: '600' },

    progressWrapper: {
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        marginTop: 0, marginBottom: 20,
    },
    stepIndicatorContainer: { flexDirection: 'row', alignItems: 'center' },
    stepDot: {
        width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFFFFF',
        borderWidth: 2, borderColor: '#E2E8F0',
        justifyContent: 'center', alignItems: 'center',
    },
    stepDotActive: { borderColor: '#6366F1', backgroundColor: '#EEF2FF' },
    stepDotFinished: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
    stepDotText: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
    stepDotTextActive: { color: '#6366F1' },
    stepLine: { width: 44, height: 2.5, backgroundColor: '#E2E8F0', marginHorizontal: 4 },
    stepLineActive: { backgroundColor: '#6366F1' },
    stepTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 18 },

    stepActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    backStepBtn: {
        flex: 1, height: 50, borderRadius: 14,
        backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center',
        marginRight: 10,
    },
    backStepBtnText: { fontSize: 14, fontWeight: '600', color: '#475569' },
    nextStepBtn: {
        flex: 2, height: 50, borderRadius: 14,
        backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center',
        shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
    },
});
