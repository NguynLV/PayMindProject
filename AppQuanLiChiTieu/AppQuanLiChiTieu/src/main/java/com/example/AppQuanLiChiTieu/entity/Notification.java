package com.example.AppQuanLiChiTieu.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.Nationalized;

import java.time.Instant;

@Getter
@Setter
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "Notifications")
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "NotificationId", nullable = false)
    private Integer id;

    @jakarta.validation.constraints.Size(max = 255)
    @jakarta.persistence.Column(name = "OwnerEmail")
    private String ownerEmail;



    @Size(max = 200)
    @NotNull
    @Nationalized
    @Column(name = "Title", nullable = false, length = 200)
    private String title;

    @NotNull
    @Nationalized
    @Column(name = "Content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Size(max = 50)
    @NotNull
    @Column(name = "Type", nullable = false, length = 50)
    private String type; // BUDGET_ALERT, REMINDER, etc.

    @NotNull
    @Builder.Default
    @ColumnDefault("false")
    @Column(name = "IsRead", nullable = false)
    private Boolean isRead = false;

    @NotNull
    @Builder.Default
    @ColumnDefault("CURRENT_TIMESTAMP")
    @Column(name = "CreatedAt", nullable = false)
    private Instant createdAt = Instant.now();
}

