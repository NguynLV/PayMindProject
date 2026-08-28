import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ScrollView, Modal, ActivityIndicator, Dimensions, StatusBar,
  FlatList, TextInput, Platform,
} from 'react-native';
import { getFullImageUrl } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions, FlashMode } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import diaryService, { DiaryEntry } from '@/services/diary.service';
import UserService, { UserProfile } from '@/services/user.service';
import { AiService } from '@/services/ai.service';
import { CategoryService, CategoryResponse } from '@/services/category.service';
import { WalletService, WalletResponse } from '@/services/wallet.service';
import { TransactionService, TransactionRequest, TransactionResponse } from '@/services/transaction.service';
import { useToast } from '@/components/common/Toast';

const { width } = Dimensions.get('window');
const CAM_SIZE = width - 32;
const COLS = 7;
const CELL = Math.floor((width - 64 - 48) / COLS);
const DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const MOODS = [
  { emoji: '😭', label: 'Rất tệ', value: 'very_bad' },
  { emoji: '😞', label: 'Tệ', value: 'bad' },
  { emoji: '😐', label: 'Bình thường', value: 'neutral' },
  { emoji: '😊', label: 'Tốt', value: 'good' },
  { emoji: '🥰', label: 'Rất tốt', value: 'very_good' },
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function formatDisplayDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}
function getMoodEmojiFromNote(note: string | null): string | null {
  if (!note) return null;
  const lower = note.toLowerCase();
  if (lower.includes('hết cứu') || lower.includes('rất tệ') || lower.includes('very_bad')) return '😭';
  if (lower.includes('xu cà na') || lower.includes('tệ') || lower.includes('bad')) return '😞';
  if (lower.includes('vô tri') || lower.includes('bình thường') || lower.includes('neutral')) return '😐';
  if (lower.includes('ổn áp') || lower.includes('tốt') || lower.includes('good')) return '😊';
  if (lower.includes('slay') || lower.includes('rất tốt') || lower.includes('very_good')) return '🥰';

  const emojis = ['😭', '😞', '😐', '😊', '🥰'];
  for (const e of emojis) {
    if (note.includes(e)) return e;
  }
  return null;
}
function parseNoteText(note: string | null) {
  if (!note) return { moodText: '', description: '' };
  const match = note.match(/^\[([\s\S]*?)\]\s*([\s\S]*)$/);
  if (match) {
    let rawMood = match[1].trim();
    if (rawMood.includes('Hết cứu') || rawMood === 'Rất tệ' || rawMood.toLowerCase().includes('very_bad')) {
      rawMood = 'Rất tệ';
    } else if (rawMood.includes('Xu cà na') || rawMood === 'Tệ' || rawMood.toLowerCase().includes('bad')) {
      rawMood = 'Tệ';
    } else if (rawMood.includes('Vô tri') || rawMood === 'Bình thường' || rawMood.toLowerCase().includes('neutral')) {
      rawMood = 'Bình thường';
    } else if (rawMood.includes('Ổn áp') || rawMood === 'Tốt' || rawMood.toLowerCase().includes('good')) {
      rawMood = 'Tốt';
    } else if (rawMood.includes('Slay') || rawMood === 'Rất tốt' || rawMood.toLowerCase().includes('very_good')) {
      rawMood = 'Rất tốt';
    }
        const foundMood = MOODS.find(m => m.value === rawMood || m.label.replace(/\n/g, ' ') === rawMood);
    const moodLabel = foundMood ? foundMood.label.replace(/\n/g, ' ') : rawMood;
    return {
      moodText: moodLabel,
      description: match[2].trim()
    };
  }
  return { moodText: '', description: note };
}

function FeedCard({
  entry,
  txMap,
  user,
  onSelect,
  containerHeight,
}: {
  entry: DiaryEntry;
  txMap: Record<number, TransactionResponse>;
  user: UserProfile | null;
  onSelect: () => void;
  containerHeight: number;
}) {
  const tx = txMap[entry.transactionId ?? -1];
  const categoryName = tx?.category?.name || 'Kỷ niệm';
  const walletName = tx?.wallet?.name || 'Ví';
  const moodEmoji = getMoodEmojiFromNote(entry.note);
  const { moodText, description } = parseNoteText(entry.note);

  return (
    <View style={[cf.card, containerHeight > 0 && { height: containerHeight, justifyContent: 'center', marginBottom: 0 }]}>
      <View style={cf.header}>
        <View style={cf.userInfo}>
          {user?.avatarUrl ? (
            <Image source={{ uri: getFullImageUrl(user.avatarUrl) }} style={cf.avatar} />
          ) : (
            <View style={cf.avatarPlaceholder}>
              <Text style={cf.avatarText}>
                {user ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() : 'U'}
              </Text>
            </View>
          )}
          <Text style={cf.userName}>{user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : 'Người dùng'}</Text>
        </View>
        <Text style={cf.dateText}>{formatCreatedAt(entry.createdAt)}</Text>
      </View>

      <TouchableOpacity activeOpacity={0.9} onPress={onSelect} style={cf.imageWrapper}>
        {entry.imageUrl ? (
          <Image source={{ uri: getFullImageUrl(entry.imageUrl) }} style={cf.image} resizeMode="cover" />
        ) : null}

        <View style={cf.topOverlay}>
          {entry.transactionType && (
            <View style={[cf.pill, { backgroundColor: entry.transactionType === 'INCOME' ? '#059669' : '#DC2626' }]}>
              <Ionicons name={entry.transactionType === 'INCOME' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'} size={13} color="#fff" style={{ marginRight: 4 }} />
              <Text style={cf.pillText}>{entry.transactionType === 'INCOME' ? 'Thu nhập' : 'Chi tiêu'}</Text>
            </View>
          )}
          <View style={cf.pill}>
            {tx ? (
              <Ionicons name={(tx.category?.icon || 'cash-outline') as any} size={13} color="#fff" style={{ marginRight: 4 }} />
            ) : moodEmoji ? (
              <Text style={{ fontSize: 13, marginRight: 4 }}>{moodEmoji}</Text>
            ) : (
              <Ionicons name="cash-outline" size={13} color="#fff" style={{ marginRight: 4 }} />
            )}
            <Text style={cf.pillText}>{categoryName}</Text>
          </View>
          <View style={cf.pill}>
            <Ionicons name="wallet-outline" size={13} color="#fff" style={{ marginRight: 4 }} />
            <Text style={cf.pillText}>{walletName}</Text>
          </View>
        </View>

        <View style={cf.bottomOverlay}>
          {entry.transactionAmount ? (
            <Text style={cf.amount}>
              <Text style={{ color: entry.transactionType === 'INCOME' ? '#4ADE80' : '#F87171' }}>
                {entry.transactionType === 'INCOME' ? '+' : '-'} {new Intl.NumberFormat('vi-VN').format(entry.transactionAmount)}đ
              </Text>
            </Text>
          ) : null}
          {moodText ? (
            <Text style={cf.moodText}>
              {moodEmoji ? <Text style={{ fontSize: 15 }}>{moodEmoji} </Text> : null}
              {moodText}
            </Text>
          ) : null}
          {description ? <Text style={cf.noteText}>{description}</Text> : null}
        </View>
      </TouchableOpacity>
    </View>
  );
}

// ─── EntryCard inside day sheet ───────────────────────────────────────────────
function EntryCard({ entry, onDelete }: { entry: DiaryEntry; onDelete: () => void }) {
  return (
    <View style={ec.card}>
      {entry.imageUrl && (
        <Image source={{ uri: getFullImageUrl(entry.imageUrl) }} style={ec.img} resizeMode="cover" />
      )}
      {entry.note && (
        <View style={ec.noteBubble}>
          <Text style={ec.noteText}>{entry.note}</Text>
        </View>
      )}
      {entry.transactionDescription && (
        <View style={ec.txBadge}>
          <Ionicons name="receipt-outline" size={13} color="#4F46E5" />
          <Text style={ec.txText}>{entry.transactionDescription}</Text>
          <Text style={ec.txAmount}>
            {entry.transactionType === 'INCOME' ? '+' : '-'}
            {new Intl.NumberFormat('vi-VN').format(entry.transactionAmount ?? 0)}đ
          </Text>
        </View>
      )}
      <View style={ec.footer}>
        <Text style={ec.time}>
          {entry.createdAt
            ? new Date(entry.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
            : ''}
        </Text>
        <TouchableOpacity style={ec.deleteBtn} onPress={onDelete}>
          <Ionicons name="trash-outline" size={16} color="#EF4444" />
          <Text style={ec.deleteText}>Xoá</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
const ec = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  img: { width: '100%', aspectRatio: 1.5 },
  noteBubble: { marginHorizontal: 16, marginTop: 14, marginBottom: 8, backgroundColor: '#EEF2FF', borderRadius: 16, padding: 14 },
  noteText: { color: '#1F2937', fontSize: 14, lineHeight: 22 },
  txBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 16, marginBottom: 12, backgroundColor: '#F0FDF4', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#BBF7D0' },
  txText: { color: '#15803D', fontSize: 13, fontWeight: '600', flex: 1 },
  txAmount: { color: '#15803D', fontSize: 13, fontWeight: '800' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  time: { color: '#9CA3AF', fontSize: 12 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  deleteText: { color: '#EF4444', fontSize: 13, fontWeight: '600' },
});

// ─── CAPTURE TAB ──────────────────────────────────────────────────────────────
function CaptureTab({
  user,
  recentEntry,
  onSaved,
  entries,
  txMap,
  onSelectEntry,
}: {
  user: UserProfile | null;
  recentEntry: DiaryEntry | null;
  onSaved: () => void;
  entries: DiaryEntry[];
  txMap: Record<number, TransactionResponse>;
  onSelectEntry: (entry: DiaryEntry) => void;
}) {
  const toast = useToast();
  const cameraRef = useRef<CameraView>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [containerHeight, setContainerHeight] = useState<number>(0);

  const scrollToFeed = () => {
    if (containerHeight > 0) {
      scrollViewRef.current?.scrollTo({ y: containerHeight, animated: true });
    }
  };

  // Form state
  const [note, setNote] = useState('');
  const [mood, setMood] = useState<string>('neutral');
  const [txType, setTxType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [selectedWalletId, setSelectedWalletId] = useState<number | null>(null);
  const [wallets, setWallets] = useState<WalletResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [showWalletPicker, setShowWalletPicker] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    (async () => {
      try {
        const [expCats, incCats, wl] = await Promise.all([
          CategoryService.getMyCategories('EXPENSE'),
          CategoryService.getMyCategories('INCOME'),
          WalletService.getMyWallets(),
        ]);
        setCategories([...(expCats || []), ...(incCats || [])]);
        setWallets(wl || []);
        if (wl && wl.length > 0) {
          const def = wl.find(w => w.isDefault) ?? wl[0];
          setSelectedWalletId(def.id);
        }
      } catch {}
    })();
  }, []);

  const selectedWallet = wallets.find(w => w.id === selectedWalletId) ?? wallets[0];

  const handleCapture = async () => {
    if (!permission?.granted) { await requestPermission(); return; }
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.5 });
      if (photo?.uri) setCapturedUri(photo.uri);
    } catch { toast.error('Lỗi camera!', 'Không thể chụp ảnh lúc này.'); }
  };

  const handlePickGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
    if (!res.canceled && res.assets[0]) setCapturedUri(res.assets[0].uri);
  };

  const handleRetake = () => { setCapturedUri(null); setNote(''); };

  const moodEmoji = MOODS.find(m => m.value === mood)?.emoji ?? '😐';

  const saveDiaryOnly = async (linkedTxId?: number) => {
    const moodLabel = MOODS.find(m => m.value === mood)?.label ?? '';
    const formattedMood = moodLabel.replace(/\n/g, ' ');
    const fullNote = formattedMood ? `[${formattedMood}] ${note}`.trim() : note;
    await diaryService.create({
      imageUri: capturedUri ?? undefined,
      note: fullNote || undefined,
      entryDate: todayStr,
      transactionId: linkedTxId,
    });
  };

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
                // Add to local state categories
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
                  transactionDate: new Date().toISOString(),
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
      onSaved();
      toast.success('Đã lưu! 💫', 'Kỷ niệm hôm nay đã được ghi lại.');
      setCapturedUri(null); setNote('');
    } catch {
      toast.error('Lưu thất bại', 'Không thể lưu. Vui lòng thử lại sau.');
    } finally {
      setSaving(false);
    }
  };

  if (!permission) return <View style={ct.root} />;

  // ── After capture: preview + form ─────────────────────────────────────────
  if (capturedUri) {
    return (
      <ScrollView style={ct.root} contentContainerStyle={{ alignItems: 'center', paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />

        {/* Top bar */}
        <View style={ct.topBar}>
          <TouchableOpacity style={ct.pillBtn} onPress={handleRetake}>
            <Ionicons name="arrow-back" size={18} color="#fff" />
          </TouchableOpacity>
          <Text style={ct.topTitle}>Kỷ niệm hôm nay</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Preview — note overlay inside the photo frame */}
        <View style={ct.previewWrapper}>
          <Image source={{ uri: capturedUri }} style={ct.previewImg} resizeMode="cover" />

          {/* Mood badge top-right */}
          <View style={ct.moodBadge}>
            <Text style={ct.moodBadgeEmoji}>{moodEmoji}</Text>
          </View>

          {/* Note input inside photo (Locket style) */}
          <TextInput
            style={ct.notePillInputInside}
            value={note}
            onChangeText={setNote}
            placeholder="Thêm một tin nhắn..."
            placeholderTextColor="rgba(255,255,255,0.45)"
            maxLength={200}
          />
        </View>

        {/* ── Mood selector ── */}
        <View style={ct.sectionBox}>
          <Text style={ct.sectionTitle}>Tâm trạng</Text>
          <View style={ct.moodRow}>
            {MOODS.map(m => (
              <TouchableOpacity
                key={m.value}
                style={[ct.moodItem, mood === m.value && ct.moodItemActive]}
                onPress={() => setMood(m.value)}
              >
                <Text style={ct.moodEmoji}>{m.emoji}</Text>
                <Text style={[ct.moodLabel, mood === m.value && ct.moodLabelActive]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Save ── */}
        <TouchableOpacity style={ct.saveBtn} onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#000" />
            : <><Ionicons name="checkmark-circle" size={22} color="#000" /><Text style={ct.saveBtnText}>Lưu kỷ niệm</Text></>
          }
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── Camera viewfinder ──────────────────────────────────────────────────────
  return (
    <ScrollView
      ref={scrollViewRef}
      style={ct.root}
      contentContainerStyle={{ flexGrow: 1 }}
      pagingEnabled={containerHeight > 0}
      decelerationRate="fast"
      showsVerticalScrollIndicator={false}
      onLayout={(e) => {
        const { height } = e.nativeEvent.layout;
        if (height > 0 && height !== containerHeight) {
          setContainerHeight(height);
        }
      }}
    >
      <View style={{ height: containerHeight || 'auto', justifyContent: 'space-between', paddingBottom: Platform.OS === 'ios' ? 12 : 20 }}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={ct.topBar}>
          <TouchableOpacity style={ct.pillBtn} onPress={() => setFlash(f => f === 'off' ? 'on' : 'off')}>
            <Ionicons name={flash === 'on' ? 'flash' : 'flash-off'} size={18} color={flash === 'on' ? '#FFB800' : '#fff'} />
          </TouchableOpacity>
          <Text style={ct.topTitle}>Kỷ niệm hôm nay</Text>
          <TouchableOpacity style={ct.pillBtn} onPress={handlePickGallery}>
            <Ionicons name="images-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {permission?.granted ? (
          <View style={ct.cameraWrapper}>
            <CameraView ref={cameraRef} style={ct.camera} facing={facing} flash={flash} />
            <View style={ct.zoomPill}><Text style={ct.zoomText}>1×</Text></View>
          </View>
        ) : (
          <View style={ct.cameraWrapper}>
            <View style={ct.permBox}>
              <Ionicons name="camera-outline" size={48} color="#555" />
              <Text style={ct.permText}>Cần quyền camera</Text>
              <TouchableOpacity style={ct.permBtn} onPress={requestPermission}>
                <Text style={ct.permBtnText}>Cấp quyền</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={ct.controls}>
          <TouchableOpacity onPress={recentEntry ? () => onSelectEntry(recentEntry) : handlePickGallery} style={ct.sideBtn}>
            {recentEntry?.imageUrl ? (
              <Image source={{ uri: getFullImageUrl(recentEntry.imageUrl) }} style={ct.recentThumb} />
            ) : (
              <View style={ct.sideBtnBox}><Ionicons name="image-outline" size={26} color="#fff" /></View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCapture} style={ct.captureOuter} activeOpacity={0.8}>
            <View style={ct.captureInner} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')} style={ct.sideBtnBox}>
            <Ionicons name="camera-reverse-outline" size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        {recentEntry ? (
          <TouchableOpacity onPress={scrollToFeed} style={ct.historyRow} activeOpacity={0.8}>
            <Ionicons name="time-outline" size={14} color="#aaa" />
            <Text style={ct.historyText}>Lịch sử ảnh đã đăng</Text>
            <Ionicons name="chevron-down" size={12} color="#aaa" style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        ) : (
          <View style={{ height: 40 }} />
        )}
      </View>

      {entries.length === 0 ? (
        <View style={[cf.emptyContainer, containerHeight > 0 && { height: containerHeight }]}>
          <Ionicons name="images-outline" size={40} color="#333" />
          <Text style={cf.emptyText}>Chưa có ảnh nhật ký nào</Text>
        </View>
      ) : (
        [...entries]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .map(entry => (
            <FeedCard
              key={entry.id}
              entry={entry}
              txMap={txMap}
              user={user}
              onSelect={() => onSelectEntry(entry)}
              containerHeight={containerHeight}
            />
          ))
      )}
    </ScrollView>
  );
}

const ct = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  topBar: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  topTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  pillBtn: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  cameraWrapper: { width: CAM_SIZE, height: CAM_SIZE, borderRadius: 36, overflow: 'hidden', backgroundColor: '#1a1a1a', alignSelf: 'center' },
  camera: { flex: 1 },
  permBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  permText: { color: '#777', fontSize: 15 },
  permBtn: { backgroundColor: '#FFB800', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 16 },
  permBtnText: { color: '#000', fontWeight: '700' },
  zoomPill: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  zoomText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 40, marginTop: 28 },
  sideBtn: { width: 56, height: 56 },
  sideBtnBox: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  recentThumb: { width: 56, height: 56, borderRadius: 16, borderWidth: 2, borderColor: '#FFB800' },
  captureOuter: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#FFB800', alignItems: 'center', justifyContent: 'center' },
  captureInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff' },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 20, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'center' },
  historyText: { color: '#aaa', fontSize: 13, fontWeight: '600' },
  historyDate: { color: '#666', fontSize: 13 },

  // Preview / Form
  previewWrapper: { width: CAM_SIZE, height: CAM_SIZE, borderRadius: 36, overflow: 'hidden', alignSelf: 'center', position: 'relative' },
  previewImg: { width: '100%', height: '100%' },
  moodBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  moodBadgeEmoji: { fontSize: 22 },

  sectionBox: { width: CAM_SIZE, marginTop: 16 },
  sectionTitle: { color: '#ccc', fontSize: 13, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },

  txToggle: { flexDirection: 'row', backgroundColor: '#1a1a1a', borderRadius: 20, padding: 4 },
  txBtn: { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  txBtnExpenseActive: { backgroundColor: '#3D1212', borderWidth: 1.5, borderColor: '#EF4444' },
  txBtnIncomeActive: { backgroundColor: '#0D2E1A', borderWidth: 1.5, borderColor: '#22C55E' },
  txBtnLabel: { color: '#777', fontSize: 15, fontWeight: '700' },
  txBtnLabelActive: { color: '#fff' },

  moodRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moodItem: { alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10, borderRadius: 18, backgroundColor: '#1a1a1a', flex: 1, marginHorizontal: 3 },
  moodItemActive: { backgroundColor: '#2c2010', borderWidth: 2, borderColor: '#FFB800' },
  moodEmoji: { fontSize: 26, marginBottom: 4 },
  moodLabel: { color: '#777', fontSize: 10, fontWeight: '600', textAlign: 'center' },
  moodLabelActive: { color: '#FFB800' },

  walletPicker: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1a1a1a', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14 },
  walletName: { color: '#fff', fontSize: 15, fontWeight: '600', flex: 1 },

  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#1a1a1a', borderRadius: 20, width: CAM_SIZE },
  notePlaceholder: { color: '#555', fontSize: 14, flex: 1 },
  notePreview: { color: '#fff', fontSize: 14, flex: 1 },

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
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20, width: CAM_SIZE, backgroundColor: '#FFB800', borderRadius: 28, paddingVertical: 16 },
  saveBtnText: { color: '#000', fontSize: 16, fontWeight: '800' },

  pickerBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  pickerBox: { backgroundColor: '#1c1c1e', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 40 },
  pickerTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 16 },
  pickerItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 16, marginBottom: 8, backgroundColor: '#2c2c2e' },
  pickerItemActive: { backgroundColor: '#2c2010', borderWidth: 1.5, borderColor: '#FFB800' },
  pickerItemText: { color: '#fff', fontSize: 15, flex: 1, fontWeight: '600' },
  pickerBalance: { color: '#777', fontSize: 13 },
  pickerCancel: { marginTop: 8, paddingVertical: 14, alignItems: 'center', backgroundColor: '#2c2c2e', borderRadius: 16 },
  pickerCancelText: { color: '#aaa', fontSize: 15, fontWeight: '600' },

  noteModalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  noteModalBox: { backgroundColor: '#1c1c1e', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  noteModalTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  noteAIHint: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,184,0,0.12)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  noteAIHintText: { color: '#FFB800', fontSize: 12, flex: 1 },
  noteModalInput: { color: '#fff', fontSize: 16, backgroundColor: '#2c2c2e', borderRadius: 16, padding: 16, minHeight: 100, textAlignVertical: 'top' },
  noteModalDone: { marginTop: 16, backgroundColor: '#FFB800', borderRadius: 20, paddingVertical: 14, alignItems: 'center' },
  noteModalDoneText: { color: '#000', fontWeight: '800', fontSize: 16 },
});

// ─── REVIEW TAB ───────────────────────────────────────────────────────────────
function formatFullDisplayDate(dateStr: string) {
  const d = new Date(dateStr);
  const weekdays = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
  const dayOfWeek = d.getDay() === 0 ? 'Chủ Nhật' : `Thứ ${d.getDay() === 0 ? 'Nhật' : d.getDay() + 1}`;
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  return `${dayOfWeek === 'Thứ 2' ? 'Thứ Hai' : dayOfWeek}, ngày ${day} thg ${month}, ${year}`;
}

function formatCreatedAt(createdAtStr: string) {
  const d = new Date(createdAtStr);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  return `lúc ${hours}:${minutes} ngày ${day} tháng ${month}, ${year}`;
}

function ReviewTab({ entries, loading, entriesMap, year, month, prevMonth, nextMonth, todayKey, streak, now, selectedDate, setSelectedDate, handleDeleteEntry, router, txMap, selectedEntry, setSelectedEntry, user }: any) {
  const insets = useSafeAreaInsets();
  const [viewMode, setViewMode] = useState<'calendar' | 'swipe'>('calendar');
  
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const firstDayShifted = firstDay === 0 ? 6 : firstDay - 1;
  const cells: (number | null)[] = [...Array(firstDayShifted).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % COLS !== 0) cells.push(null);
  
  const monthLabel = `tháng ${month + 1} ${year}`;
  const selectedDayEntries = selectedDate ? (entriesMap[selectedDate] ?? []) : [];

  const dayIncome = selectedDayEntries.reduce((sum: number, entry: DiaryEntry) => {
    return entry.transactionType === 'INCOME' ? sum + (entry.transactionAmount ?? 0) : sum;
  }, 0);

  const dayExpense = selectedDayEntries.reduce((sum: number, entry: DiaryEntry) => {
    return entry.transactionType === 'EXPENSE' ? sum + (entry.transactionAmount ?? 0) : sum;
  }, 0);

  const monthlyEntries = React.useMemo(() => {
    return entries.filter((e: DiaryEntry) => {
      if (!e.entryDate) return false;
      const d = new Date(e.entryDate);
      return d.getFullYear() === year && d.getMonth() === month;
    }).sort((a: DiaryEntry, b: DiaryEntry) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [entries, year, month]);

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F5F7' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F5F7" />

      {/* ── Month nav ── */}
      <View style={rv.monthNavContainer}>
        <TouchableOpacity onPress={prevMonth} style={rv.navBtn}>
          <Ionicons name="chevron-back" size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={rv.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity onPress={nextMonth} style={rv.navBtn}>
          <Ionicons name="chevron-forward" size={20} color="#111827" />
        </TouchableOpacity>
      </View>

      {/* ── View switcher ── */}
      <View style={rv.viewSwitcherContainer}>
        <TouchableOpacity 
          style={[rv.switcherBtn, viewMode === 'calendar' && rv.switcherBtnActive]}
          onPress={() => setViewMode('calendar')}
        >
          <Ionicons name="calendar-outline" size={15} color={viewMode === 'calendar' ? '#111827' : '#6B7280'} style={{ marginRight: 6 }} />
          <Text style={[rv.switcherBtnText, viewMode === 'calendar' && rv.switcherBtnTextActive]}>Lịch</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[rv.switcherBtn, viewMode === 'swipe' && rv.switcherBtnActive]}
          onPress={() => setViewMode('swipe')}
        >
          <Ionicons name="images-outline" size={15} color={viewMode === 'swipe' ? '#111827' : '#6B7280'} style={{ marginRight: 6 }} />
          <Text style={[rv.switcherBtnText, viewMode === 'swipe' && rv.switcherBtnTextActive]}>Lướt ảnh</Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'calendar' ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
          {/* ── Calendar grid ── */}
          <View style={rv.calCard}>
            <View style={rv.dayHeaders}>
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d: string) => (
                <Text key={d} style={rv.dayLabel}>{d}</Text>
              ))}
            </View>
            {loading ? (
              <ActivityIndicator color="#4F46E5" size="large" style={{ marginVertical: 48 }} />
            ) : (
              <View style={rv.grid}>
                {cells.map((day, i) => {
                  if (!day) return <View key={`e-${i}`} style={rv.cellEmpty} />;
                  const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const dayEntries: DiaryEntry[] = entriesMap[dateKey] ?? [];
                  const hasEntries = dayEntries.length > 0;
                  const isToday = dateKey === todayKey;
                  const cellDate = new Date(year, month, day);
                  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                  const isFuture = cellDate > todayStart;

                  if (isFuture) {
                    return (
                      <View key={dateKey} style={rv.cellFuture}>
                        <Text style={rv.dayTextFuture}>{day}</Text>
                      </View>
                    );
                  }

                  const repEntry = dayEntries.find((e: DiaryEntry) => e.imageUrl) ?? dayEntries[0];
                  const count = dayEntries.length;

                  return (
                    <View key={dateKey} style={rv.cellContainer}>
                      {hasEntries ? (
                        repEntry?.imageUrl ? (
                          <TouchableOpacity
                            style={rv.cellStackedWrapper}
                            onPress={() => setSelectedDate(dateKey)}
                            activeOpacity={0.8}
                          >
                            {count > 1 ? (
                              <>
                                <Image
                                  source={{ uri: getFullImageUrl(dayEntries[1]?.imageUrl || repEntry.imageUrl) }}
                                  style={rv.cellStackImgBehind}
                                  resizeMode="cover"
                                />
                                <Image source={{ uri: getFullImageUrl(repEntry.imageUrl) }} style={rv.cellCircleImg} resizeMode="cover" />
                                <View style={rv.cellImgCountBadge}>
                                  <Text style={rv.cellImgCountText}>+{count - 1}</Text>
                                </View>
                              </>
                            ) : (
                              <Image source={{ uri: getFullImageUrl(repEntry.imageUrl) }} style={rv.cellCircleImg} resizeMode="cover" />
                            )}
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={[rv.cellCircle, rv.cellCircleHasEntry]}
                            onPress={() => setSelectedDate(dateKey)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="document-text-outline" size={18} color="#FFB800" />
                          </TouchableOpacity>
                        )
                      ) : (
                        <TouchableOpacity
                          style={[
                            rv.cellCircle,
                            isToday && rv.cellCircleToday,
                          ]}
                          onPress={() => router.push({ pathname: '/(tabs)/add', params: { date: dateKey } })}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="add" size={16} color="rgba(0,0,0,0.2)" />
                        </TouchableOpacity>
                      )}
                      <Text style={[
                        rv.cellDayNumber,
                        hasEntries && rv.cellDayNumberHasEntry,
                        isToday && rv.cellDayNumberToday
                      ]}>
                        {day}
                      </Text>
                      {hasEntries && <View style={rv.cellActiveDot} />}
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Stats */}
          <View style={rv.statsCard}>
            <View style={rv.statsCol}>
              <Text style={rv.statsEmoji}>📖</Text>
              <Text style={rv.statsVal}>{entries.length}</Text>
              <Text style={rv.statsLbl}>Kỷ niệm</Text>
            </View>
            <View style={rv.statsDivider} />
            <View style={rv.statsCol}>
              <Text style={rv.statsEmoji}>🔥</Text>
              <Text style={rv.statsVal}>{streak}</Text>
              <Text style={rv.statsLbl}>Chuỗi ngày</Text>
            </View>
          </View>
        </ScrollView>
      ) : (
        /* ── Swipe Photos View ── */
        loading ? (
          <ActivityIndicator color="#4F46E5" size="large" style={{ marginVertical: 80 }} />
        ) : monthlyEntries.length === 0 ? (
          <View style={rv.emptySwipeContainer}>
            <Ionicons name="images-outline" size={48} color="#333" />
            <Text style={rv.emptySwipeText}>Tháng này chưa có ảnh nhật ký nào</Text>
            <TouchableOpacity style={rv.emptySwipeAddBtn} onPress={() => router.push('/(tabs)/add')}>
              <Text style={rv.emptySwipeAddBtnText}>Tạo kỷ niệm mới</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={monthlyEntries}
            renderItem={({ item }) => {
              const tx = txMap[item.transactionId ?? -1];
              const categoryName = tx?.category?.name || 'Kỷ niệm';
              const walletName = tx?.wallet?.name || 'Ví';
              const moodEmoji = getMoodEmojiFromNote(item.note);
              const { moodText, description } = parseNoteText(item.note);

              return (
                <View style={{ width: width, alignItems: 'center', justifyContent: 'center' }}>
                  {/* Photo Info Header */}
                  <View style={rv.swipeCardHeader}>
                    <View style={rv.swipeUserInfo}>
                      {user?.avatarUrl ? (
                        <Image source={{ uri: getFullImageUrl(user.avatarUrl) }} style={rv.swipeAvatar} />
                      ) : (
                        <View style={rv.swipeAvatarPlaceholder}>
                          <Text style={rv.swipeAvatarText}>
                            {user ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() : 'U'}
                          </Text>
                        </View>
                      )}
                      <View>
                        <Text style={rv.swipeUserName}>{user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : 'Người dùng'}</Text>
                        <Text style={rv.swipeTimeText}>{formatCreatedAt(item.createdAt)}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={rv.swipeDeleteBtn}
                      onPress={() => handleDeleteEntry(item)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>

                  {/* Photo Frame Container */}
                  <View style={rv.swipePhotoCard}>
                    {item.imageUrl ? (
                      <Image source={{ uri: getFullImageUrl(item.imageUrl) }} style={rv.swipeImg} resizeMode="cover" />
                    ) : null}

                    {/* Top Pill Tags Overlays */}
                    <View style={rv.swipeTopOverlay}>
                      <View style={rv.swipePillGreen}>
                        {tx ? (
                          <Ionicons name={(tx.category?.icon || 'cash-outline') as any} size={13} color="#fff" style={{ marginRight: 4 }} />
                        ) : moodEmoji ? (
                          <Text style={{ fontSize: 13, marginRight: 4 }}>{moodEmoji}</Text>
                        ) : (
                          <Ionicons name="cash-outline" size={13} color="#fff" style={{ marginRight: 4 }} />
                        )}
                        <Text style={rv.swipePillText}>{categoryName}</Text>
                      </View>
                      <View style={rv.swipePillGreen}>
                        <Ionicons name="wallet-outline" size={13} color="#fff" style={{ marginRight: 4 }} />
                        <Text style={rv.swipePillText}>{walletName}</Text>
                      </View>
                    </View>

                    {moodEmoji && (
                      <View style={rv.swipeMoodBadge}>
                        <Text style={rv.swipeMoodEmoji}>{moodEmoji}</Text>
                      </View>
                    )}

                    {/* Bottom glassmorphic overlay for details */}
                    <View style={rv.swipeBottomOverlay}>
                      {item.transactionAmount ? (
                        <Text style={rv.swipeAmount}>
                          <Text style={{ color: item.transactionType === 'INCOME' ? '#059669' : '#DC2626' }}>
                            {item.transactionType === 'INCOME' ? '+ ' : '- '}
                          </Text>
                          <Text style={{ color: '#111827' }}>
                            {new Intl.NumberFormat('vi-VN').format(item.transactionAmount)}đ
                          </Text>
                        </Text>
                      ) : null}
                      {moodText ? <Text style={rv.swipeMoodText}>{moodText}</Text> : null}
                      {description ? <Text style={rv.swipeNoteText}>{description}</Text> : null}
                    </View>
                  </View>
                </View>
              );
            }}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={{ flex: 1, width: width }}
            contentContainerStyle={{ alignItems: 'center' }}
          />
        )
      )}

      {/* ─── IMAGE 2: Day detail list (Full-screen view) ─── */}
      <Modal visible={!!selectedDate} transparent={false} animationType="slide" onRequestClose={() => setSelectedDate(null)}>
        <SafeAreaView style={rv.daySheetOverlay}>
          <StatusBar barStyle="dark-content" backgroundColor="#F4F5F7" />
          <View style={[rv.daySheetHeader, { paddingTop: insets.top > 0 ? insets.top : (Platform.OS === 'ios' ? 48 : 12) }]}>
            <TouchableOpacity onPress={() => setSelectedDate(null)} style={rv.daySheetCloseBtn}>
              <Ionicons name="close" size={20} color="#111827" />
            </TouchableOpacity>
            <Text style={rv.daySheetTitle}>{selectedDate ? formatFullDisplayDate(selectedDate) : ''}</Text>
            <View style={{ width: 40 }} />
          </View>

          {(dayIncome > 0 || dayExpense > 0) && (
            <View style={rv.daySheetTotalsRow}>
              {dayExpense > 0 && (
                <Text style={rv.daySheetTotalExpense}>↗ {new Intl.NumberFormat('vi-VN').format(dayExpense)}đ</Text>
              )}
              {dayIncome > 0 && (
                <Text style={rv.daySheetTotalIncome}>↙ {new Intl.NumberFormat('vi-VN').format(dayIncome)}đ</Text>
              )}
            </View>
          )}

          <FlatList
            data={selectedDayEntries}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id.toString()}
            style={{ flex: 1 }}
            renderItem={({ item }) => {
              const tx = txMap[item.transactionId ?? -1];
              const categoryName = tx?.category?.name || 'Kỷ niệm';
              const walletName = tx?.wallet?.name || 'Ví';
              const moodEmoji = getMoodEmojiFromNote(item.note);
              const { moodText, description } = parseNoteText(item.note);

              return (
                <View style={{ width: width, paddingHorizontal: 20 }}>
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                    {/* Header: User Info */}
                    <View style={cf.header}>
                      <View style={cf.userInfo}>
                        {user?.avatarUrl ? (
                          <Image source={{ uri: getFullImageUrl(user.avatarUrl) }} style={cf.avatar} />
                        ) : (
                          <View style={cf.avatarPlaceholder}>
                            <Text style={cf.avatarText}>
                              {user ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() : 'U'}
                            </Text>
                          </View>
                        )}
                        <Text style={cf.userName}>{user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : 'Người dùng'}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={cf.dateText}>{formatCreatedAt(item.createdAt)}</Text>
                        <TouchableOpacity
                          style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', marginLeft: 4 }}
                          onPress={() => handleDeleteEntry(item)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Image or Mood Placeholder */}
                    <TouchableOpacity activeOpacity={0.9} onPress={() => setSelectedEntry(item)} style={cf.imageWrapperSwiper}>
                      {item.imageUrl ? (
                        <Image source={{ uri: getFullImageUrl(item.imageUrl) }} style={cf.image} resizeMode="cover" />
                      ) : (
                        <View style={cf.moodPlaceholderCard}>
                          <Text style={cf.moodPlaceholderEmoji}>{moodEmoji || '🗿'}</Text>
                          <Text style={cf.moodPlaceholderText}>Kỷ niệm trong ngày</Text>
                        </View>
                      )}

                      {/* Top Overlay inside Image for Tags */}
                      <View style={cf.topOverlay}>
                        {item.transactionType && (
                          <View style={[cf.pill, { backgroundColor: item.transactionType === 'INCOME' ? '#059669' : '#DC2626' }]}>
                            <Ionicons name={item.transactionType === 'INCOME' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'} size={13} color="#fff" style={{ marginRight: 4 }} />
                            <Text style={cf.pillText}>{item.transactionType === 'INCOME' ? 'Thu nhập' : 'Chi tiêu'}</Text>
                          </View>
                        )}
                        <View style={cf.pill}>
                          {tx ? (
                            <Ionicons name={(tx.category?.icon || 'cash-outline') as any} size={13} color="#fff" style={{ marginRight: 4 }} />
                          ) : moodEmoji ? (
                            <Text style={{ fontSize: 13, marginRight: 4 }}>{moodEmoji}</Text>
                          ) : (
                            <Ionicons name="cash-outline" size={13} color="#fff" style={{ marginRight: 4 }} />
                          )}
                          <Text style={cf.pillText}>{categoryName}</Text>
                        </View>
                        <View style={cf.pill}>
                          <Ionicons name="wallet-outline" size={13} color="#fff" style={{ marginRight: 4 }} />
                          <Text style={cf.pillText}>{walletName}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {/* Transaction & Note Details below image */}
                    <View style={cf.detailsContainer}>
                      {item.transactionAmount ? (
                        <Text style={cf.amountSwiper}>
                          <Text style={{ color: item.transactionType === 'INCOME' ? '#059669' : '#DC2626' }}>
                            {item.transactionType === 'INCOME' ? '+' : '-'} {new Intl.NumberFormat('vi-VN').format(item.transactionAmount)}đ
                          </Text>
                        </Text>
                      ) : null}

                      {/* Mood and Note content */}
                      {moodText ? (
                        <View style={cf.moodRow}>
                          <Text style={cf.moodEmojiLarge}>{moodEmoji || '🗿'}</Text>
                          <Text style={cf.moodTextSwiper}>{moodText}</Text>
                        </View>
                      ) : null}

                      {description ? (
                        <View style={cf.noteBubbleSwiper}>
                          <Text style={cf.noteTextSwiper}>{description}</Text>
                        </View>
                      ) : null}
                    </View>
                  </ScrollView>
                </View>
              );
            }}
          />

          <TouchableOpacity
            style={[rv.addMoreBtn, { marginBottom: insets.bottom > 0 ? insets.bottom + 10 : 20 }]}
            onPress={() => {
              setSelectedDate(null);
              router.push({ pathname: '/(tabs)/add', params: { date: selectedDate! } });
            }}
          >
            <Ionicons name="add" size={20} color="#4F46E5" />
            <Text style={rv.addMoreText}>Thêm kỷ niệm cho ngày này</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const rv = StyleSheet.create({
  stripCard: { paddingTop: 12, paddingBottom: 4 },
  stripScroll: { paddingHorizontal: 16, gap: 12, alignItems: 'center' },
  stripItem: { alignItems: 'center', gap: 6 },
  stripImgWrapper: { width: 72, height: 72, borderRadius: 22, overflow: 'hidden', position: 'relative', backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.05)' },
  stripImg: { width: '100%', height: '100%' },
  stripBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: '#4F46E5', borderRadius: 10, paddingHorizontal: 5, paddingVertical: 2 },
  stripBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  stripDay: { color: '#4B5563', fontSize: 13, fontWeight: '700' },

  monthNavContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 16, marginBottom: 10 },
  navBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#E5E7EB' },
  monthLabel: { color: '#111827', fontSize: 16, fontWeight: '800', textTransform: 'lowercase' },

  viewSwitcherContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#E5E7EB',
    borderRadius: 20,
    padding: 4,
  },
  switcherBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 16,
  },
  switcherBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  switcherBtnText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },
  switcherBtnTextActive: {
    color: '#111827',
  },

  // Swipe Photos View Styles
  emptySwipeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 120,
    gap: 12,
  },
  emptySwipeText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySwipeAddBtn: {
    marginTop: 12,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
  },
  emptySwipeAddBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  swipeCardHeader: {
    width: width - 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  swipeUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  swipeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  swipeAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeAvatarText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '700',
  },
  swipeUserName: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },
  swipeTimeText: {
    color: '#4B5563',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  swipeDeleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipePhotoCard: {
    width: width - 32,
    height: (width - 32) * 1.2,
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  swipeImg: {
    width: '100%',
    height: '100%',
  },
  swipeTopOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    gap: 8,
  },
  swipePillGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  swipePillText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  swipeMoodBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  swipeMoodEmoji: {
    fontSize: 18,
  },
  swipeBottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 20,
    alignItems: 'center',
  },
  swipeAmount: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
    color: '#111827',
  },
  swipeMoodText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  swipeNoteText: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.85,
    textAlign: 'center',
  },

  calCard: { marginHorizontal: 16, backgroundColor: '#ffffff', borderRadius: 28, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', position: 'relative', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  dayHeaders: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  dayLabel: { width: CELL, textAlign: 'center', color: '#6B7280', fontSize: 12, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-start' },
  cellEmpty: { width: CELL, height: CELL },
  
  cellContainer: { width: CELL, alignItems: 'center', marginBottom: 12 },
  cellCircle: { width: CELL - 4, height: CELL - 4, borderRadius: (CELL - 4) / 2, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.08)', backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  cellCircleToday: { borderColor: '#4F46E5', backgroundColor: 'rgba(79, 70, 229, 0.05)' },
  cellCircleHasEntry: { borderWidth: 0 },
  cellCircleImg: { width: CELL + 4, height: CELL + 4, borderRadius: 12, borderWidth: 2, borderColor: '#4F46E5' },
  
  cellStackedWrapper: { width: CELL + 4, height: CELL + 4, position: 'relative', alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  cellStackImgBehind: { position: 'absolute', top: -2, left: -4, width: CELL + 4, height: CELL + 4, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(79,70,229,0.7)', transform: [{ rotate: '-10deg' }] },
  cellImgCountBadge: { position: 'absolute', bottom: -6, backgroundColor: '#4F46E5', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#818CF8', alignSelf: 'center' },
  cellImgCountText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  
  cellDayNumber: { color: '#4B5563', fontSize: 11, fontWeight: '600', marginTop: 4 },
  cellDayNumberHasEntry: { color: '#4F46E5', fontWeight: '800' },
  cellDayNumberToday: { color: '#4F46E5', fontWeight: '800' },
  cellActiveDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#4F46E5', marginTop: 2 },
  cellFuture: { width: CELL, alignItems: 'center', marginBottom: 12, opacity: 0.3 },
  dayTextFuture: { color: '#D1D5DB', fontSize: 11, fontWeight: '500', marginTop: 38 },

  floatingAddBtn: { position: 'absolute', bottom: 20, right: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center', shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 6 },

  statsCard: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: '#ffffff', borderRadius: 24, padding: 20, justifyContent: 'space-around', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  statsCol: { alignItems: 'center' },
  statsEmoji: { fontSize: 24 },
  statsVal: { fontSize: 20, fontWeight: '800', color: '#111827', marginTop: 6 },
  statsLbl: { fontSize: 11, fontWeight: '600', color: '#6B7280', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  statsDivider: { width: 1, height: 48, backgroundColor: 'rgba(0,0,0,0.08)' },

  // IMAGE 2 Styles: Fullscreen Day Sheet
  daySheetOverlay: { flex: 1, backgroundColor: '#F4F5F7' },
  daySheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, paddingTop: Platform.OS === 'ios' ? 24 : 12 },
  daySheetCloseBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' },
  daySheetTitle: { color: '#111827', fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
  daySheetTotalsRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginVertical: 16 },
  daySheetTotalIncome: { color: '#059669', fontSize: 16, fontWeight: '700' },
  daySheetTotalExpense: { color: '#DC2626', fontSize: 16, fontWeight: '700' },
  gridEntries: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginTop: 8 },
  entryGridCard: { width: (width - 32 - 16) / 3, aspectRatio: 0.8, borderRadius: 20, overflow: 'hidden', position: 'relative', backgroundColor: '#ffffff' },
  entryGridImg: { width: '100%', height: '100%' },
  entryCategoryBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: '#22C55E', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  entryCategoryText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  entryPageBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 3 },
  entryPageText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  entryAmountOverlay: { position: 'absolute', bottom: 12, left: 8, right: 8, alignItems: 'center' },
  entryAmountText: { color: '#fff', fontSize: 14, fontWeight: '800', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  addMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#ffffff', borderRadius: 20, paddingVertical: 14, marginHorizontal: 16, marginTop: 24, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  addMoreText: { color: '#4F46E5', fontSize: 15, fontWeight: '700' },

  // IMAGE 3 Styles: Fullscreen Detail View
  detailOverlay: { flex: 1, backgroundColor: '#F4F5F7' },
  detailSafeArea: { flex: 1, alignItems: 'center', paddingHorizontal: 16 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingVertical: 12, paddingTop: Platform.OS === 'ios' ? 24 : 12 },
  detailLeftCapsule: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  detailHeaderBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  detailCapsuleDivider: { width: 1, height: 16, backgroundColor: 'rgba(0,0,0,0.08)', marginHorizontal: 4 },
  detailCloseBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  detailTimeCapsule: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ffffff', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, marginTop: 8, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  detailTimeText: { color: '#6B7280', fontSize: 12, fontWeight: '600' },
  detailPhotoCard: { width: width - 32, height: (width - 32) * 1.25, borderRadius: 32, overflow: 'hidden', position: 'relative', backgroundColor: '#F3F4F6', alignSelf: 'center', marginTop: 16 },
  detailImg: { width: '100%', height: '100%' },
  detailTopOverlay: { position: 'absolute', top: 16, left: 16, flexDirection: 'row', gap: 8 },
  detailPillGreen: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#22C55E', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  detailPillText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  detailPageIndicator: { position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  detailPageText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  detailBottomOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, alignItems: 'center', borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  detailAmount: { fontSize: 28, fontWeight: '800', marginBottom: 4, textAlign: 'center', color: '#111827' },
  detailMoodText: { color: '#111827', fontSize: 15, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  detailNoteText: { color: '#4B5563', fontSize: 14, fontWeight: '500', opacity: 0.8, textAlign: 'center', marginTop: 2 },
  detailMoodBadge: { position: 'absolute', top: 16, backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' },
  detailMoodEmoji: { fontSize: 20 },
});

// ─── ROOT SCREEN ──────────────────────────────────────────────────────────────
export default function DiaryScreen() {
  const router = useRouter();
  const toast = useToast();
  const now = new Date();
  const insets = useSafeAreaInsets();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);

  useEffect(() => { UserService.getMyProfile().then(setUser).catch(() => {}); }, []);

  const entriesMap = React.useMemo(() => {
    const map: Record<string, DiaryEntry[]> = {};
    entries.forEach(e => {
      if (!e.entryDate) return;
      const key = e.entryDate.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [entries]);

  const selectedDayEntries = React.useMemo(() => {
    return selectedDate ? (entriesMap[selectedDate] ?? []) : [];
  }, [selectedDate, entriesMap]);

  const [txMap, setTxMap] = useState<Record<number, TransactionResponse>>({});

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const [d, txs] = await Promise.all([
        diaryService.getAll(),
        TransactionService.getMyTransactions().catch(() => [])
      ]);
      setEntries(d || []);
      const map: Record<number, TransactionResponse> = {};
      if (txs) {
        txs.forEach(t => { map[t.id] = t; });
      }
      setTxMap(map);
    }
    catch { setEntries([]); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadEntries(); }, [loadEntries]));

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  const handleDeleteEntry = async (entry: DiaryEntry) => {
    toast.confirm(
      'Xóa nhật ký?',
      'Bạn có chắc muốn xóa kỷ niệm này?',
      async () => {
        try {
          await diaryService.delete(entry.id!);
          await loadEntries();
          if (selectedEntry?.id === entry.id) {
            setSelectedEntry(null);
          }
          const remainingInDay = (entriesMap[selectedDate ?? ''] ?? []).filter(e => e.id !== entry.id);
          if (remainingInDay.length === 0) {
            setSelectedDate(null);
          }
          toast.success('Đã xóa thành công! 🗑️', 'Kỷ niệm đã được xóa khỏi nhật ký.');
        } catch { toast.error('Xóa thất bại!', 'Không xóa được. Thử lại sau.'); }
      },
      'Xóa thôi',
      'Thôi giữ',
    );
  };

  const todayKey = toKey(now);
  const streak = React.useMemo(() => {
    let count = 0;
    const checkDate = new Date();
    while (true) {
      const key = toKey(checkDate);
      if (entriesMap[key] && entriesMap[key].length > 0) { count++; checkDate.setDate(checkDate.getDate() - 1); }
      else { if (count === 0 && checkDate.toDateString() === new Date().toDateString()) { checkDate.setDate(checkDate.getDate() - 1); continue; } break; }
    }
    return count;
  }, [entriesMap]);

  const recentEntry = entries.length > 0
    ? [...entries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    : null;

  return (
    <View style={ms.root}>
      <SafeAreaView style={ms.safeArea} edges={['top']}>
        {/* Shared top header */}
        <View style={ms.header}>
          <Text style={ms.headerTitle}>Kỷ niệm</Text>
          <TouchableOpacity onPress={() => router.push('/profile')}>
            {user?.avatarUrl ? (
              <Image source={{ uri: getFullImageUrl(user.avatarUrl) }} style={ms.avatarImg} />
            ) : (
              <View style={ms.avatarPlaceholder}>
                <Text style={ms.avatarText}>
                  {user ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() : 'U'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1 }}>
          <ReviewTab
            entries={entries} loading={loading} entriesMap={entriesMap}
            year={year} month={month} prevMonth={prevMonth} nextMonth={nextMonth}
            todayKey={todayKey} streak={streak} now={now}
            selectedDate={selectedDate} setSelectedDate={setSelectedDate}
            handleDeleteEntry={handleDeleteEntry} router={router}
            txMap={txMap}
            selectedEntry={selectedEntry}
            setSelectedEntry={setSelectedEntry}
            user={user}
          />
        </View>
      </SafeAreaView>

      {/* ─── IMAGE 3: Diary Detail View (Full-screen Overlay) ─── */}
      <Modal visible={!!selectedEntry} transparent={false} animationType="slide" onRequestClose={() => setSelectedEntry(null)}>
        <SafeAreaView style={rv.detailOverlay}>
          <StatusBar barStyle="dark-content" backgroundColor="#F4F5F7" />
          <View style={rv.detailSafeArea}>
            <View style={[rv.detailHeader, { paddingTop: insets.top > 0 ? insets.top : (Platform.OS === 'ios' ? 48 : 12) }]}>
              <View style={rv.detailLeftCapsule}>
                <TouchableOpacity
                  style={rv.detailHeaderBtn}
                  onPress={() => {
                    if (!selectedEntry) return;
                    const entryToDelete = selectedEntry;
                    toast.confirm(
                      'Xóa kỷ niệm?',
                      'Bạn có chắc muốn xóa kỷ niệm này không?',
                      () => {
                        const remaining = selectedDayEntries.filter((e: any) => e.id !== entryToDelete.id);
                        if (remaining.length > 0) {
                          setSelectedEntry(remaining[0]);
                        } else {
                          setSelectedEntry(null);
                        }
                        handleDeleteEntry(entryToDelete);
                      },
                      '🔴 Xóa thôi',
                      'Thôi giữ',
                    );
                  }}
                >
                  <Ionicons name="ellipsis-horizontal" size={20} color="#111827" />
                </TouchableOpacity>
                <View style={rv.detailCapsuleDivider} />
                <TouchableOpacity style={rv.detailHeaderBtn}>
                  <Ionicons name="images-outline" size={20} color="#111827" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => setSelectedEntry(null)} style={rv.detailCloseBtn}>
                <Ionicons name="close" size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            {selectedEntry?.createdAt && (
              <View style={rv.detailTimeCapsule}>
                <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
                <Text style={rv.detailTimeText}>{formatCreatedAt(selectedEntry.createdAt)}</Text>
              </View>
            )}

            {selectedEntry && (
              <FlatList
                data={selectedDayEntries}
                renderItem={({ item }) => {
                  const tx = txMap[item.transactionId ?? -1];
                  const categoryName = tx?.category?.name || 'Kỷ niệm';
                  const walletName = tx?.wallet?.name || 'Ví';
                  const moodEmoji = getMoodEmojiFromNote(item.note);

                  // Calculate details page indicator
                  const detailTxEntries = entries.filter((e: DiaryEntry) => e.transactionId === item.transactionId);
                  const detailTotal = detailTxEntries.length;
                  const detailIndex = detailTxEntries.findIndex((e: DiaryEntry) => e.id === item.id);
                  const showDetailIndicator = detailTotal > 1;
                  const detailPageText = `${detailIndex + 1}/${detailTotal}`;

                  return (
                    <View style={{ width: width, alignItems: 'center' }}>
                      <View style={rv.detailPhotoCard}>
                        {item.imageUrl ? (
                          <Image source={{ uri: getFullImageUrl(item.imageUrl) }} style={rv.detailImg} resizeMode="cover" />
                        ) : null}

                        <View style={rv.detailTopOverlay}>
                          <View style={rv.detailPillGreen}>
                            {tx ? (
                              <Ionicons name={(tx.category?.icon || 'cash-outline') as any} size={14} color="#fff" style={{ marginRight: 4 }} />
                            ) : moodEmoji ? (
                              <Text style={{ fontSize: 14, marginRight: 4 }}>{moodEmoji}</Text>
                            ) : (
                              <Ionicons name="cash-outline" size={14} color="#fff" style={{ marginRight: 4 }} />
                            )}
                            <Text style={rv.detailPillText}>{categoryName}</Text>
                            <Ionicons name="chevron-down" size={12} color="#fff" style={{ marginLeft: 4 }} />
                          </View>
                          <View style={rv.detailPillGreen}>
                            <Ionicons name="wallet-outline" size={14} color="#fff" style={{ marginRight: 4 }} />
                            <Text style={rv.detailPillText}>{walletName}</Text>
                          </View>
                        </View>

                        {moodEmoji && (
                          <View style={[rv.detailMoodBadge, { right: showDetailIndicator ? 60 : 16 }]}>
                            <Text style={rv.detailMoodEmoji}>{moodEmoji}</Text>
                          </View>
                        )}

                        {showDetailIndicator && (
                          <View style={rv.detailPageIndicator}>
                            <Text style={rv.detailPageText}>{detailPageText}</Text>
                          </View>
                        )}

                        <View style={rv.detailBottomOverlay}>
                          {item.transactionAmount ? (
                            <Text style={rv.detailAmount}>
                              <Text style={{ color: item.transactionType === 'INCOME' ? '#059669' : '#DC2626' }}>
                                {item.transactionType === 'INCOME' ? '+ ' : '- '}
                              </Text>
                              <Text style={{ color: '#111827' }}>
                                {new Intl.NumberFormat('vi-VN').format(item.transactionAmount)}đ
                              </Text>
                            </Text>
                          ) : null}
                          {(() => {
                            const { moodText, description } = parseNoteText(item.note);
                            return (
                              <>
                                {moodText ? <Text style={rv.detailMoodText}>{moodText}</Text> : null}
                                {description ? <Text style={rv.detailNoteText}>{description}</Text> : null}
                              </>
                            );
                          })()}
                        </View>
                      </View>
                    </View>
                  );
                }}
                keyExtractor={(item) => item.id.toString()}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={selectedDayEntries.findIndex((e: any) => e.id === selectedEntry.id)}
                getItemLayout={(data, index) => ({
                  length: width,
                  offset: width * index,
                  index,
                })}
                onMomentumScrollEnd={(e) => {
                  const contentOffset = e.nativeEvent.contentOffset.x;
                  const idx = Math.round(contentOffset / width);
                  if (idx >= 0 && idx < selectedDayEntries.length) {
                    setSelectedEntry(selectedDayEntries[idx]);
                  }
                }}
                style={{ flex: 1, width: width }}
                contentContainerStyle={{ alignItems: 'center' }}
                initialNumToRender={selectedDayEntries.length}
              />
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const ms = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F5F7' },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10, backgroundColor: '#ffffff', borderBottomWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  headerDark: { backgroundColor: '#F4F5F7' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  headerTitleLight: { color: '#111827' },
  avatarImg: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#E5E7EB' },
  avatarPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  avatarPlaceholderDark: { backgroundColor: '#EEF2FF' },
  avatarText: { fontSize: 13, fontWeight: '700', color: '#4F46E5' },
  tabBarWrapper: { alignItems: 'center', paddingBottom: Platform.OS === 'ios' ? 8 : 12, paddingTop: 10, backgroundColor: '#ffffff', borderTopWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  tabBarWrapperLight: { backgroundColor: '#ffffff' },
  tabPill: { flexDirection: 'row', gap: 4, backgroundColor: '#F3F4F6', borderRadius: 28, padding: 4 },
  tabPillLight: { backgroundColor: '#E5E7EB' },
  tabItem: { width: 64, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  tabItemActiveDark: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 1 },
  tabItemActiveLight: { backgroundColor: '#fff' },
});

const cf = StyleSheet.create({
  sectionHeader: { marginHorizontal: 20, marginTop: 40, marginBottom: 16 },
  sectionTitle: { color: '#111827', fontSize: 18, fontWeight: '800' },
  sectionSubtitle: { color: '#6B7280', fontSize: 12, fontWeight: '500', marginTop: 2 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 10 },
  emptyText: { color: '#6B7280', fontSize: 14, fontWeight: '600' },

  card: { width: width - 32, marginBottom: 28, alignSelf: 'center', backgroundColor: '#ffffff', borderRadius: 24, padding: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 4 },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  avatarPlaceholder: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#4F46E5', fontSize: 11, fontWeight: '700' },
  userName: { color: '#111827', fontSize: 14, fontWeight: '600' },
  dateText: { color: '#6B7280', fontSize: 12, fontWeight: '500' },
  imageWrapper: { width: '100%', aspectRatio: 1, borderRadius: 20, overflow: 'hidden', position: 'relative', backgroundColor: '#F3F4F6' },
  image: { width: '100%', height: '100%' },
  topOverlay: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', gap: 6 },
  pill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#22C55E', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  pillText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  moodBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 16, paddingHorizontal: 8, paddingVertical: 5 },
  moodEmojiText: { fontSize: 16 },
  bottomOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, alignItems: 'center' },
  amount: { fontSize: 22, fontWeight: '800', marginBottom: 2, textAlign: 'center', color: '#111827' },
  moodText: { color: '#111827', fontSize: 13, fontWeight: '700', textAlign: 'center', marginBottom: 2 },
  noteText: { color: '#4B5563', fontSize: 15, fontWeight: '500', opacity: 0.85, textAlign: 'center', lineHeight: 22 },

  // Swiper & Pagination Styles
  imageWrapperSwiper: { width: '100%', aspectRatio: 1.1, borderRadius: 24, overflow: 'hidden', position: 'relative', backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  moodPlaceholderCard: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6', gap: 12 },
  moodPlaceholderEmoji: { fontSize: 64, textShadowColor: 'rgba(0,0,0,0.1)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  moodPlaceholderText: { color: '#6B7280', fontSize: 13, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  detailsContainer: { marginTop: 20, alignItems: 'center', gap: 14 },
  amountSwiper: { fontSize: 28, fontWeight: '800', color: '#111827', textAlign: 'center' },
  moodRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ffffff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  moodEmojiLarge: { fontSize: 20 },
  moodTextSwiper: { color: '#111827', fontSize: 16, fontWeight: '700' },
  noteBubbleSwiper: { width: '100%', backgroundColor: '#ffffff', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', marginTop: 4 },
  noteTextSwiper: { color: '#4B5563', fontSize: 16, fontWeight: '500', lineHeight: 24, opacity: 0.9, textAlign: 'center' },
});
