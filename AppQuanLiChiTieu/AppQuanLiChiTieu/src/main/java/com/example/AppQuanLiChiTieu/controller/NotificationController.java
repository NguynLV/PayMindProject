package com.example.AppQuanLiChiTieu.controller;

import com.example.AppQuanLiChiTieu.dto.response.ApiResponse;
import com.example.AppQuanLiChiTieu.dto.response.NotificationResponse;
import com.example.AppQuanLiChiTieu.service.NotificationService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class NotificationController {
    NotificationService notificationService;

    @GetMapping
    public ApiResponse<List<NotificationResponse>> getMyNotifications() {
        return ApiResponse.<List<NotificationResponse>>builder()
                .result(notificationService.getMyNotifications())
                .build();
    }

    @GetMapping("/{id}")
    public ApiResponse<NotificationResponse> getNotificationById(@PathVariable Integer id) {
        return ApiResponse.<NotificationResponse>builder()
                .result(notificationService.getNotificationById(id))
                .build();
    }

    @GetMapping("/unread-count")
    public ApiResponse<Long> getUnreadCount() {
        return ApiResponse.<Long>builder()
                .result(notificationService.getUnreadCount())
                .build();
    }

    @PostMapping("/{id}/read")
    public ApiResponse<Void> markAsRead(@PathVariable Integer id) {
        notificationService.markAsRead(id);
        return ApiResponse.<Void>builder().build();
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteNotification(@PathVariable Integer id) {
        notificationService.deleteNotification(id);
        return ApiResponse.<Void>builder().build();
    }
}
