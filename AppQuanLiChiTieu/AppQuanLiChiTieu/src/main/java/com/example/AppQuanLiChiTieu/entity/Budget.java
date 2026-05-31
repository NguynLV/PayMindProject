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
@Table(name = "Budgets")
public class Budget {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "BudgetId", nullable = false)
    private Integer id;

    @jakarta.validation.constraints.Size(max = 255)
    @jakarta.persistence.Column(name = "OwnerEmail")
    private String ownerEmail;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "CategoryId")
    private Category category;

    @Size(max = 100)
    @Nationalized
    @Column(name = "Name", length = 100)
    private String name;

    @NotNull
    @Column(name = "Amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal amount;

    @NotNull
    @ColumnDefault("80.00")
    @Column(name = "AlertThreshold", nullable = false, precision = 5, scale = 2)
    private BigDecimal alertThreshold;

    @Size(max = 20)
    @NotNull
    @Nationalized
    @Column(name = "Period", nullable = false, length = 20)
    private String period;

    @NotNull
    @Column(name = "PeriodValue", nullable = false)
    private Integer periodValue;

    @NotNull
    @Column(name = "\"Year\"", nullable = false)
    private Integer year;

    @NotNull
    @ColumnDefault("getdate()")
    @Column(name = "CreatedAt", nullable = false)
    private Instant createdAt;

    @NotNull
    @ColumnDefault("1")
    @Column(name = "IsActive", nullable = false)
    private Boolean isActive;


}
