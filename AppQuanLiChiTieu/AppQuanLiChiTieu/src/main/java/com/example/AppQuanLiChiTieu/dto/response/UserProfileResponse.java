package com.example.AppQuanLiChiTieu.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserProfileResponse {
    Integer id;
    String email;
    String firstName;
    String lastName;
    String phone;
    LocalDate birthday;
    String avatarUrl;
    String currency;
    String gender;
    Boolean isPremium;
}
