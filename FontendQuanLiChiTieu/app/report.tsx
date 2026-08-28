import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions, Platform, StatusBar } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line, Text as SvgText, G, Rect } from 'react-native-svg';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ReportService, ReportSummaryResponse, DailyStat, YearlyReportResponse, CategoryStat } from '../src/services/report.service';
import { AiService } from '../src/services/ai.service';
import { formatDate } from '../src/utils/date';

const screenWidth = Dimensions.get('window').width;

const formatVND = (n: number) => {
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(n) + ' ₫';
};

const formatMillions = (n: number) => {
    if (Math.abs(n) >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + ' tỷ';
    if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + ' tr';
    if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(0) + ' k';
    return n.toString();
};

export default function ReportScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    
    const [loading, setLoading] = useState(true);
    
    const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>((params.viewMode as any) || 'monthly');
    const [month, setMonth] = useState(params.month ? parseInt(params.month as string) : new Date().getMonth() + 1);
    const [year, setYear] = useState(params.year ? parseInt(params.year as string) : new Date().getFullYear());

    const [reportData, setReportData] = useState<ReportSummaryResponse | null>(null);
    const [yearlyData, setYearlyData] = useState<YearlyReportResponse | null>(null);
    const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
    
    const [aiInsights, setAiInsights] = useState<string[]>([]);
    const [loadingAI, setLoadingAI] = useState(false);
    const [showDrilldown, setShowDrilldown] = useState(false);
    const [drilldownTransactions, setDrilldownTransactions] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<{id: number, name: string} | null>(null);
    const [loadingDrilldown, setLoadingDrilldown] = useState(false);
    const insightsCacheRef = useRef<Record<string, string[]>>({});

    const fetchAIInsights = async (m: number, y: number, summaryData?: ReportSummaryResponse | null) => {
        const cacheKey = `${m}-${y}`;
        if (insightsCacheRef.current[cacheKey]) {
            setAiInsights(insightsCacheRef.current[cacheKey]);
            return;
        }

        try {
            setLoadingAI(true);
            const data = summaryData || await ReportService.getMonthlySummary(m, y);
            if (data) {
                let list: string[] = [];
                const aiResult: any = await AiService.getReportInsight(data, m, y).catch(() => null);

                if (aiResult && Array.isArray(aiResult.insights) && aiResult.insights.length > 0) {
                    list = [...aiResult.insights];
                } else if (aiResult && aiResult.savingTip) {
                    list.push(`Mẹo tiết kiệm: ${aiResult.savingTip}`);
                }

                // Fallback smart insights if Gemini returns empty array or error
                if (list.length === 0) {
                    const inc = data.totalIncome || 0;
                    const exp = data.totalExpense || 0;
                    const net = inc - exp;
                    if (exp > 0 && inc === 0) {
                        list.push(`Tháng ${m}/${y}: Tổng chi tiêu ${formatVND(exp)}, chưa ghi nhận khoản thu nhập nào.`);
                        list.push(`Khuyên dùng: Nên bổ sung thông tin nguồn thu nhập để hệ thống phân tích tỷ lệ tích lũy chính xác hơn.`);
                    } else if (inc > 0) {
                        const rate = Math.round((net / inc) * 100);
                        list.push(`Tỷ lệ tích lũy tháng ${m}/${y} đạt ${rate}%. (Thu: ${formatVND(inc)}, Chi: ${formatVND(exp)})`);
                        if (rate < 10) {
                            list.push(`Cảnh báo: Tỷ lệ tiết kiệm đang ở mức thấp (<10%). Hãy rà soát lại các danh mục chi tiêu lớn.`);
                        } else {
                            list.push(`Duy trì phong độ quản lý tài chính tốt cho các tháng tiếp theo nhé!`);
                        }
                    } else {
                        list.push(`Chưa có dữ liệu giao dịch thu/chi trong tháng ${m}/${y}.`);
                    }
                }

                insightsCacheRef.current[cacheKey] = list;
                setAiInsights(list);
            }
        } catch (err) {
            console.warn('AI Insight fetch failed', err);
            if (summaryData) {
                const exp = summaryData.totalExpense || 0;
                const inc = summaryData.totalIncome || 0;
                const fallbackList = [
                    `Tổng chi tiêu tháng ${m}/${y}: ${formatVND(exp)}.`,
                    inc > 0 ? `Tổng thu nhập: ${formatVND(inc)}.` : `Chưa có ghi nhận thu nhập trong tháng này.`
                ];
                setAiInsights(fallbackList);
            }
        } finally {
            setLoadingAI(false);
        }
    };

    const loadData = async () => {
        try {
            setLoading(true);
            if (viewMode === 'monthly') {
                const [data, daily] = await Promise.all([
                    ReportService.getMonthlySummary(month, year),
                    ReportService.getDailyStats(month, year),
                ]);
                setReportData(data);
                setDailyStats(daily);
                fetchAIInsights(month, year, data);
            } else {
                const data = await ReportService.getYearlySummary(year);
                setYearlyData(data);
            }
        } catch (error) {
            console.warn('Failed to load report', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCategoryPress = async (categoryId: number, categoryName: string) => {
        try {
            setSelectedCategory({ id: categoryId, name: categoryName });
            setLoadingDrilldown(true);
            setShowDrilldown(true);
            const data = await ReportService.getTransactionsByCategory(categoryId, month, year);
            setDrilldownTransactions(data);
        } catch (err) {
            console.warn('Drilldown fetch failed', err);
        } finally {
            setLoadingDrilldown(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [month, year, viewMode])
    );

    const prevMonth = () => {
        if (viewMode === 'monthly') {
            if (month === 1) {
                setMonth(12);
                setYear(year - 1);
            } else {
                setMonth(month - 1);
            }
        } else {
            setYear(year - 1);
        }
    };

    const nextMonth = () => {
        if (viewMode === 'monthly') {
            if (month === 12) {
                setMonth(1);
                setYear(year + 1);
            } else {
                setMonth(month + 1);
            }
        } else {
            setYear(year + 1);
        }
    };

    const TrendChart = ({ dailyStats, month, year }: { dailyStats: DailyStat[], month: number, year: number }) => {
        const CHART_HEIGHT = 180;
        const CHART_WIDTH = screenWidth - 32 - 32; // card padding
        const PADDING_LEFT = 32;
        const PADDING_BOTTOM = 24;
        const PADDING_TOP = 16;
        const PADDING_RIGHT = 8;

        const drawingWidth = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT;
        const drawingHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

        const daysInMonth = new Date(year, month, 0).getDate();
        const fullMonthData = Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const stat = dailyStats.find(s => s.day === day);
            return {
                day,
                income: stat?.totalIncome || 0,
                expense: stat?.totalExpense || 0
            };
        });

        const maxIncome = Math.max(...fullMonthData.map(d => d.income), 0);
        const maxExpense = Math.max(...fullMonthData.map(d => d.expense), 0);
        const overallMax = Math.max(maxIncome, maxExpense, 1000000);

        const getY = (val: number) => PADDING_TOP + drawingHeight - (val / overallMax) * drawingHeight;
        const getX = (day: number) => PADDING_LEFT + ((day - 1) / (daysInMonth - 1)) * drawingWidth;

        const generatePaths = (type: 'income' | 'expense') => {
            if (fullMonthData.length === 0) return { line: '', area: '' };

            let linePath = `M ${getX(fullMonthData[0].day)} ${getY(fullMonthData[0][type])}`;

            for (let i = 0; i < fullMonthData.length - 1; i++) {
                const x1 = getX(fullMonthData[i].day);
                const y1 = getY(fullMonthData[i][type]);
                const x2 = getX(fullMonthData[i + 1].day);
                const y2 = getY(fullMonthData[i + 1][type]);
                const midX = (x1 + x2) / 2;
                linePath += ` Q ${x1} ${y1}, ${midX} ${(y1 + y2) / 2} T ${x2} ${y2}`;
            }

            const areaPath = `${linePath} L ${getX(fullMonthData[daysInMonth - 1].day)} ${PADDING_TOP + drawingHeight} L ${getX(fullMonthData[0].day)} ${PADDING_TOP + drawingHeight} Z`;

            return { line: linePath, area: areaPath };
        };

        const incomePaths = generatePaths('income');
        const expensePaths = generatePaths('expense');

        const yLabels = [0, overallMax * 0.5, overallMax];
        const xLabels = [1, Math.round(daysInMonth / 2), daysInMonth];

        const today = new Date().getDate();
        const activeDay = month === new Date().getMonth() + 1 ? Math.min(today, daysInMonth) : Math.round(daysInMonth / 2);
        const activeIdx = activeDay - 1;
        const activeX = getX(activeDay);
        const activeIncY = getY(fullMonthData[activeIdx]?.income || 0);
        const activeExpY = getY(fullMonthData[activeIdx]?.expense || 0);

        return (
            <View style={styles.chartWrapper}>
                <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
                    <Defs>
                        <LinearGradient id="gradInc" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor="#10B981" stopOpacity="0.15" />
                            <Stop offset="1" stopColor="#10B981" stopOpacity="0" />
                        </LinearGradient>
                        <LinearGradient id="gradExp" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor="#EF4444" stopOpacity="0.1" />
                            <Stop offset="1" stopColor="#EF4444" stopOpacity="0" />
                        </LinearGradient>
                    </Defs>

                    {yLabels.map((val, i) => (
                        <G key={i}>
                            <Line
                                x1={PADDING_LEFT}
                                y1={getY(val)}
                                x2={CHART_WIDTH - PADDING_RIGHT}
                                y2={getY(val)}
                                stroke="#F1F5F9"
                                strokeWidth="1"
                            />
                            <SvgText
                                x={PADDING_LEFT - 8}
                                y={getY(val) + 4}
                                fontSize="9"
                                fill="#94A3B8"
                                textAnchor="end"
                                fontWeight="500"
                            >
                                {formatMillions(val)}
                            </SvgText>
                        </G>
                    ))}

                    {xLabels.map((d, i) => (
                        <G key={i}>
                            <SvgText
                                x={getX(d)}
                                y={CHART_HEIGHT - 6}
                                fontSize="9"
                                fill="#94A3B8"
                                textAnchor="middle"
                                fontWeight="500"
                            >
                                Ngày {String(d).padStart(2, '0')}
                            </SvgText>
                        </G>
                    ))}

                    <Line
                        x1={activeX}
                        y1={PADDING_TOP}
                        x2={activeX}
                        y2={PADDING_TOP + drawingHeight}
                        stroke="#CBD5E1"
                        strokeWidth="1"
                        strokeDasharray="3,3"
                    />

                    <Path d={incomePaths.area} fill="url(#gradInc)" />
                    <Path d={expensePaths.area} fill="url(#gradExp)" />

                    <Path d={incomePaths.line} stroke="#10B981" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    <Path d={expensePaths.line} stroke="#EF4444" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />

                    <Circle cx={activeX} cy={activeIncY} r="8" fill="#10B981" fillOpacity="0.15" />
                    <Circle cx={activeX} cy={activeIncY} r="4" fill="#10B981" stroke="#FFFFFF" strokeWidth="1.5" />

                    <Circle cx={activeX} cy={activeExpY} r="8" fill="#EF4444" fillOpacity="0.15" />
                    <Circle cx={activeX} cy={activeExpY} r="4" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1.5" />
                </Svg>
            </View>
        );
    };

    const DonutChart = ({ data }: { data: CategoryStat[] }) => {
        const size = screenWidth * 0.42;
        const strokeWidth = 12;
        const radius = (size - strokeWidth) / 2;
        const circumference = 2 * Math.PI * radius;
        
        let currentAngle = 0;
        
        return (
            <View style={styles.donutContainer}>
                <Svg width={size} height={size}>
                    {data.length === 0 ? (
                        <Circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            stroke="#F1F5F9"
                            strokeWidth={strokeWidth}
                            fill="none"
                        />
                    ) : (
                        data.map((item, index) => {
                            const strokeDashoffset = circumference - (item.percentage / 100) * circumference;
                            const rotation = (currentAngle * 360) / 100;
                            currentAngle += item.percentage;
                            
                            return (
                                <Circle
                                    key={index}
                                    cx={size / 2}
                                    cy={size / 2}
                                    r={radius}
                                    stroke={item.color || '#6366F1'}
                                    strokeWidth={strokeWidth}
                                    strokeDasharray={`${circumference} ${circumference}`}
                                    strokeDashoffset={strokeDashoffset}
                                    strokeLinecap="round"
                                    fill="none"
                                    transform={`rotate(${rotation - 90} ${size / 2} ${size / 2})`}
                                />
                            );
                        })
                    )}
                </Svg>
                <View style={styles.donutCenter}>
                    <Text style={styles.donutCenterLabel}>Tổng chi tiêu</Text>
                    <Text style={styles.donutCenterValue}>{formatMillions(reportData?.totalExpense || 0)}</Text>
                </View>
            </View>
        );
    };

    const YearlyTrendChart = ({ data, onMonthSelect }: { data: YearlyReportResponse, onMonthSelect: (m: number) => void }) => {
        const CHART_HEIGHT = 180;
        const CHART_WIDTH = screenWidth - 64;
        const PADDING_LEFT = 36;
        const PADDING_BOTTOM = 24;
        const PADDING_TOP = 16;

        const maxVal = Math.max(...data.months.map(m => Math.max(m.income, m.expense)), 1000000);
        const barWidth = (CHART_WIDTH - PADDING_LEFT - 8) / 12;

        return (
            <View style={styles.chartWrapper}>
                <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
                    {[0, 0.5, 1].map((v, i) => (
                        <G key={i}>
                            <Line 
                                x1={PADDING_LEFT} 
                                y1={PADDING_TOP + (1 - v) * (CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM)}
                                x2={CHART_WIDTH}
                                y2={PADDING_TOP + (1 - v) * (CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM)}
                                stroke="#F1F5F9"
                                strokeWidth="1"
                            />
                            <SvgText 
                                x={PADDING_LEFT - 6}
                                y={PADDING_TOP + (1 - v) * (CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM) + 4}
                                fontSize="9"
                                fill="#94A3B8"
                                textAnchor="end"
                                fontWeight="500"
                            >
                                {formatMillions(maxVal * v)}
                            </SvgText>
                        </G>
                    ))}

                    {data.months.map((m, i) => {
                        const x = PADDING_LEFT + i * barWidth;
                        const incH = (m.income / maxVal) * (CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM);
                        const expH = (m.expense / maxVal) * (CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM);
                        const baseYear = PADDING_TOP + (CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM);

                        return (
                            <G key={i} onPress={() => onMonthSelect(m.month)}>
                                <Rect x={x} y={PADDING_TOP} width={barWidth} height={CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM} fill="transparent" />
                                
                                <Rect 
                                    x={x + 2} 
                                    y={baseYear - incH} 
                                    width={barWidth / 2 - 2} 
                                    height={Math.max(incH, 2)} 
                                    fill="#10B981" 
                                    rx="1"
                                />
                                <Rect 
                                    x={x + barWidth / 2} 
                                    y={baseYear - expH} 
                                    width={barWidth / 2 - 2} 
                                    height={Math.max(expH, 2)} 
                                    fill="#EF4444" 
                                    rx="1"
                                />
                                <SvgText 
                                    x={x + barWidth / 2}
                                    y={CHART_HEIGHT - 6}
                                    fontSize="8"
                                    fill="#94A3B8"
                                    textAnchor="middle"
                                    fontWeight="600"
                                >
                                    T{m.month}
                                </SvgText>
                            </G>
                        );
                    })}
                </Svg>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.title}>Báo Cáo Tài Chính</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* View Mode Tabs */}
            <View style={styles.tabContainer}>
                <TouchableOpacity 
                    style={[styles.tabBtn, viewMode === 'monthly' && styles.tabBtnActive]} 
                    onPress={() => setViewMode('monthly')}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.tabText, viewMode === 'monthly' && styles.tabTextActive]}>Xem theo Tháng</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tabBtn, viewMode === 'yearly' && styles.tabBtnActive]} 
                    onPress={() => setViewMode('yearly')}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.tabText, viewMode === 'yearly' && styles.tabTextActive]}>Xem theo Năm</Text>
                </TouchableOpacity>
            </View>

            {/* Time Selector */}
            <View style={styles.monthSelector}>
                <TouchableOpacity onPress={prevMonth} style={styles.monthBtn} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={16} color="#6366F1" />
                </TouchableOpacity>
                <Text style={styles.monthText}>
                    {viewMode === 'monthly' ? `Tháng ${month} / ${year}` : `Năm ${year}`}
                </Text>
                <TouchableOpacity onPress={nextMonth} style={styles.monthBtn} activeOpacity={0.7}>
                    <Ionicons name="chevron-forward" size={16} color="#6366F1" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color="#6366F1" />
                </View>
            ) : viewMode === 'monthly' && reportData ? (
                <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 24, 36) }]} showsVerticalScrollIndicator={false}>
                    {/* AI Insights Card */}
                    {(loadingAI || aiInsights.length > 0) && (
                        <View style={styles.aiCard}>
                            <View style={styles.aiHeader}>
                                <View style={styles.aiBrand}>
                                    <View style={styles.aiIconWrapper}>
                                        <Ionicons name="sparkles" size={12} color="#FFFFFF" />
                                    </View>
                                    <Text style={styles.aiLabel}>AI Smart Insights</Text>
                                </View>
                                {loadingAI && <ActivityIndicator size="small" color="#6366F1" />}
                            </View>
                            {loadingAI ? (
                                <View style={styles.aiLoadingPlaceholder}>
                                    <View style={[styles.shimmer, { width: '85%' }]} />
                                    <View style={[styles.shimmer, { width: '65%' }]} />
                                </View>
                            ) : (
                                aiInsights.map((insight, idx) => (
                                    <View key={idx} style={styles.insightRow}>
                                        <Ionicons name="checkmark-circle" size={16} color="#6366F1" style={{ marginTop: 2 }} />
                                        <Text style={styles.insightText}>{insight}</Text>
                                    </View>
                                ))
                            )}
                        </View>
                    )}

                    {/* Trend Line Chart */}
                    <View style={styles.chartCard}>
                        <View style={styles.chartHeader}>
                            <Text style={styles.chartTitle}>Xu hướng tài chính</Text>
                            <View style={styles.chartLegend}>
                                <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                                <Text style={styles.legendText}>Thu</Text>
                                <View style={[styles.legendDot, { backgroundColor: '#EF4444', marginLeft: 12 }]} />
                                <Text style={styles.legendText}>Chi</Text>
                            </View>
                        </View>
                        <TrendChart dailyStats={dailyStats} month={month} year={year} />
                    </View>

                    {/* Income & Expense Summary Cards */}
                    <View style={styles.summaryCards}>
                        <View style={[styles.card, styles.incomeCard]}>
                            <View style={styles.cardHeader}>
                                <Text style={[styles.cardLabel, { color: '#065F46' }]}>Tổng thu nhập</Text>
                                <View style={[styles.arrowBg, { backgroundColor: '#D1FAE5' }]}>
                                    <Ionicons name="arrow-up" size={12} color="#10B981" />
                                </View>
                            </View>
                            <Text style={[styles.cardValue, { color: '#065F46' }]} numberOfLines={1}>{formatVND(reportData.totalIncome)}</Text>
                        </View>
                        
                        <View style={[styles.card, styles.expenseCard]}>
                            <View style={styles.cardHeader}>
                                <Text style={[styles.cardLabel, { color: '#991B1B' }]}>Tổng chi tiêu</Text>
                                <View style={[styles.arrowBg, { backgroundColor: '#FEE2E2' }]}>
                                    <Ionicons name="arrow-down" size={12} color="#EF4444" />
                                </View>
                            </View>
                            <Text style={[styles.cardValue, { color: '#991B1B' }]} numberOfLines={1}>{formatVND(reportData.totalExpense)}</Text>
                        </View>
                    </View>

                    {/* Net Saving Box */}
                    <View style={styles.netBalanceContainer}>
                        <Text style={styles.netBalanceLabel}>Tích lũy ròng trong tháng</Text>
                        <Text style={[styles.netBalanceValue, { color: reportData.netBalance >= 0 ? '#10B981' : '#EF4444' }]}>
                            {reportData.netBalance > 0 ? '+' : ''}{formatVND(reportData.netBalance)}
                        </Text>
                    </View>

                    {/* Expense Breakdown Section */}
                    <Text style={styles.sectionTitle}>Cơ cấu khoản chi</Text>
                    <View style={styles.breakdownCard}>
                        <DonutChart data={reportData.expenseByCategory} />
                        <View style={styles.breakdownList}>
                            {reportData.expenseByCategory.length === 0 ? (
                                <Text style={styles.emptyText}>Chưa ghi nhận khoản chi tiêu nào.</Text>
                            ) : (
                                reportData.expenseByCategory.map((stat, idx) => (
                                    <TouchableOpacity 
                                        key={idx} 
                                        style={styles.statRow}
                                        onPress={() => handleCategoryPress(stat.categoryId, stat.categoryName)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.statHeader}>
                                            <View style={styles.statInfo}>
                                                <View style={[styles.statDot, { backgroundColor: stat.color || '#CBD5E1' }]} />
                                                <Text style={styles.statName} numberOfLines={1}>{stat.categoryName}</Text>
                                            </View>
                                            <Text style={styles.statPercent}>{stat.percentage}%</Text>
                                        </View>
                                        <View style={styles.barBg}>
                                            <View style={[styles.barFill, { backgroundColor: stat.color || '#CBD5E1', width: `${stat.percentage}%` }]} />
                                        </View>
                                        <Text style={styles.statAmount}>{formatVND(stat.amount)}</Text>
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>
                    </View>

                    {/* Income Breakdown Section */}
                    <Text style={styles.sectionTitle}>Cơ cấu khoản thu</Text>
                    <View style={styles.breakdownCard}>
                        <View style={styles.breakdownList}>
                            {reportData.incomeByCategory.length === 0 ? (
                                <Text style={styles.emptyText}>Chưa ghi nhận khoản thu nhập nào.</Text>
                            ) : (
                                reportData.incomeByCategory.map((stat, idx) => (
                                    <View key={idx} style={styles.statRow}>
                                        <View style={styles.statHeader}>
                                            <View style={styles.statInfo}>
                                                <View style={[styles.statDot, { backgroundColor: stat.color || '#10B981' }]} />
                                                <Text style={styles.statName} numberOfLines={1}>{stat.categoryName}</Text>
                                            </View>
                                            <Text style={styles.statPercent}>{stat.percentage}%</Text>
                                        </View>
                                        <View style={styles.barBg}>
                                            <View style={[styles.barFill, { backgroundColor: stat.color || '#10B981', width: `${stat.percentage}%` }]} />
                                        </View>
                                        <Text style={styles.statAmount}>{formatVND(stat.amount)}</Text>
                                    </View>
                                ))
                            )}
                        </View>
                    </View>
                </ScrollView>
            ) : viewMode === 'yearly' && yearlyData ? (
                <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 24, 36) }]} showsVerticalScrollIndicator={false}>
                    {/* Annual Trend Bar Chart */}
                    <View style={styles.chartCard}>
                        <View style={styles.chartHeader}>
                            <Text style={styles.chartTitle}>Tổng quan dòng tiền năm {year}</Text>
                            <Text style={styles.chartHint}>Bấm vào cột để xem chi tiết tháng</Text>
                        </View>
                        <YearlyTrendChart 
                            data={yearlyData} 
                            onMonthSelect={(m) => {
                                setMonth(m);
                                setViewMode('monthly');
                            }} 
                        />
                        <View style={[styles.chartLegend, { justifyContent: 'center', marginTop: 12 }]}>
                            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                            <Text style={styles.legendText}>Thu nhập</Text>
                            <View style={[styles.legendDot, { backgroundColor: '#EF4444', marginLeft: 16 }]} />
                            <Text style={styles.legendText}>Chi tiêu</Text>
                        </View>
                    </View>

                    {/* YoY Comparison Card */}
                    <View style={styles.yoyCard}>
                        <View style={styles.yoyHeader}>
                            <Text style={styles.yoyLabel}>So sánh với năm ngoái ({year - 1})</Text>
                            <View style={[styles.badge, yearlyData.comparison.percentageChange >= 0 ? styles.badgeSuccess : styles.badgeDanger]}>
                                <Ionicons 
                                    name={yearlyData.comparison.percentageChange >= 0 ? "trending-up-outline" : "trending-down-outline"} 
                                    size={12} 
                                    color={yearlyData.comparison.percentageChange >= 0 ? "#10B981" : "#EF4444"} 
                                />
                                <Text style={[styles.badgeText, { color: yearlyData.comparison.percentageChange >= 0 ? "#10B981" : "#EF4444" }]}>
                                    {yearlyData.comparison.percentageChange >= 0 ? '+' : ''}{yearlyData.comparison.percentageChange}%
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.yoyTitle}>Tăng trưởng thu nhập ròng</Text>
                        <View style={styles.yoyValueRow}>
                            <View>
                                <Text style={styles.yoyValueLabel}>Năm ngoái</Text>
                                <Text style={styles.yoyValueText}>{formatVND(yearlyData.comparison.previousYearTotal)}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.yoyValueLabel}>Năm nay</Text>
                                <Text style={styles.yoyValueText}>{formatVND(yearlyData.totalIncome)}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Money Flow Allocation */}
                    <Text style={styles.sectionTitle}>Cơ cấu nguồn vốn năm</Text>
                    <View style={styles.moneyFlowCard}>
                        {/* Income Partition */}
                        <Text style={styles.flowTitle}>Tổng quan dòng thu</Text>
                        <View style={styles.flowRow}>
                            <View style={styles.flowPart}>
                                <Text style={styles.flowLabel}>Thu nhập chính</Text>
                                <Text style={styles.flowValue}>{formatVND(yearlyData.mainSecondaryBreakdown.mainIncome)}</Text>
                                <View style={styles.miniBar}>
                                    <View style={[styles.miniBarFill, { backgroundColor: '#10B981', width: yearlyData.totalIncome > 0 ? `${(yearlyData.mainSecondaryBreakdown.mainIncome / yearlyData.totalIncome) * 100}%` : '0%' }]} />
                                </View>
                            </View>
                            <View style={styles.flowPart}>
                                <Text style={styles.flowLabel}>Thu nhập phụ</Text>
                                <Text style={styles.flowValue}>{formatVND(yearlyData.mainSecondaryBreakdown.secondaryIncome)}</Text>
                                <View style={styles.miniBar}>
                                    <View style={[styles.miniBarFill, { backgroundColor: '#6366F1', width: yearlyData.totalIncome > 0 ? `${(yearlyData.mainSecondaryBreakdown.secondaryIncome / yearlyData.totalIncome) * 100}%` : '0%' }]} />
                                </View>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        {/* Expense Partition */}
                        <Text style={styles.flowTitle}>Tổng quan dòng chi</Text>
                        <View style={styles.flowRow}>
                            <View style={styles.flowPart}>
                                <Text style={styles.flowLabel}>Chi tiêu thiết yếu</Text>
                                <Text style={styles.flowValue}>{formatVND(yearlyData.mainSecondaryBreakdown.mainExpense)}</Text>
                                <View style={styles.miniBar}>
                                    <View style={[styles.miniBarFill, { backgroundColor: '#EF4444', width: yearlyData.totalExpense > 0 ? `${(yearlyData.mainSecondaryBreakdown.mainExpense / yearlyData.totalExpense) * 100}%` : '0%' }]} />
                                </View>
                            </View>
                            <View style={styles.flowPart}>
                                <Text style={styles.flowLabel}>Chi tiêu linh hoạt</Text>
                                <Text style={styles.flowValue}>{formatVND(yearlyData.mainSecondaryBreakdown.secondaryExpense)}</Text>
                                <View style={styles.miniBar}>
                                    <View style={[styles.miniBarFill, { backgroundColor: '#F59E0B', width: yearlyData.totalExpense > 0 ? `${(yearlyData.mainSecondaryBreakdown.secondaryExpense / yearlyData.totalExpense) * 100}%` : '0%' }]} />
                                </View>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            ) : null}

            {/* Drilldown Modal (Transactions by category in month) */}
            {showDrilldown && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHandle} />
                        <View style={styles.modalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <View style={styles.drilldownIconBadge}>
                                    <Ionicons name="filter-outline" size={15} color="#6366F1" />
                                </View>
                                <Text style={styles.modalTitle}>Chi tiết: {selectedCategory?.name}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowDrilldown(false)} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                        
                        {loadingDrilldown ? (
                            <ActivityIndicator size="large" color="#6366F1" style={{ marginVertical: 40 }} />
                        ) : drilldownTransactions.length === 0 ? (
                            <View style={styles.modalEmpty}>
                                <Text style={styles.emptyText}>Không tìm thấy giao dịch nào trong khoảng thời gian này.</Text>
                            </View>
                        ) : (
                            <ScrollView style={styles.drilldownList} showsVerticalScrollIndicator={false}>
                                {drilldownTransactions.map((tx, i) => (
                                    <View key={i} style={styles.drilldownItem}>
                                        <View style={styles.drilldownMain}>
                                            <Text style={styles.drilldownDesc} numberOfLines={1}>{tx.description || selectedCategory?.name}</Text>
                                            <Text style={styles.drilldownDate}>
                                                {formatDate(tx.transactionDate)}
                                            </Text>
                                        </View>
                                        <Text style={[styles.drilldownAmount, { color: tx.type === 'INCOME' ? '#10B981' : '#EF4444' }]}>
                                            {tx.type === 'INCOME' ? '+' : '-'}{formatVND(tx.amount)}
                                        </Text>
                                    </View>
                                ))}
                            </ScrollView>
                        )}
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC', paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
    title: { fontSize: 18, fontWeight: '700', color: '#1F2937' },

    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    monthSelector: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 12, backgroundColor: '#F8FAFC' },
    monthBtn: { padding: 8, backgroundColor: '#EEF2FF', borderRadius: 20 },
    monthText: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginHorizontal: 20 },

    tabContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 14, marginHorizontal: 16, marginVertical: 8, padding: 3, borderWidth: 1, borderColor: '#E2E8F0' },
    tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 11 },
    tabBtnActive: { backgroundColor: '#FFFFFF', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
    tabText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
    tabTextActive: { color: '#6366F1', fontWeight: '700' },

    content: { paddingHorizontal: 16, paddingTop: 8 },

    chartCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
    chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    chartTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
    chartLegend: { flexDirection: 'row', alignItems: 'center' },
    legendDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
    legendText: { fontSize: 11, color: '#64748B', fontWeight: '500' },
    chartHint: { fontSize: 10, color: '#94A3B8', fontWeight: '500' },
    chartWrapper: { marginTop: 6, alignItems: 'center' },

    summaryCards: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    card: { flex: 1, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: 'transparent' },
    incomeCard: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
    expenseCard: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    cardLabel: { fontSize: 12, fontWeight: '600' },
    arrowBg: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    cardValue: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },

    netBalanceContainer: { backgroundColor: '#FFFFFF', paddingVertical: 18, paddingHorizontal: 16, borderRadius: 16, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#F1F5F9' },
    netBalanceLabel: { fontSize: 12, color: '#64748B', fontWeight: '500', marginBottom: 8 },
    netBalanceValue: { fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },

    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 12, marginTop: 4 },

    breakdownCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#F1F5F9' },
    breakdownList: { marginTop: 8 },
    emptyText: { color: '#94A3B8', fontStyle: 'italic', textAlign: 'center', paddingVertical: 16, fontSize: 13, fontWeight: '500' },

    statRow: { marginBottom: 16 },
    statHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    statInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
    statDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    statName: { fontSize: 13, fontWeight: '600', color: '#1F2937', flex: 1 },
    statPercent: { fontSize: 13, fontWeight: '700', color: '#1F2937', fontVariant: ['tabular-nums'] },
    statAmount: { fontSize: 12, color: '#64748B', fontWeight: '600', marginTop: 4, fontVariant: ['tabular-nums'] },

    barBg: { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 3 },

    yoyCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#F1F5F9' },
    yoyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    yoyLabel: { fontSize: 11, color: '#64748B', fontWeight: '500' },
    yoyTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
    yoyValueRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10 },
    yoyValueLabel: { fontSize: 10, color: '#64748B', fontWeight: '500', marginBottom: 2 },
    yoyValueText: { fontSize: 13, fontWeight: '600', color: '#475569', fontVariant: ['tabular-nums'] },

    badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    badgeSuccess: { backgroundColor: '#ECFDF5' },
    badgeDanger: { backgroundColor: '#FEF2F2' },
    badgeText: { fontSize: 11, fontWeight: '700', marginLeft: 4, fontVariant: ['tabular-nums'] },

    moneyFlowCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#F1F5F9' },
    flowTitle: { fontSize: 13, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
    flowRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
    flowPart: { flex: 1 },
    flowLabel: { fontSize: 11, color: '#64748B', marginBottom: 4, fontWeight: '500' },
    flowValue: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 8, fontVariant: ['tabular-nums'] },
    miniBar: { height: 4, backgroundColor: '#F1F5F9', borderRadius: 2, overflow: 'hidden' },
    miniBarFill: { height: '100%', borderRadius: 2 },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 14 },

    donutContainer: { alignItems: 'center', marginVertical: 12, position: 'relative' },
    donutCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
    donutCenterLabel: { fontSize: 10, color: '#64748B', fontWeight: '600', marginBottom: 2 },
    donutCenterValue: { fontSize: 15, fontWeight: '800', color: '#1F2937', fontVariant: ['tabular-nums'] },

    aiCard: { backgroundColor: '#F5F7FF', borderRadius: 20, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#6366F1', borderWidth: 1, borderColor: '#EEF2FF' },
    aiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    aiBrand: { flexDirection: 'row', alignItems: 'center' },
    aiIconWrapper: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    aiLabel: { fontSize: 13, fontWeight: '700', color: '#6366F1' },
    aiLoadingPlaceholder: { gap: 8 },
    shimmer: { height: 10, backgroundColor: '#E0E7FF', borderRadius: 5 },
    insightRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    insightText: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 18, fontWeight: '500' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 30, maxHeight: '80%', borderWidth: 1, borderColor: '#F1F5F9' },
    modalHandle: { width: 36, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginTop: 8, marginBottom: 16 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    drilldownIconBadge: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
    modalTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
    modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
    drilldownList: { marginBottom: 10 },
    drilldownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    drilldownMain: { flex: 1, marginRight: 12 },
    drilldownDesc: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 2 },
    drilldownDate: { fontSize: 11, color: '#64748B', fontWeight: '500' },
    drilldownAmount: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
    modalEmpty: { paddingVertical: 40, alignItems: 'center' },
});
