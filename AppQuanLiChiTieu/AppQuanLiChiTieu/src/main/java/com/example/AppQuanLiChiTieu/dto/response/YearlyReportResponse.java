package com.example.AppQuanLiChiTieu.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class YearlyReportResponse {
    BigDecimal totalIncome;
    BigDecimal totalExpense;
    BigDecimal netBalance;
    
    List<MonthStat> months;
    YoYComparison comparison;
    MainSecondaryBreakdown mainSecondaryBreakdown;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class MonthStat {
        int month;
        BigDecimal income;
        BigDecimal expense;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class YoYComparison {
        BigDecimal previousYearTotal;
        double percentageChange; // e.g., +15.5 or -5.0
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class MainSecondaryBreakdown {
        BigDecimal mainIncome;
        BigDecimal secondaryIncome;
        BigDecimal mainExpense;
        BigDecimal secondaryExpense;
    }
}
