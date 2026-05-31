package com.example.AppQuanLiChiTieu.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TransactionRequest {

    @NotNull(message = "Amount is required")
    BigDecimal amount;

    @NotNull(message = "Wallet ID is required")
    Integer walletId;

    @NotNull(message = "Category ID is required")
    Integer categoryId;

    @NotNull(message = "Type is required")
    @Size(max = 20)
    String type;

    @Size(max = 500)
    String description;

    @NotNull(message = "Transaction date is required")
    Instant transactionDate;

    @Size(max = 1000)
    String imageUrl;

    @Size(max = 50)
    String mood;
}
