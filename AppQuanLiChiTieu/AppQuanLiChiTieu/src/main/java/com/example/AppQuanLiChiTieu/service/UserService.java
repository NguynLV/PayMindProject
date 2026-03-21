package com.example.AppQuanLiChiTieu.service;

import com.example.AppQuanLiChiTieu.dto.request.UpdateProfileRequest;
import com.example.AppQuanLiChiTieu.dto.response.UserProfileResponse;
import com.example.AppQuanLiChiTieu.entity.User;
import com.example.AppQuanLiChiTieu.exception.AppException;
import com.example.AppQuanLiChiTieu.exception.ErrorCode;
import com.example.AppQuanLiChiTieu.repository.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserService {

    final UserRepository userRepository;
    final CloudinaryService cloudinaryService;

    @Value("${app.base-url:http://10.0.2.2:8080/QuanLiChiTieu}")
    String baseUrl;

    // ── helpers ──────────────────────────────────────────────────────────────

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
    }

    private UserProfileResponse toProfileResponse(User user) {
        return UserProfileResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phone(user.getPhone())
                .birthday(user.getBirthday())
                .avatarUrl(user.getAvatarUrl())
                .currency(user.getCurrency())
                .gender(user.getGender())
                .build();
    }

    // ── public API ───────────────────────────────────────────────────────────

    /** GET /users/me */
    public UserProfileResponse getMyProfile() {
        return toProfileResponse(getCurrentUser());
    }

    /** PUT /users/me */
    public UserProfileResponse updateMyProfile(UpdateProfileRequest request) {
        User user = getCurrentUser();
        if (request.getFirstName() != null) user.setFirstName(request.getFirstName());
        if (request.getLastName()  != null) user.setLastName(request.getLastName());
        if (request.getPhone()     != null) user.setPhone(request.getPhone());
        if (request.getBirthday()  != null) user.setBirthday(request.getBirthday());
        if (request.getGender()    != null) user.setGender(request.getGender());
        if (request.getCurrency()  != null) user.setCurrency(request.getCurrency());
        userRepository.save(user);
        return toProfileResponse(user);
    }

    /** POST /users/me/avatar — upload and persist avatar image */
    public String uploadAvatar(MultipartFile file) throws IOException {
        if (file.isEmpty()) throw new AppException(ErrorCode.INVALID_KEY);

        // Upload to Cloudinary instead of local folder
        String avatarUrl = cloudinaryService.uploadImage(file);

        // Persist public URL on the user record
        User user = getCurrentUser();
        user.setAvatarUrl(avatarUrl);
        userRepository.save(user);

        return avatarUrl;
    }
}
