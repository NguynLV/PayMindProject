package com.example.AppQuanLiChiTieu.config;

import feign.Request;
import org.springframework.context.annotation.Bean;

import java.util.concurrent.TimeUnit;

public class GeminiFeignConfig {

    @Bean
    public Request.Options requestOptions() {
        return new Request.Options(
                10, TimeUnit.SECONDS,   // connectTimeout
                60, TimeUnit.SECONDS,   // readTimeout
                true                     // followRedirects
        );
    }
}
