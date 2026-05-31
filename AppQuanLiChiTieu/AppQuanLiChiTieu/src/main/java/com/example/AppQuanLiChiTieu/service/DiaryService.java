package com.example.AppQuanLiChiTieu.service;

import com.example.AppQuanLiChiTieu.dto.response.DiaryEntryResponse;
import com.example.AppQuanLiChiTieu.entity.DiaryEntry;
import com.example.AppQuanLiChiTieu.entity.Transaction;
import com.example.AppQuanLiChiTieu.exception.AppException;
import com.example.AppQuanLiChiTieu.exception.ErrorCode;
import com.example.AppQuanLiChiTieu.repository.DiaryRepository;
import com.example.AppQuanLiChiTieu.repository.TransactionRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DiaryService {

    DiaryRepository diaryRepository;
    TransactionRepository transactionRepository;
    FileStorageService fileStorageService;

    private void syncTransactionsToDiary(String currentUserEmail) {
        try {
            List<DiaryEntry> existingDiaries = diaryRepository.findByOwnerEmailAndIsDeletedFalseOrderByEntryDateDesc(currentUserEmail);
            Set<Integer> existingTxIds = existingDiaries.stream()
                    .map(DiaryEntry::getTransaction)
                    .filter(Objects::nonNull)
                    .map(Transaction::getId)
                    .collect(Collectors.toSet());

            List<Transaction> userTx = transactionRepository.findByOwnerEmailAndIsDeletedFalseOrderByTransactionDateDesc(currentUserEmail);
            for (Transaction t : userTx) {
                if (t.getImageUrl() != null && !t.getImageUrl().trim().isEmpty() && !existingTxIds.contains(t.getId())) {
                    try {
                        DiaryEntry diaryEntry = new DiaryEntry();
                        diaryEntry.setOwnerEmail(currentUserEmail);
                        diaryEntry.setImageUrl(t.getImageUrl());
                        
                        String moodText = "";
                        if (t.getMood() != null && !t.getMood().trim().isEmpty()) {
                            moodText = "[" + t.getMood() + "]";
                        }
                        String note = moodText;
                        if (t.getDescription() != null && !t.getDescription().trim().isEmpty()) {
                            if (!note.isEmpty()) {
                                note += "\n" + t.getDescription();
                            } else {
                                note = t.getDescription();
                            }
                        }
                        diaryEntry.setNote(note);
                        
                        LocalDate entryDate = t.getTransactionDate().atZone(ZoneId.systemDefault()).toLocalDate();
                        diaryEntry.setEntryDate(entryDate);
                        diaryEntry.setTransaction(t);
                        diaryEntry.setCreatedAt(Instant.now());
                        diaryEntry.setIsDeleted(false);
                        diaryRepository.save(diaryEntry);
                    } catch (Exception ex) {
                        log.error("Failed to auto-create diary entry for transaction {}: {}", t.getId(), ex.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to sync transactions to diary: {}", e.getMessage());
        }
    }

    private DiaryEntryResponse toResponse(DiaryEntry entry) {
        Transaction tx = entry.getTransaction();
        return DiaryEntryResponse.builder()
                .id(entry.getId())
                .imageUrl(entry.getImageUrl())
                .note(entry.getNote())
                .entryDate(entry.getEntryDate())
                .transactionId(tx != null ? tx.getId().longValue() : null)
                .transactionDescription(tx != null ? tx.getDescription() : null)
                .transactionType(tx != null ? tx.getType() : null)
                .transactionAmount(tx != null ? tx.getAmount().doubleValue() : null)
                .createdAt(entry.getCreatedAt())
                .updatedAt(entry.getUpdatedAt())
                .build();
    }

    public List<DiaryEntryResponse> getMyDiaries() {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        syncTransactionsToDiary(currentUserEmail);
        return diaryRepository.findByOwnerEmailAndIsDeletedFalseOrderByEntryDateDesc(currentUserEmail)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<DiaryEntryResponse> getMyDiariesByMonth(int year, int month) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        syncTransactionsToDiary(currentUserEmail);
        LocalDate start = LocalDate.of(year, month, 1);
        LocalDate end = start.withDayOfMonth(start.lengthOfMonth());
        return diaryRepository.findByOwnerEmailAndEntryDateBetweenAndIsDeletedFalseOrderByEntryDateDesc(currentUserEmail, start, end)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public DiaryEntryResponse getDiaryById(Long id) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        DiaryEntry entry = diaryRepository.findByIdAndOwnerEmailAndIsDeletedFalse(id, currentUserEmail)
                .orElseThrow(() -> new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION));
        return toResponse(entry);
    }

    public DiaryEntryResponse createDiary(MultipartFile image, String note,
                                          String entryDateStr, Long transactionId) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        String imageUrl = null;
        if (image != null && !image.isEmpty()) {
            try {
                imageUrl = fileStorageService.uploadImage(image);
            } catch (Exception e) {
                log.error("Failed to upload diary image: {}", e.getMessage());
            }
        }

        LocalDate entryDate = (entryDateStr != null && !entryDateStr.isBlank())
                ? LocalDate.parse(entryDateStr)
                : LocalDate.now();

        Transaction transaction = null;
        if (transactionId != null) {
            transaction = transactionRepository.findByIdAndOwnerEmailAndIsDeletedFalse(transactionId.intValue(), currentUserEmail).orElse(null);
        }

        DiaryEntry entry = new DiaryEntry();
        entry.setImageUrl(imageUrl);
        entry.setNote(note);
        entry.setEntryDate(entryDate);
        entry.setTransaction(transaction);
        entry.setCreatedAt(Instant.now());
        entry.setIsDeleted(false);
        entry.setOwnerEmail(currentUserEmail);

        return toResponse(diaryRepository.save(entry));
    }

    public DiaryEntryResponse updateDiary(Long id, String note) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        DiaryEntry entry = diaryRepository.findByIdAndOwnerEmailAndIsDeletedFalse(id, currentUserEmail)
                .orElseThrow(() -> new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION));
        entry.setNote(note);
        entry.setUpdatedAt(Instant.now());
        return toResponse(diaryRepository.save(entry));
    }

    public void deleteDiary(Long id) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        DiaryEntry entry = diaryRepository.findByIdAndOwnerEmailAndIsDeletedFalse(id, currentUserEmail)
                .orElseThrow(() -> new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION));
        entry.setIsDeleted(true);
        entry.setUpdatedAt(Instant.now());
        diaryRepository.save(entry);
    }
}
