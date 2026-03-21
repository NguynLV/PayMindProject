import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Image,
    Dimensions,
    StatusBar,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin, statusCodes, isErrorWithCode } from '@/utils/google-auth';
import AuthService from '@/services/auth.service';
import { saveToken } from '@/services/api';

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

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    const [googleLoading, setGoogleLoading] = useState(false);


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
            Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
            return;
        }

        setLoading(true);
        try {
            const response = await AuthService.login({ email, password });
            if (response.authenticated) {
                await saveToken(response.token);
                // Save or clear remembered account
                if (rememberMe) {
                    await AsyncStorage.setItem('remembered_account', JSON.stringify({ email, password }));
                } else {
                    await AsyncStorage.removeItem('remembered_account');
                }
                setLoading(false);
                router.replace('/(tabs)');
            } else {
                setLoading(false);
                Alert.alert('Đăng nhập thất bại', 'Email hoặc mật khẩu không đúng');
            }
        } catch (error: any) {
            setLoading(false);
            const errorMsg = error?.response?.data?.message || error.message || 'Đã có lỗi xảy ra';
            Alert.alert('Lỗi', errorMsg);
        }
    };

    const handleGoogleLogin = async () => {
        if (!GoogleSignin) {
            Alert.alert('Thông báo', 'Tính năng đăng nhập Google hiện chưa hỗ trợ trên Expo Go. Vui lòng dùng bản build chính thức.');
            return;
        }
        setGoogleLoading(true);
        try {
            await GoogleSignin.hasPlayServices();
            try { await GoogleSignin.signOut(); } catch (e) {}
            const userInfo = await GoogleSignin.signIn();
            const idToken = userInfo.data?.idToken;

            if (idToken) {
                // Submit ID token to your Spring Boot backend
                const res = await AuthService.loginWithGoogle(idToken);
                if (res.authenticated) {
                    await saveToken(res.token);
                    if (res.isNewUser) {
                        router.replace('/auth/onboarding');
                    } else {
                        router.replace('/(tabs)');
                    }
                } else {
                    Alert.alert('Lỗi đăng nhập', 'Không thể xác thực tài khoản Google với máy chủ');
                }
            } else {
                Alert.alert('Lỗi', 'Không lấy được thông tin đăng nhập từ Google');
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
                        Alert.alert('Lỗi', 'Google Play Services không khả dụng trên thiết bị của bạn');
                        break;
                    default:
                        Alert.alert('Lỗi Google Sign-In', error.message || 'Thất bại');
                }
            } else {
                Alert.alert('Lỗi đăng nhập Google', error.message || 'Thất bại');
            }
        } finally {
            setGoogleLoading(false);
        }
    };
    return (
        <KeyboardAvoidingView
            style={styles.root}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={true} />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                {/* Purple Hero Header */}
                <View style={styles.hero}>
                    {/* Decorative circles */}
                    <View style={styles.heroBubble1} />
                    <View style={styles.heroBubble2} />
                    {/* Wallet icon art */}
                    <View style={styles.walletCircle}>
                        <Ionicons name="wallet" size={56} color="#A855F7" />
                    </View>
                    <View style={styles.coinBadge}>
                        <Text style={styles.coinText}>đ</Text>
                    </View>
                </View>

                {/* White Content Card */}
                <View style={styles.card}>
                    <Text style={styles.title}>Chào mừng trở lại!</Text>
                    <Text style={styles.subtitle}>Quản lý tài chính sinh viên thông minh hơn</Text>

                    {/* Email Input */}
                    <View style={styles.inputContainer}>
                        <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Email/Số điện thoại"
                            placeholderTextColor="#9CA3AF"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    {/* Password Input */}
                    <View style={styles.inputContainer}>
                        <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Mật khẩu"
                            placeholderTextColor="#9CA3AF"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                            <Ionicons
                                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                                size={20}
                                color="#9CA3AF"
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Remember Me + Forgot Password row */}
                    <View style={styles.rememberRow}>
                        <TouchableOpacity
                            style={styles.rememberToggle}
                            onPress={() => setRememberMe(!rememberMe)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                                {rememberMe && <Ionicons name="checkmark" size={13} color="#fff" />}
                            </View>
                            <Text style={styles.rememberText}>Lưu tài khoản</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push('/auth/forgot-password')}>
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
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.loginBtnText}>Đăng nhập</Text>
                        )}
                    </TouchableOpacity>

                    {/* Divider */}
                    <View style={styles.dividerRow}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>HOẶC ĐĂNG NHẬP VỚI</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    {/* Social Login */}
                    <View style={styles.socialRow}>
                        <TouchableOpacity
                            style={[styles.googleBtn, googleLoading && styles.googleBtnDisabled]}
                            activeOpacity={0.85}
                            onPress={handleGoogleLogin}
                            disabled={googleLoading}
                        >
                            {googleLoading ? (
                                <ActivityIndicator size={22} color="#4285F4" />
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

                    {/* Register Link */}
                    <View style={styles.registerRow}>
                        <Text style={styles.registerText}>Bạn chưa có tài khoản?  </Text>
                        <TouchableOpacity onPress={() => router.push('/auth/register')}>
                            <Text style={styles.registerLink}>Đăng ký ngay</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#ffffff' },
    scrollContent: { flexGrow: 1 },

    // Hero Section
    hero: {
        width: '100%',
        height: 260,
        borderBottomLeftRadius: 36,
        borderBottomRightRadius: 36,
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    heroBubble1: {
        position: 'absolute', width: 200, height: 200,
        borderRadius: 100, backgroundColor: '#F3F4F6',
        top: -60, right: -40,
    },
    heroBubble2: {
        position: 'absolute', width: 140, height: 140,
        borderRadius: 70, backgroundColor: '#F9FAFB',
        bottom: -30, left: -20,
    },
    walletCircle: {
        width: 110, height: 110, borderRadius: 55,
        backgroundColor: '#ffffff',
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1, shadowRadius: 16, elevation: 8,
        borderWidth: 1, borderColor: '#F3F4F6',
    },
    coinBadge: {
        position: 'absolute', bottom: 42, right: width / 2 - 85,
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: '#F59E0B',
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5, shadowRadius: 6, elevation: 4,
    },
    coinText: { color: '#fff', fontSize: 18, fontWeight: '800' },

    // Card
    card: {
        backgroundColor: '#fff',
        marginHorizontal: 0,
        marginTop: 0,
        paddingHorizontal: 28,
        paddingTop: 32,
        paddingBottom: 40,
        flex: 1,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 28,
    },

    // Inputs
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 14,
        paddingHorizontal: 14,
        height: 54,
        marginBottom: 14,
    },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, fontSize: 15, color: '#111827', height: '100%' },
    eyeBtn: { padding: 6 },

    // Remember + Forgot row
    forgotRow: { alignSelf: 'flex-end', marginBottom: 22 },
    forgotText: { fontSize: 14, color: '#4F46E5', fontWeight: '600' },
    rememberRow: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 22,
    },
    rememberToggle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    checkbox: {
        width: 20, height: 20, borderRadius: 6,
        borderWidth: 2, borderColor: '#D1D5DB',
        backgroundColor: '#fff',
        justifyContent: 'center', alignItems: 'center',
    },
    checkboxActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
    rememberText: { fontSize: 14, color: '#374151', fontWeight: '500' },

    // Login Button
    loginBtn: {
        backgroundColor: '#4F46E5',
        borderRadius: 14,
        height: 54,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 5,
        marginBottom: 24,
    },
    loginBtnDisabled: { backgroundColor: '#818CF8', shadowOpacity: 0, elevation: 0 },
    loginBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },

    // Divider
    dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
    dividerText: { color: '#9CA3AF', paddingHorizontal: 12, fontSize: 12, fontWeight: '600' },

    // Social
    socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 28 },
    socialBtn: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: '#E5E7EB',
    },
    googleBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB',
        borderRadius: 14, paddingVertical: 12, paddingHorizontal: 28, gap: 10,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    },
    googleBtnDisabled: { opacity: 0.5 },
    googleLogoImg: { width: 24, height: 24 },
    googleBtnText: { fontSize: 16, fontWeight: '600', color: '#111827' },
    googleText: {
        fontSize: 22, fontWeight: '800',
        color: '#4285F4',
        letterSpacing: -0.5,
    },

    // Register
    registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    registerText: { fontSize: 15, color: '#6B7280' },
    registerLink: { fontSize: 15, color: '#4F46E5', fontWeight: '700' },
});
