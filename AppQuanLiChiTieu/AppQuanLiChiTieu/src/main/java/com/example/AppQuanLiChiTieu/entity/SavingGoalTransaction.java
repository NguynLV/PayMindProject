package com.example.AppQuanLiChiTieu.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.Nationalized;

import java.math.BigDecimal;
import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "SavingGoalTransactions")
public class SavingGoalTransaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "SavingTxId", nullable = false)
    private Integer id;

    @jakarta.validation.constraints.Size(max = 255)
    @jakarta.persistence.Column(name = "OwnerEmail")
    private String ownerEmail;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "GoalId", nullable = false)
    private SavingGoal savingGoal;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "WalletId")
    private Wallet wallet;

    @Size(max = 20)
    @NotNull
    @Nationalized
    @Column(name = "Type", nullable = false, length = 20)
    private String type; // DEPOSIT or WITHDRAW

    @NotNull
    @Column(name = "Amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal amount;

    @Size(max = 500)
    @Nationalized
    @Column(name = "Notes", length = 500)
    private String notes;

    @NotNull
    @ColumnDefault("CURRENT_TIMESTAMP")
    @Column(name = "TransactionDate", nullable = false)
    private Instant transactionDate;
}

