import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Platform, Switch, StatusBar } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CategoryService, CategoryRequest } from '../src/services/category.service';
import { useToast } from '../src/components/common/Toast';

const ICONS = ['restaurant', 'cafe', 'fast-food', 'cart', 'bus', 'car', 'airplane', 'home', 'business', 'cash', 'card', 'wallet', 'gift', 'heart', 'medkit', 'book', 'school', 'game-controller', 'football', 'musical-notes', 'cut', 'shirt', 'hammer', 'construct', 'flower', 'paw', 'bed', 'briefcase', 'trending-up', 'trending-down', 'receipt', 'code-slash', 'color-palette', 'ellipsis-horizontal-circle'];

const COLORS = ['#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E', '#64748B'];

export default function CategoryFormScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const toast = useToast();

    const editId = params.id ? parseInt(params.id as string) : null;
    const initialType = (params.type as 'EXPENSE' | 'INCOME') || 'EXPENSE';

    const [name, setName] = useState('');
    const [icon, setIcon] = useState('grid');
    const [color, setColor] = useState('#6366F1');
    const [type, setType] = useState<'EXPENSE' | 'INCOME'>(initialType);
    const [isMain, setIsMain] = useState(false);

    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(!!editId);

    const [isNameFocused, setIsNameFocused] = useState(false);

    useEffect(() => {
        if (editId) {
            CategoryService.getMyCategories(initialType).then(cats => {
                const existing = cats.find(c => c.id === editId);
                if (existing) {
                    setName(existing.name);
                    setIcon(existing.icon);
                    setColor(existing.color);
                    setType(existing.type as 'EXPENSE' | 'INCOME');
                    setIsMain(existing.isMain);
                }
                setLoading(false);
            }).catch(e => {
                console.log(e);
                setLoading(false);
            });
        } else {
            if (params.type) {
                setType(params.type as 'EXPENSE' | 'INCOME');
            }
            setLoading(false);
        }
    }, [editId, params.type]);

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error('Thiếu tên nhóm!', 'Vui lòng nhập tên nhóm nha homie.');
            return;
        }

        try {
            setSaving(true);
            const data: CategoryRequest = { name: name.trim(), icon, color, type, isMain };
            if (editId) {
                await CategoryService.updateCategory(editId, data);
            } else {
                await CategoryService.createCategory(data);
            }
            router.back();
        } catch (error) {
            console.log(error);
            toast.error('Lưu thất bại!', 'Không thể lưu nhóm lúc này. Thử lại sau nha.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.center}>
                <ActivityIndicator size="large" color="#6366F1" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            
            {/* Header */}
            <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 12 : 8 }]}>
                <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()} activeOpacity={0.7}>
                    <Ionicons name="close" size={26} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{editId ? 'Sửa Nhóm' : 'Thêm Nhóm Mới'}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {/* Preview Circle */}
                <View style={styles.previewContainer}>
                    <View style={[styles.previewIconBox, { backgroundColor: color + '15' }]}>
                        <Ionicons name={icon as any} size={40} color={color} />
                    </View>
                </View>

                {/* Form Elements Card */}
                <View style={[styles.card, isNameFocused && styles.cardFocused]}>
                    <Text style={styles.label}>Tên nhóm thu chi</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ví dụ: Ăn uống, Tiền lương, Di chuyển..."
                        placeholderTextColor="#94A3B8"
                        value={name}
                        onChangeText={setName}
                        autoFocus={!editId}
                        onFocus={() => setIsNameFocused(true)}
                        onBlur={() => setIsNameFocused(false)}
                    />

                    <View style={styles.divider} />

                    <Text style={[styles.label, { marginTop: 12 }]}>Phân loại nhóm</Text>
                    <View style={styles.typeRow}>
                        <TouchableOpacity
                            style={[styles.typeBtn, type === 'EXPENSE' && styles.typeBtnActiveExp]}
                            onPress={() => setType('EXPENSE')}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.typeText, type === 'EXPENSE' && styles.typeTextActiveExp]}>Khoản Chi</Text>
                        </TouchableOpacity>
                        <View style={{ width: 12 }} />
                        <TouchableOpacity
                            style={[styles.typeBtn, type === 'INCOME' && styles.typeBtnActiveInc]}
                            onPress={() => setType('INCOME')}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.typeText, type === 'INCOME' && styles.typeTextActiveInc]}>Khoản Thu</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.switchRow}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.label}>Đặt làm danh mục chính</Text>
                            <Text style={styles.switchHint}>Sử dụng cho các khoản giao dịch cố định hoặc quan trọng thường ngày.</Text>
                        </View>
                        <Switch
                            value={isMain}
                            onValueChange={setIsMain}
                            trackColor={{ false: '#E2E8F0', true: '#6366F1' }}
                            thumbColor="#FFFFFF"
                            ios_backgroundColor="#E2E8F0"
                        />
                    </View>
                </View>

                {/* Icon Selection Card */}
                <Text style={styles.sectionTitle}>Chọn biểu tượng</Text>
                <View style={styles.gridCard}>
                    {ICONS.map(i => (
                        <TouchableOpacity
                            key={i}
                            style={[
                                styles.iconItem, 
                                icon === i && { backgroundColor: color + '15', borderColor: color, borderWidth: 1.5 }
                            ]}
                            onPress={() => setIcon(i)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name={i as any} size={22} color={icon === i ? color : '#64748B'} />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Color Palette Card */}
                <Text style={styles.sectionTitle}>Chọn màu sắc đại diện</Text>
                <View style={[styles.gridCard, { marginBottom: 40 }]}>
                    {COLORS.map(c => (
                        <TouchableOpacity
                            key={c}
                            style={[styles.colorItem, { backgroundColor: c }]}
                            onPress={() => setColor(c)}
                            activeOpacity={0.8}
                        >
                            {color === c && (
                                <View style={styles.colorCheckBg}>
                                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            {/* Footer Button */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={saving}
                    activeOpacity={0.85}
                >
                    {saving ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.saveBtnText}>Lưu Nhóm Giao Dịch</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC', paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    closeBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },

    scrollContent: { padding: 16 },
    previewContainer: { alignItems: 'center', marginVertical: 20 },
    previewIconBox: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', borderStyle: 'solid' },

    card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#F1F5F9' },
    cardFocused: { borderColor: '#6366F1' },
    label: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 8 },
    input: { fontSize: 15, color: '#1F2937', paddingVertical: 8, fontWeight: '500' },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 10 },

    typeRow: { flexDirection: 'row' },
    typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', backgroundColor: '#FFFFFF' },
    typeBtnActiveExp: { backgroundColor: '#FEF2F2', borderColor: '#EF4444' },
    typeBtnActiveInc: { backgroundColor: '#ECFDF5', borderColor: '#10B981' },
    typeText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
    typeTextActiveExp: { color: '#EF4444', fontWeight: '700' },
    typeTextActiveInc: { color: '#10B981', fontWeight: '700' },

    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
    switchHint: { fontSize: 11, color: '#94A3B8', marginTop: 2, lineHeight: 15, fontWeight: '500' },

    sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginLeft: 4, marginBottom: 12 },
    gridCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 20, borderWidth: 1, borderColor: '#F1F5F9' },

    iconItem: { width: '15%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 10, borderWidth: 1.5, borderColor: 'transparent' },

    colorItem: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', margin: 4 },
    colorCheckBg: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.15)', justifyContent: 'center', alignItems: 'center' },

    footer: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    saveBtn: { backgroundColor: '#6366F1', borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
    saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' }
});
