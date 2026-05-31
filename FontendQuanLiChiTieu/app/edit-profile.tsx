import React, { useState } from 'react';
import {
    StyleSheet, View, Text, TextInput, TouchableOpacity,
    Image, ActivityIndicator, Platform,
    KeyboardAvoidingView, ScrollView, StatusBar, SafeAreaView
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { CustomDatePicker } from '@/components/common/CustomDatePicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import UserService, { UserProfile } from '@/services/user.service';
import { Gender } from '@/constants/enums';
import { formatDate } from '@/utils/date';
import { useToast } from '@/components/common/Toast';

export default function EditProfileScreen() {
    const router = useRouter();
    const toast = useToast();
    const params = useLocalSearchParams<{ user: string }>();
    const insets = useSafeAreaInsets();
    const initial: UserProfile = params.user ? JSON.parse(params.user) : {};

    const [avatar, setAvatar] = useState<ImagePicker.ImagePickerAsset | null>(null);

    const [firstName, setFirstName] = useState(initial.firstName ?? '');
    const [lastName, setLastName] = useState(initial.lastName ?? '');
    const [currency, setCurrency] = useState(initial.currency ?? 'VND');
    const [gender, setGender] = useState<Gender>((initial.gender as Gender) ?? Gender.NAM);

    const [birthday, setBirthday] = useState(
        initial.birthday ? new Date(initial.birthday) : new Date()
    );
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loading, setLoading] = useState(false);

    const [isFirstNameFocused, setIsFirstNameFocused] = useState(false);
    const [isLastNameFocused, setIsLastNameFocused] = useState(false);
    const [isCurrencyFocused, setIsCurrencyFocused] = useState(false);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            toast.warning('Cần quyền truy cập', 'Cho phép truy cập thư viện ảnh để đổi avatar nha homie!');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });
        if (!result.canceled) {
            setAvatar(result.assets[0]);
        }
    };

    const handleSave = async () => {
        if (!firstName.trim() || !lastName.trim()) {
            toast.error('Ủa thiếu thông tin!', 'Họ và tên không được để trống nha homie.');
            return;
        }
        setLoading(true);
        try {
            if (avatar) {
                await UserService.uploadAvatar(avatar);
            }
            await UserService.updateMyProfile({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                birthday: birthday.toISOString().split('T')[0],
                gender,
                currency,
            });
            toast.success('Cập nhật thành công! 🥳', 'Thông tin của bạn đã được lưu lại!');
            setTimeout(() => router.back(), 1500);
        } catch (error: any) {
            toast.error('Có lỗi xảy ra!', error?.response?.data?.message ?? 'Không thể cập nhật thông tin lúc này.');
        } finally {
            setLoading(false);
        }
    };

    const avatarUri = avatar?.uri ?? initial.avatarUrl ?? null;

    return (
        <SafeAreaView style={styles.mainContainer}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 12 : 8 }]}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Chỉnh Sửa Hồ Sơ</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <View style={styles.card}>
                        {/* Avatar Picker */}
                        <TouchableOpacity onPress={pickImage} style={styles.avatarContainer} activeOpacity={0.9}>
                            {avatarUri ? (
                                <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
                            ) : (
                                <View style={[styles.avatarImg, { backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }]}>
                                    <Ionicons name="camera-outline" size={32} color="#94A3B8" />
                                </View>
                            )}
                            <View style={styles.avatarBadge}>
                                <Ionicons name="camera" size={14} color="#FFFFFF" />
                            </View>
                        </TouchableOpacity>

                        {/* Name Inputs Row */}
                        <View style={styles.formRow}>
                            <View style={styles.inputGroupHalf}>
                                <Text style={styles.label}>Họ</Text>
                                <View style={[styles.inputContainer, isLastNameFocused && styles.inputContainerFocused]}>
                                    <TextInput 
                                        style={styles.input} 
                                        value={lastName} 
                                        onChangeText={setLastName} 
                                        placeholder="Họ của bạn" 
                                        placeholderTextColor="#94A3B8"
                                        onFocus={() => setIsLastNameFocused(true)}
                                        onBlur={() => setIsLastNameFocused(false)}
                                    />
                                </View>
                            </View>
                            
                            <View style={styles.inputGroupHalf}>
                                <Text style={styles.label}>Tên</Text>
                                <View style={[styles.inputContainer, isFirstNameFocused && styles.inputContainerFocused]}>
                                    <TextInput 
                                        style={styles.input} 
                                        value={firstName} 
                                        onChangeText={setFirstName} 
                                        placeholder="Tên của bạn" 
                                        placeholderTextColor="#94A3B8"
                                        onFocus={() => setIsFirstNameFocused(true)}
                                        onBlur={() => setIsFirstNameFocused(false)}
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Email — read only */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Địa chỉ Email</Text>
                            <View style={[styles.inputContainer, styles.inputDisabled]}>
                                <Ionicons name="mail-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                                <Text style={styles.inputReadOnly}>{initial.email}</Text>
                            </View>
                        </View>

                        {/* Birthday & Currency Row */}
                        <View style={styles.formRow}>
                            <View style={styles.inputGroupHalf}>
                                <Text style={styles.label}>Ngày sinh</Text>
                                <TouchableOpacity style={styles.inputContainer} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
                                    <Ionicons name="calendar-outline" size={18} color="#6366F1" style={styles.inputIcon} />
                                    <Text style={styles.dateText}>{formatDate(birthday)}</Text>
                                </TouchableOpacity>
                                <CustomDatePicker
                                    visible={showDatePicker}
                                    onClose={() => setShowDatePicker(false)}
                                    initialDate={birthday}
                                    onSelect={(selectedDate) => {
                                        setBirthday(selectedDate);
                                    }}
                                    title="Sửa ngày sinh"
                                />
                            </View>
                            
                            <View style={styles.inputGroupHalf}>
                                <Text style={styles.label}>Loại tiền tệ</Text>
                                <View style={[styles.inputContainer, isCurrencyFocused && styles.inputContainerFocused]}>
                                    <Ionicons name="cash-outline" size={18} color={isCurrencyFocused ? '#6366F1' : '#94A3B8'} style={styles.inputIcon} />
                                    <TextInput 
                                        style={styles.input} 
                                        value={currency} 
                                        onChangeText={setCurrency} 
                                        placeholder="VND" 
                                        placeholderTextColor="#94A3B8" 
                                        autoCapitalize="characters"
                                        onFocus={() => setIsCurrencyFocused(true)}
                                        onBlur={() => setIsCurrencyFocused(false)}
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Gender selection */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Giới tính</Text>
                            <View style={styles.genderContainer}>
                                {Object.values(Gender).map((g) => (
                                    <TouchableOpacity
                                        key={g}
                                        style={[styles.genderButton, gender === g && styles.genderButtonSelected]}
                                        onPress={() => setGender(g)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.genderText, gender === g && styles.genderTextSelected]}>
                                            {g === 'NAM' ? 'Nam' : g === 'NU' ? 'Nữ' : 'Khác'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Save Button */}
                        <TouchableOpacity
                            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                            onPress={handleSave}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#F8FAFC' },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },

    scroll: { paddingBottom: 30, paddingHorizontal: 16, paddingTop: 60 },

    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        paddingTop: 64,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        position: 'relative',
    },

    avatarContainer: {
        position: 'absolute',
        top: -50,
        alignSelf: 'center',
        shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10,
        elevation: 4,
    },
    avatarImg: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: '#FFFFFF' },
    avatarBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#6366F1', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFFFFF' },

    formRow: { flexDirection: 'row', justifyContent: 'space-between' },
    inputGroup: { marginBottom: 18 },
    inputGroupHalf: { marginBottom: 18, width: '48%' },
    label: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 8, marginLeft: 2 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, height: 48, borderWidth: 1, borderColor: '#E2E8F0' },
    inputContainerFocused: { borderColor: '#6366F1' },
    inputDisabled: { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' },
    inputIcon: { marginRight: 8 },
    input: { flex: 1, fontSize: 14, color: '#1F2937', height: '100%', fontWeight: '500' },
    inputReadOnly: { flex: 1, fontSize: 14, color: '#64748B', fontWeight: '500' },
    dateText: { flex: 1, fontSize: 14, color: '#1F2937', fontWeight: '500' },

    genderContainer: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F8FAFC', borderRadius: 14, padding: 4, borderWidth: 1, borderColor: '#E2E8F0' },
    genderButton: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    genderButtonSelected: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
    genderText: { color: '#64748B', fontSize: 13, fontWeight: '500' },
    genderTextSelected: { color: '#6366F1', fontWeight: '700' },

    saveButton: { backgroundColor: '#6366F1', marginTop: 12, borderRadius: 16, height: 50, justifyContent: 'center', alignItems: 'center', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
    saveButtonDisabled: { backgroundColor: '#A5B4FC', shadowOpacity: 0, elevation: 0 },
    saveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
