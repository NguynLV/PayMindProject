package com.example.AppQuanLiChiTieu.service;

import com.example.AppQuanLiChiTieu.dto.response.DailyStatResponse;
import com.example.AppQuanLiChiTieu.dto.response.ReportSummaryResponse;
import com.example.AppQuanLiChiTieu.dto.response.YearlyReportResponse;
import com.example.AppQuanLiChiTieu.entity.Transaction;
import com.example.AppQuanLiChiTieu.repository.TransactionRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ReportService {

    TransactionRepository transactionRepository;
    com.example.AppQuanLiChiTieu.repository.CategoryRepository categoryRepository;
    TransactionService transactionService;

    public YearlyReportResponse getYearlySummary(int year) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        ZonedDateTime startOfYear = ZonedDateTime.of(year, 1, 1, 0, 0, 0, 0, ZoneId.systemDefault());
        ZonedDateTime endOfYear = ZonedDateTime.of(year, 12, 31, 23, 59, 59, 999999999, ZoneId.systemDefault());
        
        ZonedDateTime startOfPrevYear = ZonedDateTime.of(year - 1, 1, 1, 0, 0, 0, 0, ZoneId.systemDefault());
        ZonedDateTime endOfPrevYear = ZonedDateTime.of(year - 1, 12, 31, 23, 59, 59, 999999999, ZoneId.systemDefault());

        List<Transaction> transactions = transactionRepository.findByOwnerEmailAndIsDeletedFalseOrderByTransactionDateDesc(currentUserEmail);
        
        List<Transaction> currentYearTx = transactions.stream()
                .filter(t -> !t.getTransactionDate().isBefore(startOfYear.toInstant()) && !t.getTransactionDate().isAfter(endOfYear.toInstant()))
                .collect(Collectors.toList());

        List<Transaction> prevYearTx = transactions.stream()
                .filter(t -> !t.getTransactionDate().isBefore(startOfPrevYear.toInstant()) && !t.getTransactionDate().isAfter(endOfPrevYear.toInstant()))
                .collect(Collectors.toList());

        BigDecimal totalIncome = currentYearTx.stream().filter(t -> "INCOME".equalsIgnoreCase(t.getType())).map(Transaction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalExpense = currentYearTx.stream().filter(t -> "EXPENSE".equalsIgnoreCase(t.getType())).map(Transaction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal netBalance = totalIncome.subtract(totalExpense);

        // Monthly stats
        Map<Integer, List<Transaction>> byMonth = currentYearTx.stream()
                .collect(Collectors.groupingBy(t -> t.getTransactionDate().atZone(ZoneId.systemDefault()).getMonthValue()));

        List<YearlyReportResponse.MonthStat> months = new ArrayList<>();
        for (int m = 1; m <= 12; m++) {
            List<Transaction> monthTx = byMonth.getOrDefault(m, new ArrayList<>());
            BigDecimal inc = monthTx.stream().filter(t -> "INCOME".equalsIgnoreCase(t.getType())).map(Transaction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal exp = monthTx.stream().filter(t -> "EXPENSE".equalsIgnoreCase(t.getType())).map(Transaction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            months.add(YearlyReportResponse.MonthStat.builder().month(m).income(inc).expense(exp).build());
        }

        // YoY Comparison
        BigDecimal prevIncome = prevYearTx.stream().filter(t -> "INCOME".equalsIgnoreCase(t.getType())).map(Transaction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        double change = 0;
        if (prevIncome.compareTo(BigDecimal.ZERO) > 0) {
            change = totalIncome.subtract(prevIncome).divide(prevIncome, 4, RoundingMode.HALF_UP).doubleValue() * 100.0;
        }

        // Main vs Secondary breakdown
        BigDecimal mainInc = currentYearTx.stream().filter(t -> "INCOME".equalsIgnoreCase(t.getType()) && Boolean.TRUE.equals(t.getCategory().getIsMain())).map(Transaction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal secInc = currentYearTx.stream().filter(t -> "INCOME".equalsIgnoreCase(t.getType()) && !Boolean.TRUE.equals(t.getCategory().getIsMain())).map(Transaction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal mainExp = currentYearTx.stream().filter(t -> "EXPENSE".equalsIgnoreCase(t.getType()) && Boolean.TRUE.equals(t.getCategory().getIsMain())).map(Transaction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal secExp = currentYearTx.stream().filter(t -> "EXPENSE".equalsIgnoreCase(t.getType()) && !Boolean.TRUE.equals(t.getCategory().getIsMain())).map(Transaction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

        return YearlyReportResponse.builder()
                .totalIncome(totalIncome)
                .totalExpense(totalExpense)
                .netBalance(netBalance)
                .months(months)
                .comparison(YearlyReportResponse.YoYComparison.builder()
                        .previousYearTotal(prevIncome)
                        .percentageChange(Math.round(change * 10.0) / 10.0)
                        .build())
                .mainSecondaryBreakdown(YearlyReportResponse.MainSecondaryBreakdown.builder()
                        .mainIncome(mainInc)
                        .secondaryIncome(secInc)
                        .mainExpense(mainExp)
                        .secondaryExpense(secExp)
                        .build())
                .build();
    }

    public ReportSummaryResponse getMonthlySummary(int month, int year) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        YearMonth yearMonth = YearMonth.of(year, month);
        Instant startDate = yearMonth.atDay(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant endDate = yearMonth.atEndOfMonth().atTime(23, 59, 59).atZone(ZoneId.systemDefault()).toInstant();

        List<Transaction> transactions = transactionRepository
                .findByOwnerEmailAndIsDeletedFalseOrderByTransactionDateDesc(currentUserEmail)
                .stream()
                .filter(t -> !t.getTransactionDate().isBefore(startDate) && !t.getTransactionDate().isAfter(endDate))
                .collect(Collectors.toList());

        BigDecimal totalIncome = transactions.stream()
                .filter(t -> "INCOME".equalsIgnoreCase(t.getType()))
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalExpense = transactions.stream()
                .filter(t -> "EXPENSE".equalsIgnoreCase(t.getType()))
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal netBalance = totalIncome.subtract(totalExpense);

        List<ReportSummaryResponse.CategoryStat> incomeStats = buildCategoryStats(
                transactions.stream().filter(t -> "INCOME".equalsIgnoreCase(t.getType())).collect(Collectors.toList()),
                totalIncome
        );

        List<ReportSummaryResponse.CategoryStat> expenseStats = buildCategoryStats(
                transactions.stream().filter(t -> "EXPENSE".equalsIgnoreCase(t.getType())).collect(Collectors.toList()),
                totalExpense
        );

        return ReportSummaryResponse.builder()
                .totalIncome(totalIncome)
                .totalExpense(totalExpense)
                .netBalance(netBalance)
                .incomeByCategory(incomeStats)
                .expenseByCategory(expenseStats)
                .build();
    }

    public List<DailyStatResponse> getDailyStats(int month, int year) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        YearMonth yearMonth = YearMonth.of(year, month);
        Instant startDate = yearMonth.atDay(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant endDate = yearMonth.atEndOfMonth().atTime(23, 59, 59).atZone(ZoneId.systemDefault()).toInstant();

        List<Transaction> transactions = transactionRepository
                .findByOwnerEmailAndIsDeletedFalseOrderByTransactionDateDesc(currentUserEmail)
                .stream()
                .filter(t -> !t.getTransactionDate().isBefore(startDate) && !t.getTransactionDate().isAfter(endDate))
                .collect(Collectors.toList());

        // Group by day-of-month
        Map<Integer, List<Transaction>> byDay = transactions.stream()
                .collect(Collectors.groupingBy(t ->
                        t.getTransactionDate().atZone(ZoneId.systemDefault()).getDayOfMonth()
                ));

        int daysInMonth = yearMonth.lengthOfMonth();
        List<DailyStatResponse> result = new java.util.ArrayList<>();
        for (int d = 1; d <= daysInMonth; d++) {
            List<Transaction> dayTx = byDay.getOrDefault(d, java.util.Collections.emptyList());
            BigDecimal inc = dayTx.stream().filter(t -> "INCOME".equalsIgnoreCase(t.getType()))
                    .map(Transaction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal exp = dayTx.stream().filter(t -> "EXPENSE".equalsIgnoreCase(t.getType()))
                    .map(Transaction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            result.add(DailyStatResponse.builder().day(d).totalIncome(inc).totalExpense(exp).build());
        }
        return result;
    }

    private List<ReportSummaryResponse.CategoryStat> buildCategoryStats(List<Transaction> transactions, BigDecimal totalAmount) {
        // Group by category ID
        Map<Integer, List<Transaction>> grouped = transactions.stream()
                .collect(Collectors.groupingBy(t -> t.getCategory().getId()));

        return grouped.entrySet().stream().map(entry -> {
            Integer catId = entry.getKey();
            List<Transaction> catTx = entry.getValue();
            
            String catName = catTx.get(0).getCategory().getName();
            String icon = catTx.get(0).getCategory().getIcon();
            String color = catTx.get(0).getCategory().getColor();
            
            BigDecimal sum = catTx.stream()
                    .map(Transaction::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            double percentage = 0.0;
            if (totalAmount.compareTo(BigDecimal.ZERO) > 0) {
                percentage = sum.divide(totalAmount, 4, RoundingMode.HALF_UP).doubleValue() * 100.0;
            }

            return ReportSummaryResponse.CategoryStat.builder()
                    .categoryId(catId)
                    .categoryName(catName)
                    .icon(icon)
                    .color(color)
                    .amount(sum)
                    .percentage(Math.round(percentage * 10.0) / 10.0) // Round to 1 decimal
                    .build();
        })
        .sorted((s1, s2) -> s2.getAmount().compareTo(s1.getAmount())) // Sort by amount descending
        .collect(Collectors.toList());
    }

    public List<com.example.AppQuanLiChiTieu.dto.response.TransactionResponse> getTransactionsByCategory(int categoryId, int month, int year) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        YearMonth yearMonth = YearMonth.of(year, month);
        Instant startDate = yearMonth.atDay(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant endDate = yearMonth.atEndOfMonth().atTime(23, 59, 59).atZone(ZoneId.systemDefault()).toInstant();

        com.example.AppQuanLiChiTieu.entity.Category category = categoryRepository.findByIdAndOwnerEmailAndIsDeletedFalse(categoryId, currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Category not found"));

        return transactionRepository.findByCategoryAndOwnerEmailAndIsDeletedFalseAndTransactionDateBetweenOrderByTransactionDateDesc(
                category, currentUserEmail, startDate, endDate)
                .stream()
                .map(transactionService::toResponse)
                .collect(Collectors.toList());
    }
}
