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
import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "RecurringTransactions")
public class RecurringTransaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "RecurringId", nullable = false)
    private Integer id;

    @jakarta.validation.constraints.Size(max = 255)
    @jakarta.persistence.Column(name = "OwnerEmail")
    private String ownerEmail;


    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "WalletId", nullable = false)
    private Wallet wallet;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "CategoryId", nullable = false)
    private Category category;

    @Size(max = 20)
    @NotNull
    @Nationalized
    @Column(name = "Type", nullable = false, length = 20)
    private String type;

    @NotNull
    @Column(name = "Amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal amount;

    @Size(max = 255)
    @Nationalized
    @Column(name = "Description")
    private String description;

    @Size(max = 20)
    @NotNull
    @Nationalized
    @Column(name = "Cycle", nullable = false, length = 20)
    private String cycle;

    @NotNull
    @Column(name = "NextRunDate", nullable = false)
    private LocalDate nextRunDate;

    @NotNull
    @ColumnDefault("true")
    @Column(name = "IsActive", nullable = false)
    private Boolean isActive;

    @NotNull
    @ColumnDefault("CURRENT_TIMESTAMP")
    @Column(name = "CreatedAt", nullable = false)
    private Instant createdAt;


}
