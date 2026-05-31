package com.example.AppQuanLiChiTieu.service;

import com.example.AppQuanLiChiTieu.dto.request.DebtRequest;
import com.example.AppQuanLiChiTieu.dto.response.DebtResponse;
import com.example.AppQuanLiChiTieu.entity.Debt;
import com.example.AppQuanLiChiTieu.exception.AppException;
import com.example.AppQuanLiChiTieu.exception.ErrorCode;
import com.example.AppQuanLiChiTieu.repository.DebtRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DebtService {

    DebtRepository debtRepository;

    public DebtResponse toResponse(Debt debt) {
        return DebtResponse.builder()
                .id(debt.getId())
                .ownerEmail(debt.getOwnerEmail())
                .debtorName(debt.getDebtorName())
                .phoneNumber(debt.getPhoneNumber())
                .amount(debt.getAmount())
                .itemType(debt.getItemType())
                .itemDescription(debt.getItemDescription())
                .type(debt.getType())
                .status(debt.getStatus())
                .note(debt.getNote())
                .dueDate(debt.getDueDate())
                .createdAt(debt.getCreatedAt())
                .updatedAt(debt.getUpdatedAt())
                .build();
    }

    public List<DebtResponse> getMyDebts() {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        return debtRepository.findByOwnerEmailOrderByCreatedAtDesc(currentUserEmail)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public DebtResponse getDebtById(Integer id) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        Debt debt = debtRepository.findByIdAndOwnerEmail(id, currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Debt not found or access denied"));
        return toResponse(debt);
    }

    @Transactional
    public DebtResponse createDebt(DebtRequest request) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();

        Debt debt = new Debt();
        debt.setOwnerEmail(currentUserEmail);
        debt.setDebtorName(request.getDebtorName());
        debt.setPhoneNumber(request.getPhoneNumber());
        debt.setAmount(request.getAmount());
        debt.setItemType(request.getItemType() != null ? request.getItemType().toUpperCase() : "CASH");
        debt.setItemDescription(request.getItemDescription());
        debt.setType(request.getType() != null ? request.getType().toUpperCase() : "LENT");
        debt.setStatus(request.getStatus() != null ? request.getStatus().toUpperCase() : "UNPAID");
        debt.setNote(request.getNote());
        debt.setDueDate(request.getDueDate());
        debt.setCreatedAt(Instant.now());
        debt.setUpdatedAt(Instant.now());

        Debt saved = debtRepository.save(debt);
        return toResponse(saved);
    }

    @Transactional
    public DebtResponse updateDebt(Integer id, DebtRequest request) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        Debt debt = debtRepository.findByIdAndOwnerEmail(id, currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Debt not found or access denied"));

        debt.setDebtorName(request.getDebtorName());
        debt.setPhoneNumber(request.getPhoneNumber());
        debt.setAmount(request.getAmount());
        debt.setItemType(request.getItemType() != null ? request.getItemType().toUpperCase() : "CASH");
        debt.setItemDescription(request.getItemDescription());
        debt.setType(request.getType() != null ? request.getType().toUpperCase() : "LENT");
        debt.setStatus(request.getStatus() != null ? request.getStatus().toUpperCase() : "UNPAID");
        debt.setNote(request.getNote());
        debt.setDueDate(request.getDueDate());
        debt.setUpdatedAt(Instant.now());

        Debt saved = debtRepository.save(debt);
        return toResponse(saved);
    }

    @Transactional
    public DebtResponse updateStatus(Integer id, String status) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        Debt debt = debtRepository.findByIdAndOwnerEmail(id, currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Debt not found or access denied"));

        debt.setStatus(status.toUpperCase());
        debt.setUpdatedAt(Instant.now());

        Debt saved = debtRepository.save(debt);
        return toResponse(saved);
    }

    @Transactional
    public void deleteDebt(Integer id) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        Debt debt = debtRepository.findByIdAndOwnerEmail(id, currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Debt not found or access denied"));
        debtRepository.delete(debt);
    }
}
