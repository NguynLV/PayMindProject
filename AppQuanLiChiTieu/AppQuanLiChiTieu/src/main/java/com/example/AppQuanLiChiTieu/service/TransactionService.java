package com.example.AppQuanLiChiTieu.service;

import com.example.AppQuanLiChiTieu.dto.request.TransactionRequest;
import com.example.AppQuanLiChiTieu.dto.response.TransactionResponse;
import com.example.AppQuanLiChiTieu.entity.Category;
import com.example.AppQuanLiChiTieu.entity.Transaction;
import com.example.AppQuanLiChiTieu.entity.Wallet;
import com.example.AppQuanLiChiTieu.exception.AppException;
import com.example.AppQuanLiChiTieu.exception.ErrorCode;
import com.example.AppQuanLiChiTieu.repository.CategoryRepository;
import com.example.AppQuanLiChiTieu.repository.TransactionRepository;
import com.example.AppQuanLiChiTieu.repository.WalletRepository;
import com.example.AppQuanLiChiTieu.repository.RedisUserRepository;
import com.example.AppQuanLiChiTieu.model.User;
import lombok.extern.slf4j.Slf4j;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.multipart.MultipartFile;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TransactionService {

    final TransactionRepository transactionRepository;
    final WalletRepository walletRepository;
    final CategoryRepository categoryRepository;
    final RedisUserRepository redisUserRepository;
    final FileStorageService fileStorageService;

    final WalletService walletService;
    final CategoryService categoryService;
    final NotificationService notificationService;
    final BudgetService budgetService;

    public TransactionResponse toResponse(Transaction t) {
        return TransactionResponse.builder()
                .id(t.getId())
                .amount(t.getAmount())
                .type(t.getType())
                .description(t.getDescription())
                .imageUrl(t.getImageUrl())
                .mood(t.getMood())
                .transactionDate(t.getTransactionDate())
                .category(categoryService.toCategoryResponse(t.getCategory()))
                .wallet(walletService.toWalletResponse(t.getWallet()))
                .build();
    }

    public List<TransactionResponse> getMyTransactions() {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        return transactionRepository.findByOwnerEmailAndIsDeletedFalseOrderByTransactionDateDesc(currentUserEmail)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public TransactionResponse createTransaction(TransactionRequest request) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        Wallet wallet = walletRepository.findByIdAndOwnerEmailAndIsDeletedFalse(request.getWalletId(), currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Wallet not found"));
                
        Category category = categoryRepository.findByIdAndOwnerEmailAndIsDeletedFalse(request.getCategoryId(), currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Category not found"));

        // Create transaction
        Transaction t = new Transaction();
        t.setWallet(wallet);
        t.setCategory(category);
        t.setAmount(request.getAmount());
        t.setType(request.getType() != null ? request.getType().toUpperCase() : "EXPENSE");
        t.setDescription(request.getDescription());
        t.setTransactionDate(request.getTransactionDate());
        t.setImageUrl(request.getImageUrl());
        t.setMood(request.getMood());
        t.setStatus("Completed");
        t.setIsDeleted(false);
        t.setCreatedAt(Instant.now());
        t.setOwnerEmail(currentUserEmail);

        // Update wallet balance based on type
        if ("EXPENSE".equalsIgnoreCase(request.getType())) {
            wallet.setBalance(wallet.getBalance().subtract(request.getAmount()));
        } else if ("INCOME".equalsIgnoreCase(request.getType())) {
            wallet.setBalance(wallet.getBalance().add(request.getAmount()));
        }
        
        walletRepository.save(wallet);
        Transaction saved = transactionRepository.save(t);

        // Check if this transaction exceeds any budget
        if ("EXPENSE".equalsIgnoreCase(request.getType())) {
            checkBudgetAndNotify(category, request.getTransactionDate());
        }

        return toResponse(saved);
    }

    @Transactional
    public void deleteTransaction(Integer id) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        Transaction t = transactionRepository.findByIdAndOwnerEmailAndIsDeletedFalse(id, currentUserEmail)
                .orElseThrow(() -> new AppException(ErrorCode.TRANSACTION_NOT_EXISTED));

        Wallet wallet = t.getWallet();
        
        // Reverse wallet balance
        if ("EXPENSE".equalsIgnoreCase(t.getType())) {
            wallet.setBalance(wallet.getBalance().add(t.getAmount()));
        } else if ("INCOME".equalsIgnoreCase(t.getType())) {
            wallet.setBalance(wallet.getBalance().subtract(t.getAmount()));
        }

        t.setIsDeleted(true);
        t.setDeletedAt(Instant.now());

        walletRepository.save(wallet);
        transactionRepository.save(t);
    }

    public byte[] exportTransactionsToExcel() {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        
        User user = redisUserRepository.findById(currentUserEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        if (user.getIsPremium() == null || !user.getIsPremium()) {
            throw new AppException(ErrorCode.PREMIUM_REQUIRED);
        }

        List<Transaction> transactions = transactionRepository.findByOwnerEmailAndIsDeletedFalseOrderByTransactionDateDesc(currentUserEmail);

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Giao dịch");

            // Header Row
            Row headerRow = sheet.createRow(0);
            String[] columns = {"Ngày", "Danh mục", "Mô tả", "Ví", "Số tiền", "Loại"};
            
            CellStyle headerCellStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerCellStyle.setFont(headerFont);

            for (int i = 0; i < columns.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerCellStyle);
            }

            // Data Rows
            int rowIdx = 1;
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy").withZone(ZoneId.systemDefault());
            
            for (Transaction t : transactions) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(formatter.format(t.getTransactionDate()));
                row.createCell(1).setCellValue(t.getCategory().getName());
                row.createCell(2).setCellValue(t.getDescription() != null ? t.getDescription() : "");
                row.createCell(3).setCellValue(t.getWallet().getName());
                row.createCell(4).setCellValue(t.getAmount().doubleValue());
                row.createCell(5).setCellValue("INCOME".equalsIgnoreCase(t.getType()) ? "Thu nhập" : "Chi tiêu");
            }

            // Auto-size columns
            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            log.error("Error generating Excel file", e);
            throw new RuntimeException("Could not generate Excel file");
        }
    }

    private void checkBudgetAndNotify(Category category, Instant transactionDate) {
        try {
            List<com.example.AppQuanLiChiTieu.dto.response.BudgetResponse> budgets = budgetService.getMyBudgets();
            
            for (com.example.AppQuanLiChiTieu.dto.response.BudgetResponse budget : budgets) {
                boolean isRelevantCategory = budget.getCategoryId() == null || budget.getCategoryId().equals(category.getId());
                
                if (isRelevantCategory && budget.getIsActive()) {
                    double percent = 0;
                    if (budget.getAmount().doubleValue() > 0) {
                        percent = (budget.getSpentAmount().doubleValue() / budget.getAmount().doubleValue()) * 100;
                    }

                    log.info("Checking budget '{}': Spent={}, Limit={}, Percent={}%", 
                        budget.getName(), budget.getSpentAmount(), budget.getAmount(), percent);

                    if (percent >= 100) {
                        log.info("Budget exceeded 100%! Creating notification.");
                        notificationService.createNotification(
                            "Vượt ngân sách: " + budget.getName(),
                            "Bạn đã chi tiêu vượt quá hạn mức " + String.format("%,.0f", budget.getAmount().doubleValue()) + "đ cho danh mục " + category.getName() + ".",
                            "BUDGET_ALERT"
                        );
                    } else if (percent >= budget.getAlertThreshold().doubleValue()) {
                        log.info("Budget exceeded threshold ({}%)! Creating notification.", budget.getAlertThreshold());
                        notificationService.createNotification(
                            "Sắp chạm hạn mức: " + budget.getName(),
                            "Chi tiêu cho " + category.getName() + " đã đạt " + String.format("%.1f", percent) + "% ngân sách của bạn.",
                            "BUDGET_ALERT"
                        );
                    } else {
                        log.info("Budget not yet exceeded threshold.");
                    }
                }
            }
        } catch (Exception e) {
            // Don't fail the transaction if notification fails
            e.printStackTrace();
            System.err.println("Error checking budget notification: " + e.getMessage());
        }
    }

    public String uploadImage(MultipartFile image) {
        try {
            return fileStorageService.uploadImage(image);
        } catch (IOException e) {
            log.error("Failed to upload transaction image", e);
            throw new RuntimeException("Could not upload transaction image");
        }
    }
}
