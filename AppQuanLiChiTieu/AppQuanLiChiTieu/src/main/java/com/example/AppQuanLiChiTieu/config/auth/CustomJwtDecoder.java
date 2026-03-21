package com.example.AppQuanLiChiTieu.config.auth;

import com.example.AppQuanLiChiTieu.dto.request.IntrospectRequest;
import com.example.AppQuanLiChiTieu.dto.response.IntrospectResponse;
import com.example.AppQuanLiChiTieu.service.AuthenticationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

import javax.crypto.spec.SecretKeySpec;

import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;

@Component
public class CustomJwtDecoder implements JwtDecoder {
    @Value("${jwt.signerKey}")
    private String signerKey;

    private final AuthenticationService authenticationService;

    private NimbusJwtDecoder jwtDecoder;

    @Autowired
    public CustomJwtDecoder(AuthenticationService authenticationService) {
        this.authenticationService = authenticationService;
    }

    public Jwt decode(String token) {
        IntrospectResponse response;
        try {
            response = authenticationService.introspect(
                    IntrospectRequest.builder().token(token).build());
        } catch (Exception e) {
            // General exception catch to handle Redis failures inside introspect
            throw new JwtException("Authentication service error: " + e.getMessage());
        }

        if (!response.isValid()) {
            throw new org.springframework.security.oauth2.jwt.JwtException("Invalid JWT");
        }

        if (jwtDecoder == null) {
            SecretKeySpec secretKeySpec =
                    new SecretKeySpec(signerKey.getBytes(), "HmacSHA512");
            jwtDecoder = NimbusJwtDecoder
                    .withSecretKey(secretKeySpec)
                    .macAlgorithm(MacAlgorithm.HS512)
                    .build();
        }

        return jwtDecoder.decode(token);
    }
}
