package com.example.AppQuanLiChiTieu.service;

import com.example.AppQuanLiChiTieu.dto.request.UpdateProfileRequest;
import com.example.AppQuanLiChiTieu.dto.response.UserProfileResponse;
import com.example.AppQuanLiChiTieu.model.User;
import com.example.AppQuanLiChiTieu.exception.AppException;
import com.example.AppQuanLiChiTieu.exception.ErrorCode;
import com.example.AppQuanLiChiTieu.repository.RedisUserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserService {

    RedisUserRepository redisUserRepository;
    FileStorageService fileStorageService;
    
    // ── helpers ──────────────────────────────────────────────────────────────

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return redisUserRepository.findById(email)
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
                .isPremium(user.getIsPremium() != null && user.getIsPremium())
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
        redisUserRepository.save(user);
        return toProfileResponse(user);
    }

    /** POST /users/me/avatar — upload and persist avatar image */
    public String uploadAvatar(MultipartFile file) throws IOException {
        if (file.isEmpty()) throw new AppException(ErrorCode.INVALID_KEY);

        String avatarUrl = fileStorageService.uploadImage(file);

        User user = getCurrentUser();
        user.setAvatarUrl(avatarUrl);
        redisUserRepository.save(user);

        return avatarUrl;
    }
}
