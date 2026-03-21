package com.example.AppQuanLiChiTieu.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ReportInsightRequest {
    Map<String, Object> reportData;
    int month;
    int year;
}
