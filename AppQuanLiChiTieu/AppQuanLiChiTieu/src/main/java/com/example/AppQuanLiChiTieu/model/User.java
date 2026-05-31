package com.example.AppQuanLiChiTieu.model;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;
import java.time.LocalDate;

import org.springframework.data.annotation.Id;
import org.springframework.data.redis.core.RedisHash;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@RedisHash("user_session")
public class User {
    Integer id;

    @Size(max = 255)
    @NotNull
    @Id
    String email;

    @Size(max = 255)
    String passwordHash;

    @Size(max = 100)
    String firstName;

    @Size(max = 100)
    String lastName;

    @Size(max = 20)
    String phone;

    LocalDate birthday;

    @Size(max = 500)
    String avatarUrl;

    @Size(max = 10)
    String currency;

    @Size(max = 10)
    String gender;

    Boolean isActive;

    Boolean isPremium;

    Instant createdAt;

    Instant lastLoginAt;
}
