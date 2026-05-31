package com.example.AppQuanLiChiTieu.controller;

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
import com.example.AppQuanLiChiTieu.dto.response.ApiResponse;
import com.example.AppQuanLiChiTieu.dto.response.AuthenticationResponse;
import com.example.AppQuanLiChiTieu.service.AuthenticationService;
import com.nimbusds.jose.JOSEException;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import java.text.ParseException;
import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AuthenticationController {
    AuthenticationService authenticationService;

    @PostMapping("/register")
    void register(@Valid @org.springframework.web.bind.annotation.ModelAttribute RegisterRequest request){
        authenticationService.register(request);
    }

    @PostMapping("/check-email")
    ApiResponse<Boolean> checkEmail(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        boolean exists = authenticationService.checkEmailExists(email);
        return ApiResponse.<Boolean>builder().result(exists).build();
    }

    @PostMapping("/resend-otp")
    void resendOtp(@RequestParam String email) {
        authenticationService.resendOtp(email);
    }

    @PostMapping("/verify")
    ApiResponse<AuthenticationResponse> verify(@Valid @RequestBody VerifyOtpRequest request){
        return ApiResponse.<AuthenticationResponse>builder().result(authenticationService.verifyOtp(request)).build();
    }

    @PostMapping("/token")
    ApiResponse<AuthenticationResponse> authenticate(@Valid @RequestBody AuthenticationRequest request){
        return ApiResponse.<AuthenticationResponse>builder().result(authenticationService.authenticate(request)).build();
    }

    @PostMapping("/introspect")
    ApiResponse<IntrospectResponse> introspect(@RequestBody IntrospectRequest request)
            throws ParseException, JOSEException {
        return ApiResponse.<IntrospectResponse>builder().result(authenticationService.introspect(request)).build();
    }

    @PostMapping("/logout")
    void logout(@RequestBody LogoutRequest request) throws ParseException, JOSEException {
        authenticationService.logout(request);
    }

    @PostMapping("/refresh")
    ApiResponse<AuthenticationResponse> refresh(@RequestBody RefreshRequest request) throws ParseException, JOSEException {
        return ApiResponse.<AuthenticationResponse>builder().result(authenticationService.refreshToken(request)).build();
    }

    @PostMapping("/google")
    ApiResponse<AuthenticationResponse> loginWithGoogle(@RequestBody GoogleLoginRequest request) {
        return ApiResponse.<AuthenticationResponse>builder().result(authenticationService.loginWithGoogle(request)).build();
    }

    @PostMapping("/verify-reset-otp")
    void verifyResetOtp(@Valid @RequestBody VerifyOtpRequest request) {
        authenticationService.verifyResetOtp(request);
    }

    @PostMapping("/forgot-password")
    void forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authenticationService.forgotPassword(request);
    }

    @PostMapping("/reset-password")
    void resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authenticationService.resetPassword(request);
    }
}
