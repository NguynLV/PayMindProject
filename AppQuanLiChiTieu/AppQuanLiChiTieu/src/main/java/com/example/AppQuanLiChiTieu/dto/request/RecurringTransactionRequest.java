package com.example.AppQuanLiChiTieu.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RecurringTransactionRequest {
    Integer walletId;
    Integer categoryId;
    String type; // INCOME, EXPENSE
    BigDecimal amount;
    String description;
    String cycle; // DAILY, WEEKLY, MONTHLY, YEARLY
    LocalDate nextRunDate;
    Boolean isActive;
}
