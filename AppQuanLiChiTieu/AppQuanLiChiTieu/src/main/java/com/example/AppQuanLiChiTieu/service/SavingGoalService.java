package com.example.AppQuanLiChiTieu.service;

import com.example.AppQuanLiChiTieu.dto.request.SavingGoalRequest;
import com.example.AppQuanLiChiTieu.dto.request.SavingGoalTransactionRequest;
import com.example.AppQuanLiChiTieu.dto.response.SavingGoalResponse;
import com.example.AppQuanLiChiTieu.dto.response.SavingGoalTransactionResponse;
import com.example.AppQuanLiChiTieu.entity.SavingGoal;
import com.example.AppQuanLiChiTieu.entity.SavingGoalTransaction;
import com.example.AppQuanLiChiTieu.entity.Wallet;
import com.example.AppQuanLiChiTieu.exception.AppException;
import com.example.AppQuanLiChiTieu.exception.ErrorCode;
import com.example.AppQuanLiChiTieu.repository.SavingGoalRepository;
import com.example.AppQuanLiChiTieu.repository.SavingGoalTransactionRepository;
import com.example.AppQuanLiChiTieu.repository.WalletRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SavingGoalService {

    SavingGoalRepository savingGoalRepository;
    SavingGoalTransactionRepository savingGoalTransactionRepository;
    WalletRepository walletRepository;

    // ── Mappers ──

    private SavingGoalTransactionResponse toTxResponse(SavingGoalTransaction tx) {
        return SavingGoalTransactionResponse.builder()
                .id(tx.getId())
                .goalId(tx.getSavingGoal().getId())
                .type(tx.getType())
                .amount(tx.getAmount())
                .notes(tx.getNotes())
                .walletName(tx.getWallet() != null ? tx.getWallet().getName() : null)
                .walletId(tx.getWallet() != null ? tx.getWallet().getId() : null)
                .transactionDate(tx.getTransactionDate())
                .build();
    }

    private SavingGoalResponse toResponse(SavingGoal goal, List<SavingGoalTransactionResponse> recentTx) {
        double progress = 0;
        if (goal.getTargetAmount().compareTo(BigDecimal.ZERO) > 0) {
            progress = goal.getCurrentAmount()
                    .divide(goal.getTargetAmount(), 4, RoundingMode.HALF_UP)
                    .doubleValue() * 100.0;
            progress = Math.round(progress * 10.0) / 10.0;
        }
        return SavingGoalResponse.builder()
                .id(goal.getId())
                .name(goal.getName())
                .targetAmount(goal.getTargetAmount())
                .currentAmount(goal.getCurrentAmount())
                .deadline(goal.getDeadline())
                .status(goal.getStatus())
                .createdAt(goal.getCreatedAt())
                .progressPercent(progress)
                .recentTransactions(recentTx)
                .build();
    }

    // ── CRUD ──

    public List<SavingGoalResponse> getAllGoals() {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        return savingGoalRepository.findByOwnerEmailAndStatusNotOrderByCreatedAtDesc(currentUserEmail, "Deleted").stream()
                .map(goal -> {
                    List<SavingGoalTransactionResponse> txs = savingGoalTransactionRepository
                            .findBySavingGoalOrderByTransactionDateDesc(goal)
                            .stream().limit(5).map(this::toTxResponse).collect(Collectors.toList());
                    return toResponse(goal, txs);
                })
                .collect(Collectors.toList());
    }

    public SavingGoalResponse getGoalById(Integer id) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        SavingGoal goal = savingGoalRepository.findByIdAndOwnerEmailAndStatusNot(id, currentUserEmail, "Deleted")
                .orElseThrow(() -> new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION));
        List<SavingGoalTransactionResponse> txs = savingGoalTransactionRepository
                .findBySavingGoalOrderByTransactionDateDesc(goal)
                .stream().map(this::toTxResponse).collect(Collectors.toList());
        return toResponse(goal, txs);
    }

    public SavingGoalResponse createGoal(SavingGoalRequest request) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        SavingGoal goal = new SavingGoal();
        goal.setName(request.getName());
        goal.setTargetAmount(request.getTargetAmount());
        goal.setCurrentAmount(request.getCurrentAmount() != null ? request.getCurrentAmount() : BigDecimal.ZERO);
        goal.setDeadline(request.getDeadline());
        goal.setStatus("Active");
        goal.setCreatedAt(Instant.now());
        goal.setOwnerEmail(currentUserEmail);

        SavingGoal saved = savingGoalRepository.save(goal);
        return toResponse(saved, Collections.emptyList());
    }

    public SavingGoalResponse updateGoal(Integer id, SavingGoalRequest request) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        SavingGoal goal = savingGoalRepository.findByIdAndOwnerEmailAndStatusNot(id, currentUserEmail, "Deleted")
                .orElseThrow(() -> new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION));

        if (request.getName() != null) goal.setName(request.getName());
        if (request.getTargetAmount() != null) goal.setTargetAmount(request.getTargetAmount());
        if (request.getDeadline() != null) goal.setDeadline(request.getDeadline());
        if (request.getStatus() != null) goal.setStatus(request.getStatus());

        SavingGoal saved = savingGoalRepository.save(goal);
        List<SavingGoalTransactionResponse> txs = savingGoalTransactionRepository
                .findBySavingGoalOrderByTransactionDateDesc(saved)
                .stream().limit(5).map(this::toTxResponse).collect(Collectors.toList());
        return toResponse(saved, txs);
    }

    public void deleteGoal(Integer id) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        SavingGoal goal = savingGoalRepository.findByIdAndOwnerEmailAndStatusNot(id, currentUserEmail, "Deleted")
                .orElseThrow(() -> new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION));
        goal.setStatus("Deleted");
        savingGoalRepository.save(goal);
    }

    // ── Deposit & Withdraw ──

    @Transactional
    public SavingGoalResponse deposit(Integer goalId, SavingGoalTransactionRequest request) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        SavingGoal goal = savingGoalRepository.findByIdAndOwnerEmailAndStatusNot(goalId, currentUserEmail, "Deleted")
                .orElseThrow(() -> new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION));

        Wallet wallet = null;
        if (request.getWalletId() != null) {
            wallet = walletRepository.findByIdAndOwnerEmailAndIsDeletedFalse(request.getWalletId(), currentUserEmail)
                    .orElseThrow(() -> new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION));
            // Deduct from wallet
            wallet.setBalance(wallet.getBalance().subtract(request.getAmount()));
            walletRepository.save(wallet);
        }

        // Add to saving goal
        goal.setCurrentAmount(goal.getCurrentAmount().add(request.getAmount()));

        // Auto-complete if reached target
        if (goal.getCurrentAmount().compareTo(goal.getTargetAmount()) >= 0) {
            goal.setStatus("Completed");
        }
        savingGoalRepository.save(goal);

        // Log transaction
        SavingGoalTransaction tx = new SavingGoalTransaction();
        tx.setSavingGoal(goal);
        tx.setWallet(wallet);
        tx.setType("DEPOSIT");
        tx.setAmount(request.getAmount());
        tx.setNotes(request.getNotes());
        tx.setTransactionDate(Instant.now());
        tx.setOwnerEmail(currentUserEmail);
        savingGoalTransactionRepository.save(tx);

        List<SavingGoalTransactionResponse> txs = savingGoalTransactionRepository
                .findBySavingGoalOrderByTransactionDateDesc(goal)
                .stream().limit(5).map(this::toTxResponse).collect(Collectors.toList());
        return toResponse(goal, txs);
    }

    @Transactional
    public SavingGoalResponse withdraw(Integer goalId, SavingGoalTransactionRequest request) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        SavingGoal goal = savingGoalRepository.findByIdAndOwnerEmailAndStatusNot(goalId, currentUserEmail, "Deleted")
                .orElseThrow(() -> new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION));

        if (goal.getCurrentAmount().compareTo(request.getAmount()) < 0) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION); // Insufficient balance in goal
        }

        Wallet wallet = null;
        if (request.getWalletId() != null) {
            wallet = walletRepository.findByIdAndOwnerEmailAndIsDeletedFalse(request.getWalletId(), currentUserEmail)
                    .orElseThrow(() -> new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION));
            // Add back to wallet
            wallet.setBalance(wallet.getBalance().add(request.getAmount()));
            walletRepository.save(wallet);
        }

        // Subtract from saving goal
        goal.setCurrentAmount(goal.getCurrentAmount().subtract(request.getAmount()));
        savingGoalRepository.save(goal);

        // Log transaction
        SavingGoalTransaction tx = new SavingGoalTransaction();
        tx.setSavingGoal(goal);
        tx.setWallet(wallet);
        tx.setType("WITHDRAW");
        tx.setAmount(request.getAmount());
        tx.setNotes(request.getNotes());
        tx.setTransactionDate(Instant.now());
        tx.setOwnerEmail(currentUserEmail);
        savingGoalTransactionRepository.save(tx);

        List<SavingGoalTransactionResponse> txs = savingGoalTransactionRepository
                .findBySavingGoalOrderByTransactionDateDesc(goal)
                .stream().limit(5).map(this::toTxResponse).collect(Collectors.toList());
        return toResponse(goal, txs);
    }

    public List<SavingGoalTransactionResponse> getGoalTransactions(Integer goalId) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        SavingGoal goal = savingGoalRepository.findByIdAndOwnerEmailAndStatusNot(goalId, currentUserEmail, "Deleted")
                .orElseThrow(() -> new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION));
        return savingGoalTransactionRepository.findBySavingGoalOrderByTransactionDateDesc(goal)
                .stream().map(this::toTxResponse).collect(Collectors.toList());
    }
}
