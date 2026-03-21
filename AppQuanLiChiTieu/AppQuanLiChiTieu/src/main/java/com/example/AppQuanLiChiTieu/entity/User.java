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
@Table(name = "Users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "UserId", nullable = false)
    private Integer id;

    @Size(max = 255)
    @NotNull
    @Nationalized
    @Column(name = "Email", nullable = false)
    private String email;

    @Size(max = 500)
    @NotNull
    @Nationalized
    @Column(name = "PasswordHash", nullable = false, length = 500)
    private String passwordHash;

    @Size(max = 100)
    @NotNull
    @Nationalized
    @Column(name = "FirstName", nullable = false, length = 100)
    private String firstName;

    @Size(max = 100)
    @NotNull
    @Nationalized
    @Column(name = "LastName", nullable = false, length = 100)
    private String lastName;

    @Size(max = 20)
    @Nationalized
    @Column(name = "Phone", length = 20)
    private String phone;

    @Column(name = "Birthday")
    private LocalDate birthday;

    @Size(max = 500)
    @Nationalized
    @Column(name = "AvatarUrl", length = 500)
    private String avatarUrl;

    @Size(max = 10)
    @NotNull
    @Nationalized
    @ColumnDefault("'VND'")
    @Column(name = "Currency", nullable = false, length = 10)
    private String currency;

    @NotNull
    @ColumnDefault("getdate()")
    @Column(name = "CreatedAt", nullable = false)
    private Instant createdAt;

    @Column(name = "LastLoginAt")
    private Instant lastLoginAt;

    @NotNull
    @ColumnDefault("1")
    @Column(name = "IsActive", nullable = false)
    private Boolean isActive;

    @Size(max = 10)
    @Nationalized
    @Column(name = "Gender", length = 10)
    private String gender;


}