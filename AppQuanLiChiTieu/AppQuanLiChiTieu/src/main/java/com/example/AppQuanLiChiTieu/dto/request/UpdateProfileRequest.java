package com.example.AppQuanLiChiTieu.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateProfileRequest {
    String firstName;
    String lastName;
    String phone;
    LocalDate birthday;
    String gender;  
    String currency; 
}
