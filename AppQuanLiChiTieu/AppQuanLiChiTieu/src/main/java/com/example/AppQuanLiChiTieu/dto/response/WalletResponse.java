package com.example.AppQuanLiChiTieu.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class WalletResponse {
    Integer id;
    String name;
    BigDecimal balance;
    String type;
    Boolean isDefault;
}
