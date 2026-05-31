package com.example.AppQuanLiChiTieu.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
public class SavingGoalTransactionResponse {
    private Integer id;
    private Integer goalId;
    private String type; // DEPOSIT or WITHDRAW
    private BigDecimal amount;
    private String notes;
    private String walletName;
    private Integer walletId;
    private Instant transactionDate;
}
