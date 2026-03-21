import React, { useState } from 'react';
import {
    StyleSheet, View, Text, TextInput, TouchableOpacity,
    Alert, Image, ActivityIndicator, Platform,
    KeyboardAvoidingView, ScrollView, StatusBar
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { CustomDatePicker } from '@/components/common/CustomDatePicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import UserService, { UserProfile } from '@/services/user.service';
import { Gender } from '@/constants/enums';
import { formatDate } from '@/utils/date';

export default function EditProfileScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ user: string }>();
    const insets = useSafeAreaInsets();
    const initial: UserProfile = params.user ? JSON.parse(params.user) : {};

    const [avatar, setAvatar] = useState<ImagePicker.ImagePickerAsset | null>(null);

    const [firstName, setFirstName] = useState(initial.firstName ?? '');
    const [lastName, setLastName] = useState(initial.lastName ?? '');
    const [phone, setPhone] = useState(initial.phone ?? '');
    const [currency, setCurrency] = useState(initial.currency ?? 'VND');
    const [gender, setGender] = useState<Gender>((initial.gender as Gender) ?? Gender.NAM);

    const [birthday, setBirthday] = useState(
        initial.birthday ? new Date(initial.birthday) : new Date()
    );
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loading, setLoading] = useState(false);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to upload your avatar!');
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

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) setBirthday(selectedDate);
    };

    const handleSave = async () => {
        if (!firstName.trim() || !lastName.trim()) {
            Alert.alert('Lỗi', 'Họ và tên không được để trống.');
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
                phone: phone.trim() || undefined,
                birthday: birthday.toISOString().split('T')[0],
                gender,
                currency,
            });
            Alert.alert('Thành công ✅', 'Thông tin đã được cập nhật!', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (error: any) {
            Alert.alert('Lỗi', error?.response?.data?.message ?? 'Không thể cập nhật thông tin.');
        } finally {
            setLoading(false);
        }
    };

    const avatarUri = avatar?.uri ?? initial.avatarUrl ?? null;

    return (
        <View style={styles.mainContainer}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={true} />

            {/* The White background (replacing purple) */}
            <View style={[styles.topWhiteBg, { height: 260 + insets.top }]} />

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 20) }}>

                    {/* Header - matching exact design precisely */}
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={24} color="#111827" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Chỉnh sửa thông tin</Text>
                        <View style={{ width: 44 }} />
                    </View>

                    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                        {/* The form card overlapping */}
                        <View style={styles.card}>

                            {/* Avatar Picker */}
                            <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
                                {avatarUri ? (
                                    <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
                                ) : (
                                    <View style={[styles.avatarImg, { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' }]}>
                                        <Ionicons name="camera" size={32} color="#9CA3AF" />
                                    </View>
                                )}
                                <View style={styles.avatarBadge}>
                                    <Ionicons name="camera" size={16} color="#fff" />
                                </View>
                            </TouchableOpacity>

                            {/* Name */}
                            <View style={styles.formRow}>
                                <View style={styles.inputGroupHalf}>
                                    <Text style={styles.label}>Họ</Text>
                                    <View style={styles.inputContainer}>
                                        <Ionicons name="person-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                                        <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Nguyễn" placeholderTextColor="#9CA3AF" />
                                    </View>
                                </View>
                                <View style={styles.inputGroupHalf}>
                                    <Text style={styles.label}>Tên</Text>
                                    <View style={styles.inputContainer}>
                                        <TextInput style={[styles.input, { paddingLeft: 6 }]} value={firstName} onChangeText={setFirstName} placeholder="An" placeholderTextColor="#9CA3AF" />
                                    </View>
                                </View>
                            </View>

                            {/* Email — read only */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Email</Text>
                                <View style={[styles.inputContainer, styles.inputDisabled]}>
                                    <Ionicons name="mail-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                                    <Text style={styles.inputReadOnly}>{initial.email}</Text>
                                </View>
                            </View>

                            {/* Phone */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Số điện thoại</Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons name="call-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                                    <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="0912 345 678" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" />
                                </View>
                            </View>

                            {/* Birthday & Currency */}
                            <View style={styles.formRow}>
                                <View style={styles.inputGroupHalf}>
                                    <Text style={styles.label}>Ngày sinh</Text>
                                    <TouchableOpacity style={styles.inputContainer} onPress={() => setShowDatePicker(true)}>
                                        <Ionicons name="calendar-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
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
                                    <Text style={styles.label}>Tiền tệ</Text>
                                    <View style={styles.inputContainer}>
                                        <Ionicons name="cash-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                                        <TextInput style={styles.input} value={currency} onChangeText={setCurrency} placeholder="VND" placeholderTextColor="#9CA3AF" autoCapitalize="characters" />
                                    </View>
                                </View>
                            </View>

                            {/* Gender */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Giới tính</Text>
                                <View style={styles.genderContainer}>
                                    {Object.values(Gender).map((g) => (
                                        <TouchableOpacity
                                            key={g}
                                            style={[styles.genderButton, gender === g && styles.genderButtonSelected]}
                                            onPress={() => setGender(g)}
                                        >
                                            <Text style={[styles.genderText, gender === g && styles.genderTextSelected]}>
                                                {g === 'NAM' ? 'Nam' : g === 'NU' ? 'Nữ' : 'Khác'}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Save button inside the card bottom */}
                            <TouchableOpacity
                                style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                                onPress={handleSave}
                                disabled={loading}
                            >
                                {loading
                                    ? <ActivityIndicator color="#ffffff" size="small" />
                                    : <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
                                }
                            </TouchableOpacity>

                        </View>

                        <View style={{ height: 20 }} />
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#ffffff' },
    topWhiteBg: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: '#ffffff', borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },

    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
    iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { flex: 1, color: '#111827', fontSize: 20, fontWeight: '700', textAlign: 'center' },

    scroll: { paddingBottom: 12 },

    card: {
        backgroundColor: '#fff',
        borderRadius: 30,
        marginHorizontal: 16,
        padding: 24,
        paddingTop: 66, // Give room for avatar overlapping
        paddingBottom: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        marginTop: 56,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },

    avatarContainer: {
        position: 'absolute',
        top: -56,
        alignSelf: 'center',
        elevation: 6,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6,
    },
    avatarImg: { width: 112, height: 112, borderRadius: 56, borderWidth: 6, borderColor: '#F3F4F6' },
    avatarBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#5B50DF', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },

    formRow: { flexDirection: 'row', justifyContent: 'space-between' },
    inputGroup: { marginBottom: 20 },
    inputGroupHalf: { marginBottom: 20, width: '47%' },
    label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 10, marginLeft: 2 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 16, paddingHorizontal: 16, height: 56 },
    inputDisabled: { backgroundColor: '#F9FAFB' },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, fontSize: 15, color: '#111827', height: '100%', fontWeight: '400' },
    inputReadOnly: { flex: 1, fontSize: 15, color: '#6B7280', fontWeight: '400' },
    dateText: { flex: 1, fontSize: 15, color: '#111827', fontWeight: '400' },

    genderContainer: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F9FAFB', borderRadius: 16, padding: 6 },
    genderButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    genderButtonSelected: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
    genderText: { color: '#6B7280', fontSize: 14, fontWeight: '400' },
    genderTextSelected: { color: '#5B50DF', fontWeight: '600' },

    saveButton: { backgroundColor: '#5B50DF', marginTop: 10, borderRadius: 20, height: 60, justifyContent: 'center', alignItems: 'center', shadowColor: '#5B50DF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
    saveButtonDisabled: { backgroundColor: '#A5B4FC', shadowOpacity: 0, elevation: 0 },
    saveButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});
