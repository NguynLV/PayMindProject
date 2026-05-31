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
public class DebtRequest {
    String debtorName;
    String phoneNumber;
    BigDecimal amount;
    String itemType; // CASH, MILK_TEA, COFFEE, LUNCH, OTHER
    String itemDescription;
    String type; // LENT, BORROWED
    String status; // UNPAID, PAID, DEFAULTED
    String note;
    LocalDate dueDate;
}
