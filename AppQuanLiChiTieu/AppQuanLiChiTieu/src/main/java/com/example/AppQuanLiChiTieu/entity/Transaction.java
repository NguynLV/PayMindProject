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
@Table(name = "Transactions")
public class Transaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "TransactionId", nullable = false)
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

    @Size(max = 500)
    @Nationalized
    @Column(name = "Description", length = 500)
    private String description;

    @Size(max = 20)
    @NotNull
    @Nationalized
    @ColumnDefault("'Completed'")
    @Column(name = "Status", nullable = false, length = 20)
    private String status;

    @Size(max = 50)
    @Nationalized
    @Column(name = "PaymentMethod", length = 50)
    private String paymentMethod;

    @Size(max = 255)
    @Nationalized
    @Column(name = "Location")
    private String location;

    @Size(max = 1000)
    @Nationalized
    @Column(name = "ImageUrl", length = 1000)
    private String imageUrl;

    @Size(max = 50)
    @Nationalized
    @Column(name = "Mood", length = 50)
    private String mood;

    @NotNull
    @Column(name = "TransactionDate", nullable = false)
    private Instant transactionDate;

    @NotNull
    @ColumnDefault("false")
    @Column(name = "IsDeleted", nullable = false)
    private Boolean isDeleted;

    @Column(name = "DeletedAt")
    private Instant deletedAt;

    @NotNull
    @ColumnDefault("CURRENT_TIMESTAMP")
    @Column(name = "CreatedAt", nullable = false)
    private Instant createdAt;

    @Column(name = "UpdatedAt")
    private Instant updatedAt;


}
