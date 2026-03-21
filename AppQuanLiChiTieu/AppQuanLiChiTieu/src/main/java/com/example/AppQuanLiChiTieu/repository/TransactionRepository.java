package com.example.AppQuanLiChiTieu.repository;

import com.example.AppQuanLiChiTieu.entity.Transaction;
import com.example.AppQuanLiChiTieu.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

import java.util.Optional;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Integer> {
    Optional<Transaction> findByIdAndUserAndIsDeletedFalse(Integer id, User user);
    List<Transaction> findByUserAndIsDeletedFalseOrderByTransactionDateDesc(User user);
    
    List<Transaction> findByUserAndTypeAndIsDeletedFalseAndTransactionDateBetween(User user, String type, java.time.Instant startDate, java.time.Instant endDate);

    List<Transaction> findByUserAndCategoryAndIsDeletedFalseAndTransactionDateBetweenOrderByTransactionDateDesc(
            User user, com.example.AppQuanLiChiTieu.entity.Category category, java.time.Instant startDate, java.time.Instant endDate);
}
