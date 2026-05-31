import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Image,
    Dimensions,
    StatusBar,
    SafeAreaView
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin, statusCodes, isErrorWithCode } from '@/utils/google-auth';
import AuthService from '@/services/auth.service';
import { saveToken } from '@/services/api';
import { useToast } from '@/components/common/Toast';

const GOOGLE_WEB_CLIENT_ID = '473436450565-hih6p9ftkiudpi2tplnml8p3pevg2h7q.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID = '473436450565-lbmqavb9i5ogs02gfie2970io80eatks.apps.googleusercontent.com';
const GOOGLE_ANDROID_CLIENT_ID = '473436450565-l0crld2pm33rm1ie2gdkt3kava9h98ah.apps.googleusercontent.com';

if (GoogleSignin) {
    GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        iosClientId: GOOGLE_IOS_CLIENT_ID,
        offlineAccess: true,
    });
}

const { width } = Dimensions.get('window');

export default function LoginScreen() {
    const router = useRouter();
    const toast = useToast();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    const [googleLoading, setGoogleLoading] = useState(false);

    const [isEmailFocused, setIsEmailFocused] = useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);

    // Load saved credentials on mount
    useEffect(() => {
        (async () => {
            const saved = await AsyncStorage.getItem('remembered_account');
            if (saved) {
                const { email: savedEmail, password: savedPassword } = JSON.parse(saved);
                setEmail(savedEmail || '');
                setPassword(savedPassword || '');
                setRememberMe(true);
            }
        })();
    }, []);

    const handleLogin = async () => {
        if (!email || !password) {
            toast.error('Thiếu thông tin rồi!', 'Nhập đầy đủ email và mật khẩu nha.');
            return;
        }

        setLoading(true);
        try {
            const response = await AuthService.login({ email, password });
            if (response.authenticated) {
                await saveToken(response.token);
                if (rememberMe) {
                    await AsyncStorage.setItem('remembered_account', JSON.stringify({ email, password }));
                } else {
                    await AsyncStorage.removeItem('remembered_account');
                }
                setLoading(false);
                router.replace('/(tabs)');
            } else {
                setLoading(false);
                toast.error('Sai rồi bạn êi!', 'Email hoặc mật khẩu không đúng. Kiểm tra lại nha.');
            }
        } catch (error: any) {
            setLoading(false);
            const errorMsg = error?.response?.data?.message || error.message || 'Đã có lỗi xảy ra';
            toast.error('Có lỗi xảy ra!', errorMsg);
        }
    };

    const handleGoogleLogin = async () => {
        if (!GoogleSignin) {
            toast.info('Thông báo', 'Tính năng đăng nhập Google hiện chưa hỗ trợ trên Expo Go. Vui lòng dùng bản build chính thức.');
            return;
        }
        setGoogleLoading(true);
        try {
            await GoogleSignin.hasPlayServices();
            try { await GoogleSignin.signOut(); } catch (e) {}
            const userInfo = await GoogleSignin.signIn();
            const idToken = userInfo.data?.idToken;

            if (idToken) {
                const res = await AuthService.loginWithGoogle(idToken);
                if (res.authenticated) {
                    await saveToken(res.token);
                    if (res.isNewUser) {
                        router.replace('/auth/onboarding');
                    } else {
                        router.replace('/(tabs)');
                    }
                } else {
                    toast.error('Có lỗi xảy ra!', 'Không thể xác thực tài khoản Google với máy chủ');
                }
            } else {
                toast.error('Có lỗi xảy ra!', 'Không lấy được thông tin đăng nhập từ Google');
            }
        } catch (error: any) {
            if (isErrorWithCode(error)) {
                switch (error.code) {
                    case statusCodes.SIGN_IN_CANCELLED:
                        console.log('Google Sign-In Cancelled');
                        break;
                    case statusCodes.IN_PROGRESS:
                        console.log('Google Sign-In in progress');
                        break;
                    case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
                        toast.error('Có lỗi xảy ra!', 'Google Play Services không khả dụng trên thiết bị của bạn');
                        break;
                    default:
                        toast.error('Có lỗi xảy ra!', error.message || 'Thất bại');
                }
            } else {
                toast.error('Có lỗi xảy ra!', error.message || 'Thất bại');
            }
        } finally {
            setGoogleLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.root}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Hero Header Area */}
                    <View style={styles.hero}>
                        <View style={styles.heroBubble1} />
                        <View style={styles.heroBubble2} />
                        <View style={styles.walletSquare}>
                            <Ionicons name="wallet" size={48} color="#6366F1" />
                            <View style={styles.coinBadge}>
                                <Text style={styles.coinText}>đ</Text>
                            </View>
                        </View>
                    </View>

                    {/* Content Area */}
                    <View style={styles.card}>
                        <Text style={styles.title}>Chào mừng trở lại!</Text>
                        <Text style={styles.subtitle}>Quản lý tài chính cá nhân thông minh cùng PayMind</Text>

                        {/* Email Input */}
                        <View style={[styles.inputContainer, isEmailFocused && styles.inputContainerFocused]}>
                            <Ionicons name="mail-outline" size={18} color={isEmailFocused ? '#6366F1' : '#94A3B8'} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Địa chỉ email tài khoản"
                                placeholderTextColor="#94A3B8"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                onFocus={() => setIsEmailFocused(true)}
                                onBlur={() => setIsEmailFocused(false)}
                            />
                        </View>

                        {/* Password Input */}
                        <View style={[styles.inputContainer, isPasswordFocused && styles.inputContainerFocused]}>
                            <Ionicons name="lock-closed-outline" size={18} color={isPasswordFocused ? '#6366F1' : '#94A3B8'} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Nhập mật khẩu"
                                placeholderTextColor="#94A3B8"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                onFocus={() => setIsPasswordFocused(true)}
                                onBlur={() => setIsPasswordFocused(false)}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                                <Ionicons
                                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                                    size={18}
                                    color="#94A3B8"
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Remember Me + Forgot Password */}
                        <View style={styles.rememberRow}>
                            <TouchableOpacity
                                style={styles.rememberToggle}
                                onPress={() => setRememberMe(!rememberMe)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                                    {rememberMe && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                                </View>
                                <Text style={styles.rememberText}>Lưu tài khoản</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => router.push('/auth/forgot-password')} activeOpacity={0.6}>
                                <Text style={styles.forgotText}>Quên mật khẩu?</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Login Button */}
                        <TouchableOpacity
                            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
                            onPress={handleLogin}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.loginBtnText}>Đăng nhập</Text>
                            )}
                        </TouchableOpacity>

                        {/* Divider */}
                        <View style={styles.dividerRow}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>HOẶC TIẾP TỤC VỚI</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* Social Google Login */}
                        <View style={styles.socialRow}>
                            <TouchableOpacity
                                style={[styles.googleBtn, googleLoading && styles.googleBtnDisabled]}
                                activeOpacity={0.85}
                                onPress={handleGoogleLogin}
                                disabled={googleLoading}
                            >
                                {googleLoading ? (
                                    <ActivityIndicator size={20} color="#6366F1" />
                                ) : (
                                    <Image
                                        source={{ uri: 'https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png' }}
                                        style={styles.googleLogoImg}
                                        resizeMode="contain"
                                    />
                                )}
                                <Text style={styles.googleBtnText}>Tiếp tục với Google</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Link Register */}
                        <View style={styles.registerRow}>
                            <Text style={styles.registerText}>Bạn chưa có tài khoản? </Text>
                            <TouchableOpacity onPress={() => router.push('/auth/register')} activeOpacity={0.6}>
                                <Text style={styles.registerLink}>Đăng ký ngay</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#FFFFFF' },
    scrollContent: { flexGrow: 1 },

    hero: {
        width: '100%', height: 220,
        backgroundColor: '#FFFFFF',
        alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        position: 'relative',
    },
    heroBubble1: {
        position: 'absolute', width: 160, height: 160,
        borderRadius: 80, backgroundColor: '#EEF2FF', top: -50, right: -40,
    },
    heroBubble2: {
        position: 'absolute', width: 120, height: 120,
        borderRadius: 60, backgroundColor: '#F8FAFC', bottom: -30, left: -25,
    },
    walletSquare: {
        width: 88, height: 88, borderRadius: 24, backgroundColor: '#FFFFFF',
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#6366F1', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
        borderWidth: 1, borderColor: '#F1F5F9',
        position: 'relative',
    },
    coinBadge: {
        position: 'absolute', bottom: -4, right: -4,
        width: 28, height: 28, borderRadius: 14, backgroundColor: '#F59E0B',
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3, shadowRadius: 4, elevation: 2,
        borderWidth: 2, borderColor: '#FFFFFF',
    },
    coinText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },

    card: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40, flex: 1,
    },
    title: { fontSize: 22, fontWeight: '800', color: '#1F2937', marginBottom: 6 },
    subtitle: { fontSize: 13, color: '#64748B', marginBottom: 28, fontWeight: '500' },

    inputContainer: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
        borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14,
        paddingHorizontal: 12, height: 50, marginBottom: 14,
    },
    inputContainerFocused: { borderColor: '#6366F1' },
    inputIcon: { marginRight: 8 },
    input: { flex: 1, fontSize: 14, color: '#1F2937', height: '100%', fontWeight: '500' },
    eyeBtn: { padding: 6 },

    forgotText: { fontSize: 13, color: '#6366F1', fontWeight: '700' },
    rememberRow: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 22,
    },
    rememberToggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    checkbox: {
        width: 18, height: 18, borderRadius: 5,
        borderWidth: 1.5, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF',
        justifyContent: 'center', alignItems: 'center',
    },
    checkboxActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
    rememberText: { fontSize: 13, color: '#475569', fontWeight: '600' },

    loginBtn: {
        backgroundColor: '#6366F1', borderRadius: 14, height: 50,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15, shadowRadius: 8, elevation: 4, marginBottom: 24,
    },
    loginBtnDisabled: { backgroundColor: '#A5B4FC', shadowOpacity: 0, elevation: 0 },
    loginBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

    dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    dividerLine: { flex: 1, height: 1, backgroundColor: '#F1F5F9' },
    dividerText: { color: '#94A3B8', paddingHorizontal: 12, fontSize: 11, fontWeight: '600' },

    socialRow: { marginBottom: 24 },
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

    registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    registerText: { fontSize: 14, color: '#64748B', fontWeight: '500' },
    registerLink: { fontSize: 14, color: '#6366F1', fontWeight: '700' },
});
