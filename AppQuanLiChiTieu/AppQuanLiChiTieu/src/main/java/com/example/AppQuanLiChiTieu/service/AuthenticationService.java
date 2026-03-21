package com.example.AppQuanLiChiTieu.service;

import com.example.AppQuanLiChiTieu.dto.request.AuthenticationRequest;
import com.example.AppQuanLiChiTieu.dto.request.ForgotPasswordRequest;
import com.example.AppQuanLiChiTieu.dto.request.GoogleLoginRequest;
import com.example.AppQuanLiChiTieu.dto.request.IntrospectRequest;
import com.example.AppQuanLiChiTieu.dto.request.LogoutRequest;
import com.example.AppQuanLiChiTieu.dto.request.RefreshRequest;
import com.example.AppQuanLiChiTieu.dto.request.RegisterRequest;
import com.example.AppQuanLiChiTieu.dto.request.ResetPasswordRequest;
import com.example.AppQuanLiChiTieu.dto.request.VerifyOtpRequest;
import com.example.AppQuanLiChiTieu.dto.response.IntrospectResponse;
import com.example.AppQuanLiChiTieu.dto.response.AuthenticationResponse;
import com.example.AppQuanLiChiTieu.entity.RedisOtp;
import com.example.AppQuanLiChiTieu.entity.RedisToken;
import com.example.AppQuanLiChiTieu.entity.User;
import com.example.AppQuanLiChiTieu.exception.AppException;
import com.example.AppQuanLiChiTieu.exception.ErrorCode;
import com.example.AppQuanLiChiTieu.repository.RedisOtpRepository;
import com.example.AppQuanLiChiTieu.repository.RedisRepository;
import com.example.AppQuanLiChiTieu.repository.UserRepository;
import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.text.ParseException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AuthenticationService {
    UserRepository userRepository;
    PasswordEncoder passwordEncoder;
    RedisRepository redisRepository;

    ////////////////
    RedisOtpRepository redisOtpRepository;
    MailSentOtpService mailSentOtpService;
    CloudinaryService cloudinaryService;

    public boolean checkEmailExists(String email) {
        return userRepository.existsByEmail(email);
    }

    public void register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail()))
            throw new AppException(ErrorCode.USER_EXISTED);

        if (request.getPassword() == null) {
            throw new AppException(ErrorCode.INVALID_PASSWORD);
        }
        if (request.getConfirmPassword() != null && !request.getPassword().equals(request.getConfirmPassword())) {
            throw new AppException(ErrorCode.PASSWORD_MISMATCH);
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setCurrency(request.getCurrency());
        user.setBirthday(request.getBirthday());
        user.setIsActive(false);
        user.setGender(request.getGender() != null ? request.getGender().name() : null);
        user.setPhone(request.getPhone());
        user.setCreatedAt(Instant.now());

        // Handle Avatar Upload
        if (request.getAvatar() != null && !request.getAvatar().isEmpty()) {
            try {
                String avatarUrl = cloudinaryService.uploadImage(request.getAvatar());
                user.setAvatarUrl(avatarUrl);
            } catch (java.io.IOException e) {
                throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
            }
        }

        userRepository.save(user);

        String otp = String.valueOf((int) (Math.random() * 900000) + 100000);

        RedisOtp redisOtp = RedisOtp.builder()
                .email(request.getEmail())
                .otpCode(otp)
                .build();
        redisOtpRepository.save(redisOtp);

        mailSentOtpService.sendOtp(request.getEmail(), request.getFirstName(), otp);

    }

    public void resendOtp(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        String otp = String.valueOf((int) (Math.random() * 900000) + 100000);

        RedisOtp redisOtp = RedisOtp.builder()
                .email(email)
                .otpCode(otp)
                .build();
        redisOtpRepository.save(redisOtp);

        if (!user.getIsActive()) {
            mailSentOtpService.sendOtp(email, user.getFirstName(), otp);
        } else {
            mailSentOtpService.sendForgotPasswordOtp(email, user.getFirstName(), otp);
        }
    }

    public AuthenticationResponse verifyOtp(VerifyOtpRequest request) {
        RedisOtp redisOtp = redisOtpRepository.findById(request.getEmail())
                .orElseThrow(() -> new AppException(ErrorCode.OTP_INVALID));

        if (!redisOtp.getOtpCode().equals(request.getOtpCode()))
            throw new AppException(ErrorCode.OTP_INVALID);

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        user.setIsActive(true);
        user.setLastLoginAt(Instant.now());
        userRepository.save(user);

        redisOtpRepository.delete(redisOtp);

        var token = generateToken(user);

        return AuthenticationResponse.builder()
                .token(token)
                .authenticated(true)
                .build();
    }
    ///////////

    @NonFinal
    @Value("${jwt.signerKey}")
    protected String SIGNER_KEY;

    @NonFinal
    @Value("${jwt.valid-duration}")
    protected long VALID_DURATION;

    @NonFinal
    @Value("${jwt.refreshable-duration}")
    protected long REFRESHABLE_DURATION;

    public IntrospectResponse introspect(IntrospectRequest request)
            throws JOSEException, ParseException {
        var token = request.getToken();
        boolean isValid = true;

        try {
            verifyToken(token, false);
        } catch (AppException e) {
            isValid = false;
        }

        return IntrospectResponse.builder()
                .valid(isValid)
                .build();
    }

    public AuthenticationResponse authenticate(AuthenticationRequest request){
        var user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        boolean authenticated = passwordEncoder.matches(request.getPassword(), user.getPasswordHash());

        if (!authenticated)
            throw new AppException(ErrorCode.UNAUTHENTICATED);

        user.setLastLoginAt(Instant.now());
        userRepository.save(user);

        var token = generateToken(user);

        return AuthenticationResponse.builder()
                .token(token)
                .authenticated(true)
                .build();
    }

    /** Google Sign-In: verify the idToken with Google, find-or-create user, return app JWT */
    @SuppressWarnings("unchecked")
    public AuthenticationResponse loginWithGoogle(GoogleLoginRequest request) {
        // 1. Verify idToken via Google tokeninfo endpoint
        String url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + request.getIdToken();
        RestTemplate restTemplate = new RestTemplate();
        Map<String, Object> googleInfo;
        try {
            googleInfo = restTemplate.getForObject(url, Map.class);
        } catch (Exception e) {
            log.error("Google token verification failed", e);
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        if (googleInfo == null || googleInfo.containsKey("error")) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        String email = (String) googleInfo.get("email");
        String firstName = (String) googleInfo.getOrDefault("given_name", "Google");
        String lastName  = (String) googleInfo.getOrDefault("family_name", "User");
        String avatarUrl = (String) googleInfo.getOrDefault("picture", null);

        if (email == null) throw new AppException(ErrorCode.UNAUTHENTICATED);

        // 2. Find existing user or auto-create one
        final boolean[] isNewUserWrapper = {false};
        User user = userRepository.findByEmail(email).orElseGet(() -> {
            isNewUserWrapper[0] = true;
            User newUser = new User();
            newUser.setEmail(email);
            // random placeholder password - user will never log in with password via Google
            newUser.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
            newUser.setFirstName(firstName);
            newUser.setLastName(lastName);
            newUser.setAvatarUrl(avatarUrl);
            newUser.setCurrency("VND");
            newUser.setIsActive(true);
            newUser.setCreatedAt(Instant.now());
            return userRepository.save(newUser);
        });

        boolean isNewUser = isNewUserWrapper[0];

        // Ensure user is active
        if (!user.getIsActive()) {
            user.setIsActive(true);
        }
        user.setLastLoginAt(Instant.now());
        // Update avatar if it changed
        if (avatarUrl != null && (user.getAvatarUrl() == null || !user.getAvatarUrl().equals(avatarUrl))) {
            user.setAvatarUrl(avatarUrl);
        }
        userRepository.save(user);

        // 3. Issue app JWT
        return AuthenticationResponse.builder()
                .token(generateToken(user))
                .authenticated(true)
                .isNewUser(isNewUser)
                .build();
    }

    private String generateToken(User user) {
        JWSHeader header = new JWSHeader(JWSAlgorithm.HS512);

        JWTClaimsSet jwtClaimsSet = new JWTClaimsSet.Builder()
                .subject(user.getEmail())
                .issuer("LeVinhNguyenDepTraiCodeGioi")
                .issueTime(new Date())
                .expirationTime(new Date(
                        Instant.now().plus(VALID_DURATION, ChronoUnit.SECONDS).toEpochMilli()
                ))
                .jwtID(UUID.randomUUID().toString())
                .claim("scope", buildScope(user))
                .build();

        Payload payload = new Payload(jwtClaimsSet.toJSONObject());

        JWSObject jwsObject = new JWSObject(header, payload);

        try {
            jwsObject.sign(new MACSigner(SIGNER_KEY.getBytes()));
            return jwsObject.serialize();
        } catch (JOSEException e) {
            log.error("Cannot create token", e);
            throw new RuntimeException(e);
        }
    }

    private SignedJWT verifyToken(String token, boolean isRefresh) throws JOSEException, ParseException {
        JWSVerifier verifier = new MACVerifier(SIGNER_KEY.getBytes());

        SignedJWT signedJWT = SignedJWT.parse(token);
        Date expiryTime = signedJWT.getJWTClaimsSet().getExpirationTime();
        Date issueTime = signedJWT.getJWTClaimsSet().getIssueTime();

        var verified = signedJWT.verify(verifier);

        if (!verified)
            throw new AppException(ErrorCode.UNAUTHENTICATED);

        if (isRefresh) {
            // For refresh, we allow expired tokens as long as they are within REFRESHABLE_DURATION
            if (issueTime.toInstant().plus(REFRESHABLE_DURATION, ChronoUnit.SECONDS).isBefore(Instant.now()))
                throw new AppException(ErrorCode.UNAUTHENTICATED);
        } else {
            // For normal requests, token must NOT be expired
            if (!expiryTime.after(new Date()))
                throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        String jwtID = signedJWT.getJWTClaimsSet().getJWTID();
        Objects.requireNonNull(jwtID , "JWT ID must not be null");
        try {
            if (redisRepository.existsById(jwtID)) {
                throw new AppException(ErrorCode.UNAUTHENTICATED);
            }
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("Redis connection error, skipping blacklist check: {}", e.getMessage());
        }

        return signedJWT;
    }

    public void logout(LogoutRequest request) throws ParseException, JOSEException {
        var signToken = verifyToken(request.getToken(), false);

        String jit = signToken.getJWTClaimsSet().getJWTID();
        Date expiryTime = signToken.getJWTClaimsSet().getExpirationTime();

        RedisToken redisToken = RedisToken.builder()
                .jwtID(jit)
                .expiredTime(expiryTime.getTime())
                .build();

        try {
            redisRepository.save(redisToken);
        } catch (Exception e) {
            log.error("Failed to save revoked token to Redis: {}", e.getMessage());
        }
    }

    public AuthenticationResponse refreshToken(RefreshRequest request) throws ParseException, JOSEException {
        var signedJWT = verifyToken(request.getToken(), true);

        var jit = signedJWT.getJWTClaimsSet().getJWTID();
        var expiryTime = signedJWT.getJWTClaimsSet().getExpirationTime();

        RedisToken redisToken = RedisToken.builder()
                .jwtID(jit)
                .expiredTime(expiryTime.getTime())
                .build();

        try {
            redisRepository.save(redisToken);
        } catch (Exception e) {
            log.error("Failed to save revoked token to Redis during refresh: {}", e.getMessage());
        }

        var email = signedJWT.getJWTClaimsSet().getSubject();

        var user = userRepository.findByEmail(email).orElseThrow(
                () -> new AppException(ErrorCode.UNAUTHENTICATED)
        );

        var token = generateToken(user);

        return AuthenticationResponse.builder()
                .token(token)
                .authenticated(true)
                .build();
    }

    public void verifyResetOtp(VerifyOtpRequest request) {
        RedisOtp redisOtp = redisOtpRepository.findById(request.getEmail())
                .orElseThrow(() -> new AppException(ErrorCode.OTP_INVALID));

        if (!redisOtp.getOtpCode().equals(request.getOtpCode())) {
            throw new AppException(ErrorCode.OTP_INVALID);
        }
    }

    public void forgotPassword(ForgotPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        String otp = String.valueOf((int) (Math.random() * 900000) + 100000);

        RedisOtp redisOtp = RedisOtp.builder()
                .email(request.getEmail())
                .otpCode(otp)
                .build();
        redisOtpRepository.save(redisOtp);

        mailSentOtpService.sendForgotPasswordOtp(request.getEmail(), user.getFirstName(), otp);
    }

    public void resetPassword(ResetPasswordRequest request) {
        if (request.getNewPassword() == null ||
                !request.getNewPassword().equals(request.getConfirmNewPassword())) {
            throw new AppException(ErrorCode.PASSWORD_MISMATCH);
        }

        RedisOtp redisOtp = redisOtpRepository.findById(request.getEmail())
                .orElseThrow(() -> new AppException(ErrorCode.OTP_INVALID));

        if (!redisOtp.getOtpCode().equals(request.getOtpCode())) {
            throw new AppException(ErrorCode.OTP_INVALID);
        }

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        redisOtpRepository.delete(redisOtp);
    }

    private String buildScope(User user) {
        StringJoiner stringJoiner = new StringJoiner(" ");
        // Add roles if any
        stringJoiner.add("ROLE_USER"); // Add a default role
        return stringJoiner.toString();
    }
}
