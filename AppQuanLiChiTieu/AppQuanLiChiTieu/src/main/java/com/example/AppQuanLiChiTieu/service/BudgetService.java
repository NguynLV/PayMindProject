package com.example.AppQuanLiChiTieu.service;

import com.example.AppQuanLiChiTieu.dto.request.BudgetRequest;
import com.example.AppQuanLiChiTieu.dto.response.BudgetResponse;
import com.example.AppQuanLiChiTieu.entity.Budget;
import com.example.AppQuanLiChiTieu.entity.Category;
import com.example.AppQuanLiChiTieu.entity.Transaction;
import com.example.AppQuanLiChiTieu.entity.User;
import com.example.AppQuanLiChiTieu.exception.AppException;
import com.example.AppQuanLiChiTieu.exception.ErrorCode;
import com.example.AppQuanLiChiTieu.repository.BudgetRepository;
import com.example.AppQuanLiChiTieu.repository.CategoryRepository;
import com.example.AppQuanLiChiTieu.repository.TransactionRepository;
import com.example.AppQuanLiChiTieu.repository.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.DayOfWeek;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class BudgetService {

    BudgetRepository budgetRepository;
    CategoryRepository categoryRepository;
    TransactionRepository transactionRepository;
    UserRepository userRepository;

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
    }

    private BigDecimal calculateSpentAmount(User user, Budget budget) {
        Instant startDate;
        Instant endDate;

        if ("Monthly".equalsIgnoreCase(budget.getPeriod())) {
            YearMonth yearMonth = YearMonth.of(budget.getYear(), budget.getPeriodValue());
            startDate = yearMonth.atDay(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
            endDate = yearMonth.atEndOfMonth().atTime(23, 59, 59).atZone(ZoneId.systemDefault()).toInstant();
        } else if ("Weekly".equalsIgnoreCase(budget.getPeriod())) {
            // Calculation for current week (Monday to Sunday)
            LocalDate today = LocalDate.now();
            LocalDate monday = today.with(DayOfWeek.MONDAY);
            LocalDate sunday = today.with(DayOfWeek.SUNDAY);
            startDate = monday.atStartOfDay(ZoneId.systemDefault()).toInstant();
            endDate = sunday.atTime(23, 59, 59).atZone(ZoneId.systemDefault()).toInstant();
        } else if ("Daily".equalsIgnoreCase(budget.getPeriod())) {
            // For Daily, periodValue is Day. Use current month/year for calculation.
            int month = LocalDate.now().getMonthValue();
            startDate = YearMonth.of(budget.getYear(), month).atDay(budget.getPeriodValue()).atStartOfDay(ZoneId.systemDefault()).toInstant();
            endDate = YearMonth.of(budget.getYear(), month).atDay(budget.getPeriodValue()).atTime(23, 59, 59).atZone(ZoneId.systemDefault()).toInstant();
        } else {
            return BigDecimal.ZERO;
        }

        List<Transaction> transactions = transactionRepository
                .findByUserAndTypeAndIsDeletedFalseAndTransactionDateBetween(user, "EXPENSE", startDate, endDate);

        return transactions.stream()
                .filter(t -> budget.getCategory() == null || t.getCategory().getId().equals(budget.getCategory().getId()))
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BudgetResponse toBudgetResponse(Budget budget, BigDecimal spentAmount) {
        return BudgetResponse.builder()
                .id(budget.getId())
                .categoryId(budget.getCategory() != null ? budget.getCategory().getId() : null)
                .categoryName(budget.getCategory() != null ? budget.getCategory().getName() : "Tất cả")
                .name(budget.getName())
                .amount(budget.getAmount())
                .spentAmount(spentAmount)
                .alertThreshold(budget.getAlertThreshold())
                .period(budget.getPeriod())
                .periodValue(budget.getPeriodValue())
                .year(budget.getYear())
                .isActive(budget.getIsActive())
                .createdAt(budget.getCreatedAt())
                .build();
    }

    public List<BudgetResponse> getMyBudgets() {
        User user = getCurrentUser();
        List<Budget> budgets = budgetRepository.findByUserAndIsActiveTrue(user);
        
        return budgets.stream().map(budget -> {
            BigDecimal spent = calculateSpentAmount(user, budget);
            return toBudgetResponse(budget, spent);
        }).collect(Collectors.toList());
    }

    public BudgetResponse createBudget(BudgetRequest request) {
        User user = getCurrentUser();
        
        Category category = null;
        if (request.getCategoryId() != null) {
            category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION)); // Category not found
        }

        Budget budget = new Budget();
        budget.setUser(user);
        budget.setCategory(category);
        budget.setName(request.getName());
        budget.setAmount(request.getAmount());
        budget.setAlertThreshold(new BigDecimal("80.00")); // default to 80%
        budget.setPeriod(request.getPeriod());
        budget.setPeriodValue(request.getPeriodValue());
        budget.setYear(request.getYear());
        budget.setCreatedAt(Instant.now());
        budget.setIsActive(true);

        Budget savedBudget = budgetRepository.save(budget);
        return toBudgetResponse(savedBudget, BigDecimal.ZERO); // initially 0 because we might just created it
    }

    public BudgetResponse updateBudget(Integer id, BudgetRequest request) {
        User user = getCurrentUser();
        Budget budget = budgetRepository.findByIdAndUserAndIsActiveTrue(id, user)
                .orElseThrow(() -> new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION));

        Category category = null;
        if (request.getCategoryId() != null) {
            category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION));
        }

        budget.setCategory(category);
        budget.setName(request.getName());
        budget.setAmount(request.getAmount());
        budget.setPeriod(request.getPeriod());
        budget.setPeriodValue(request.getPeriodValue());
        budget.setYear(request.getYear());

        Budget savedBudget = budgetRepository.save(budget);
        BigDecimal spent = calculateSpentAmount(user, savedBudget);
        return toBudgetResponse(savedBudget, spent);
    }

    public void deleteBudget(Integer id) {
        User user = getCurrentUser();
        Budget budget = budgetRepository.findByIdAndUserAndIsActiveTrue(id, user)
                .orElseThrow(() -> new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION));
        
        budget.setIsActive(false);
        budgetRepository.save(budget);
    }
}
