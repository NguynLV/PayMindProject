package com.example.AppQuanLiChiTieu.dto.request.EmailRequest;

import jakarta.validation.Valid;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.antlr.v4.runtime.misc.NotNull;


@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SendEmailRequest {

    @Valid
    @NotNull
    Recipient to;

    String subject;

    String htmlContent;
}
