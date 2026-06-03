import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  TextInput, ActivityIndicator, StatusBar, Dimensions, Modal,
  ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import diaryService from '@/services/diary.service';
import { AiService } from '@/services/ai.service';
import UserService, { UserProfile } from '@/services/user.service';
import { CategoryService, CategoryResponse } from '@/services/category.service';
import { WalletService, WalletResponse } from '@/services/wallet.service';
import { TransactionService, TransactionRequest } from '@/services/transaction.service';
import { useToast } from '@/components/common/Toast';

const { width } = Dimensions.get('window');
const PREVIEW_SIZE = width - 48;

const MOODS = [
  { emoji: '😭', label: 'Rất tệ', value: 'very_bad' },
  { emoji: '😞', label: 'Tệ', value: 'bad' },
  { emoji: '😐', label: 'Bình thường', value: 'neutral' },
  { emoji: '😊', label: 'Tốt', value: 'good' },
  { emoji: '🥰', label: 'Rất tốt', value: 'very_good' },
];

export default function DiaryCreateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  const toast = useToast();
  const entryDate = params.date || new Date().toISOString().split('T')[0];

  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [mood, setMood] = useState('neutral');
  const [saving, setSaving] = useState(false);
  const [showNote, setShowNote] = useState(false);

  // AI integration states
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [wallets, setWallets] = useState<WalletResponse[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    loadInitialData();
    UserService.getMyProfile()
      .then(u => setUser(u))
      .catch(console.warn);
  }, []);

  const loadInitialData = async () => {
    try {
      const [expenseCats, incomeCats, walletList] = await Promise.all([
        CategoryService.getMyCategories('EXPENSE'),
        CategoryService.getMyCategories('INCOME'),
        WalletService.getMyWallets(),
      ]);
      setCategories([...(expenseCats || []), ...(incomeCats || [])]);
      setWallets(walletList || []);
    } catch (err) {
      console.warn('Diary: Failed to load categories/wallets', err);
    }
  };

  // ─── Camera actions ────────────────────────────────────────────────────────
  const handleCapture = async () => {
    if (!permission?.granted) { await requestPermission(); return; }
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.85 });
      if (photo?.uri) setCapturedUri(photo.uri);
    } catch { toast.error('Lỗi camera!', 'Không thể chụp ảnh lúc này.'); }
  };

  const handlePickGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85,
    });
    if (!res.canceled && res.assets[0]) setCapturedUri(res.assets[0].uri);
  };

  const handleRetake = () => { setCapturedUri(null); setNote(''); setShowNote(false); };

  const formatDisplayDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  // ─── Save helpers ─────────────────────────────────────────────────────────
  const saveDiaryOnly = async (linkedTransactionId?: number) => {
    const moodLabel = MOODS.find(m => m.value === mood)?.label ?? '';
    const formattedMood = moodLabel.replace(/\n/g, ' ');
    const fullNote = formattedMood ? `[${formattedMood}] ${note}`.trim() : note;
    await diaryService.create({
      imageUri: capturedUri ?? undefined,
      note: fullNote || undefined,
      entryDate: entryDate,
      transactionId: linkedTransactionId,
    });
    router.back();
  };

  const saveDiaryAndTransaction = async (parsed: any) => {
    try {
      const targetType: 'INCOME' | 'EXPENSE' = parsed.type || 'EXPENSE';
      let finalCategoryId: number | null = null;

      // Try to find existing category
      if (parsed.category) {
        const matched = categories.find(
          c => c.name.toLowerCase() === (parsed.category as string).toLowerCase()
            && c.type === targetType
        );
        if (matched) {
          finalCategoryId = matched.id;
        } else {
          // Auto-create the category
          const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899'];
          const newCat = await CategoryService.createCategory({
            name: (parsed.category as string).trim().charAt(0).toUpperCase()
              + (parsed.category as string).trim().slice(1),
            icon: 'apps',
            color: colors[Math.floor(Math.random() * colors.length)],
            type: targetType,
          });
          finalCategoryId = newCat.id;
          setCategories(prev => [...prev, newCat]);
        }
      }

      if (!finalCategoryId || wallets.length === 0) {
        // Fallback: save diary only without transaction
        await saveDiaryOnly();
        return;
      }

      // Pick wallet based on intent
      let walletId = wallets[0].id;
      if (parsed.walletIntent === 'BANK') {
        const bw = wallets.find(w =>
          w.name.toLowerCase().includes('ngân hàng') ||
          w.name.toLowerCase().includes('bank') ||
          w.name.toLowerCase().includes('thẻ')
        );
        if (bw) walletId = bw.id;
      } else if (parsed.walletIntent === 'CASH') {
        const cw = wallets.find(w =>
          w.name.toLowerCase().includes('tiền mặt') ||
          w.name.toLowerCase().includes('ví')
        );
        if (cw) walletId = cw.id;
      }

      const req: TransactionRequest = {
        amount: parsed.amount,
        type: targetType,
        categoryId: finalCategoryId,
        walletId,
        transactionDate: new Date(entryDate).toISOString(),
        description: parsed.description || note || 'Từ nhật ký chi tiêu',
      };

      const createdTx = await TransactionService.createTransaction(req);
      await saveDiaryOnly(createdTx?.id ?? undefined);
    } catch (err: any) {
      console.warn('Diary: Error saving transaction', err);
      // On error, still save the diary without transaction
      await saveDiaryOnly();
    }
  };

  // ─── Main Save logic ──────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!capturedUri) return;
    setSaving(true);
    try {
      let linkedTxId: number | undefined = undefined;

      if (note.trim()) {
        if (user?.isPremium) {
          try {
            const categoryNames = categories.map(c => c.name);
            const parsed = await AiService.chat(note, categoryNames);

            if (parsed && parsed.intent === 'TRANSACTION' && parsed.amount && parsed.amount > 0) {
              const targetType: 'INCOME' | 'EXPENSE' = parsed.type || 'EXPENSE';
              let finalCategoryId: number | null = null;

              // Look for existing category
              const matchName = parsed.category || 'Kỷ niệm';
              const matched = categories.find(
                c => c.name.toLowerCase() === matchName.toLowerCase() && c.type === targetType
              );

              if (matched) {
                finalCategoryId = matched.id;
              } else {
                // Create category dynamically
                const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899'];
                const formattedName = matchName.trim().charAt(0).toUpperCase() + matchName.trim().slice(1);
                const newCat = await CategoryService.createCategory({
                  name: formattedName,
                  icon: targetType === 'INCOME' ? 'cash-outline' : 'cart-outline',
                  color: colors[Math.floor(Math.random() * colors.length)],
                  type: targetType,
                });
                finalCategoryId = newCat.id;
                setCategories(prev => [...prev, newCat]);
              }

              // Pick wallet
              let walletId = wallets[0]?.id;
              if (wallets.length > 0) {
                if (parsed.walletIntent === 'BANK') {
                  const bw = wallets.find(w =>
                    w.name.toLowerCase().includes('ngân hàng') ||
                    w.name.toLowerCase().includes('bank') ||
                    w.name.toLowerCase().includes('thẻ')
                  );
                  if (bw) walletId = bw.id;
                } else if (parsed.walletIntent === 'CASH') {
                  const cw = wallets.find(w =>
                    w.name.toLowerCase().includes('tiền mặt') ||
                    w.name.toLowerCase().includes('ví')
                  );
                  if (cw) walletId = cw.id;
                }
                if (!walletId) {
                  const def = wallets.find(w => w.isDefault) ?? wallets[0];
                  walletId = def.id;
                }
              }

              if (finalCategoryId && walletId) {
                const req: TransactionRequest = {
                  amount: parsed.amount,
                  type: targetType,
                  categoryId: finalCategoryId,
                  walletId,
                  transactionDate: new Date(entryDate).toISOString(),
                  description: parsed.description || note || 'Từ nhật ký chi tiêu',
                };
                const createdTx = await TransactionService.createTransaction(req);
                linkedTxId = createdTx?.id;
              }
            }
          } catch (aiErr) {
            console.warn('AI Parsing or Tx creation failed:', aiErr);
          }
        } else {
          toast.info(
            'Lưu nhật ký thành công! 📝',
            'Tính năng tạo giao dịch tự động từ nhật ký bằng AI chỉ dành cho tài khoản Premium.'
          );
        }
      }

      await saveDiaryOnly(linkedTxId);
    } catch {
      toast.error('Lưu thất bại', 'Không thể lưu nhật ký. Vui lòng thử lại sau.');
    } finally {
      setSaving(false);
    }
  };

  // ─── UI helpers ───────────────────────────────────────────────────────────
  if (!permission) return <View style={styles.root} />;

  if (!permission.granted) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <Text style={styles.permText}>Cần quyền truy cập camera</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Cấp quyền</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── After capture: preview ───────────────────────────────────────────────
  if (capturedUri) {
    const moodEmoji = MOODS.find(m => m.value === mood)?.emoji ?? '😐';

    return (
      <ScrollView style={styles.root} contentContainerStyle={{ alignItems: 'center', paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />

        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleRetake} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>{`Nhật ký ngày ${formatDisplayDate(entryDate)}`}</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Preview image */}
        <View style={styles.previewWrapper}>
          <Image source={{ uri: capturedUri }} style={styles.preview} />
          
          {/* Mood badge top-right */}
          <View style={styles.moodBadge}>
            <Text style={styles.moodBadgeEmoji}>{moodEmoji}</Text>
          </View>

          <TextInput
            style={styles.notePillInputInside}
            value={note}
            onChangeText={setNote}
            placeholder="Thêm một tin nhắn..."
            placeholderTextColor="rgba(255,255,255,0.45)"
            maxLength={200}
          />
        </View>

        {/* ── Mood selector ── */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>Tâm trạng</Text>
          <View style={styles.moodRow}>
            {MOODS.map(m => (
              <TouchableOpacity
                key={m.value}
                style={[styles.moodItem, mood === m.value && styles.moodItemActive]}
                onPress={() => setMood(m.value)}
              >
                <Text style={styles.moodEmoji}>{m.emoji}</Text>
                <Text style={[styles.moodLabel, mood === m.value && styles.moodLabelActive]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity style={styles.sendBtn} onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#000" />
            : <><Ionicons name="checkmark" size={24} color="#000" /><Text style={styles.sendText}>Lưu nhật ký</Text></>}
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ─── Camera viewfinder ────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <SafeAreaView style={styles.safeArea}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>{`Nhật ký ngày ${formatDisplayDate(entryDate)}`}</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Camera rounded box — Locket style */}
        <View style={styles.cameraWrapper}>
          <CameraView ref={cameraRef} style={styles.camera} facing={facing} />
        </View>

        {/* Bottom controls */}
        <View style={styles.controls}>
          {/* Gallery */}
          <TouchableOpacity onPress={handlePickGallery} style={styles.sideBtn}>
            <Ionicons name="image-outline" size={30} color="#fff" />
          </TouchableOpacity>

          {/* Capture button — Locket gold ring style */}
          <TouchableOpacity onPress={handleCapture} style={styles.captureOuter}>
            <View style={styles.captureInner} />
          </TouchableOpacity>

          {/* Flip */}
          <TouchableOpacity onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')} style={styles.sideBtn}>
            <Ionicons name="camera-reverse-outline" size={30} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  safeArea: { flex: 1, alignItems: 'center' },

  // Top bar
  topBar: {
    width: '100%', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
  },
  topTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  // Camera — Locket rounded style
  cameraWrapper: {
    width: PREVIEW_SIZE, height: PREVIEW_SIZE,
    borderRadius: 32, overflow: 'hidden',
    marginTop: 8,
  },
  camera: { flex: 1 },

  // Camera tip
  cameraTipRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 16, paddingHorizontal: 20,
  },
  cameraTipText: { color: '#aaa', fontSize: 12, flex: 1 },

  // Controls row
  controls: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    width: '100%', paddingHorizontal: 32, marginTop: 'auto', paddingBottom: 16,
  },
  sideBtn: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },

  // Capture button — white circle with gold border
  captureOuter: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 4, borderColor: '#FFB800',
    alignItems: 'center', justifyContent: 'center',
  },
  captureInner: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff',
  },

  // Preview screen
  previewWrapper: {
    width: PREVIEW_SIZE, height: PREVIEW_SIZE,
    borderRadius: 32, overflow: 'hidden',
    marginTop: 8, alignItems: 'center', justifyContent: 'flex-end',
  },
  preview: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  notePillInputInside: {
    position: 'absolute',
    bottom: 16,
    left: 24,
    right: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 20, marginBottom: 16, width: PREVIEW_SIZE,
    backgroundColor: '#FFB800', borderRadius: 28, paddingVertical: 16,
  },
  sendText: { color: '#000', fontSize: 17, fontWeight: '800' },

  // Permission
  permText: { color: '#fff', fontSize: 16, marginBottom: 20, textAlign: 'center' },
  permBtn: { backgroundColor: '#FFB800', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  permBtnText: { color: '#000', fontWeight: '800' },

  // Mood selector
  moodBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  moodBadgeEmoji: { fontSize: 22 },
  sectionBox: { width: PREVIEW_SIZE, marginTop: 16 },
  sectionTitle: { color: '#ccc', fontSize: 13, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moodItem: { alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10, borderRadius: 18, backgroundColor: '#1a1a1a', flex: 1, marginHorizontal: 3 },
  moodItemActive: { backgroundColor: '#2c2010', borderWidth: 2, borderColor: '#FFB800' },
  moodEmoji: { fontSize: 26, marginBottom: 4 },
  moodLabel: { color: '#777', fontSize: 10, fontWeight: '600', textAlign: 'center' },
  moodLabelActive: { color: '#FFB800' },
});
