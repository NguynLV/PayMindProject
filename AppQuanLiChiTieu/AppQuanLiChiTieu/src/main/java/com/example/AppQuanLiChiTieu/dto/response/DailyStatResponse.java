package com.example.AppQuanLiChiTieu.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DailyStatResponse {
    int day;
    BigDecimal totalIncome;
    BigDecimal totalExpense;
}
