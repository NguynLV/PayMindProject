package com.example.AppQuanLiChiTieu.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GeminiRequest {
    List<Content> contents;
    
    @JsonProperty("generation_config")
    GenerationConfig generationConfig;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class Content {
        List<Part> parts;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class Part {
        String text;
        
        @JsonProperty("inline_data")
        InlineData inlineData;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class InlineData {
        @JsonProperty("mime_type")
        String mimeType;
        
        String data;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class GenerationConfig {
        Double temperature;
        
        @JsonProperty("top_k")
        Integer topK;
        
        @JsonProperty("top_p")
        Double topP;
        
        @JsonProperty("max_output_tokens")
        Integer maxOutputTokens;
        
        // Commented out as it causes 400 Bad Request on stable v1 endpoint
        // @JsonProperty("response_mime_type")
        // String responseMimeType;
    }
}
