import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, Modal, TouchableOpacity,
    Platform, Dimensions, Pressable, FlatList, NativeSyntheticEvent, NativeScrollEvent
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_HEIGHT = 45;
const VISIBLE_ITEMS = 5;

interface WheelPickerProps {
    data: (string | number)[];
    selectedValue: string | number;
    onValueChange: (value: string | number) => void;
}

const WheelPicker: React.FC<WheelPickerProps> = ({ data, selectedValue, onValueChange }) => {
    const flatListRef = useRef<FlatList>(null);
    const [isReady, setIsReady] = useState(false);

    // Padding to center items
    const extendedData = useMemo(() => [
        '', '', ...data, '', ''
    ], [data]);

    const initialIndex = useMemo(() => {
        const idx = data.indexOf(selectedValue);
        return idx !== -1 ? idx : 0;
    }, [data, selectedValue]);

    useEffect(() => {
        if (isReady && flatListRef.current) {
            flatListRef.current.scrollToIndex({
                index: initialIndex,
                animated: false,
                viewOffset: 0,
            });
        }
    }, [isReady, initialIndex]);

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (!isReady) return;
        const offset = event.nativeEvent.contentOffset.y;
        const index = Math.round(offset / ITEM_HEIGHT);
        if (index >= 0 && index < data.length) {
            const newValue = data[index];
            if (newValue !== selectedValue) {
                onValueChange(newValue);
            }
        }
    };

    return (
        <View style={styles.wheelContainer}>
            <View style={styles.highlightBar} />
            <FlatList
                ref={flatListRef}
                data={extendedData}
                keyExtractor={(_, index) => index.toString()}
                renderItem={({ item, index }) => {
                    const isSelected = index - 2 === data.indexOf(selectedValue);
                    return (
                        <View style={[styles.wheelItem, { height: ITEM_HEIGHT }]}>
                            <Text style={[
                                styles.wheelItemText,
                                isSelected && styles.wheelItemTextActive
                            ]}>
                                {item}
                            </Text>
                        </View>
                    );
                }}
                getItemLayout={(_, index) => ({
                    length: ITEM_HEIGHT,
                    offset: ITEM_HEIGHT * index,
                    index,
                })}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
                showsVerticalScrollIndicator={false}
                onMomentumScrollEnd={handleScroll}
                onLayout={() => setIsReady(true)}
                scrollEventThrottle={16}
                // Important for smooth "iOS-like" behavior
                removeClippedSubviews={false}
            />
        </View>
    );
};

interface CustomDatePickerProps {
    visible: boolean;
    onClose: () => void;
    onSelect?: (date: Date) => void;
    initialDate?: Date;
    title?: string;
    mode?: 'single' | 'range';
    onSelectRange?: (start: Date, end: Date) => void;
    initialEndDate?: Date;
}

const MONTHS_LABELS = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
    visible, onClose, onSelect, initialDate = new Date(), title = 'Chọn ngày',
    mode = 'single', onSelectRange, initialEndDate
}) => {
    const [activeTab, setActiveTab] = useState<'start' | 'end'>('start');
    const [startDate, setStartDate] = useState(new Date(initialDate));
    const [endDate, setEndDate] = useState(new Date(initialEndDate || initialDate));

    const workingDate = activeTab === 'start' ? startDate : endDate;

    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const startYear = currentYear - 50;
        const endYear = currentYear + 50;
        const res = [];
        for (let i = startYear; i <= endYear; i++) res.push(i);
        return res;
    }, []);

    const months = useMemo(() => MONTHS_LABELS, []);

    const days = useMemo(() => {
        const year = workingDate.getFullYear();
        const month = workingDate.getMonth();
        const numDays = new Date(year, month + 1, 0).getDate();
        const res = [];
        for (let i = 1; i <= numDays; i++) res.push(i);
        return res;
    }, [workingDate.getFullYear(), workingDate.getMonth()]);

    const updateDate = (type: 'day' | 'month' | 'year', value: string | number) => {
        const newDate = new Date(workingDate);
        if (type === 'day') newDate.setDate(value as number);
        if (type === 'month') {
            const mIdx = MONTHS_LABELS.indexOf(value as string);
            // Check if day is valid for new month
            const lastDay = new Date(newDate.getFullYear(), mIdx + 1, 0).getDate();
            if (newDate.getDate() > lastDay) newDate.setDate(lastDay);
            newDate.setMonth(mIdx);
        }
        if (type === 'year') {
            newDate.setFullYear(value as number);
            // Check leap year case
            const lastDay = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate();
            if (newDate.getDate() > lastDay) newDate.setDate(lastDay);
        }

        if (activeTab === 'start') {
            setStartDate(newDate);
            if (mode === 'single') setEndDate(newDate);
        } else {
            setEndDate(newDate);
        }
    };

    const isInvalidRange = mode === 'range' && startDate > endDate;

    const handleApply = () => {
        if (isInvalidRange) return;
        if (mode === 'single' && onSelect) {
            onSelect(startDate);
        } else if (mode === 'range' && onSelectRange) {
            onSelectRange(startDate, endDate);
        }
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Pressable style={styles.backdrop} onPress={onClose} />
                <View style={styles.sheet}>
                    {/* Header */}
                    <View style={styles.sheetHeader}>
                        <Text style={styles.title}>{mode === 'range' ? 'Chọn khoảng thời gian' : title}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    {/* Range Tabs if needed */}
                    {mode === 'range' && (
                        <View style={styles.rangeSection}>
                            <View style={styles.tabsContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.tab,
                                        activeTab === 'start' && styles.activeTab,
                                        isInvalidRange && { borderColor: '#EF4444' }
                                    ]}
                                    onPress={() => setActiveTab('start')}
                                >
                                    <Text style={styles.tabLabel}>Từ ngày</Text>
                                    <Text style={[
                                        styles.tabValue,
                                        activeTab === 'start' && styles.activeTabValue,
                                        isInvalidRange && { color: '#EF4444' }
                                    ]}>
                                        {startDate.toLocaleDateString('vi-VN')}
                                    </Text>
                                </TouchableOpacity>
                                <View style={styles.tabSeparator} />
                                <TouchableOpacity
                                    style={[
                                        styles.tab,
                                        activeTab === 'end' && styles.activeTab,
                                        isInvalidRange && { borderColor: '#EF4444' }
                                    ]}
                                    onPress={() => setActiveTab('end')}
                                >
                                    <Text style={styles.tabLabel}>Đến ngày</Text>
                                    <Text style={[
                                        styles.tabValue,
                                        activeTab === 'end' && styles.activeTabValue,
                                        isInvalidRange && { color: '#EF4444' }
                                    ]}>
                                        {endDate.toLocaleDateString('vi-VN')}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            {isInvalidRange && (
                                <Text style={styles.errorText}>Ngày bắt đầu không được sau ngày kết thúc</Text>
                            )}
                        </View>
                    )}

                    {/* Pickers */}
                    <View style={styles.pickersWrapper}>
                        <View style={styles.pickerBox}>
                            <WheelPicker
                                data={days}
                                selectedValue={workingDate.getDate()}
                                onValueChange={(val) => updateDate('day', val)}
                            />
                            <WheelPicker
                                data={months}
                                selectedValue={MONTHS_LABELS[workingDate.getMonth()]}
                                onValueChange={(val) => updateDate('month', val)}
                            />
                            <WheelPicker
                                data={years}
                                selectedValue={workingDate.getFullYear()}
                                onValueChange={(val) => updateDate('year', val)}
                            />
                        </View>
                        <TouchableOpacity style={styles.doneInsideBtn}>
                            <Text style={styles.doneInsideBtnText}>Xong</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.applyBtn, isInvalidRange && styles.applyBtnDisabled]}
                            onPress={handleApply}
                            disabled={isInvalidRange}
                        >
                            <Text style={styles.applyBtnText}>Áp dụng</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        maxHeight: '90%',
    },
    sheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    rangeSection: {
        paddingTop: 24,
        paddingHorizontal: 24,
    },
    tabsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    tab: {
        flex: 1,
        padding: 12,
        borderRadius: 16,
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    activeTab: {
        backgroundColor: '#EFF6FF',
        borderColor: '#2563EB',
        borderWidth: 1.5,
    },
    tabLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
        textAlign: 'center',
    },
    tabValue: {
        fontSize: 15,
        fontWeight: '600',
        color: '#374151',
        textAlign: 'center',
    },
    activeTabValue: {
        color: '#1E40AF',
    },
    tabSeparator: {
        width: 12,
        height: 2,
        backgroundColor: '#D1D5DB',
    },
    errorText: {
        color: '#EF4444',
        fontSize: 12,
        marginTop: 8,
        textAlign: 'center',
        fontWeight: '500',
    },
    pickersWrapper: {
        padding: 24,
        alignItems: 'center',
    },
    pickerBox: {
        flexDirection: 'row',
        backgroundColor: '#F9FAFB',
        borderRadius: 24,
        height: ITEM_HEIGHT * VISIBLE_ITEMS,
        overflow: 'hidden',
        width: '100%',
    },
    wheelContainer: {
        flex: 1,
        height: '100%',
    },
    highlightBar: {
        position: 'absolute',
        top: ITEM_HEIGHT * 2,
        left: 8,
        right: 8,
        height: ITEM_HEIGHT,
        backgroundColor: '#E5E7EB',
        borderRadius: 12,
        opacity: 0.3,
    },
    wheelItem: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    wheelItemText: {
        fontSize: 17,
        color: '#9CA3AF',
    },
    wheelItemTextActive: {
        color: '#111827',
        fontWeight: '700',
        fontSize: 19,
    },
    doneInsideBtn: {
        marginTop: 20,
    },
    doneInsideBtnText: {
        color: '#2563EB',
        fontSize: 17,
        fontWeight: '600',
    },
    footer: {
        paddingHorizontal: 24,
        paddingBottom: 20,
        marginTop: 10,
    },
    applyBtn: {
        backgroundColor: '#2563EB',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    applyBtnDisabled: {
        backgroundColor: '#D1D5DB',
        shadowOpacity: 0,
        elevation: 0,
    },
    applyBtnText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
    },
});
