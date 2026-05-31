package com.example.AppQuanLiChiTieu.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
public class SavingGoalResponse {
    private Integer id;
    private String name;
    private BigDecimal targetAmount;
    private BigDecimal currentAmount;
    private LocalDate deadline;
    private String status;
    private Instant createdAt;
    private double progressPercent;
    private List<SavingGoalTransactionResponse> recentTransactions;
}
