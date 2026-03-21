package com.example.AppQuanLiChiTieu.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.redis.core.RedisHash;
import org.springframework.data.redis.core.TimeToLive;

import java.util.concurrent.TimeUnit;

@Getter
@Setter
@RedisHash("redis_otp")
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class RedisOtp {
    @Id
    private String email;

    private String otpCode;

    @TimeToLive(unit = TimeUnit.SECONDS)
    @Builder.Default
    private Long expiredTime = 300L; // 5 minutes
}
