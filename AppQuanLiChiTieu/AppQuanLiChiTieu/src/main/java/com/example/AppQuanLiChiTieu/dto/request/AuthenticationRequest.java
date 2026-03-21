package com.example.AppQuanLiChiTieu.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AuthenticationRequest {
    @NotBlank(message = "Email không được để trống")
    String email;
    @NotBlank(message = "Mật khẩu không được để trống")
    String password;
}
