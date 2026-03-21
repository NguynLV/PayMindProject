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
public class WalletRequest {
    @NotBlank(message = "Tên ví không được để trống")
    String name;

    @NotNull(message = "Số dư không được để trống")
    BigDecimal balance;
}
