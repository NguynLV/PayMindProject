package com.example.AppQuanLiChiTieu.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class WebhookPaymentRequest {
    String transactionId;
    Double amount;
    String description;
    String bankCode;
    Instant transactionDate;
}
