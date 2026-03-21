package com.example.AppQuanLiChiTieu.utils;

import com.example.AppQuanLiChiTieu.dto.request.GeminiRequest;
import com.example.AppQuanLiChiTieu.dto.response.GeminiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.Map;

@FeignClient(name = "gemini-client", url = "${gemini.api.url:https://generativelanguage.googleapis.com}")
public interface GeminiClient {
    @PostMapping(
            value = "/{apiVersion}/models/{model}:generateContent",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    GeminiResponse generateContent(
            @PathVariable("apiVersion") String apiVersion,
            @PathVariable("model") String model,
            @RequestParam("key") String apiKey,
            @RequestBody GeminiRequest request
    );

    @org.springframework.web.bind.annotation.GetMapping(value = "/v1beta/models")
    Map<String, Object> listModels(@RequestParam("key") String apiKey);
}
