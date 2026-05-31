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
@Table(name = "Wallets")
public class Wallet {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "WalletId", nullable = false)
    private Integer id;

    @Size(max = 255)
    @Column(name = "OwnerEmail")
    private String ownerEmail;


    @Size(max = 100)
    @NotNull
    @Nationalized
    @Column(name = "Name", nullable = false, length = 100)
    private String name;

    @NotNull
    @ColumnDefault("0")
    @Column(name = "Balance", nullable = false, precision = 18, scale = 2)
    private BigDecimal balance;

    @Size(max = 50)
    @Nationalized
    @Column(name = "Type", length = 50)
    private String type;

    @NotNull
    @ColumnDefault("false")
    @Column(name = "IsDefault", nullable = false)
    private Boolean isDefault;

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


}