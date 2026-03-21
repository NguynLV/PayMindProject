//package com.example.AppQuanLiChiTieu.service;
//
//import com.example.AppQuanLiChiTieu.dto.request.RegisterRequest;
//import com.example.AppQuanLiChiTieu.dto.request.VerifyOtpRequest;
//import com.example.AppQuanLiChiTieu.dto.response.AuthenticationResponse;
//import com.example.AppQuanLiChiTieu.entity.RedisOtp;
//import com.example.AppQuanLiChiTieu.entity.User;
//import com.example.AppQuanLiChiTieu.exception.AppException;
//import com.example.AppQuanLiChiTieu.exception.ErrorCode;
//import com.example.AppQuanLiChiTieu.repository.RedisOtpRepository;
//import com.example.AppQuanLiChiTieu.repository.RedisReopository;
//import com.example.AppQuanLiChiTieu.repository.UserRepository;
//
//import java.time.Instant;
//
//public class RegisterAccountService {
//    UserRepository userRepository;
//    RedisOtpRepository redisOtpRepository;
//    MailSentOtpService mailSentOtpService;
//    AuthenticationService authenticationService;
//
//    public void register(RegisterRequest request) {
//        if (userRepository.existsByEmail(request.getEmail()))
//            throw new AppException(ErrorCode.USER_EXISTED);
//
//        User user = new User();
//        user.setEmail(request.getEmail());
//        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
//        user.setFirstName(request.getFirstName());
//        user.setLastName(request.getLastName());
//        user.setBirthday(request.getBirthday());
//        user.setIsActive(false);
//        user.setCreatedAt(Instant.now());
//
//        userRepository.save(user);
//
//        String otp = String.valueOf((int) (Math.random() * 900000) + 100000);
//
//        RedisOtp redisOtp = RedisOtp.builder()
//                .email(request.getEmail())
//                .otpCode(otp)
//                .build();
//        redisOtpRepository.save(redisOtp);
//
//        mailSentOtpService.sendOtp(request.getEmail(), request.getFirstName(), otp);
//    }
//
//    public AuthenticationResponse verifyOtp(VerifyOtpRequest request) {
//        RedisOtp redisOtp = redisOtpRepository.findById(request.getEmail())
//                .orElseThrow(() -> new AppException(ErrorCode.OTP_INVALID));
//
//        if (!redisOtp.getOtpCode().equals(request.getOtpCode()))
//            throw new AppException(ErrorCode.OTP_INVALID);
//
//        User user = userRepository.findByEmail(request.getEmail())
//                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
//
//        user.setIsActive(true);
//        userRepository.save(user);
//
//        redisOtpRepository.delete(redisOtp);
//
//        var token = authenticationService.generateToken(user);
//
//        return AuthenticationResponse.builder()
//                .token(token)
//                .authenticated(true)
//                .build();
//    }
//
//}
