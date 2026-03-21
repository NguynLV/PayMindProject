package com.example.AppQuanLiChiTieu.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.redis.core.RedisHash;
import org.springframework.data.redis.core.TimeToLive;

import java.util.concurrent.TimeUnit;

@Getter
@Setter
@RedisHash("redis_token")
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class RedisToken {

    @Id
    private String jwtID;

    @TimeToLive(unit = TimeUnit.SECONDS)
    @Builder.Default
    private Long expiredTime = 3600L;
}
