package com.example.AppQuanLiChiTieu.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class NotificationResponse {
    Integer id;
    String title;
    String content;
    String type;
    Boolean isRead;
    Instant createdAt;
}
