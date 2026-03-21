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
public class ReportSummaryResponse {
    BigDecimal totalIncome;
    BigDecimal totalExpense;
    BigDecimal netBalance;
    List<CategoryStat> incomeByCategory;
    List<CategoryStat> expenseByCategory;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class CategoryStat {
        Integer categoryId;
        String categoryName;
        String icon;
        String color;
        BigDecimal amount;
        Double percentage;
    }
}
