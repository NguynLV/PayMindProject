package com.example.AppQuanLiChiTieu.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DiaryEntryResponse {
    Long id;
    String imageUrl;
    String note;
    LocalDate entryDate;
    Long transactionId;
    String transactionDescription;
    String transactionType;
    Double transactionAmount;
    Instant createdAt;
    Instant updatedAt;
}
