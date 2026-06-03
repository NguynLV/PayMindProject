import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, StatusBar, Dimensions, ActivityIndicator,
  RefreshControl, Alert, Modal, TouchableWithoutFeedback,
  Image, Platform, FlatList, NativeSyntheticEvent, NativeScrollEvent
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Rect, G, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import UserService, { UserProfile } from '@/services/user.service';
import { getToken, removeToken } from '@/services/api';
import { TransactionService, TransactionResponse } from '@/services/transaction.service';
import { WalletService, WalletResponse } from '@/services/wallet.service';
import { NotificationService } from '@/services/notification.service';
import { BudgetService, BudgetResponse } from '@/services/budget.service';
import { getRelativeDate, formatTime } from '@/utils/date';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const BENTO_WIDTH = (width - 48) / 2; // Split side by side with gap 16

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatVND = (n: number) =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(n) + ' đ';

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
          : <Ionicons name="person" size={18} color="#6366F1" />
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
                <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={20} color="#6B7280" />
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
                      <Ionicons name="checkmark-circle" size={24} color="#6366F1" />
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
  { id: 'add_expense', icon: 'remove-circle', label: 'Chi tiêu', color: '#EF4444', bg: '#FFF0F0' },
  { id: 'add_income', icon: 'add-circle', label: 'Thu nhập', color: '#10B981', bg: '#F0FFF4' },
  { id: 'wallet', icon: 'wallet', label: 'Ví tiền', color: '#6366F1', bg: '#F0EEFF' },
  { id: 'categories', icon: 'grid', label: 'Nhóm', color: '#8B5CF6', bg: '#F5F3FF' },
  { id: 'report', icon: 'bar-chart', label: 'Báo cáo', color: '#F59E0B', bg: '#FFFBEB' },
  { id: 'budget', icon: 'pie-chart', label: 'Ngân sách', color: '#EC4899', bg: '#FDF2F8' },
  { id: 'assistant', icon: 'sparkles', label: 'Trợ lý AI', color: '#06B6D4', bg: '#EEF2FF' },
  { id: 'debt', icon: 'receipt-outline', label: 'Sổ Nợ', color: '#F97316', bg: '#FFEDD5', beta: true },
  { id: 'recurring', icon: 'repeat-outline', label: 'Định kỳ', color: '#0EA5E9', bg: '#ECFEFF', beta: true },
];

// ── Custom SVG Donut Chart ─────────────────────────────────────────────────────
function DonutChart({
  data,
  size = 130,
  strokeWidth = 12,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cumulativePercent = 0;

  if (total === 0) {
    return (
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#F1F5F9"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Defs>
        <SvgGradient id="purpleGlow" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#8B5CF6" />
          <Stop offset="100%" stopColor="#EC4899" />
        </SvgGradient>
        <SvgGradient id="tealGlow" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#06B6D4" />
          <Stop offset="100%" stopColor="#3B82F6" />
        </SvgGradient>
      </Defs>
      {data.map((item, index) => {
        const percentage = (item.value / total) * 100;
        const strokeDashoffset = circumference - (percentage / 100) * circumference;
        const strokeDasharray = `${circumference} ${circumference}`;
        const rotation = (cumulativePercent / 100) * 360;

        cumulativePercent += percentage;

        let strokeColor = item.color;
        if (item.color.toLowerCase() === '#a855f7' || item.color.toLowerCase() === '#8b5cf6') strokeColor = 'url(#purpleGlow)';
        if (item.color.toLowerCase() === '#06b6d4' || item.color.toLowerCase() === '#0ea5e9') strokeColor = 'url(#tealGlow)';

        return (
          <Circle
            key={index}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
          />
        );
      })}
    </Svg>
  );
}

// ── Custom SVG Bar Chart for Analytics Bento ───────────────────────────────────
function AnalyticsBarChart({
  data,
  height: chartHeight = 60,
  width: chartWidth = BENTO_WIDTH - 32,
}: {
  data: { label: string; value: number }[];
  height?: number;
  width?: number;
}) {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barWidth = 8;
  const gap = (chartWidth - data.length * barWidth) / (data.length - 1);

  return (
    <View style={{ height: chartHeight + 20, width: chartWidth, marginTop: 12 }}>
      <Svg width={chartWidth} height={chartHeight}>
        <Defs>
          <SvgGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#6366F1" />
            <Stop offset="100%" stopColor="#818CF8" stopOpacity={0.2} />
          </SvgGradient>
        </Defs>
        {data.map((item, index) => {
          const barHeight = (item.value / maxVal) * chartHeight;
          const x = index * (barWidth + gap);
          const y = chartHeight - barHeight;

          return (
            <Rect
              key={index}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={4}
              ry={4}
              fill="url(#barGrad)"
            />
          );
        })}
      </Svg>
      {/* X Axis Labels */}
      <View style={styles.barLabelsRow}>
        {data.map((item, index) => (
          <Text key={index} style={[styles.barLabelText, { width: barWidth + gap, textAlign: 'center' }]}>
            {item.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ── Custom Circular Progress Ring for Budget Bento ─────────────────────────────
function CircularProgressRing({
  percentage,
  size = 72,
  strokeWidth = 6,
  color = '#8B5CF6',
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.min(Math.max(percentage, 0), 100);
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        {/* Track Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#F1F5F9"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
        />
      </Svg>
      <View style={styles.progressRingContent}>
        <Text style={styles.progressRingPercentText}>{clampedPercent}%</Text>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [wallets, setWallets] = useState<WalletResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [budgets, setBudgets] = useState<BudgetResponse[]>([]);
  const [activeBudgetIdx, setActiveBudgetIdx] = useState(0);
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [balanceHidden, setBalanceHidden] = useState(false);
  const isFirstLoad = useRef(true);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isFirstLoad.current && !isRefresh) {
      // Load cache immediately
      try {
        const cached = await AsyncStorage.getItem('@home_data_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.user) setUser(parsed.user);
          if (parsed.transactions) setTransactions(parsed.transactions);
          if (parsed.wallets) setWallets(parsed.wallets);
          if (parsed.unreadCount !== undefined) setUnreadCount(parsed.unreadCount);
          if (parsed.budgets) setBudgets(parsed.budgets);
          setLoading(false); // Stop loading immediately if cache exists
        }
      } catch (e) {
        console.warn('Cache read error', e);
      }

      await new Promise(resolve => setTimeout(resolve, 100));
      isFirstLoad.current = false;
    }

    const token = await getToken();
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      router.replace('/auth/login');
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

      // Save cache silently
      try {
        await AsyncStorage.setItem('@home_data_cache', JSON.stringify({
          user: u, transactions: txRes, wallets: wRes, unreadCount: unread, budgets: budgetsRes
        }));
      } catch (e) {
        console.warn('Cache write error', e);
      }

      if (activeBudgetIdx >= budgetsRes.length && budgetsRes.length > 0) {
        setActiveBudgetIdx(0);
      }
    } catch (error: any) {
      console.warn('Fetch data error:', error);
      if (error.response?.status === 401) {
        await removeToken();
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

  const getCategorySpending = () => {
    const expenses = transactions.filter(t => t.type === 'EXPENSE');
    if (expenses.length === 0) {
      return [];
    }

    const grouped: { [key: string]: { name: string; amount: number; color: string; icon: string } } = {};
    expenses.forEach(tx => {
      const catName = tx.category.name;
      if (!grouped[catName]) {
        grouped[catName] = {
          name: catName,
          amount: 0,
          color: tx.category.color || '#8B5CF6',
          icon: tx.category.icon || 'grid-outline',
        };
      }
      grouped[catName].amount += tx.amount;
    });

    return Object.values(grouped)
      .sort((a, b) => b.amount - a.amount)
      .map(item => ({
        label: item.name,
        value: item.amount,
        color: item.color,
        icon: item.icon,
      }));
  };

  const getWeeklySpending = () => {
    const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const mockValues = [0, 0, 0, 0, 0, 0, 0];

    const expenses = transactions.filter(t => {
      const txDate = new Date(t.transactionDate);
      const diffTime = Math.abs(new Date().getTime() - txDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return t.type === 'EXPENSE' && diffDays <= 7;
    });

    if (expenses.length > 0) {
      const weeklyValues = Array(7).fill(0);
      expenses.forEach(t => {
        const day = new Date(t.transactionDate).getDay();
        const idx = day === 0 ? 6 : day - 1;
        weeklyValues[idx] += t.amount;
      });
      return days.map((day, i) => ({ label: day, value: weeklyValues[i] }));
    }

    return days.map((day, i) => ({ label: day, value: mockValues[i] }));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Đang khởi chạy PayMind...</Text>
      </View>
    );
  }

  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
  const spendingData = getCategorySpending().filter(item => item.value > 0);
  // Fallback to display even if value is 0 for placeholder
  const displaySpendingData = spendingData.length > 0 ? spendingData : getCategorySpending();
  const totalExpenseSum = displaySpendingData.reduce((sum, s) => sum + s.value, 0);
  const weeklyData = getWeeklySpending();

  const activeBudget = budgets[activeBudgetIdx];
  const budgetSpent = activeBudget?.spentAmount || 0;
  const budgetLimit = activeBudget?.amount || 1;
  const budgetPercent = Math.min(Math.round((budgetSpent / budgetLimit) * 100), 100);
  const budgetLeft = Math.max(budgetLimit - budgetSpent, 0);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
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
            onRefresh={() => { setRefreshing(true); fetchData(true); }}
            tintColor="#6366F1"
          />
        }
      >
        {/* Soft Linear Top Ambient Shadow */}
        <LinearGradient
          colors={['rgba(99, 102, 241, 0.04)', 'transparent']}
          style={styles.ambientGlow}
        />

        {/* ── HEADER ── */}
        <View style={[styles.header, { paddingTop: insets.top > 0 ? 8 : 16 }]}>
          <View style={styles.headerLeft}>
            <Avatar firstName={user?.firstName ?? ''} lastName={user?.lastName ?? ''} avatarUrl={user?.avatarUrl} />
            <View>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.headerName}>{user?.firstName} {user?.lastName}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.logoText}>PayMind</Text>
            <TouchableOpacity style={styles.notifBtn} onPress={() => router.push('/notifications')}>
              <Ionicons name="notifications-outline" size={20} color="#1F2937" />
              {unreadCount > 0 && (
                <View style={styles.notifDot}>
                  <Text style={styles.notifCount}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── WALLET BALANCE CARD ── */}
        <View style={styles.balanceCardWrapper}>
          <View style={styles.balanceCard}>
            <View style={styles.balanceTopRow}>
              <View>
                <Text style={styles.balanceLabel}>Tổng số dư ví</Text>
                <Text style={styles.balanceAmount} numberOfLines={1} adjustsFontSizeToFit>
                  {balanceHidden ? '••••••••' : formatVND(totalBalance)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setBalanceHidden(!balanceHidden)} style={styles.eyeBtn}>
                <Ionicons name={balanceHidden ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View style={styles.balanceDivider} />

            <View style={styles.balanceGrid}>
              <TouchableOpacity
                style={styles.balanceSide}
                onPress={() => router.push({ pathname: '/(tabs)/transactions', params: { initialType: 'INCOME' } })}
              >
                <View style={[styles.arrowIconBg, { backgroundColor: '#E6F4EA' }]}>
                  <Ionicons name="arrow-down-circle" size={16} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sideLabel}>Thu nhập</Text>
                  <Text style={styles.sideIncomeText} numberOfLines={1}>{formatVND(totalIncome)}</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.sideSeparator} />

              <TouchableOpacity
                style={styles.balanceSide}
                onPress={() => router.push({ pathname: '/(tabs)/transactions', params: { initialType: 'EXPENSE' } })}
              >
                <View style={[styles.arrowIconBg, { backgroundColor: '#FCE8E6' }]}>
                  <Ionicons name="arrow-up-circle" size={16} color="#EF4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sideLabel}>Chi tiêu</Text>
                  <Text style={styles.sideExpenseText} numberOfLines={1}>{formatVND(totalExpense)}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── OVERVIEW (DONUT CHART) ── */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeaderTitle}>Biểu đồ chi tiêu</Text>
          <View style={styles.donutCard}>
            <View style={styles.donutRow}>
              <View style={styles.donutWrapper}>
                <DonutChart data={displaySpendingData} />
                <View style={styles.donutCenterLabel}>
                  <Text style={styles.donutCenterSub}>CHI TIÊU</Text>
                  <Text style={styles.donutCenterValue} numberOfLines={1} adjustsFontSizeToFit>
                    {formatVND(totalExpenseSum).replace(' đ', '')}
                  </Text>
                  <Text style={styles.donutCenterUnit}>đ</Text>
                </View>
              </View>

              <View style={styles.legendContainer}>
                {displaySpendingData.length > 0 ? (
                  displaySpendingData.slice(0, 3).map((item, index) => (
                    <View key={index} style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                      <View style={styles.legendTextWrapper}>
                        <Text style={styles.legendName} numberOfLines={1}>{item.label}</Text>
                        <Text style={styles.legendAmount}>{formatVND(item.value)}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingRight: 10 }}>
                    <Text style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center' }}>Chưa có chi tiêu</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* ── QUICK ACTIONS ── */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeaderTitle}>Thao tác nhanh</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickScroll}
          >
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
                  } else if (a.id === 'debt') {
                    router.push('/debt' as any);
                  } else if (a.id === 'recurring') {
                    router.push('/recurring' as any);
                  }
                }}
              >
                <View style={styles.quickIconCircle}>
                  <View style={[styles.quickInnerCircle, { backgroundColor: a.bg }]}>
                    <Ionicons name={a.icon as any} size={20} color={a.color} />
                  </View>
                  {a.beta && (
                    <View style={styles.betaBadge}>
                      <Text style={styles.betaText}>B</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.quickLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── BENTO GRID: ANALYTICS & BUDGET ── */}
        <View style={styles.bentoContainer}>
          {/* Analytics Bento Card */}
          <View style={[styles.bentoCard, { width: BENTO_WIDTH }]}>
            <View style={styles.bentoHeader}>
              <Ionicons name="bar-chart-outline" size={16} color="#6366F1" />
              <Text style={styles.bentoTitle}>Rhythm Tuần</Text>
            </View>
            <AnalyticsBarChart data={weeklyData} />
          </View>

          {/* Budget Bento Card */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={{ width: BENTO_WIDTH }}
            onPress={() => budgets.length > 0 && setSelectorVisible(true)}
          >
            <View style={styles.bentoCard}>
              <View style={styles.bentoHeader}>
                <Ionicons name="pie-chart-outline" size={16} color="#EC4899" />
                <Text style={styles.bentoTitle} numberOfLines={1}>Ngân Sách</Text>
              </View>

              {activeBudget ? (
                <View style={styles.budgetBentoContent}>
                  <CircularProgressRing percentage={budgetPercent} color="#EC4899" />
                  <View style={styles.budgetBentoTextCol}>
                    <Text style={styles.budgetNameText} numberOfLines={1}>{activeBudget.name}</Text>
                    <Text style={styles.budgetLeftLabel}>Còn lại</Text>
                    <Text style={styles.budgetLeftValue} numberOfLines={1} adjustsFontSizeToFit>
                      {formatVND(budgetLeft)}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.noBudgetBento}>
                  <Ionicons name="add-circle-outline" size={22} color="#9CA3AF" style={{ marginBottom: 4 }} />
                  <Text style={styles.noBudgetText}>Chưa tạo ngân sách</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* ── RECENT TRANSACTIONS ── */}
        <View style={[styles.sectionContainer, { marginBottom: 32 }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderTitle}>Giao dịch gần đây</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>
              <Text style={styles.viewAllBtnText}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.transactionsWrapper}>
            {transactions.length === 0 ? (
              <View style={styles.noTxContainer}>
                <Ionicons name="receipt-outline" size={28} color="#9CA3AF" style={{ marginBottom: 6 }} />
                <Text style={styles.noTxText}>Chưa có giao dịch phát sinh</Text>
              </View>
            ) : (
              transactions.slice(0, 5).map((tx, idx) => {
                const isIncome = tx.type === 'INCOME';
                return (
                  <View key={tx.id}>
                    <TouchableOpacity style={styles.txRow} activeOpacity={0.7}>
                      <View style={[styles.txIconContainer, { backgroundColor: (tx.category.color || '#9CA3AF') + '10', borderColor: (tx.category.color || '#9CA3AF') + '25' }]}>
                        <Ionicons name={tx.category.icon as any || 'grid'} size={20} color={tx.category.color || '#4B5563'} />
                      </View>

                      <View style={styles.txDetailsCol}>
                        <Text style={styles.txCategoryName} numberOfLines={1}>{tx.category.name}</Text>
                        <Text style={styles.txDateText}>
                          {getRelativeDate(tx.transactionDate)}, {formatTime(tx.transactionDate)}
                        </Text>
                      </View>

                      <View style={styles.txAmountCol}>
                        <Text style={[styles.txAmountText, { color: isIncome ? '#10B981' : '#EF4444' }]}>
                          {isIncome ? '+' : '-'}{formatVND(tx.amount)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    {idx < Math.min(transactions.length, 5) - 1 && <View style={styles.txDivider} />}
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280', fontWeight: '500' },
  safe: { flex: 1, backgroundColor: '#FAFAFA' },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: Platform.OS === 'ios' ? 88 : 64 },
  ambientGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 200, zIndex: 0 },

  // ── HEADER ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
    zIndex: 2,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#4B5563' },
  greeting: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginBottom: 2 },
  headerName: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logoText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.5,
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  notifDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FAFAFA',
    paddingHorizontal: 2
  },
  notifCount: { color: '#FFFFFF', fontSize: 8, fontWeight: '800' },

  // ── WALLET BALANCE CARD ──
  balanceCardWrapper: { paddingHorizontal: 20, marginBottom: 24 },
  balanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  balanceTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  balanceLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  balanceAmount: { fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  eyeBtn: { padding: 4 },
  balanceDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 16 },
  balanceGrid: { flexDirection: 'row', alignItems: 'center' },
  balanceSide: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  arrowIconBg: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  sideLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '600', marginBottom: 1 },
  sideIncomeText: { fontSize: 14, fontWeight: '700', color: '#10B981' },
  sideExpenseText: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
  sideSeparator: { width: 1, height: 28, backgroundColor: '#F3F4F6', marginHorizontal: 12 },

  // ── SECTION GENERAL ──
  sectionContainer: { paddingHorizontal: 20, marginBottom: 24 },
  sectionHeaderTitle: { fontSize: 15, fontWeight: '800', color: '#1F2937', marginBottom: 12 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  viewAllBtnText: { fontSize: 12, fontWeight: '700', color: '#6366F1' },

  // ── OVERVIEW (DONUT) ──
  donutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  donutWrapper: { width: 130, height: 130, justifyContent: 'center', alignItems: 'center' },
  donutCenterLabel: { position: 'absolute', justifyContent: 'center', alignItems: 'center', width: 90 },
  donutCenterSub: { fontSize: 9, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.5 },
  donutCenterValue: { fontSize: 20, fontWeight: '800', color: '#1F2937', marginTop: 1, marginBottom: -2 },
  donutCenterUnit: { fontSize: 11, fontWeight: '700', color: '#4B5563' },
  legendContainer: { flex: 1, gap: 12 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendTextWrapper: { flex: 1 },
  legendName: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
  legendAmount: { fontSize: 13, fontWeight: '700', color: '#1F2937', marginTop: 1 },

  // ── QUICK ACTIONS ──
  quickScroll: { paddingHorizontal: 4, gap: 14 },
  quickItem: { alignItems: 'center', gap: 6 },
  quickIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  quickInnerCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  betaBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#F97316', width: 12, height: 12, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  betaText: { color: '#FFFFFF', fontSize: 7, fontWeight: '900' },
  quickLabel: { fontSize: 11, fontWeight: '600', color: '#4B5563', textAlign: 'center' },

  // ── BENTO GRID ──
  bentoContainer: { flexDirection: 'row', gap: 16, paddingHorizontal: 20, marginBottom: 24 },
  bentoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 140,
    justifyContent: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  bentoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  bentoTitle: { fontSize: 13, fontWeight: '700', color: '#1F2937' },

  // Bento: Bar Chart specific
  barLabelsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  barLabelText: { fontSize: 9, color: '#9CA3AF', fontWeight: '700' },

  // Bento: Budget specific
  progressRingContent: { position: 'absolute', zIndex: 10, justifyContent: 'center', alignItems: 'center' },
  progressRingPercentText: { fontSize: 12, fontWeight: '800', color: '#1F2937' },
  budgetBentoContent: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  budgetBentoTextCol: { flex: 1 },
  budgetNameText: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
  budgetLeftLabel: { fontSize: 9, fontWeight: '600', color: '#9CA3AF', marginTop: 2, textTransform: 'uppercase' },
  budgetLeftValue: { fontSize: 12, fontWeight: '800', color: '#EC4899', marginTop: 1 },
  noBudgetBento: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  noBudgetText: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textAlign: 'center' },

  // ── RECENT TRANSACTIONS ──
  transactionsWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  noTxContainer: { padding: 32, alignItems: 'center', justifyContent: 'center' },
  noTxText: { color: '#9CA3AF', fontSize: 12, fontWeight: '600' },
  txRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  txIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txDetailsCol: { flex: 1, marginLeft: 12, gap: 3 },
  txCategoryName: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
  txDateText: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  txAmountCol: { alignItems: 'flex-end' },
  txAmountText: { fontSize: 14, fontWeight: '800' },
  txDivider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 66 },

  // ── SELECTOR MODAL ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  selectorContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: height * 0.7,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  selectorTitle: { fontSize: 17, fontWeight: '800', color: '#1F2937' },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectorList: { paddingBottom: 20 },
  selectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  selectorItemActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.06)',
    borderColor: 'rgba(99, 102, 241, 0.3)'
  },
  selectorItemInfo: { flex: 1 },
  selectorItemName: { fontSize: 14, fontWeight: '700', color: '#4B5563', marginBottom: 4 },
  selectorItemNameActive: { color: '#6366F1' },
  selectorItemLimit: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  manageBudgetsBtn: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  manageBudgetsText: { fontSize: 13, fontWeight: '700', color: '#6366F1' },
});
