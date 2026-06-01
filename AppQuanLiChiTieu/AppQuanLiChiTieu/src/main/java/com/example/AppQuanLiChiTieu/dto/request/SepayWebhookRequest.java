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

    // ✅ IMPORTANT: Thêm @JsonProperty cho amount (MBBank gửi "amount" hoặc camelCase)
    @JsonProperty("amount")
    Double amount;

    @JsonProperty("transfer_type")
    String transferType;

    @JsonProperty("transfer_amount")
    Double transferAmount;

    Double accumulated;
    String code;

    @JsonProperty("transaction_content")
    String transactionContent;

    @JsonProperty("reference_number")
    String referenceNumber;

    // ✅ IMPORTANT: Thêm @JsonProperty cho content (MBBank gửi "content")
    @JsonProperty("content")
    String content;

    // ✅ IMPORTANT: Thêm @JsonProperty cho description (MBBank gửi "description")
    @JsonProperty("description")
    String description;

    String body;
}