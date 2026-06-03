package com.example.AppQuanLiChiTieu.repository;

import com.example.AppQuanLiChiTieu.entity.Category;
import com.example.AppQuanLiChiTieu.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Integer> {
    Optional<Transaction> findByIdAndOwnerEmailAndIsDeletedFalse(Integer id, String ownerEmail);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"category", "wallet"})
    List<Transaction> findByOwnerEmailAndIsDeletedFalseOrderByTransactionDateDesc(String ownerEmail);

    List<Transaction> findByTypeAndOwnerEmailAndIsDeletedFalseAndTransactionDateBetween(String type, String ownerEmail, Instant startDate, Instant endDate);
    List<Transaction> findByCategoryAndOwnerEmailAndIsDeletedFalseAndTransactionDateBetweenOrderByTransactionDateDesc(
            Category category, String ownerEmail, Instant startDate, Instant endDate);
}
