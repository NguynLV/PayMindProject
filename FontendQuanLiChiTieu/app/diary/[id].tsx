import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Image, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import diaryService, { DiaryEntry } from '@/services/diary.service';
import { useToast } from '@/components/common/Toast';

const COLORS = {
  primary: '#FF8551',
  bg: '#FFF5E4',
  card: '#FFFFFF',
  text: '#3D2C2C',
  textLight: '#9E7B7B',
  border: '#FFD9BE',
};

export default function DiaryDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const [entry, setEntry] = useState<DiaryEntry | null>(null);
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      diaryService.getById(Number(id))
        .then(data => { setEntry(data); setNote(data.note ?? ''); })
        .catch(() => toast.error('Không tìm thấy!', 'Không tìm thấy nhật ký này rồi homie.'))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleSave = async () => {
    if (!entry) return;
    setSaving(true);
    try {
      const updated = await diaryService.update(entry.id, note);
      setEntry(updated);
      setEditing(false);
      toast.success('Đã cập nhật! ✅', 'Ghi chú đã được cập nhật xịn sò.');
    } catch (e: any) {
      toast.error('Lỗi rồi bạn êi!', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    toast.confirm(
      'Xóa nhật ký?',
      'Bạn chắc chắn muốn xóa kỷ niệm này không?',
      async () => {
        if (!entry) return;
        await diaryService.delete(entry.id);
        router.back();
      },
      'Xóa luôn',
      'Hủy thôi'
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg }}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (!entry) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📔 Chi tiết Nhật ký</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Image */}
        {entry.imageUrl && (
          <Image source={{ uri: entry.imageUrl }} style={styles.image} resizeMode="cover" />
        )}

        <View style={styles.contentCard}>
          {/* Date */}
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
            <Text style={styles.dateText}>
              {new Date(entry.entryDate).toLocaleDateString('vi-VN', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </Text>
          </View>

          {/* Note */}
          <Text style={styles.noteLabel}>Ghi chú</Text>
          {editing ? (
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={500}
              textAlignVertical="top"
              autoFocus
            />
          ) : (
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Text style={entry.note ? styles.noteText : styles.noteEmpty}>
                {entry.note || 'Nhấn để thêm ghi chú...'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Linked transaction */}
          {entry.transactionAmount && (
            <View style={styles.txCard}>
              <Ionicons name="receipt-outline" size={18} color={COLORS.primary} />
              <View style={styles.txInfo}>
                <Text style={styles.txDesc}>{entry.transactionDescription || 'Giao dịch liên kết'}</Text>
                <Text style={[styles.txAmount, { color: entry.transactionType === 'INCOME' ? '#10B981' : '#EF4444' }]}>
                  {entry.transactionType === 'INCOME' ? '+' : '-'}
                  {entry.transactionAmount.toLocaleString('vi-VN')}đ
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Action buttons */}
        {editing && (
          <View style={styles.editActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setNote(entry.note ?? ''); setEditing(false); }}>
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : (
                <Text style={styles.saveBtnText}>Lưu</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 2 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  deleteBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF0F0', justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  image: { width: '100%', height: 280 },
  contentCard: { margin: 16, backgroundColor: COLORS.card, borderRadius: 20, padding: 18, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  dateText: { fontSize: 14, color: COLORS.textLight },
  noteLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textLight, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  noteText: { fontSize: 16, color: COLORS.text, lineHeight: 24 },
  noteEmpty: { fontSize: 15, color: '#CCC', fontStyle: 'italic' },
  noteInput: { fontSize: 16, color: COLORS.text, lineHeight: 24, minHeight: 100, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12 },
  txCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFF8F0', borderRadius: 14, padding: 12, marginTop: 16 },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 13, color: COLORS.text, marginBottom: 2 },
  txAmount: { fontSize: 15, fontWeight: '700' },
  editActions: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelBtnText: { color: COLORS.textLight, fontWeight: '600', fontSize: 15 },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: COLORS.primary, alignItems: 'center', elevation: 3, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
