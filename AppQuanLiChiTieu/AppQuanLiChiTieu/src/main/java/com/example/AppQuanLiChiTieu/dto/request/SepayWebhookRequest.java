package com.example.AppQuanLiChiTieu.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SepayWebhookRequest {
    Long id;
    String gateway;
    String transactionDate;
    String accountNumber;
    String subAccount;
    Double amount;
    String transferType;
    Double transferAmount;
    Double accumulated;
    String code;
    String transactionContent;
    String referenceNumber;
    String body;
}
