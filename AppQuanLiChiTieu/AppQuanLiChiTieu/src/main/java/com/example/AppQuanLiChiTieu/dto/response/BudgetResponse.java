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
public class BudgetResponse {
    Integer id;
    Integer categoryId;
    String categoryName;
    String name;
    BigDecimal amount;
    BigDecimal spentAmount; 
    BigDecimal alertThreshold;
    String period;
    Integer periodValue;
    Integer year;
    Integer month;
    Boolean isActive;
    Instant createdAt;
}
