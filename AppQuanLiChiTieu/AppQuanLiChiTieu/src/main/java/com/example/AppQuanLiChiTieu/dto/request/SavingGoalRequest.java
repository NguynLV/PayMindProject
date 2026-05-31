package com.example.AppQuanLiChiTieu.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class SavingGoalRequest {
    @NotBlank(message = "Tên mục tiêu không được để trống")
    private String name;

    @NotNull(message = "Số tiền mục tiêu không được để trống")
    private BigDecimal targetAmount;

    private BigDecimal currentAmount;
    private LocalDate deadline;
    private String status; // Active, Completed, Cancelled
}
