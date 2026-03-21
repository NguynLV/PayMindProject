package com.example.AppQuanLiChiTieu.controller;

import com.example.AppQuanLiChiTieu.dto.request.UpdateProfileRequest;
import com.example.AppQuanLiChiTieu.dto.response.ApiResponse;
import com.example.AppQuanLiChiTieu.dto.response.UserProfileResponse;
import com.example.AppQuanLiChiTieu.service.UserService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserController {

    UserService userService;

    @GetMapping("/me")
    ApiResponse<UserProfileResponse> getMyProfile() {
        return ApiResponse.<UserProfileResponse>builder()
                .result(userService.getMyProfile())
                .build();
    }

    @PutMapping("/me")
    ApiResponse<UserProfileResponse> updateMyProfile(@RequestBody UpdateProfileRequest request) {
        return ApiResponse.<UserProfileResponse>builder()
                .result(userService.updateMyProfile(request))
                .build();
    }

    @PostMapping(value = "/me/avatar", consumes = "multipart/form-data")
    ApiResponse<String> uploadAvatar(@RequestParam("file") MultipartFile file) throws IOException {
        return ApiResponse.<String>builder()
                .result(userService.uploadAvatar(file))
                .build();
    }
}
