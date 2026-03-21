import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    Image,
    ActivityIndicator,
    Platform,
    KeyboardAvoidingView,
    ScrollView,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import AuthService from '@/services/auth.service';
import { formatDate } from '@/utils/date';
import { CustomDatePicker } from '@/components/common/CustomDatePicker';
import { GoogleSignin, statusCodes, isErrorWithCode } from '@/utils/google-auth';
import { saveToken } from '@/services/api';
import { Gender } from '@/constants/enums';

const GOOGLE_WEB_CLIENT_ID = '473436450565-hih6p9ftkiudpi2tplnml8p3pevg2h7q.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID = '473436450565-lbmqavb9i5ogs02gfie2970io80eatks.apps.googleusercontent.com';

if (GoogleSignin) {
    GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        iosClientId: GOOGLE_IOS_CLIENT_ID,
        offlineAccess: true,
    });
}

export default function RegisterScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);

    // Form State
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
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
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [currency, setCurrency] = useState('VND');
    const [gender, setGender] = useState<Gender>(Gender.NAM);

    // Date Picker State
    const [birthday, setBirthday] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Avatar State
    const [avatar, setAvatar] = useState<ImagePicker.ImagePickerAsset | null>(null);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to upload your avatar!');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setAvatar(result.assets[0]);
        }
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || birthday;
        setShowDatePicker(Platform.OS === 'ios');
        setBirthday(currentDate);
    };

    const handleRegister = async () => {
        if (!firstName || !lastName || !email || !password || !confirmPassword || !phone) {
            Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ các trường thông tin bắt buộc');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Mật khẩu không khớp', 'Mật khẩu xác nhận không trùng khớp. Vui lòng kiểm tra lại.');
            return;
        }

        setLoading(true);
        try {
            const formattedBirthday = birthday.toISOString().split('T')[0];

            await AuthService.register({
                firstName,
                lastName,
                email,
                password,
                confirmPassword,
                phone,
                currency,
                gender,
                birthday: formattedBirthday,
                avatar: avatar,
            });

            setLoading(false);
            Alert.alert('Đăng ký thành công', 'Vui lòng xác thực email của bạn để tiếp tục.', [
                { text: 'OK', onPress: () => router.push({ pathname: '/auth/verify-otp', params: { email } }) }
            ]);
        } catch (error: any) {
            setLoading(false);
            const errorMsg = error?.response?.data?.message || error.message || 'Đã có lỗi xảy ra';
            Alert.alert('Lỗi đăng ký', errorMsg);
        }
    };

    const handleGoogleLogin = async () => {
        if (!GoogleSignin) {
            Alert.alert('Thông báo', 'Tính năng đăng ký bằng Google hiện chưa hỗ trợ trên Expo Go. Vui lòng dùng bản build chính thức.');
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
                    Alert.alert('Lỗi', 'Không thể xác thực tài khoản Google với máy chủ');
                }
            } else {
                Alert.alert('Lỗi', 'Không lấy được thông tin từ Google');
            }
        } catch (error: any) {
            if (isErrorWithCode(error)) {
                switch (error.code) {
                    case statusCodes.SIGN_IN_CANCELLED:
                        break;
                    case statusCodes.IN_PROGRESS:
                        break;
                    case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
                        Alert.alert('Lỗi', 'Google Play Services không khả dụng');
                        break;
                    default:
                        Alert.alert('Lỗi Google Sign-In', error.message || 'Thất bại');
                }
            } else {
                Alert.alert('Lỗi', error.message || 'Thất bại');
            }
        } finally {
            setGoogleLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                style={styles.keyboardAvoiding}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    {/* Header Section */}
                    <View style={styles.headerContainer}>
                        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => router.back()}
                        >
                            <Ionicons name="arrow-back" size={24} color="#111827" />
                        </TouchableOpacity>
                        <Text style={styles.title}>Tham gia cùng
                            chúng tôi!</Text>
                        <Text style={styles.subtitle}>Tạo tài khoản để bắt đầu quản lý tài chính.</Text>
                    </View>

                    {/* Progress Indicator */}
                    <View style={styles.progressWrapper}>
                        {[1, 2, 3].map((step) => (
                            <View key={step} style={styles.stepIndicatorContainer}>
                                <View style={[
                                    styles.stepDot,
                                    currentStep >= step && styles.stepDotActive,
                                    currentStep > step && styles.stepDotFinished
                                ]}>
                                    {currentStep > step ? (
                                        <Ionicons name="checkmark" size={16} color="#fff" />
                                    ) : (
                                        <Text style={[styles.stepDotText, currentStep >= step && styles.stepDotTextActive]}>{step}</Text>
                                    )}
                                </View>
                                {step < 3 && <View style={[styles.stepLine, currentStep > step && styles.stepLineActive]} />}
                            </View>
                        ))}
                    </View>

                    {/* Step Content */}
                    <View style={styles.formContainer}>
                        {currentStep === 1 && (
                            <>
                                <Text style={styles.stepTitle}>Thông tin tài khoản</Text>
                                {/* Email */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Email</Text>
                                    <View style={styles.inputContainer}>
                                        <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            value={email}
                                            onChangeText={validateEmail}
                                            placeholder="john.doe@example.com"
                                            placeholderTextColor="#9CA3AF"
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                        />
                                    </View>
                                    {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
                                </View>

                                {/* Password */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Mật khẩu</Text>
                                    <View style={styles.inputContainer}>
                                        <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Tạo mật khẩu"
                                            placeholderTextColor="#9CA3AF"
                                            value={password}
                                            onChangeText={setPassword}
                                            secureTextEntry={!showPassword}
                                        />
                                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                            <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#9CA3AF" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Confirm Password */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Xác nhận mật khẩu</Text>
                                    <View style={styles.inputContainer}>
                                        <Ionicons name="shield-checkmark-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Nhập lại mật khẩu"
                                            placeholderTextColor="#9CA3AF"
                                            value={confirmPassword}
                                            onChangeText={setConfirmPassword}
                                            secureTextEntry={!showPassword}
                                        />
                                    </View>
                                </View>
                            </>
                        )}

                        {currentStep === 2 && (
                            <>
                                <Text style={styles.stepTitle}>Thông tin cá nhân</Text>
                                <View style={styles.formRow}>
                                    <View style={styles.inputGroupHalf}>
                                        <Text style={styles.label}>Họ</Text>
                                        <View style={styles.inputContainer}>
                                            <Ionicons name="person-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                            <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="Nguyễn" placeholderTextColor="#9CA3AF" />
                                        </View>
                                    </View>
                                    <View style={styles.inputGroupHalf}>
                                        <Text style={styles.label}>Tên</Text>
                                        <View style={styles.inputContainer}>
                                            <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="An" placeholderTextColor="#9CA3AF" />
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Số điện thoại</Text>
                                    <View style={styles.inputContainer}>
                                        <Ionicons name="call-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            value={phone}
                                            onChangeText={setPhone}
                                            placeholder="09xx xxx xxx"
                                            placeholderTextColor="#9CA3AF"
                                            keyboardType="phone-pad"
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Giới tính</Text>
                                    <View style={styles.genderContainer}>
                                        {Object.values(Gender).map((g) => (
                                            <TouchableOpacity
                                                key={g}
                                                style={[styles.genderButton, gender === g && styles.genderButtonSelected]}
                                                onPress={() => setGender(g)}
                                            >
                                                <Text style={[styles.genderText, gender === g && styles.genderTextSelected]}>{g}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            </>
                        )}

                        {currentStep === 3 && (
                            <>
                                <Text style={styles.stepTitle}>Hoàn thiện thiết lập</Text>
                                {/* Avatar Picker */}
                                <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
                                    {avatar ? (
                                        <Image source={{ uri: avatar.uri }} style={styles.avatar} />
                                    ) : (
                                        <View style={styles.avatarPlaceholder}>
                                            <Ionicons name="camera" size={40} color="#9CA3AF" />
                                            <Text style={styles.avatarText}>Tải ảnh lên</Text>
                                        </View>
                                    )}
                                    <View style={styles.avatarBadge}>
                                        <Ionicons name="add" size={16} color="#fff" />
                                    </View>
                                </TouchableOpacity>

                                <View style={styles.formRow}>
                                    {/* Birthday */}
                                    <View style={styles.inputGroupHalf}>
                                        <Text style={styles.label}>Ngày sinh</Text>
                                        <TouchableOpacity style={styles.inputContainer} onPress={() => setShowDatePicker(true)}>
                                            <Ionicons name="calendar-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                            <Text style={styles.dateText}>{formatDate(birthday)}</Text>
                                        </TouchableOpacity>
                                        <CustomDatePicker
                                            visible={showDatePicker}
                                            onClose={() => setShowDatePicker(false)}
                                            initialDate={birthday}
                                            onSelect={(selectedDate) => {
                                                setBirthday(selectedDate);
                                            }}
                                            title="Chọn ngày sinh"
                                        />
                                    </View>

                                    {/* Currency */}
                                    <View style={styles.inputGroupHalf}>
                                        <Text style={styles.label}>Tiền tệ</Text>
                                        <View style={styles.inputContainer}>
                                            <Ionicons name="cash-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                            <TextInput
                                                style={styles.input}
                                                value={currency}
                                                onChangeText={setCurrency}
                                                placeholder="VND"
                                                placeholderTextColor="#9CA3AF"
                                            />
                                        </View>
                                    </View>
                                </View>
                            </>
                        )}

                        {/* Navigation Buttons */}
                        <View style={styles.stepActions}>
                            {currentStep > 1 && (
                                <TouchableOpacity
                                    style={styles.backStepBtn}
                                    onPress={() => setCurrentStep(prev => prev - 1)}
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
                                    if (currentStep < 3) {
                                        // Basic validation for step 1
                                        if (currentStep === 1) {
                                            if (!email || !password || !confirmPassword) {
                                                Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ email và mật khẩu');
                                                return;
                                            }
                                            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                            if (!emailRegex.test(email.trim())) {
                                                setEmailError('Email không đúng định dạng');
                                                Alert.alert('Lỗi', 'Email không đúng định dạng. Vui lòng kiểm tra lại.');
                                                return;
                                            }
                                            if (password.length < 6) {
                                                Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
                                                return;
                                            }
                                            if (password !== confirmPassword) {
                                                Alert.alert('Lỗi', 'Mật khẩu không khớp');
                                                return;
                                            }
                                            // Check if email already exists
                                            setLoading(true);
                                            try {
                                                const { exists } = await AuthService.checkEmail(email.trim());
                                                if (exists) {
                                                    setLoading(false);
                                                    Alert.alert('Email đã tồn tại', 'Email này đã được đăng ký. Vui lòng sử dụng email khác hoặc đăng nhập.');
                                                    return;
                                                }
                                            } catch (error) {
                                                console.warn('Lỗi kiểm tra email:', error);
                                            }
                                            setLoading(false);

                                            // Step 1 validation passed
                                            setCurrentStep(2);
                                        } else if (currentStep === 2) {
                                            if (!firstName.trim() || !lastName.trim() || !phone.trim() || !gender) {
                                                Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ các thông tin cá nhân (Họ, Tên, Số điện thoại)');
                                                return;
                                            }

                                            // Validate Vietnamese phone number
                                            const phoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})$/;
                                            if (!phoneRegex.test(phone.trim())) {
                                                Alert.alert('Lỗi', 'Số điện thoại không đúng định dạng. ');
                                                return;
                                            }

                                            // Step 2 validation passed
                                            setCurrentStep(3);
                                        }
                                    } else {
                                        handleRegister();
                                    }
                                }}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#ffffff" size="small" />
                                ) : (
                                    <Text style={styles.registerButtonText}>
                                        {currentStep === 3 ? "Hoàn tất" : "Tiếp theo"}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Divider */}
                        <View style={styles.dividerRow}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>HOẶC TIẾP TỤC VỚI</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* Google Social Register */}
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
                            <Text style={styles.googleBtnText}>Đăng ký với Google</Text>
                        </TouchableOpacity>

                        {/* Login Link */}
                        {currentStep === 1 && (
                            <View style={styles.loginContainer}>
                                <Text style={styles.loginText}>Bạn đã có tài khoản? </Text>
                                <TouchableOpacity onPress={() => router.push('/auth/login')}>
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
    safeArea: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    keyboardAvoiding: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    headerContainer: {
        paddingTop: 60,
        paddingBottom: 60,
        paddingHorizontal: 24,
        backgroundColor: '#ffffff',
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
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
    },
    formContainer: {
        backgroundColor: '#ffffff',
        marginHorizontal: 20,
        marginTop: 10,  // Changed from -40 to avoid overlapping progress
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        paddingBottom: 40,
        marginBottom: 20,
    },
    avatarContainer: {
        alignSelf: 'center',
        marginBottom: 30,
        position: 'relative',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        borderColor: '#E5E7EB',
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
    },
    avatarText: {
        color: '#9CA3AF',
        fontSize: 12,
        marginTop: 4,
        fontWeight: '500',
    },
    avatarBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#4F46E5',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#ffffff',
    },
    formRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputGroupHalf: {
        marginBottom: 20,
        width: '48%',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#111827',
        height: '100%',
    },
    dateText: {
        flex: 1,
        fontSize: 16,
        color: '#111827',
    },
    eyeIcon: {
        padding: 5,
    },
    genderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#F9FAFB',
        padding: 4,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    genderButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    genderButtonSelected: {
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    genderText: {
        color: '#6B7280',
        fontSize: 15,
        fontWeight: '500',
    },
    genderTextSelected: {
        color: '#4F46E5',
        fontWeight: 'bold',
    },
    registerButton: {
        backgroundColor: '#4F46E5',
        borderRadius: 16,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
        marginTop: 10,
    },
    registerButtonDisabled: {
        backgroundColor: '#818CF8',
        shadowOpacity: 0,
        elevation: 0,
    },
    registerButtonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
    },
    loginText: {
        color: '#6B7280',
        fontSize: 15,
    },
    loginLink: {
        color: '#4F46E5',
        fontSize: 15,
        fontWeight: 'bold',
    },
    // Divider
    dividerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 20 },
    dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
    dividerText: { color: '#9CA3AF', paddingHorizontal: 12, fontSize: 12, fontWeight: '600' },

    // Google Button
    googleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 16,
        height: 56,
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    googleBtnDisabled: { opacity: 0.5 },
    googleLogoImg: { width: 24, height: 24 },
    googleBtnText: { fontSize: 16, fontWeight: '600', color: '#111827' },
    errorText: { color: '#EF4444', fontSize: 13, marginTop: 6, marginLeft: 4, fontWeight: '500' },

    // Multi-step Styles
    progressWrapper: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -10, // Adjusted position for white background
        marginBottom: 20,
        zIndex: 20,
    },
    stepIndicatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stepDot: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#ffffff',
        borderWidth: 2,
        borderColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    stepDotActive: {
        borderColor: '#4F46E5',
        backgroundColor: '#EEF2FF',
    },
    stepDotFinished: {
        backgroundColor: '#4F46E5',
        borderColor: '#4F46E5',
    },
    stepDotText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#9CA3AF',
    },
    stepDotTextActive: {
        color: '#4F46E5',
    },
    stepLine: {
        width: 40,
        height: 3,
        backgroundColor: '#E5E7EB',
        marginHorizontal: 4,
    },
    stepLineActive: {
        backgroundColor: '#4F46E5',
    },
    stepTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 24,
        textAlign: 'center',
    },
    stepActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
    },
    backStepBtn: {
        flex: 1,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    backStepBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#4B5563',
    },
    nextStepBtn: {
        flex: 2,
        height: 56,
        borderRadius: 16,
        backgroundColor: '#4F46E5',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
});
