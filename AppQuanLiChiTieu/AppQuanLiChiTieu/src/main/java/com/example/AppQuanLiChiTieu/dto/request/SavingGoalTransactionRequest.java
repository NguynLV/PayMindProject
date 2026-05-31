package com.example.AppQuanLiChiTieu.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class SavingGoalTransactionRequest {
    @NotNull(message = "Số tiền không được để trống")
    private BigDecimal amount;

    private Integer walletId;
    private String notes;
}
