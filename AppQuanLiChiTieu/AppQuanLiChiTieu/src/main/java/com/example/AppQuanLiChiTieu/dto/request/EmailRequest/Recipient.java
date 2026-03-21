package com.example.AppQuanLiChiTieu.dto.request.EmailRequest;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Recipient {
    @Email
    @NotBlank
    String email;

    String name;

    @Size(min = 4, max = 50, message = "Username must be between 4 and 50 characters")
    String userName;
}
