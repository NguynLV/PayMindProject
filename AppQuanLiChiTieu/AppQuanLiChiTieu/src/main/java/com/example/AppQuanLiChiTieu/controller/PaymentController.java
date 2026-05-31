package com.example.AppQuanLiChiTieu.controller;

import com.example.AppQuanLiChiTieu.dto.request.SepayWebhookRequest;
import com.example.AppQuanLiChiTieu.dto.request.WebhookPaymentRequest;
import com.example.AppQuanLiChiTieu.dto.response.ApiResponse;
import com.example.AppQuanLiChiTieu.service.PaymentService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

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
        
        // Verify SePay authorization token
        if (sepayToken != null && !sepayToken.isEmpty()) {
            String expectedAuth = "Apikey " + sepayToken;
            if (authorizationHeader == null || !authorizationHeader.equals(expectedAuth)) {
                throw new RuntimeException("Unauthorized SePay webhook request");
            }
        }

        // Map SepayWebhookRequest to WebhookPaymentRequest
        String description = request.getCode();
        if (description == null || description.isEmpty()) {
            description = request.getTransactionContent();
        }

        // Parse date
        Instant txDate = null;
        if (request.getTransactionDate() != null && !request.getTransactionDate().isEmpty()) {
            try {
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
                LocalDateTime localDateTime = LocalDateTime.parse(request.getTransactionDate(), formatter);
                txDate = localDateTime.atZone(ZoneId.systemDefault()).toInstant();
            } catch (Exception e) {
                txDate = Instant.now();
            }
        } else {
            txDate = Instant.now();
        }

        WebhookPaymentRequest internalRequest = WebhookPaymentRequest.builder()
                .transactionId(request.getId() != null ? request.getId().toString() : request.getReferenceNumber())
                .amount(request.getTransferAmount() != null ? request.getTransferAmount() : request.getAmount())
                .description(description)
                .bankCode(request.getGateway())
                .transactionDate(txDate)
                .build();

        paymentService.processWebhook(internalRequest);

        return ApiResponse.<Void>builder()
                .build();
    }
}
