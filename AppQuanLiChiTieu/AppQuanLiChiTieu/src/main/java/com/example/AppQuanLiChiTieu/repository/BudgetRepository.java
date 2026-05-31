package com.example.AppQuanLiChiTieu.repository;

import com.example.AppQuanLiChiTieu.entity.Budget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BudgetRepository extends JpaRepository<Budget, Integer> {
    List<Budget> findByOwnerEmailAndIsActiveTrue(String ownerEmail);
    Optional<Budget> findByIdAndOwnerEmailAndIsActiveTrue(Integer id, String ownerEmail);
}
