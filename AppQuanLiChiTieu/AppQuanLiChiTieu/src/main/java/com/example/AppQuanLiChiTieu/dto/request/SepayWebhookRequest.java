package com.example.AppQuanLiChiTieu.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
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

    @JsonProperty("transaction_date")
    String transactionDate;

    @JsonProperty("account_number")
    String accountNumber;

    @JsonProperty("sub_account")
    String subAccount;

    // ✅ Map "amount" field
    @JsonProperty("amount")
    Double amount;

    @JsonProperty("transfer_type")
    String transferType;

    // ✅ Map "transfer_amount" field
    @JsonProperty("transfer_amount")
    Double transferAmount;

    Double accumulated;
    String code;

    @JsonProperty("transaction_content")
    String transactionContent;

    @JsonProperty("reference_number")
    String referenceNumber;

    @JsonProperty("content")
    String content;

    @JsonProperty("description")
    String description;

    String body;
}