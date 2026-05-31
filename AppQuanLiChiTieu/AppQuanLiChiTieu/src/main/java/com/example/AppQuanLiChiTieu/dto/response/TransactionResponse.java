package com.example.AppQuanLiChiTieu.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TransactionResponse {
    Integer id;
    BigDecimal amount;
    String type;
    String description;
    Instant transactionDate;
    
    CategoryResponse category;
    WalletResponse wallet;
    String imageUrl;
    String mood;
}
