import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, StatusBar, Dimensions, ActivityIndicator,
  RefreshControl, Alert, Modal, TouchableWithoutFeedback,
  Animated, Image, Platform, FlatList, NativeSyntheticEvent, NativeScrollEvent
} from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import UserService, { UserProfile } from '@/services/user.service';
import { getToken, removeToken } from '@/services/api';
import { TransactionService, TransactionResponse } from '@/services/transaction.service';
import { WalletService, WalletResponse } from '@/services/wallet.service';
import { NotificationService } from '@/services/notification.service';
import { BudgetService, BudgetResponse } from '@/services/budget.service';
import { getRelativeDate, formatTime } from '@/utils/date';
import { useFocusEffect } from 'expo-router';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - 40; // Horizontal padding 20 * 2

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatVND = (n: number) =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(n) + ' VNĐ';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Chào buổi sáng ☀️';
  if (h < 18) return 'Chào buổi chiều 👋';
  return 'Chào buổi tối 🌙';
};

// ── Profile Avatar ─────────────────────────────────────────────────────────────
function Avatar({ firstName, lastName, avatarUrl }: { firstName: string; lastName: string; avatarUrl?: string }) {
  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
  return (
    <View style={styles.avatar}>
      {avatarUrl
        ? <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
        : initials
          ? <Text style={styles.avatarText}>{initials}</Text>
          : <Ionicons name="person" size={22} color="#fff" />
      }
    </View>
  );
}

// ── Budget Selector Modal ──────────────────────────────────────────────────────
function BudgetSelectorModal({
  visible,
  budgets,
  onClose,
  onSelect,
  onManage,
  activeIndex
}: {
  visible: boolean;
  budgets: BudgetResponse[];
  onClose: () => void;
  onSelect: (index: number) => void;
  onManage: () => void;
  activeIndex: number;
}) {
  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.selectorContainer}>
              <View style={styles.selectorHeader}>
                <Text style={styles.selectorTitle}>Chọn ngân sách</Text>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={budgets}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    style={[styles.selectorItem, activeIndex === index && styles.selectorItemActive]}
                    onPress={() => { onSelect(index); onClose(); }}
                  >
                    <View style={styles.selectorItemInfo}>
                      <Text style={[styles.selectorItemName, activeIndex === index && styles.selectorItemNameActive]}>
                        {item.name}
                      </Text>
                      <Text style={styles.selectorItemLimit}>Hạn mức: {formatVND(item.amount)}</Text>
                    </View>
                    {activeIndex === index && (
                      <Ionicons name="checkmark-circle" size={24} color="#8B5CF6" />
                    )}
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.selectorList}
                scrollEnabled={budgets.length > 5}
              />

              <TouchableOpacity
                style={styles.manageBudgetsBtn}
                onPress={onManage}
              >
                <Text style={styles.manageBudgetsText}>Quản lý tất cả ngân sách</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ── Quick Actions Data ─────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { id: 'add_expense', icon: 'remove-circle', label: 'Chi tiêu', color: '#FF6B6B', bg: '#FFF0F0' },
  { id: 'add_income', icon: 'add-circle', label: 'Thu nhập', color: '#2ECC71', bg: '#F0FFF4' },
  { id: 'wallet', icon: 'wallet', label: 'Ví tiền', color: '#4F46E5', bg: '#F0EEFF' },
  { id: 'categories', icon: 'grid', label: 'Nhóm', color: '#8B5CF6', bg: '#F5F3FF' },
  { id: 'report', icon: 'bar-chart', label: 'Báo cáo', color: '#F59E0B', bg: '#FFFBEB' },
  { id: 'budget', icon: 'pie-chart', label: 'Ngân sách', color: '#EC4899', bg: '#FDF2F8' },
  { id: 'assistant', icon: 'sparkles', label: 'Trợ lý AI', color: '#6366F1', bg: '#EEF2FF' },
];

// ── Balance Card Component ──────────────────────────────────────────────────────
function BalanceCard({ 
  balance, 
  income, 
  expense,
  onIncomePress,
  onExpensePress
}: { 
  balance: number; 
  income: number; 
  expense: number;
  onIncomePress?: () => void;
  onExpensePress?: () => void;
}) {
  const [hidden, setHidden] = useState(false);
  return (
    <View style={styles.balanceCard}>
      <View style={styles.balanceTop}>
        <View>
          <Text style={styles.balanceLabel}>Tổng số dư</Text>
          <Text style={styles.balanceAmount}>
            {hidden ? '••••••••' : formatVND(balance)}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setHidden(!hidden)} style={styles.eyeBtn}>
          <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={22} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
      <View style={styles.balanceDivider} />
      <View style={styles.balanceRow}>
        <TouchableOpacity style={styles.balanceSide} onPress={onIncomePress} activeOpacity={0.7}>
          <View style={styles.balanceSideIcon}>
            <Ionicons name="arrow-down-circle" size={20} color="#10B981" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.balanceSideLabel}>Thu nhập</Text>
            <Text style={styles.balanceSideIncome} numberOfLines={1} adjustsFontSizeToFit>{formatVND(income)}</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.balanceSeparator} />
        <TouchableOpacity style={styles.balanceSide} onPress={onExpensePress} activeOpacity={0.7}>
          <View style={[styles.balanceSideIcon, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="arrow-up-circle" size={20} color="#EF4444" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.balanceSideLabel}>Chi tiêu</Text>
            <Text style={styles.balanceSideExpense} numberOfLines={1} adjustsFontSizeToFit>{formatVND(expense)}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Precise Circular Progress Component ──────────────────────────────────────────
function CircularProgress({ percentage, size, strokeWidth, color }: { percentage: number; size: number; strokeWidth: number; color: string }) {
  const radius = size / 2;
  const clampedPct = Math.min(Math.max(percentage, 0), 100);
  const rotation = clampedPct * 3.6; // 0-100 to 0-360 degrees

  // For 0-180 degrees
  const firstHalfRotation = Math.min(rotation, 180);
  // For 181-360 degrees
  const secondHalfRotation = Math.max(rotation - 180, 0);

  // If percentage is 0 or less, show just the underlay
  // If percentage is 100 or more, show full circle (handled by the two halves)

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      {/* Background Circle (The track) */}
      <View style={[
        styles.circularUnderlay,
        {
          width: size,
          height: size,
          borderRadius: radius,
          borderWidth: strokeWidth,
          borderColor: '#F3F4F6'
        }
      ]} />

      {/* Container for First 180 Degrees */}
      <View style={{ position: 'absolute', width: size, height: size, overflow: 'hidden' }}>
        <View style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: radius,
          borderWidth: strokeWidth,
          borderColor: 'transparent',
          borderTopColor: color,
          borderRightColor: color,
          transform: [
            { rotate: '-135deg' }, // Start at top
            { rotate: `${firstHalfRotation}deg` }
          ]
        }} />
      </View>

      {/* Container for Second 180 Degrees */}
      <View style={{
        position: 'absolute',
        width: size,
        height: size,
        overflow: 'hidden',
        // Only show this half if we've passed 180 degrees
        transform: [{ rotate: '180deg' }]
      }}>
        <View style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: radius,
          borderWidth: strokeWidth,
          borderColor: 'transparent',
          borderTopColor: secondHalfRotation > 0 ? color : 'transparent',
          borderRightColor: secondHalfRotation > 0 ? color : 'transparent',
          transform: [
            { rotate: '-135deg' },
            { rotate: `${secondHalfRotation}deg` }
          ]
        }} />
      </View>
    </View>
  );
}

// ── Monthly Budget Card Component (Swipeable) ───────────────────────────────────
function MonthlyBudgetCard({
  budgets,
  activeIndex,
  onShowSelector,
  onSetActive
}: {
  budgets: BudgetResponse[];
  activeIndex: number;
  onShowSelector: () => void;
  onSetActive: (index: number) => void;
}) {
  const flatListRef = useRef<FlatList>(null);
  const internalIndexChange = useRef(false);

  useEffect(() => {
    if (!internalIndexChange.current && flatListRef.current) {
      flatListRef.current.scrollToIndex({ index: activeIndex, animated: true });
    }
    internalIndexChange.current = false;
  }, [activeIndex]);

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const xOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(xOffset / CARD_WIDTH);
    if (index !== activeIndex && index >= 0 && index < budgets.length) {
      internalIndexChange.current = true;
      onSetActive(index);
    }
  };

  if (budgets.length === 0) return null;

  const renderItem = ({ item }: { item: BudgetResponse }) => {
    const spent = item.spentAmount || 0;
    const limit = item.amount || 1;
    const spentPct = Math.round(Math.min(spent / limit, 1) * 100);
    const leftPct = Math.max(0, 100 - Math.round((spent / limit) * 100));
    const isOverLimit = spent > limit;
    const color = isOverLimit ? '#EF4444' : '#8B5CF6';

    return (
      <View style={[styles.budgetCardContainer, { width: CARD_WIDTH }]}>
        <View style={styles.budgetCard}>
          <View style={styles.circularContainer}>
            <CircularProgress
              percentage={leftPct}
              size={110}
              strokeWidth={5}
              color={color}
            />
            <View style={styles.circularInner}>
              <Text style={styles.leftLabel}>CÒN LẠI</Text>
              <Text style={styles.leftPctText}>{leftPct}%</Text>
            </View>
          </View>

          <View style={styles.budgetDetails}>
            <View style={styles.budgetGoalContainer}>
              <Text style={styles.budgetGoalLabel}>MỤC TIÊU</Text>
              <Text style={styles.budgetGoalValue}>{item.name}</Text>
            </View>

            <View style={styles.budgetDivider} />

            <View style={styles.budgetRow}>
              <View style={styles.budgetRowLeft}>
                <View style={[styles.dot, { backgroundColor: color }]} />
                <Text style={styles.budgetRowLabel}>Đã chi</Text>
              </View>
              <Text style={styles.budgetRowValue}>{formatVND(spent)}</Text>
            </View>

            <View style={styles.miniProgressBarBg}>
              <View style={[styles.miniProgressBarFill, { width: `${spentPct}%`, backgroundColor: color }]} />
            </View>

            <View style={styles.budgetRow}>
              <View style={styles.budgetRowLeft}>
                <View style={[styles.dot, { backgroundColor: '#E5E7EB' }]} />
                <Text style={styles.budgetRowLabel}>Hạn mức</Text>
              </View>
              <Text style={styles.budgetRowValue}>{formatVND(limit)}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>
            Ngân sách {
              budgets[activeIndex]?.period?.toLowerCase() === 'daily' ? 'ngày' :
                budgets[activeIndex]?.period?.toLowerCase() === 'weekly' ? 'tuần' : 'tháng'
            }
          </Text>
          {budgets.length > 1 && (
            <View style={styles.navCountBadge}>
              <Text style={styles.navText}>{activeIndex + 1}/{budgets.length}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={onShowSelector}>
          <Text style={styles.sectionLink}>Chọn</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={budgets}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        getItemLayout={(data, index) => ({
          length: CARD_WIDTH,
          offset: CARD_WIDTH * index,
          index,
        })}
        snapToAlignment="center"
        snapToInterval={CARD_WIDTH}
        decelerationRate="fast"
        scrollEventThrottle={16}
      />
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [wallets, setWallets] = useState<WalletResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [budgets, setBudgets] = useState<BudgetResponse[]>([]);
  const [activeBudgetIdx, setActiveBudgetIdx] = useState(0);
  const [selectorVisible, setSelectorVisible] = useState(false);

  const fetchData = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const [u, txRes, wRes, unread, budgetsRes] = await Promise.all([
        UserService.getMyProfile(),
        TransactionService.getMyTransactions(),
        WalletService.getMyWallets(),
        NotificationService.getUnreadCount(),
        BudgetService.getMyBudgets()
      ]);
      setUser(u);
      setTransactions(txRes);
      setWallets(wRes);
      setUnreadCount(unread);
      setBudgets(budgetsRes);

      if (activeBudgetIdx >= budgetsRes.length && budgetsRes.length > 0) {
        setActiveBudgetIdx(0);
      }
    } catch (error: any) {
      console.warn('Fetch data error:', error);
      if (error.response?.status === 401) {
        router.replace('/auth/login');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router, activeBudgetIdx]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.headerBg} />

      <BudgetSelectorModal
        visible={selectorVisible}
        budgets={budgets}
        activeIndex={activeBudgetIdx}
        onClose={() => setSelectorVisible(false)}
        onSelect={(idx) => setActiveBudgetIdx(idx)}
        onManage={() => { setSelectorVisible(false); router.push('/budget'); }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(); }}
            tintColor="#fff"
          />
        }
      >
        <View style={styles.headerSection}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Avatar firstName={user?.firstName ?? ''} lastName={user?.lastName ?? ''} avatarUrl={user?.avatarUrl} />
              <View>
                <Text style={styles.greeting}>{getGreeting()}</Text>
                <View style={styles.headerNameRow}>
                  <Text style={styles.headerName}>{user?.firstName} {user?.lastName}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.notifBtn} onPress={() => router.push('/notifications')}>
              <Ionicons name="notifications-outline" size={22} color="#111827" />
              {unreadCount > 0 && (
                <View style={styles.notifDot}>
                  <Text style={styles.notifCount}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <BalanceCard
            balance={wallets.reduce((sum, w) => sum + w.balance, 0)}
            income={transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0)}
            expense={transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0)}
            onIncomePress={() => router.push({ pathname: '/(tabs)/transactions', params: { initialType: 'INCOME' } })}
            onExpensePress={() => router.push({ pathname: '/(tabs)/transactions', params: { initialType: 'EXPENSE' } })}
          />
        </View>

        <View style={styles.body}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thao tác nhanh</Text>
            <View style={styles.quickGrid}>
              {QUICK_ACTIONS.map(a => (
                <TouchableOpacity
                  key={a.id}
                  style={styles.quickItem}
                  onPress={() => {
                    if (a.id === 'add_expense') {
                      router.push({ pathname: '/(tabs)/add', params: { initialType: 'EXPENSE' } });
                    } else if (a.id === 'add_income') {
                      router.push({ pathname: '/(tabs)/add', params: { initialType: 'INCOME' } });
                    } else if (a.id === 'wallet') {
                      router.push('/(tabs)/wallet');
                    } else if (a.id === 'categories') {
                      router.push('/categories');
                    } else if (a.id === 'report') {
                      router.push('/report');
                    } else if (a.id === 'budget') {
                      router.push('/budget');
                    } else if (a.id === 'assistant') {
                      router.push('/(tabs)/assistant');
                    }
                  }}
                >
                  <View style={[styles.quickIcon, { backgroundColor: a.bg }]}>
                    <Ionicons name={a.icon as any} size={26} color={a.color} />
                  </View>
                  <Text style={styles.quickLabel}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <MonthlyBudgetCard
            budgets={budgets}
            activeIndex={activeBudgetIdx}
            onShowSelector={() => setSelectorVisible(true)}
            onSetActive={(idx) => setActiveBudgetIdx(idx)}
          />

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Giao dịch gần đây</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>
                <Text style={styles.sectionLink}>Xem tất cả</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.txCard}>
              {transactions.length === 0 ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#6B7280' }}>Chưa có giao dịch nào</Text>
                </View>
              ) : (
                transactions.slice(0, 5).map((tx, idx) => {
                  const dateObj = new Date(tx.transactionDate);
                  return (
                    <View key={tx.id}>
                      <TouchableOpacity style={styles.txRow}>
                        <View style={[styles.txIcon, { backgroundColor: (tx.category.color || '#F3F4F6') + '22' }]}>
                          <Ionicons name={tx.category.icon as any} size={24} color={tx.category.color} />
                        </View>
                        <View style={styles.txInfo}>
                          <Text style={styles.txName}>{tx.category.name}</Text>
                          <Text style={styles.txDate}>{getRelativeDate(tx.transactionDate)}, {formatTime(tx.transactionDate)}</Text>
                        </View>
                        <Text style={[styles.txAmount, { color: tx.type === 'INCOME' ? '#2ECC71' : '#FF6B6B' }]}>
                          {tx.type === 'INCOME' ? '+' : '-'}{formatVND(tx.amount)}
                        </Text>
                      </TouchableOpacity>
                      {idx < Math.min(transactions.length, 5) - 1 && <View style={styles.txDivider} />}
                    </View>
                  );
                })
              )}
            </View>
          </View>
          <View style={{ height: 32 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  loadingText: { marginTop: 12, fontSize: 15, color: '#6B7280' },
  safe: { flex: 1, backgroundColor: '#fff', paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0 },
  headerBg: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fff', height: 280 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  headerSection: { paddingTop: 20, paddingHorizontal: 20, paddingBottom: 0 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  greeting: { fontSize: 12, color: '#6B7280', fontWeight: '500', marginBottom: 2 },
  headerName: { fontSize: 18, fontWeight: '800', color: '#111827' },
  notifBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  notifDot: { position: 'absolute', top: 4, right: 4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: '#fff', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 2 },
  notifCount: { color: '#fff', fontSize: 9, fontWeight: '800' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#E5E7EB', overflow: 'hidden' },
  avatarImg: { width: 48, height: 48, borderRadius: 24 },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#6B7280' },
  balanceCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4 },
  balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  balanceLabel: { fontSize: 13, color: '#6B7280', fontWeight: '600', marginBottom: 6 },
  balanceAmount: { fontSize: 32, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  eyeBtn: { padding: 6 },
  balanceDivider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 16 },
  balanceRow: { flexDirection: 'row', alignItems: 'center' },
  balanceSide: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  balanceSideIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center' },
  balanceSideLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 2 },
  balanceSideIncome: { fontSize: 15, fontWeight: '700', color: '#10B981' },
  balanceSideExpense: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
  balanceSeparator: { width: 1, height: 36, backgroundColor: '#F3F4F6', marginHorizontal: 12 },
  body: { backgroundColor: '#F3F4F6', borderTopLeftRadius: 32, borderTopRightRadius: 32, marginTop: 20, paddingTop: 8, minHeight: 600 },
  section: { paddingHorizontal: 20, paddingTop: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 12 },
  sectionLink: { fontSize: 14, fontWeight: '600', color: '#4F46E5' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickItem: { width: (width - 40 - 36) / 3, alignItems: 'center', gap: 8 },
  quickIcon: { width: 60, height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  quickLabel: { fontSize: 12, fontWeight: '600', color: '#374151', textAlign: 'center' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  /* Monthly Budget Card */
  navCountBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  navText: { fontSize: 12, fontWeight: '700', color: '#4B5563' },
  budgetCardContainer: { paddingVertical: 10 },
  budgetCard: { backgroundColor: '#fff', borderRadius: 28, padding: 24, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, alignItems: 'center', marginHorizontal: 2 },
  circularContainer: { width: 130, height: 130, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  circularUnderlay: { position: 'absolute', backgroundColor: 'transparent' },
  circularInner: { position: 'absolute', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  leftLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1 },
  leftPctText: { fontSize: 32, fontWeight: '800', color: '#111827' },
  budgetDetails: { width: '100%' },
  budgetGoalContainer: { alignItems: 'center', marginBottom: 8 },
  budgetGoalLabel: { fontSize: 12, fontWeight: '700', color: '#8B5CF6', letterSpacing: 1, marginBottom: 4 },
  budgetGoalValue: { fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center' },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 6 },
  budgetRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  budgetRowLabel: { fontSize: 15, color: '#6B7280', fontWeight: '500' },
  budgetRowValue: { fontSize: 16, fontWeight: '700', color: '#111827' },
  miniProgressBarBg: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden', marginVertical: 8, marginLeft: 20 },
  miniProgressBarFill: { height: '100%', borderRadius: 3 },
  budgetDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 16 },

  /* Modal Styles */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  selectorContainer: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: height * 0.7 },
  selectorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  selectorTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  selectorList: { paddingBottom: 20 },
  selectorItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, backgroundColor: '#F9FAFB', marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6' },
  selectorItemActive: { backgroundColor: '#F5F3FF', borderColor: '#C4B5FD' },
  selectorItemInfo: { flex: 1 },
  selectorItemName: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 4 },
  selectorItemNameActive: { color: '#8B5CF6' },
  selectorItemLimit: { fontSize: 13, color: '#6B7280' },
  manageBudgetsBtn: { padding: 16, alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 16, marginTop: 10 },
  manageBudgetsText: { fontSize: 15, fontWeight: '700', color: '#4F46E5' },

  /* Transactions */
  txCard: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
  txRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  txIcon: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  txEmoji: { fontSize: 22 },
  txInfo: { flex: 1, marginLeft: 12 },
  txName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  txDate: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '700' },
  txDivider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 72 },
});
