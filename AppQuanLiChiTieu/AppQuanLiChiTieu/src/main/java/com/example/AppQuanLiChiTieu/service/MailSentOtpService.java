package com.example.AppQuanLiChiTieu.service;

import com.example.AppQuanLiChiTieu.dto.request.EmailRequest.EmailRequest;
import com.example.AppQuanLiChiTieu.dto.request.EmailRequest.Recipient;
import com.example.AppQuanLiChiTieu.dto.request.EmailRequest.Sender;
import com.example.AppQuanLiChiTieu.exception.AppException;
import com.example.AppQuanLiChiTieu.exception.ErrorCode;
import com.example.AppQuanLiChiTieu.utils.EmailClient;
import com.example.AppQuanLiChiTieu.utils.SendNewUserCreate;
import feign.FeignException;
import lombok.AccessLevel;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MailSentOtpService {

   EmailClient emailClient;
   String apiKey;

   private static final String SENDER_EMAIL = "iphone0868369069@gmail.com";
   private static final String SENDER_NAME = "QuanLiChiTieu";

   public MailSentOtpService(EmailClient emailClients,
                            @Value("${brevo.api.key}") String apiKey) {
      this.emailClient = emailClients;
      this.apiKey = apiKey;
   }


   public void sendEmailCreateAccount(String toEmail, String toName, String username, String password) {
      String content = SendNewUserCreate.sendNewUserCreate(username, password);

      Sender sender = Sender.builder()
              .email(SENDER_EMAIL)
              .name(SENDER_NAME)
              .build();

      Recipient recipient = Recipient.builder()
              .email(toEmail)
              .name(toName)
              .build();

      EmailRequest emailRequest = EmailRequest.builder()
              .sender(sender)
              .htmlContent(content)
              .to(List.of(recipient))
              .subject("Welcome! Your account information")
              .build();

      try {
         emailClient.sendEmail(apiKey, emailRequest);
      } catch (FeignException e) {
         throw new AppException(ErrorCode.CANNOT_SEND_EMAIL);
      }
   }

    public void sendOtp(String toEmail, String toName, String otpCode) {
        String content = com.example.AppQuanLiChiTieu.utils.BuildOtpEmail.buildOtpEmailHtml(toName, otpCode);

        Sender sender = Sender.builder()
                .email(SENDER_EMAIL)
                .name(SENDER_NAME)
                .build();

        Recipient recipient = Recipient.builder()
                .email(toEmail)
                .name(toName)
                .build();

        EmailRequest emailRequest = EmailRequest.builder()
                .sender(sender)
                .htmlContent(content)
                .to(List.of(recipient))
                .subject("[QuanLiChiTieu] Mã xác minh OTP của bạn")
                .build();

        try {
            emailClient.sendEmail(apiKey, emailRequest);
        } catch (FeignException e) {
            throw new AppException(ErrorCode.CANNOT_SEND_EMAIL);
        }
    }

    public void sendForgotPasswordOtp(String toEmail, String toName, String otpCode) {
        String content = com.example.AppQuanLiChiTieu.utils.BuildOtpEmail.buildForgotPasswordEmailHtml(toName, otpCode);

        Sender sender = Sender.builder()
                .email(SENDER_EMAIL)
                .name(SENDER_NAME)
                .build();

        Recipient recipient = Recipient.builder()
                .email(toEmail)
                .name(toName)
                .build();

        EmailRequest emailRequest = EmailRequest.builder()
                .sender(sender)
                .htmlContent(content)
                .to(List.of(recipient))
                .subject("[QuanLiChiTieu] Đặt lại mật khẩu của bạn")
                .build();

        try {
            emailClient.sendEmail(apiKey, emailRequest);
        } catch (FeignException e) {
            throw new AppException(ErrorCode.CANNOT_SEND_EMAIL);
        }
    }

}
