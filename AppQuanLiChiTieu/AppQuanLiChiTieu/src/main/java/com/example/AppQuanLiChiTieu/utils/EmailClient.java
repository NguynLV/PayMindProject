package com.example.AppQuanLiChiTieu.utils;



import com.example.AppQuanLiChiTieu.dto.request.EmailRequest.EmailRequest;
import com.example.AppQuanLiChiTieu.dto.response.EmailResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;


@FeignClient(name = "email-client", url = "https://api.brevo.com")
public interface EmailClient {
    @PostMapping(
            value = "/v3/smtp/email",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    EmailResponse sendEmail(@RequestHeader("api-key") String apiKey,
                            @RequestBody EmailRequest body);
}
