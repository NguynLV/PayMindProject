package com.example.AppQuanLiChiTieu.repository;

import com.example.AppQuanLiChiTieu.entity.RecurringTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface RecurringTransactionRepository extends JpaRepository<RecurringTransaction, Integer> {
    List<RecurringTransaction> findByOwnerEmailOrderByCreatedAtDesc(String ownerEmail);
    Optional<RecurringTransaction> findByIdAndOwnerEmail(Integer id, String ownerEmail);
    List<RecurringTransaction> findByIsActiveTrueAndNextRunDateLessThanEqual(LocalDate date);
}
