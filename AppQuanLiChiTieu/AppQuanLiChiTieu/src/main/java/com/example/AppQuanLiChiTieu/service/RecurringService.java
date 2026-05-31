package com.example.AppQuanLiChiTieu.service;

import com.example.AppQuanLiChiTieu.dto.request.RecurringTransactionRequest;
import com.example.AppQuanLiChiTieu.dto.response.RecurringTransactionResponse;
import com.example.AppQuanLiChiTieu.entity.Category;
import com.example.AppQuanLiChiTieu.entity.RecurringTransaction;
import com.example.AppQuanLiChiTieu.entity.Transaction;
import com.example.AppQuanLiChiTieu.entity.Wallet;
import com.example.AppQuanLiChiTieu.repository.CategoryRepository;
import com.example.AppQuanLiChiTieu.repository.RecurringTransactionRepository;
import com.example.AppQuanLiChiTieu.repository.TransactionRepository;
import com.example.AppQuanLiChiTieu.repository.WalletRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RecurringService {

    RecurringTransactionRepository recurringTransactionRepository;
    WalletRepository walletRepository;
    CategoryRepository categoryRepository;
    TransactionRepository transactionRepository;

    WalletService walletService;
    CategoryService categoryService;
    NotificationService notificationService;

    public RecurringTransactionResponse toResponse(RecurringTransaction rt) {
        return RecurringTransactionResponse.builder()
                .id(rt.getId())
                .ownerEmail(rt.getOwnerEmail())
                .wallet(walletService.toWalletResponse(rt.getWallet()))
                .category(categoryService.toCategoryResponse(rt.getCategory()))
                .type(rt.getType())
                .amount(rt.getAmount())
                .description(rt.getDescription())
                .cycle(rt.getCycle())
                .nextRunDate(rt.getNextRunDate())
                .isActive(rt.getIsActive())
                .createdAt(rt.getCreatedAt())
                .build();
    }

    public List<RecurringTransactionResponse> getMyRecurringTransactions() {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        return recurringTransactionRepository.findByOwnerEmailOrderByCreatedAtDesc(currentUserEmail)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public RecurringTransactionResponse getRecurringTransactionById(Integer id) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        RecurringTransaction rt = recurringTransactionRepository.findByIdAndOwnerEmail(id, currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Recurring transaction not found or access denied"));
        return toResponse(rt);
    }

    @Transactional
    public RecurringTransactionResponse createRecurringTransaction(RecurringTransactionRequest request) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();

        Wallet wallet = walletRepository.findByIdAndOwnerEmailAndIsDeletedFalse(request.getWalletId(), currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Wallet not found"));

        Category category = categoryRepository.findByIdAndOwnerEmailAndIsDeletedFalse(request.getCategoryId(), currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Category not found"));

        RecurringTransaction rt = new RecurringTransaction();
        rt.setOwnerEmail(currentUserEmail);
        rt.setWallet(wallet);
        rt.setCategory(category);
        rt.setType(request.getType() != null ? request.getType().toUpperCase() : "EXPENSE");
        rt.setAmount(request.getAmount());
        rt.setDescription(request.getDescription());
        rt.setCycle(request.getCycle() != null ? request.getCycle().toUpperCase() : "MONTHLY");
        rt.setNextRunDate(request.getNextRunDate() != null ? request.getNextRunDate() : LocalDate.now());
        rt.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);
        rt.setCreatedAt(Instant.now());

        RecurringTransaction saved = recurringTransactionRepository.save(rt);
        return toResponse(saved);
    }

    @Transactional
    public RecurringTransactionResponse updateRecurringTransaction(Integer id, RecurringTransactionRequest request) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();

        RecurringTransaction rt = recurringTransactionRepository.findByIdAndOwnerEmail(id, currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Recurring transaction not found or access denied"));

        Wallet wallet = walletRepository.findByIdAndOwnerEmailAndIsDeletedFalse(request.getWalletId(), currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Wallet not found"));

        Category category = categoryRepository.findByIdAndOwnerEmailAndIsDeletedFalse(request.getCategoryId(), currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Category not found"));

        rt.setWallet(wallet);
        rt.setCategory(category);
        rt.setType(request.getType() != null ? request.getType().toUpperCase() : "EXPENSE");
        rt.setAmount(request.getAmount());
        rt.setDescription(request.getDescription());
        rt.setCycle(request.getCycle() != null ? request.getCycle().toUpperCase() : "MONTHLY");
        rt.setNextRunDate(request.getNextRunDate());
        rt.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);

        RecurringTransaction saved = recurringTransactionRepository.save(rt);
        return toResponse(saved);
    }

    @Transactional
    public void deleteRecurringTransaction(Integer id) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        RecurringTransaction rt = recurringTransactionRepository.findByIdAndOwnerEmail(id, currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Recurring transaction not found or access denied"));
        recurringTransactionRepository.delete(rt);
    }

    @Transactional
    public RecurringTransactionResponse triggerRecurringTransaction(Integer id) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        RecurringTransaction rt = recurringTransactionRepository.findByIdAndOwnerEmail(id, currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Recurring transaction not found or access denied"));

        executeRecurring(rt);

        return toResponse(rt);
    }

    /**
     * Executes the recurring transaction: creates transaction history, updates wallet balance, calculates next run date.
     */
    @Transactional
    public void executeRecurring(RecurringTransaction rt) {
        Wallet wallet = rt.getWallet();
        Category category = rt.getCategory();

        // Create actual transaction
        Transaction t = new Transaction();
        t.setWallet(wallet);
        t.setCategory(category);
        t.setAmount(rt.getAmount());
        t.setType(rt.getType());
        t.setDescription(rt.getDescription() + " (Định kỳ)");
        t.setStatus("Completed");
        t.setIsDeleted(false);
        t.setTransactionDate(Instant.now());
        t.setCreatedAt(Instant.now());
        t.setOwnerEmail(rt.getOwnerEmail());

        // Update Wallet Balance
        if ("EXPENSE".equalsIgnoreCase(rt.getType())) {
            wallet.setBalance(wallet.getBalance().subtract(rt.getAmount()));
        } else if ("INCOME".equalsIgnoreCase(rt.getType())) {
            wallet.setBalance(wallet.getBalance().add(rt.getAmount()));
        }

        walletRepository.save(wallet);
        transactionRepository.save(t);

        // Update Next Run Date based on Cycle
        LocalDate nextDate = calculateNextRunDate(rt.getNextRunDate(), rt.getCycle());
        rt.setNextRunDate(nextDate);
        recurringTransactionRepository.save(rt);

        // Notify user about execution
        String messageTitle = "INCOME".equalsIgnoreCase(rt.getType()) ? "Tiếp tế định kỳ thành công 📦" : "Ví bay màu tự động 🧛‍♂️";
        String messageBody = String.format("Hệ thống đã tự động ghi nhận %s %sđ cho '%s' vào ví '%s' của bạn.",
                "INCOME".equalsIgnoreCase(rt.getType()) ? "cộng" : "trừ",
                String.format("%,.0f", rt.getAmount().doubleValue()),
                rt.getDescription(),
                wallet.getName());

        notificationService.createNotificationForUser(messageTitle, messageBody, "RECURRING_ALERT", rt.getOwnerEmail());
    }

    private LocalDate calculateNextRunDate(LocalDate currentRun, String cycle) {
        if (currentRun == null) {
            currentRun = LocalDate.now();
        }
        switch (cycle.toUpperCase()) {
            case "DAILY":
                return currentRun.plusDays(1);
            case "WEEKLY":
                return currentRun.plusWeeks(1);
            case "YEARLY":
                return currentRun.plusYears(1);
            case "MONTHLY":
            default:
                return currentRun.plusMonths(1);
        }
    }

    /**
     * Daily background job to process recurring transactions that are due.
     * Scheduled to run every day at 1:00 AM.
     */
    @Scheduled(cron = "0 0 1 * * ?")
    public void runRecurringCronJob() {
        log.info("Starting Daily Recurring Transactions Cron Job at {}", Instant.now());
        LocalDate today = LocalDate.now();
        List<RecurringTransaction> dueTransactions = recurringTransactionRepository.findByIsActiveTrueAndNextRunDateLessThanEqual(today);

        log.info("Found {} active recurring transactions due to execute today.", dueTransactions.size());

        for (RecurringTransaction rt : dueTransactions) {
            try {
                executeRecurring(rt);
                log.info("Successfully executed recurring transaction ID: {} - {}", rt.getId(), rt.getDescription());
            } catch (Exception e) {
                log.error("Failed to execute recurring transaction ID: {} - {}", rt.getId(), rt.getDescription(), e);
                // Send alert notification of failure to owner
                try {
                    notificationService.createNotificationForUser(
                            "Giao dịch định kỳ lỗi 🚨",
                            "Không thể tự động thực hiện giao dịch '" + rt.getDescription() + "'. Vui lòng kiểm tra lại ví hoặc danh mục.",
                            "RECURRING_ALERT",
                            rt.getOwnerEmail()
                    );
                } catch (Exception ne) {
                    log.error("Could not even notify owner about failure", ne);
                }
            }
        }
        log.info("Finished Daily Recurring Transactions Cron Job.");
    }
}
