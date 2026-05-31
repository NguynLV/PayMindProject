package com.example.AppQuanLiChiTieu.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.Nationalized;

import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "DiaryEntries")
public class DiaryEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "DiaryId", nullable = false)
    private Long id;

    @Size(max = 255)
    @Column(name = "OwnerEmail")
    private String ownerEmail;

    @Column(name = "UserId")
    private Long userId;

    @Size(max = 1000)
    @Nationalized
    @Column(name = "ImageUrl", length = 1000)
    private String imageUrl;

    @Size(max = 500)
    @Nationalized
    @Column(name = "Note", length = 500)
    private String note;

    @NotNull
    @Column(name = "EntryDate", nullable = false)
    private LocalDate entryDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "TransactionId")
    private Transaction transaction;

    @NotNull
    @ColumnDefault("CURRENT_TIMESTAMP")
    @Column(name = "CreatedAt", nullable = false)
    private Instant createdAt;

    @Column(name = "UpdatedAt")
    private Instant updatedAt;

    @NotNull
    @ColumnDefault("0")
    @Column(name = "IsDeleted", nullable = false)
    private Boolean isDeleted = false;
}

