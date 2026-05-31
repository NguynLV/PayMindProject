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
public class DebtResponse {
    Integer id;
    String ownerEmail;
    String debtorName;
    String phoneNumber;
    BigDecimal amount;
    String itemType;
    String itemDescription;
    String type;
    String status;
    String note;
    LocalDate dueDate;
    Instant createdAt;
    Instant updatedAt;
}
