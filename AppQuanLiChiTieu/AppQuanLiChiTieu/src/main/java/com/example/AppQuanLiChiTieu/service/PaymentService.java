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
        if (description.toUpperCase().contains("YEARLY") || description.toUpperCase().contains("PMY")) {
            requiredAmount = 190000.0;
        }

        if (request.getAmount() == null || request.getAmount() < requiredAmount) {
            log.warn("Invalid payment amount: {} (required minimum: {})", request.getAmount(), requiredAmount);
            throw new AppException(ErrorCode.INVALID_KEY);
        }

        // Search for email pattern in transaction description
        Pattern pattern = Pattern.compile("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}");
        Matcher matcher = pattern.matcher(description);

        String email = null;
        if (matcher.find()) {
            email = matcher.group().trim().toLowerCase();
            log.info("Extracted email using regex: {}", email);
        }

        // Priority 2: Try direct token reconstruction by detecting stripped email domains
        if (email == null) {
            log.info("Attempting Priority 2 (token domain reconstruction).");
            String[] tokens = description.trim().split("\\s+");
            String[] knownDomains = {"gmail.com", "fpt.edu.vn", "yahoo.com", "outlook.com", "hotmail.com"};
            for (String rawToken : tokens) {
                String token = rawToken.trim().toLowerCase().replaceAll("[^a-z0-9]", "");
                if (token.length() >= 4) {
                    // Check if token contains/ends with a stripped domain name (e.g. gmailcom)
                    for (String domain : knownDomains) {
                        String strippedDomain = domain.replaceAll("[^a-z0-9]", "");
                        if (token.endsWith(strippedDomain)) {
                            String prefix = token.substring(0, token.length() - strippedDomain.length());
                            String reconstructedEmail = prefix + "@" + domain;
                            log.info("Reconstructed email check: {} for token: {}", reconstructedEmail, rawToken);
                            if (redisUserRepository.existsById(reconstructedEmail)) {
                                email = reconstructedEmail;
                                break;
                            }
                        }
                    }
                    if (email != null) break;

                    // Also check if token is just the prefix (e.g. exists by appending common domains)
                    if (redisUserRepository.existsById(token)) {
                        email = token;
                        break;
                    } else if (redisUserRepository.existsById(token + "@gmail.com")) {
                        email = token + "@gmail.com";
                        break;
                    } else if (redisUserRepository.existsById(token + "@fpt.edu.vn")) {
                        email = token + "@fpt.edu.vn";
                        break;
                    }
                }
            }
        }

        // Priority 3: Fallback scan matching normalized email as substring of normalized description
        if (email == null) {
            String normDesc = description.toLowerCase().replaceAll("[^a-z0-9]", "");
            log.info("Attempting Priority 3 (normalized substring matching). Normalized description: {}", normDesc);
            for (User u : redisUserRepository.findAll()) {
                String normUserEmail = u.getEmail().toLowerCase().replaceAll("[^a-z0-9]", "");
                if (!normUserEmail.isEmpty() && normDesc.contains(normUserEmail)) {
                    email = u.getEmail();
                    log.info("Matched normalized email '{}' inside description", email);
                    break;
                }
            }
        }

        // Priority 4: Fallback scan using startsWith/contains for token prefix
        if (email == null) {
            log.info("Attempting Priority 4 (token startsWith/contains scanning).");
            String[] tokens = description.trim().split("\\s+");
            for (String rawToken : tokens) {
                String token = rawToken.trim().toLowerCase().replaceAll("[^a-z0-9]", "");
                if (token.length() >= 5) {
                    for (User u : redisUserRepository.findAll()) {
                        String normUserEmail = u.getEmail().toLowerCase().replaceAll("[^a-z0-9]", "");
                        if (normUserEmail.startsWith(token) || normUserEmail.contains(token)) {
                            email = u.getEmail();
                            break;
                        }
                    }
                    if (email != null) {
                        log.info("Matched token '{}' to user email '{}'", token, email);
                        break;
                    }
                }
            }
        }

        if (email == null) {
            log.warn("Could not extract email or user identifier from description: {}", description);
            throw new AppException(ErrorCode.INVALID_KEY);
        }

        final String finalEmail = email;
        log.info("Final resolved email: {}", finalEmail);

        User user = redisUserRepository.findById(finalEmail)
                .orElseThrow(() -> {
                    log.warn("User with email {} not found in Redis", finalEmail);
                    return new AppException(ErrorCode.USER_NOT_EXISTED);
                });

        user.setIsPremium(true);
        redisUserRepository.save(user);

        log.info("Successfully updated premium status for user: {}", finalEmail);

        // Send a system notification
        notificationService.createNotificationForUser(
                "Nâng cấp Premium thành công! 👑",
                "Chào mừng homie đã lên đời Premium! Tất cả các tính năng AI Assistant, AI Budget và Xuất Excel đã được mở khóa! 🎉✨",
                "SYSTEM",
                finalEmail
        );
    }
}
