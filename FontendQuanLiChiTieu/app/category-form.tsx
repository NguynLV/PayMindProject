import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform, Switch } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CategoryService, CategoryRequest } from '../src/services/category.service';

const ICONS = ['restaurant', 'cafe', 'fast-food', 'cart', 'bus', 'car', 'airplane', 'home', 'business', 'cash', 'card', 'wallet', 'gift', 'heart', 'medkit', 'book', 'school', 'game-controller', 'football', 'musical-notes', 'cut', 'shirt', 'hammer', 'construct', 'flower', 'paw', 'bed', 'briefcase', 'trending-up', 'trending-down', 'receipt', 'code-slash', 'color-palette', 'ellipsis-horizontal-circle'];

const COLORS = ['#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E', '#64748B'];

export default function CategoryFormScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    // Nếu có id tức là đang edit, nếu không thì là create
    const editId = params.id ? parseInt(params.id as string) : null;
    const initialType = (params.type as 'EXPENSE' | 'INCOME') || 'EXPENSE';

    const [name, setName] = useState('');
    const [icon, setIcon] = useState('grid');
    const [color, setColor] = useState('#4F46E5');
    const [type, setType] = useState<'EXPENSE' | 'INCOME'>(initialType);
    const [isMain, setIsMain] = useState(false);

    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(!!editId); // Tự tải nếu có editId

    useEffect(() => {
        if (editId) {
            // Load existing category details to pre-fill the form
            // Cần lấy từ API list rồi tìm, hoặc tạo API GET /categories/{id}
            // Tạm thời fetch list để tìm
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
            // If it's a create, sync the type from params since the screen might not remount
            if (params.type) {
                setType(params.type as 'EXPENSE' | 'INCOME');
            }
            setLoading(false);
        }
    }, [editId, params.type]);

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert("Lỗi", "Vui lòng nhập tên nhóm");
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
            Alert.alert("Lỗi", "Không thể lưu nhóm lúc này");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.center}>
                <ActivityIndicator size="large" color="#4F46E5" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
                    <Ionicons name="close" size={28} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{editId ? 'Sửa Nhóm' : 'Thêm Nhóm Mới'}</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                {/* Preview Circle */}
                <View style={styles.previewContainer}>
                    <View style={[styles.previewIconBox, { backgroundColor: color + '20' }]}>
                        <Ionicons name={icon as any} size={48} color={color} />
                    </View>
                </View>

                {/* Name & Type */}
                <View style={styles.card}>
                    <Text style={styles.label}>Tên nhóm</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ví dụ: Lương, Ăn uống, Giải trí..."
                        placeholderTextColor="#9CA3AF"
                        value={name}
                        onChangeText={setName}
                        autoFocus={!editId}
                    />

                    <View style={styles.divider} />

                    <Text style={[styles.label, { marginTop: 12 }]}>Thuộc loại</Text>
                    <View style={styles.typeRow}>
                        <TouchableOpacity
                            style={[styles.typeBtn, type === 'EXPENSE' && styles.typeBtnActiveExp]}
                            onPress={() => setType('EXPENSE')}
                        >
                            <Text style={[styles.typeText, type === 'EXPENSE' && styles.typeTextActiveExp]}>Khoản chi</Text>
                        </TouchableOpacity>
                        <View style={{ width: 12 }} />
                        <TouchableOpacity
                            style={[styles.typeBtn, type === 'INCOME' && styles.typeBtnActiveInc]}
                            onPress={() => setType('INCOME')}
                        >
                            <Text style={[styles.typeText, type === 'INCOME' && styles.typeTextActiveInc]}>Khoản thu</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.switchRow}>
                        <View>
                            <Text style={styles.label}>Danh mục chính</Text>
                            <Text style={styles.switchHint}>Dùng cho các khoản thu/chi cố định, quan trọng</Text>
                        </View>
                        <Switch
                            value={isMain}
                            onValueChange={setIsMain}
                            trackColor={{ false: '#D1D5DB', true: '#4F46E5' }}
                            thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
                        />
                    </View>
                </View>

                {/* Icon Grid */}
                <Text style={styles.sectionTitle}>Chọn Biểu tượng</Text>
                <View style={styles.gridCard}>
                    {ICONS.map(i => (
                        <TouchableOpacity
                            key={i}
                            style={[styles.iconItem, icon === i && { backgroundColor: color + '20', borderColor: color, borderWidth: 1 }]}
                            onPress={() => setIcon(i)}
                        >
                            <Ionicons name={i as any} size={28} color={icon === i ? color : '#6B7280'} />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Color Palette */}
                <Text style={styles.sectionTitle}>Chọn Màu sắc</Text>
                <View style={[styles.gridCard, { marginBottom: 30 }]}>
                    {COLORS.map(c => (
                        <TouchableOpacity
                            key={c}
                            style={[styles.colorItem, { backgroundColor: c }, color === c && styles.colorItemSelected]}
                            onPress={() => setColor(c)}
                        >
                            {color === c && <Ionicons name="checkmark" size={20} color="#fff" />}
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Lưu Nhóm</Text>}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6', paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff' },
    closeBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },

    scrollContent: { padding: 16 },
    previewContainer: { alignItems: 'center', marginVertical: 16 },
    previewIconBox: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center' },

    card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
    label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
    input: { fontSize: 16, color: '#111827', paddingVertical: 10 },
    divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 8 },

    typeRow: { flexDirection: 'row' },
    typeBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#D1D5DB', alignItems: 'center' },
    typeBtnActiveExp: { backgroundColor: '#FEF2F2', borderColor: '#EF4444' },
    typeBtnActiveInc: { backgroundColor: '#ECFDF5', borderColor: '#10B981' },
    typeText: { fontSize: 15, fontWeight: '500', color: '#6B7280' },
    typeTextActiveExp: { color: '#EF4444', fontWeight: 'bold' },
    typeTextActiveInc: { color: '#10B981', fontWeight: 'bold' },

    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
    switchHint: { fontSize: 12, color: '#9CA3AF', marginTop: -4 },

    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginLeft: 4, marginBottom: 12 },
    gridCard: { backgroundColor: '#fff', borderRadius: 16, padding: 12, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', marginBottom: 24 },

    iconItem: { width: '16.6%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 12 },

    colorItem: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', margin: 6 },
    colorItemSelected: { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },

    footer: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
    saveBtn: { backgroundColor: '#4F46E5', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
