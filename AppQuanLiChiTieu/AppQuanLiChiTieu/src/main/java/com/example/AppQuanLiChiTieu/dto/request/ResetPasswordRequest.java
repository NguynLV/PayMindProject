package com.example.AppQuanLiChiTieu.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ResetPasswordRequest {
    @NotBlank(message = "Email không được để trống")
    String email;
    @NotBlank(message = "Mã OTP không được để trống")
    String otpCode;
    @NotBlank(message = "Mật khẩu mới không được để trống")
    String newPassword;
    @NotBlank(message = "Mật khẩu xác nhận không được để trống")
    String confirmNewPassword;
}
