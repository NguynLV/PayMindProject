package com.example.AppQuanLiChiTieu.repository;

import com.example.AppQuanLiChiTieu.entity.SavingGoal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SavingGoalRepository extends JpaRepository<SavingGoal, Integer> {
    List<SavingGoal> findByOwnerEmailOrderByCreatedAtDesc(String ownerEmail);
    Optional<SavingGoal> findByIdAndOwnerEmailAndStatusNot(Integer id, String ownerEmail, String status);
    List<SavingGoal> findByOwnerEmailAndStatusOrderByCreatedAtDesc(String ownerEmail, String status);
    List<SavingGoal> findByOwnerEmailAndStatusNotOrderByCreatedAtDesc(String ownerEmail, String status);
}
