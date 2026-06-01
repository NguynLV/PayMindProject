package com.example.AppQuanLiChiTieu.controller;

import com.example.AppQuanLiChiTieu.dto.request.SepayWebhookRequest;
import com.example.AppQuanLiChiTieu.dto.request.WebhookPaymentRequest;
import com.example.AppQuanLiChiTieu.dto.response.ApiResponse;
import com.example.AppQuanLiChiTieu.service.PaymentService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Slf4j
@RestController
@RequestMapping("/payments")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PaymentController {

    PaymentService paymentService;

    @Value("${sepay.token:sepay_secret_token}")
    @NonFinal
    String sepayToken;

    @PostMapping("/webhook")
    public ApiResponse<Void> processWebhook(@Valid @RequestBody WebhookPaymentRequest request) {
        paymentService.processWebhook(request);
        return ApiResponse.<Void>builder()
                .build();
    }
    @PostMapping("/sepay")
    public ApiResponse<Void> processSepayWebhook(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestBody SepayWebhookRequest request) {

        log.info("=== Received SePay webhook ===");
        log.info("Code: {}, Content: {}, Description: {}", request.getCode(), request.getContent(), request.getDescription());
        log.info("Amount: {}, TransferAmount: {}", request.getAmount(), request.getTransferAmount());

        // Verify SePay authorization token
        if (sepayToken != null && !sepayToken.isEmpty()) {
            String expectedAuth = "Apikey " + sepayToken;
            if (authorizationHeader == null || !authorizationHeader.equals(expectedAuth)) {
                throw new RuntimeException("Unauthorized SePay webhook request");
            }
        }

        // ✅ FIX: Kiểm tra theo thứ tự: code → transactionContent → content → description
        String description = request.getCode();
        if (description == null || description.isEmpty()) {
            description = request.getTransactionContent();
        }
        if (description == null || description.isEmpty()) {
            description = request.getContent();
        }
        if (description == null || description.isEmpty()) {
            description = request.getDescription();
        }

        log.info("Final description to process: {}", description);

        // Parse date
        Instant txDate = null;
        if (request.getTransactionDate() != null && !request.getTransactionDate().isEmpty()) {
            try {
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
                LocalDateTime localDateTime = LocalDateTime.parse(request.getTransactionDate(), formatter);
                txDate = localDateTime.atZone(ZoneId.systemDefault()).toInstant();
            } catch (Exception e) {
                log.warn("Failed to parse transaction date, using current time", e);
                txDate = Instant.now();
            }
        } else {
            txDate = Instant.now();
        }

        // ✅ FIX: Chọn amount từ transferAmount trước, nếu null thì dùng amount
        Double finalAmount = request.getTransferAmount();
        if (finalAmount == null || finalAmount == 0) {
            finalAmount = request.getAmount();
        }

        log.info("Final amount to process: {}", finalAmount);

        WebhookPaymentRequest internalRequest = WebhookPaymentRequest.builder()
                .transactionId(request.getId() != null ? request.getId().toString() : request.getReferenceNumber())
                .amount(finalAmount)
                .description(description)
                .bankCode(request.getGateway())
                .transactionDate(txDate)
                .build();

        log.info("Calling paymentService.processWebhook with: {}", internalRequest);
        paymentService.processWebhook(internalRequest);

        return ApiResponse.<Void>builder()
                .build();
    }
}
