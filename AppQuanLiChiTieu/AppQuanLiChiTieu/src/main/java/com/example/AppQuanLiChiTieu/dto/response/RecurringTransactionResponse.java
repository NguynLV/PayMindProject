package com.example.AppQuanLiChiTieu.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RecurringTransactionResponse {
    Integer id;
    String ownerEmail;
    WalletResponse wallet;
    CategoryResponse category;
    String type;
    BigDecimal amount;
    String description;
    String cycle;
    LocalDate nextRunDate;
    Boolean isActive;
    Instant createdAt;
}
