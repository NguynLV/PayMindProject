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
@Table(name = "SavingGoals")
public class SavingGoal {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "GoalId", nullable = false)
    private Integer id;

    @jakarta.validation.constraints.Size(max = 255)
    @jakarta.persistence.Column(name = "OwnerEmail")
    private String ownerEmail;


    @Size(max = 150)
    @NotNull
    @Nationalized
    @Column(name = "Name", nullable = false, length = 150)
    private String name;

    @NotNull
    @Column(name = "TargetAmount", nullable = false, precision = 18, scale = 2)
    private BigDecimal targetAmount;

    @NotNull
    @ColumnDefault("0")
    @Column(name = "CurrentAmount", nullable = false, precision = 18, scale = 2)
    private BigDecimal currentAmount;

    @Column(name = "Deadline")
    private LocalDate deadline;

    @Size(max = 20)
    @NotNull
    @Nationalized
    @ColumnDefault("'Active'")
    @Column(name = "Status", nullable = false, length = 20)
    private String status;

    @NotNull
    @ColumnDefault("CURRENT_TIMESTAMP")
    @Column(name = "CreatedAt", nullable = false)
    private Instant createdAt;


}
