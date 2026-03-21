import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions, Platform } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line, Text as SvgText, G, Rect } from 'react-native-svg';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ReportService, ReportSummaryResponse, DailyStat, YearlyReportResponse, CategoryStat } from '../src/services/report.service';
import { AiService } from '../src/services/ai.service';
import { WalletService, WalletResponse } from '../src/services/wallet.service';
import { formatDate } from '../src/utils/date';
const screenWidth = Dimensions.get('window').width;
const formatVND = (n: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(n) + ' VNĐ';
const formatMillions = (n: number) => {
    if (Math.abs(n) >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'tỷ';
    if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'tr';
    if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(0) + 'k';
    return n.toString();
};

export default function ReportScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    
    const [loading, setLoading] = useState(true);
    
    // Initialize state from params if available
    const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>((params.viewMode as any) || 'monthly');
    const [month, setMonth] = useState(params.month ? parseInt(params.month as string) : new Date().getMonth() + 1);
    const [year, setYear] = useState(params.year ? parseInt(params.year as string) : new Date().getFullYear());

    const [reportData, setReportData] = useState<ReportSummaryResponse | null>(null);
    const [yearlyData, setYearlyData] = useState<YearlyReportResponse | null>(null);
    const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
    
    // AI & Drill-down states
    const [aiInsights, setAiInsights] = useState<string[]>([]);
    const [loadingAI, setLoadingAI] = useState(false);
    const [showDrilldown, setShowDrilldown] = useState(false);
    const [drilldownTransactions, setDrilldownTransactions] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<{id: number, name: string} | null>(null);
    const [loadingDrilldown, setLoadingDrilldown] = useState(false);

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
            } else {
                const data = await ReportService.getYearlySummary(year);
                setYearlyData(data);
            }

            // Fetch AI Insights if in monthly mode
            if (viewMode === 'monthly') {
                fetchAIInsights(month, year);
            }
        } catch (error) {
            console.warn('Failed to load report', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAIInsights = async (m: number, y: number) => {
        try {
            setLoadingAI(true);
            const data = await ReportService.getMonthlySummary(m, y);
            if (data && (data.totalIncome > 0 || data.totalExpense > 0)) {
                const aiResult = await AiService.getReportInsight(data, m, y);
                if (aiResult && aiResult.insights) {
                    setAiInsights(aiResult.insights);
                }
            }
        } catch (err) {
            console.warn('AI Insight fetch failed', err);
        } finally {
            setLoadingAI(false);
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

    // Use real daily stats – sample key days for bar chart
    const sampleDays = [1, 5, 10, 15, 20, 25, dailyStats.length];
    const chartLabels = sampleDays.map(d => String(d).padStart(2, '0'));
    const incomeData = sampleDays.map(d => {
        const stat = dailyStats.find(s => s.day === d);
        return stat ? stat.totalIncome : 0;
    });
    const expenseData = sampleDays.map(d => {
        const stat = dailyStats.find(s => s.day === d);
        return stat ? stat.totalExpense : 0;
    });
    const maxVal = Math.max(...incomeData, ...expenseData, 1); // avoid divide-by-zero

    // --- TrendChart Component ---
    const TrendChart = ({ dailyStats, month, year }: { dailyStats: DailyStat[], month: number, year: number }) => {
        const CHART_HEIGHT = 200;
        const CHART_WIDTH = screenWidth - 64;
        const PADDING_LEFT = 40;
        const PADDING_BOTTOM = 30;
        const PADDING_TOP = 20;
        const PADDING_RIGHT = 10;

        const drawingWidth = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT;
        const drawingHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

        // Ensure we have data for all days in month
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
        const overallMax = Math.max(maxIncome, maxExpense, 1000000); // at least 1tr for scale

        // Helper to get Y coordinate
        const getY = (val: number) => PADDING_TOP + drawingHeight - (val / overallMax) * drawingHeight;
        // Helper to get X coordinate
        const getX = (day: number) => PADDING_LEFT + ((day - 1) / (daysInMonth - 1)) * drawingWidth;

        // Path generator for line and area (Smooth Bézier)
        const generatePaths = (type: 'income' | 'expense') => {
            if (fullMonthData.length === 0) return { line: '', area: '' };

            let linePath = `M ${getX(fullMonthData[0].day)} ${getY(fullMonthData[0][type])}`;

            // For a smooth curve, we'll use a simple approximation if points are dense
            // Better: use Quadratic or Cubic Bézier with control points
            // For now, let's use line segments but with a slight smoothing if needed.
            // Actually, for 30 points, simple lines look quite smooth already but let's try a basic curve.
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

        // Y-axis grid
        const yLabels = [0, overallMax * 0.25, overallMax * 0.5, overallMax * 0.75, overallMax];
        const xLabels = [1, 5, 10, 15, 20, 25, daysInMonth];

        // Specific day to highlight (e.g. current day or last recorded day)
        const today = new Date().getDate();
        const activeDay = month === new Date().getMonth() + 1 ? Math.min(today, daysInMonth) : 15;
        const activeIdx = activeDay - 1;
        const activeX = getX(activeDay);
        const activeIncY = getY(fullMonthData[activeIdx]?.income || 0);
        const activeExpY = getY(fullMonthData[activeIdx]?.expense || 0);

        return (
            <View style={styles.chartWrapper}>
                <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
                    <Defs>
                        <LinearGradient id="gradInc" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor="#10B981" stopOpacity="0.3" />
                            <Stop offset="1" stopColor="#10B981" stopOpacity="0" />
                        </LinearGradient>
                        <LinearGradient id="gradExp" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor="#EF4444" stopOpacity="0.2" />
                            <Stop offset="1" stopColor="#EF4444" stopOpacity="0" />
                        </LinearGradient>
                    </Defs>

                    {/* Y-axis Labels & Grid */}
                    {yLabels.map((val, i) => (
                        <G key={i}>
                            <Line
                                x1={PADDING_LEFT}
                                y1={getY(val)}
                                x2={CHART_WIDTH - PADDING_RIGHT}
                                y2={getY(val)}
                                stroke="#F3F4F6"
                                strokeWidth="1"
                            />
                            <SvgText
                                x={PADDING_LEFT - 8}
                                y={getY(val) + 4}
                                fontSize="10"
                                fill="#9CA3AF"
                                textAnchor="end"
                            >
                                {formatMillions(val)}
                            </SvgText>
                        </G>
                    ))}

                    {/* X-axis Labels */}
                    {xLabels.map((d, i) => (
                        <G key={i}>
                            {d === activeDay && (
                                <Rect
                                    x={getX(d) - 10}
                                    y={CHART_HEIGHT - 24}
                                    width="20"
                                    height="18"
                                    rx="4"
                                    fill="#EEF2FF"
                                />
                            )}
                            <SvgText
                                x={getX(d)}
                                y={CHART_HEIGHT - 10}
                                fontSize="10"
                                fill={d === activeDay ? "#4F46E5" : "#9CA3AF"}
                                textAnchor="middle"
                                fontWeight={d === activeDay ? "bold" : "normal"}
                            >
                                {String(d).padStart(2, '0')}
                            </SvgText>
                        </G>
                    ))}

                    {/* Vertical Highlight Line */}
                    <Line
                        x1={activeX}
                        y1={PADDING_TOP}
                        x2={activeX}
                        y2={PADDING_TOP + drawingHeight}
                        stroke="#E5E7EB"
                        strokeWidth="1"
                        strokeDasharray="4,4"
                    />

                    {/* Areas */}
                    <Path d={incomePaths.area} fill="url(#gradInc)" />
                    <Path d={expensePaths.area} fill="url(#gradExp)" />

                    {/* Lines */}
                    <Path d={incomePaths.line} stroke="#10B981" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    <Path d={expensePaths.line} stroke="#EF4444" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

                    {/* Highlight Dots */}
                    <Circle cx={activeX} cy={activeIncY} r="12" fill="#10B981" fillOpacity="0.15" />
                    <Circle cx={activeX} cy={activeIncY} r="6" fill="#10B981" stroke="#fff" strokeWidth="2" />

                    <Circle cx={activeX} cy={activeExpY} r="12" fill="#EF4444" fillOpacity="0.15" />
                    <Circle cx={activeX} cy={activeExpY} r="6" fill="#EF4444" stroke="#fff" strokeWidth="2" />
                </Svg>
            </View>
        );
    };

    // --- DonutChart Component ---
    const DonutChart = ({ data }: { data: CategoryStat[] }) => {
        const size = screenWidth * 0.45;
        const strokeWidth = 14;
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
                            stroke="#F3F4F6"
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
                                    stroke={item.color || '#4F46E5'}
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
                    {/* Center Text */}
                    <View style={styles.donutCenter}>
                        <Text style={styles.donutCenterLabel}>Tổng chi</Text>
                        <Text style={styles.donutCenterValue}>{formatMillions(reportData?.totalExpense || 0)}</Text>
                    </View>
                </Svg>
            </View>
        );
    };

    // --- YearlyTrendChart Component ---
    const YearlyTrendChart = ({ data, onMonthSelect }: { data: YearlyReportResponse, onMonthSelect: (m: number) => void }) => {
        const CHART_HEIGHT = 200;
        const CHART_WIDTH = screenWidth - 64;
        const PADDING_LEFT = 40;
        const PADDING_BOTTOM = 30;
        const PADDING_TOP = 20;

        const maxVal = Math.max(...data.months.map(m => Math.max(m.income, m.expense)), 1000000);
        const barWidth = (CHART_WIDTH - PADDING_LEFT - 10) / 12;

        return (
            <View style={styles.chartWrapper}>
                <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
                    {/* Y Axis Grid */}
                    {[0, 0.5, 1].map((v, i) => (
                        <G key={i}>
                            <Line 
                                x1={PADDING_LEFT} 
                                y1={PADDING_TOP + (1 - v) * (CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM)}
                                x2={CHART_WIDTH}
                                y2={PADDING_TOP + (1 - v) * (CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM)}
                                stroke="#F3F4F6"
                            />
                            <SvgText 
                                x={PADDING_LEFT - 5}
                                y={PADDING_TOP + (1 - v) * (CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM) + 4}
                                fontSize="10"
                                fill="#9CA3AF"
                                textAnchor="end"
                            >
                                {formatMillions(maxVal * v)}
                            </SvgText>
                        </G>
                    ))}

                    {/* Bars */}
                    {data.months.map((m, i) => {
                        const x = PADDING_LEFT + i * barWidth;
                        const incH = (m.income / maxVal) * (CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM);
                        const expH = (m.expense / maxVal) * (CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM);
                        const baseYear = PADDING_TOP + (CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM);

                        return (
                            <G key={i} onPress={() => onMonthSelect(m.month)}>
                                {/* Group hit area */}
                                <Rect x={x} y={PADDING_TOP} width={barWidth} height={CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM} fill="transparent" />
                                
                                <Rect 
                                    x={x + 2} 
                                    y={baseYear - incH} 
                                    width={barWidth / 2 - 2} 
                                    height={incH} 
                                    fill="#10B981" 
                                    rx="2"
                                />
                                <Rect 
                                    x={x + barWidth / 2} 
                                    y={baseYear - expH} 
                                    width={barWidth / 2 - 2} 
                                    height={expH} 
                                    fill="#EF4444" 
                                    rx="2"
                                />
                                <SvgText 
                                    x={x + barWidth / 2}
                                    y={CHART_HEIGHT - 10}
                                    fontSize="8"
                                    fill="#9CA3AF"
                                    textAnchor="middle"
                                >
                                    {m.month}
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
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.title}>Báo cáo Thống kê</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.tabContainer}>
                <TouchableOpacity 
                    style={[styles.tabBtn, viewMode === 'monthly' && styles.tabBtnActive]} 
                    onPress={() => setViewMode('monthly')}
                >
                    <Text style={[styles.tabText, viewMode === 'monthly' && styles.tabTextActive]}>Tháng</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tabBtn, viewMode === 'yearly' && styles.tabBtnActive]} 
                    onPress={() => setViewMode('yearly')}
                >
                    <Text style={[styles.tabText, viewMode === 'yearly' && styles.tabTextActive]}>Năm</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.monthSelector}>
                <TouchableOpacity onPress={prevMonth} style={styles.monthBtn}>
                    <Ionicons name="chevron-back" size={16} color="#4F46E5" />
                </TouchableOpacity>
                <Text style={styles.monthText}>
                    {viewMode === 'monthly' ? `Tháng ${month} / ${year}` : `Năm ${year}`}
                </Text>
                <TouchableOpacity onPress={nextMonth} style={styles.monthBtn}>
                    <Ionicons name="chevron-forward" size={16} color="#4F46E5" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color="#4F46E5" />
                </View>
            ) : viewMode === 'monthly' && reportData ? (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    {/* AI Insights Card */}
                    {(loadingAI || aiInsights.length > 0) && (
                        <View style={styles.aiCard}>
                            <View style={styles.aiHeader}>
                                <View style={styles.aiBrand}>
                                    <View style={styles.aiIconWrapper}>
                                        <Ionicons name="sparkles" size={12} color="#fff" />
                                    </View>
                                    <Text style={styles.aiLabel}>Trợ lý AI phân tích</Text>
                                </View>
                                {loadingAI && <ActivityIndicator size="small" color="#4F46E5" />}
                            </View>
                            {loadingAI ? (
                                <View style={styles.aiLoadingPlaceholder}>
                                    <View style={[styles.shimmer, { width: '80%' }]} />
                                    <View style={[styles.shimmer, { width: '60%' }]} />
                                </View>
                            ) : (
                                aiInsights.map((insight, idx) => (
                                    <View key={idx} style={styles.insightRow}>
                                        <Ionicons name="checkmark-circle" size={16} color="#4F46E5" style={{ marginTop: 2 }} />
                                        <Text style={styles.insightText}>{insight}</Text>
                                    </View>
                                ))
                            )}
                        </View>
                    )}

                    <View style={styles.chartCard}>
                        <View style={styles.chartHeader}>
                            <Text style={styles.chartTitle}>Biến động Thu - Chi</Text>
                            <View style={styles.chartLegend}>
                                <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                                <Text style={styles.legendText}>Thu</Text>
                                <View style={[styles.legendDot, { backgroundColor: '#EF4444', marginLeft: 15 }]} />
                                <Text style={styles.legendText}>Chi</Text>
                            </View>
                        </View>
                        <TrendChart dailyStats={dailyStats} month={month} year={year} />
                    </View>

                    <View style={styles.summaryCards}>
                        <View style={[styles.card, styles.incomeCard]}>
                            <View style={styles.cardHeader}>
                                <Text style={[styles.cardLabel, { color: '#059669' }]}>Thu nhập</Text>
                                <View style={[styles.arrowBg, { backgroundColor: '#D1FAE5' }]}>
                                    <Ionicons name="arrow-up-outline" size={14} color="#10B981" />
                                </View>
                            </View>
                            <Text style={[styles.cardValue, { color: '#059669' }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.5}>{formatVND(reportData.totalIncome)}</Text>
                        </View>
                        <View style={[styles.card, styles.expenseCard]}>
                            <View style={styles.cardHeader}>
                                <Text style={[styles.cardLabel, { color: '#DC2626' }]}>Chi tiêu</Text>
                                <View style={[styles.arrowBg, { backgroundColor: '#FEE2E2' }]}>
                                    <Ionicons name="arrow-down-outline" size={14} color="#EF4444" />
                                </View>
                            </View>
                            <Text style={[styles.cardValue, { color: '#DC2626' }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.5}>{formatVND(reportData.totalExpense)}</Text>
                        </View>
                    </View>

                    <View style={styles.netBalanceContainer}>
                        <Text style={styles.netBalanceLabel}>Tích lũy trong tháng</Text>
                        <Text style={[styles.netBalanceValue, { color: reportData.netBalance >= 0 ? '#10B981' : '#EF4444' }]}>
                            {reportData.netBalance > 0 ? '+' : ''}{formatVND(reportData.netBalance)}
                        </Text>
                    </View>

                    <Text style={styles.sectionTitle}>Cơ cấu Chi tiêu</Text>
                    
                    {/* Donut Chart Integration */}
                    <DonutChart data={reportData.expenseByCategory} />

                    <View style={styles.breakdownContainer}>
                        {reportData.expenseByCategory.length === 0 ? (
                            <Text style={styles.emptyText}>Chưa có phát sinh chi tiêu nào trong tháng.</Text>
                        ) : (
                            reportData.expenseByCategory.map((stat, idx) => (
                                <TouchableOpacity 
                                    key={idx} 
                                    style={styles.statRow}
                                    onPress={() => handleCategoryPress(stat.categoryId, stat.categoryName)}
                                >
                                    <View style={styles.statHeader}>
                                        <View style={styles.statInfo}>
                                            <View style={[styles.statDot, { backgroundColor: stat.color || '#F97316' }]} />
                                            <Text style={styles.statName}>{stat.categoryName}</Text>
                                        </View>
                                        <Text style={styles.statPercent}>{stat.percentage}%</Text>
                                    </View>
                                    <Text style={styles.statAmount}>{formatVND(stat.amount)}</Text>
                                    <View style={styles.barBg}>
                                        <View style={[styles.barFill, { backgroundColor: stat.color || '#F97316', width: `${stat.percentage}%` }]} />
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                    </View>

                    <Text style={styles.sectionTitle}>Cơ cấu Thu nhập</Text>
                    <View style={styles.breakdownContainer}>
                        {reportData.incomeByCategory.length === 0 ? (
                            <Text style={styles.emptyText}>Chưa có phát sinh thu nhập nào trong tháng.</Text>
                        ) : (
                            reportData.incomeByCategory.map((stat, idx) => (
                                <View key={idx} style={styles.statRow}>
                                    <View style={styles.statHeader}>
                                        <View style={styles.statInfo}>
                                            <View style={[styles.statDot, { backgroundColor: stat.color || '#10B981' }]} />
                                            <Text style={styles.statName}>{stat.categoryName}</Text>
                                        </View>
                                        <Text style={styles.statPercent}>{stat.percentage}%</Text>
                                    </View>
                                    <Text style={styles.statAmount}>{formatVND(stat.amount)}</Text>
                                    <View style={styles.barBg}>
                                        <View style={[styles.barFill, { backgroundColor: stat.color || '#10B981', width: `${stat.percentage}%` }]} />
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                    <View style={{ height: 50 }} />
                </ScrollView>
            ) : viewMode === 'yearly' && yearlyData ? (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Annual Chart */}
                    <View style={styles.chartCard}>
                        <View style={styles.chartHeader}>
                            <Text style={styles.chartTitle}>Tổng quan {year}</Text>
                            <Text style={styles.chartHint}>Bấm vào cột để xem chi tiết tháng</Text>
                        </View>
                        <YearlyTrendChart 
                            data={yearlyData} 
                            onMonthSelect={(m) => {
                                setMonth(m);
                                setViewMode('monthly');
                            }} 
                        />
                        <View style={[styles.chartLegend, { justifyContent: 'center', marginTop: 10 }]}>
                            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                            <Text style={styles.legendText}>Thu</Text>
                            <View style={[styles.legendDot, { backgroundColor: '#EF4444', marginLeft: 15 }]} />
                            <Text style={styles.legendText}>Chi</Text>
                        </View>
                    </View>

                    {/* YoY Comparison */}
                    <View style={styles.yoyCard}>
                        <View style={styles.yoyInfo}>
                            <Text style={styles.yoyLabel}>So với năm ngoái ({year - 1})</Text>
                            <View style={styles.yoyValueRow}>
                                <Text style={styles.yoyTitle}>Tăng trưởng thu nhập</Text>
                                <View style={[styles.badge, yearlyData.comparison.percentageChange >= 0 ? styles.badgeSuccess : styles.badgeDanger]}>
                                    <Ionicons 
                                        name={yearlyData.comparison.percentageChange >= 0 ? "trending-up" : "trending-down"} 
                                        size={12} 
                                        color={yearlyData.comparison.percentageChange >= 0 ? "#10B981" : "#EF4444"} 
                                    />
                                    <Text style={[styles.badgeText, { color: yearlyData.comparison.percentageChange >= 0 ? "#10B981" : "#EF4444" }]}>
                                        {Math.abs(yearlyData.comparison.percentageChange)}%
                                    </Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.yoyIndicator}>
                            <Text style={styles.yoySubtext}>Năm ngoái: {formatVND(yearlyData.comparison.previousYearTotal)}</Text>
                            <Text style={styles.yoySubtext}>Năm nay: {formatVND(yearlyData.totalIncome)}</Text>
                        </View>
                    </View>

                    {/* Main vs Secondary Breakdown */}
                    <Text style={styles.sectionTitle}>Phân bổ Tài chính</Text>
                    
                    <View style={styles.moneyFlowCard}>
                        {/* Income Partition */}
                        <Text style={styles.flowTitle}>Cơ cấu Thu nhập</Text>
                        <View style={styles.flowRow}>
                            <View style={styles.flowPart}>
                                <Text style={styles.flowLabel}>Tiền Chính</Text>
                                <Text style={styles.flowValue}>{formatVND(yearlyData.mainSecondaryBreakdown.mainIncome)}</Text>
                                <View style={styles.miniBar}><View style={[styles.miniBarFill, { backgroundColor: '#10B981', width: yearlyData.totalIncome > 0 ? `${(yearlyData.mainSecondaryBreakdown.mainIncome / yearlyData.totalIncome) * 100}%` : '0%' }]} /></View>
                            </View>
                            <View style={styles.flowPart}>
                                <Text style={styles.flowLabel}>Tiền Phụ</Text>
                                <Text style={styles.flowValue}>{formatVND(yearlyData.mainSecondaryBreakdown.secondaryIncome)}</Text>
                                <View style={styles.miniBar}><View style={[styles.miniBarFill, { backgroundColor: '#8B5CF6', width: yearlyData.totalIncome > 0 ? `${(yearlyData.mainSecondaryBreakdown.secondaryIncome / yearlyData.totalIncome) * 100}%` : '0%' }]} /></View>
                            </View>
                        </View>

                        <View style={[styles.divider, { marginVertical: 20 }]} />

                        {/* Expense Partition */}
                        <Text style={styles.flowTitle}>Cơ cấu Chi tiêu</Text>
                        <View style={styles.flowRow}>
                            <View style={styles.flowPart}>
                                <Text style={styles.flowLabel}>Chi Thiết yếu</Text>
                                <Text style={styles.flowValue}>{formatVND(yearlyData.mainSecondaryBreakdown.mainExpense)}</Text>
                                <View style={styles.miniBar}><View style={[styles.miniBarFill, { backgroundColor: '#EF4444', width: yearlyData.totalExpense > 0 ? `${(yearlyData.mainSecondaryBreakdown.mainExpense / yearlyData.totalExpense) * 100}%` : '0%' }]} /></View>
                            </View>
                            <View style={styles.flowPart}>
                                <Text style={styles.flowLabel}>Chi Linh hoạt</Text>
                                <Text style={styles.flowValue}>{formatVND(yearlyData.mainSecondaryBreakdown.secondaryExpense)}</Text>
                                <View style={styles.miniBar}><View style={[styles.miniBarFill, { backgroundColor: '#F97316', width: yearlyData.totalExpense > 0 ? `${(yearlyData.mainSecondaryBreakdown.secondaryExpense / yearlyData.totalExpense) * 100}%` : '0%' }]} /></View>
                            </View>
                        </View>
                    </View>

                    <View style={{ height: 50 }} />
                </ScrollView>
            ) : null}

            {/* Drilldown Modal */}
            {showDrilldown && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Chi tiết: {selectedCategory?.name}</Text>
                            <TouchableOpacity onPress={() => setShowDrilldown(false)}>
                                <Ionicons name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                        
                        {loadingDrilldown ? (
                            <ActivityIndicator size="large" color="#4F46E5" style={{ marginVertical: 40 }} />
                        ) : drilldownTransactions.length === 0 ? (
                            <Text style={styles.emptyText}>Không tìm thấy giao dịch nào.</Text>
                        ) : (
                            <ScrollView style={styles.drilldownList}>
                                {drilldownTransactions.map((tx, i) => (
                                    <View key={i} style={styles.drilldownItem}>
                                        <View style={styles.drilldownMain}>
                                            <Text style={styles.drilldownDesc}>{tx.description || selectedCategory?.name}</Text>
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
    container: { flex: 1, backgroundColor: '#F8F9FB', paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16, backgroundColor: '#F8F9FB' },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
    title: { fontSize: 18, fontWeight: '700', color: '#111827' },

    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    monthSelector: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 10, backgroundColor: '#F8F9FB' },
    monthBtn: { padding: 8, backgroundColor: '#EEF2FF', borderRadius: 20 },
    monthText: { fontSize: 16, fontWeight: '700', color: '#111827', marginHorizontal: 20 },

    tabContainer: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 12, marginHorizontal: 16, marginBottom: 16, padding: 4 },
    tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
    tabBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
    tabTextActive: { color: '#4F46E5', fontWeight: '700' },

    content: { padding: 16 },

    // Chart
    chartCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    chartTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
    chartLegend: { flexDirection: 'row', alignItems: 'center' },
    legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    legendText: { fontSize: 13, color: '#6B7280' },

    // Cards
    summaryCards: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    card: { flex: 1, padding: 16, borderRadius: 16 },
    incomeCard: { backgroundColor: '#ECFDF5' },
    expenseCard: { backgroundColor: '#FEF2F2' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    cardLabel: { fontSize: 14, fontWeight: '600' },
    arrowBg: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    cardValue: { fontSize: 13, fontWeight: '700' },

    // Net
    netBalanceContainer: { backgroundColor: '#fff', paddingVertical: 24, paddingHorizontal: 16, borderRadius: 16, alignItems: 'center', marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    netBalanceLabel: { fontSize: 14, color: '#6B7280', marginBottom: 12 },
    netBalanceValue: { fontSize: 22, fontWeight: '800' },

    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 },

    breakdownContainer: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
    emptyText: { color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center', paddingVertical: 10 },

    statRow: { marginBottom: 24 },
    statHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    statInfo: { flexDirection: 'row', alignItems: 'center' },
    statDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
    statName: { fontSize: 15, fontWeight: '600', color: '#111827' },
    statPercent: { fontSize: 15, fontWeight: '700', color: '#111827' },
    statAmount: { fontSize: 13, color: '#9CA3AF', marginBottom: 10 },

    barBg: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 3 },

    // Custom chart styles
    chartWrapper: { marginTop: 10, alignItems: 'center' },
    chartHint: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },

    // Yearly Specific
    yoyCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
    yoyInfo: { marginBottom: 12 },
    yoyLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
    yoyValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    yoyTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
    yoyIndicator: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10 },
    yoySubtext: { fontSize: 11, color: '#9CA3AF' },

    badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    badgeSuccess: { backgroundColor: '#ECFDF5' },
    badgeDanger: { backgroundColor: '#FEF2F2' },
    badgeText: { fontSize: 12, fontWeight: '700', marginLeft: 4 },

    moneyFlowCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
    flowTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 16 },
    flowRow: { flexDirection: 'row', justifyContent: 'space-between' },
    flowPart: { flex: 1, marginRight: 15 },
    flowLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
    flowValue: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
    miniBar: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
    miniBarFill: { height: '100%', borderRadius: 3 },
    divider: { height: 1, backgroundColor: '#F3F4F6' },

    // Donut styles
    donutContainer: { alignItems: 'center', marginVertical: 24, position: 'relative' },
    donutCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
    donutCenterLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
    donutCenterValue: { fontSize: 16, fontWeight: '800', color: '#111827' },

    // AI Card styles
    aiCard: { backgroundColor: '#EEF2FF', borderRadius: 16, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#4F46E5' },
    aiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    aiBrand: { flexDirection: 'row', alignItems: 'center' },
    aiIconWrapper: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    aiLabel: { fontSize: 13, fontWeight: '700', color: '#4F46E5' },
    aiLoadingPlaceholder: { gap: 8 },
    shimmer: { height: 12, backgroundColor: '#E0E7FF', borderRadius: 6 },
    insightRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    insightText: { flex: 1, fontSize: 14, color: '#374151', lineHeight: 20 },

    // Modal styles
    modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', zIndex: 1000 },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
    drilldownList: { marginBottom: 20 },
    drilldownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    drilldownMain: { flex: 1 },
    drilldownDesc: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 2 },
    drilldownDate: { fontSize: 12, color: '#9CA3AF' },
    drilldownAmount: { fontSize: 15, fontWeight: '700' },
});
