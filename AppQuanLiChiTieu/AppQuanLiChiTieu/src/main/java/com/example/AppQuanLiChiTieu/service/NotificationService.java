package com.example.AppQuanLiChiTieu.service;

import com.example.AppQuanLiChiTieu.dto.response.NotificationResponse;
import com.example.AppQuanLiChiTieu.entity.Notification;
import com.example.AppQuanLiChiTieu.repository.NotificationRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class NotificationService {
    NotificationRepository notificationRepository;

    public List<NotificationResponse> getMyNotifications() {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        return notificationRepository.findByOwnerEmailOrderByCreatedAtDesc(currentUserEmail).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public long getUnreadCount() {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        return notificationRepository.countByOwnerEmailAndIsReadFalse(currentUserEmail);
    }

    @Transactional
    public void markAsRead(Integer id) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        Notification notification = notificationRepository.findByIdAndOwnerEmail(id, currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        notification.setIsRead(true);
        notificationRepository.save(notification);
    }

    @Transactional
    public void createNotification(String title, String content, String type) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        createNotificationForUser(title, content, type, currentUserEmail);
    }

    @Transactional
    public void createNotificationForUser(String title, String content, String type, String ownerEmail) {
        Notification notification = Notification.builder()
                .title(title)
                .content(content)
                .type(type)
                .isRead(false)
                .createdAt(Instant.now())
                .ownerEmail(ownerEmail)
                .build();
        notificationRepository.save(notification);
    }

    @Transactional
    public void deleteNotification(Integer id) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        Notification notification = notificationRepository.findByIdAndOwnerEmail(id, currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        notificationRepository.delete(notification);
    }

    public NotificationResponse getNotificationById(Integer id) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        Notification notification = notificationRepository.findByIdAndOwnerEmail(id, currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        return toResponse(notification);
    }

    private NotificationResponse toResponse(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .title(n.getTitle())
                .content(n.getContent())
                .type(n.getType())
                .isRead(n.getIsRead())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
