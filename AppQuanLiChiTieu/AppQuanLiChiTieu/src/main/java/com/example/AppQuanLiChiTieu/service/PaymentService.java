package com.example.AppQuanLiChiTieu.service;

import com.example.AppQuanLiChiTieu.dto.request.WebhookPaymentRequest;
import com.example.AppQuanLiChiTieu.model.User;
import com.example.AppQuanLiChiTieu.repository.RedisUserRepository;
import com.example.AppQuanLiChiTieu.exception.AppException;
import com.example.AppQuanLiChiTieu.exception.ErrorCode;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class PaymentService {

    RedisUserRepository redisUserRepository;
    NotificationService notificationService;

    public void processWebhook(WebhookPaymentRequest request) {
        log.info("Received payment webhook: {}", request);

        String description = request.getDescription();
        if (description == null || description.isEmpty()) {
            log.warn("Empty transaction description");
            throw new AppException(ErrorCode.INVALID_KEY);
        }

        double requiredAmount = 19000.0;
        if (description.toUpperCase().contains("YEARLY")) {
            requiredAmount = 190000.0;
        }

        if (request.getAmount() == null || request.getAmount() < requiredAmount) {
            log.warn("Invalid payment amount: {} (required minimum: {})", request.getAmount(), requiredAmount);
            throw new AppException(ErrorCode.INVALID_KEY);
        }

        // Search for email pattern in transaction description
        Pattern pattern = Pattern.compile("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}");
        Matcher matcher = pattern.matcher(description);

        if (!matcher.find()) {
            log.warn("No email found in transaction description: {}", description);
            throw new AppException(ErrorCode.INVALID_KEY);
        }

        String email = matcher.group().trim().toLowerCase();
        log.info("Extracted email from transaction description: {}", email);

        User user = redisUserRepository.findById(email)
                .orElseThrow(() -> {
                    log.warn("User with email {} not found in Redis", email);
                    return new AppException(ErrorCode.USER_NOT_EXISTED);
                });

        user.setIsPremium(true);
        redisUserRepository.save(user);

        log.info("Successfully updated premium status for user: {}", email);

        // Send a system notification
        notificationService.createNotificationForUser(
                "Nâng cấp Premium thành công! 👑",
                "Chào mừng homie đã lên đời Premium! Tất cả các tính năng AI Assistant, AI Budget và Xuất Excel đã được mở khóa! 🎉✨",
                "SYSTEM",
                email
        );
    }
}
