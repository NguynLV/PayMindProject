package com.example.AppQuanLiChiTieu.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RegisterRequest {
    @NotBlank(message = "Tên không được để trống")
    @Size(min = 3, message = "USERNAME_INVALID")
    String firstName;

    @NotBlank(message = "Họ không được để trống")
    String lastName;

    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 8, message = "INVALID_PASSWORD")
    String password;

    @NotBlank(message = "Email không được để trống")
    @Email(message = "INVALID_EMAIL")
    String email;

    LocalDate birthday;

    String currency;

    String gender;

    String phone;

    org.springframework.web.multipart.MultipartFile avatar;
}
