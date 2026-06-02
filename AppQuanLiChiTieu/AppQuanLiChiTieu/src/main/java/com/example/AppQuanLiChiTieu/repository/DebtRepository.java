package com.example.AppQuanLiChiTieu.repository;

import com.example.AppQuanLiChiTieu.entity.Debt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DebtRepository extends JpaRepository<Debt, Integer> {
    List<Debt> findByOwnerEmailOrderByCreatedAtDesc(String ownerEmail);
    Optional<Debt> findByIdAndOwnerEmail(Integer id, String ownerEmail);
    List<Debt> findByStatusAndDueDate(String status, java.time.LocalDate dueDate);
}
