package com.example.AppQuanLiChiTieu.repository;

import com.example.AppQuanLiChiTieu.entity.DiaryEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DiaryRepository extends JpaRepository<DiaryEntry, Long> {
    List<DiaryEntry> findByOwnerEmailAndIsDeletedFalseOrderByEntryDateDesc(String ownerEmail);
    List<DiaryEntry> findByOwnerEmailAndEntryDateBetweenAndIsDeletedFalseOrderByEntryDateDesc(String ownerEmail, LocalDate start, LocalDate end);
    Optional<DiaryEntry> findByIdAndOwnerEmailAndIsDeletedFalse(Long id, String ownerEmail);
}
