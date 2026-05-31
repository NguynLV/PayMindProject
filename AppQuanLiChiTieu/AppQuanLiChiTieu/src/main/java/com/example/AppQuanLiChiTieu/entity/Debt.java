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
@Table(name = "Debts")
public class Debt {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "DebtId", nullable = false)
    private Integer id;

    @Size(max = 255)
    @Column(name = "OwnerEmail")
    private String ownerEmail;

    @NotNull
    @Size(max = 255)
    @Nationalized
    @Column(name = "DebtorName", nullable = false)
    private String debtorName;

    @Size(max = 20)
    @Column(name = "PhoneNumber", length = 20)
    private String phoneNumber;

    @Column(name = "Amount", precision = 18, scale = 2)
    private BigDecimal amount;

    @Size(max = 50)
    @Column(name = "ItemType", length = 50)
    private String itemType; // CASH, MILK_TEA, COFFEE, LUNCH, OTHER

    @Size(max = 255)
    @Nationalized
    @Column(name = "ItemDescription")
    private String itemDescription;

    @NotNull
    @Size(max = 20)
    @Column(name = "Type", nullable = false, length = 20)
    private String type; // LENT (Cho mượn), BORROWED (Đi mượn)

    @NotNull
    @Size(max = 20)
    @Column(name = "Status", nullable = false, length = 20)
    private String status; // UNPAID (Chưa trả), PAID (Đã trả), DEFAULTED (Bùng)

    @Size(max = 500)
    @Nationalized
    @Column(name = "Note", length = 500)
    private String note;

    @Column(name = "DueDate")
    private LocalDate dueDate;

    @NotNull
    @Column(name = "CreatedAt", nullable = false)
    private Instant createdAt;

    @Column(name = "UpdatedAt")
    private Instant updatedAt;
}
