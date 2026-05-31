package com.example.AppQuanLiChiTieu.repository;

import com.example.AppQuanLiChiTieu.entity.SavingGoal;
import com.example.AppQuanLiChiTieu.entity.SavingGoalTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SavingGoalTransactionRepository extends JpaRepository<SavingGoalTransaction, Integer> {
    List<SavingGoalTransaction> findBySavingGoalOrderByTransactionDateDesc(SavingGoal savingGoal);
}
