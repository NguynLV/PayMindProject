package com.example.AppQuanLiChiTieu.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@JsonIgnoreProperties(ignoreUnknown = true)
public class SepayWebhookRequest {
    Long id;
    String gateway;

    @JsonProperty("transaction_date")
    String transactionDate;

    @JsonProperty("account_number")
    String accountNumber;

    @JsonProperty("sub_account")
    String subAccount;

    // Accept many variants that might carry the amount
    @JsonProperty("amount")
    @JsonAlias({ "amount", "transferAmount", "transfer_amount", "transferamount", "transfer_amt", "transferAmountVND" })
    Double amount;

    @JsonProperty("transfer_type")
    String transferType;

    // Keep a separate field if you prefer; accept aliases too
    @JsonProperty("transfer_amount")
    @JsonAlias({ "transfer_amount", "transferAmount", "transferamount", "transfer_amt" })
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