package com.example.AppQuanLiChiTieu.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BudgetRequest {
    Integer categoryId;

    @NotBlank(message = "Tên ngân sách không được để trống")
    String name;

    @NotNull(message = "Số tiền không được để trống")
    BigDecimal amount;

    @NotBlank(message = "Chu kỳ không được để trống")
    String period;

    @NotNull(message = "Giá trị chu kỳ không được để trống")
    Integer periodValue;

    @NotNull(message = "Năm không được để trống")
    Integer year;

    Integer month;
}
