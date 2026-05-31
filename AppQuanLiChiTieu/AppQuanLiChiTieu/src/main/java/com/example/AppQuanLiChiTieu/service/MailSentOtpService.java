package com.example.AppQuanLiChiTieu.service;

import com.example.AppQuanLiChiTieu.dto.request.EmailRequest.EmailRequest;
import com.example.AppQuanLiChiTieu.dto.request.EmailRequest.Recipient;
import com.example.AppQuanLiChiTieu.dto.request.EmailRequest.Sender;
import com.example.AppQuanLiChiTieu.utils.EmailClient;
import com.example.AppQuanLiChiTieu.utils.SendNewUserCreate;
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
   String senderEmail;
   String senderName;

   public MailSentOtpService(EmailClient emailClients,
                            @Value("${brevo.api.key}") String apiKey,
                            @Value("${brevo.sender.email:iphone0868369069@gmail.com}") String senderEmail,
                            @Value("${brevo.sender.name:QuanLiChiTieu}") String senderName) {
      this.emailClient = emailClients;
      this.apiKey = apiKey;
      this.senderEmail = senderEmail;
      this.senderName = senderName;
   }

   public void sendEmailCreateAccount(String toEmail, String toName, String username, String password) {
      String content = SendNewUserCreate.sendNewUserCreate(username, password);

      Sender sender = Sender.builder()
              .email(senderEmail)
              .name(senderName)
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
         if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new IllegalArgumentException("Brevo API key is empty");
         }
         emailClient.sendEmail(apiKey, emailRequest);
         log.info("Email sent successfully to {}", toEmail);
      } catch (Exception e) {
         log.warn("Failed to send email to {} via Brevo API: {}. Printing credentials to console log.", toEmail, e.getMessage());
         log.info("\n==================================================\n" +
                  "            ACCOUNT CREDENTIALS (LOG)            \n" +
                  "Username: {}\n" +
                  "Password: {}\n" +
                  "==================================================", username, password);
      }
   }

    public void sendOtp(String toEmail, String toName, String otpCode) {
        String content = com.example.AppQuanLiChiTieu.utils.BuildOtpEmail.buildOtpEmailHtml(toName, otpCode);

        Sender sender = Sender.builder()
                .email(senderEmail)
                .name(senderName)
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
            if (apiKey == null || apiKey.trim().isEmpty()) {
               throw new IllegalArgumentException("Brevo API key is empty");
            }
            emailClient.sendEmail(apiKey, emailRequest);
            log.info("OTP email sent successfully to {}", toEmail);
        } catch (Exception e) {
            log.warn("Failed to send OTP email to {} via Brevo: {}. Printing OTP to console log.", toEmail, e.getMessage());
            log.info("\n==================================================\n" +
                     "               OTP CODE FOR TESTING              \n" +
                     "Recipient: {}\n" +
                     "OTP Code: {}\n" +
                     "==================================================", toEmail, otpCode);
        }
    }

    public void sendForgotPasswordOtp(String toEmail, String toName, String otpCode) {
        String content = com.example.AppQuanLiChiTieu.utils.BuildOtpEmail.buildForgotPasswordEmailHtml(toName, otpCode);

        Sender sender = Sender.builder()
                .email(senderEmail)
                .name(senderName)
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
            if (apiKey == null || apiKey.trim().isEmpty()) {
               throw new IllegalArgumentException("Brevo API key is empty");
            }
            emailClient.sendEmail(apiKey, emailRequest);
            log.info("Forgot Password OTP email sent successfully to {}", toEmail);
        } catch (Exception e) {
            log.warn("Failed to send Forgot Password OTP email to {} via Brevo: {}. Printing OTP to console log.", toEmail, e.getMessage());
            log.info("\n==================================================\n" +
                     "         FORGOT PASSWORD OTP CODE (LOG)          \n" +
                     "Recipient: {}\n" +
                     "OTP Code: {}\n" +
                     "==================================================", toEmail, otpCode);
        }
    }
}
