package com.example.AppQuanLiChiTieu.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.Nationalized;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "AuditLogs")
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "LogId", nullable = false)
    private Long id;


    @Size(max = 100)
    @NotNull
    @Nationalized
    @Column(name = "\"Action\"", nullable = false, length = 100)
    private String action;

    @Size(max = 20)
    @NotNull
    @Nationalized
    @ColumnDefault("'Info'")
    @Column(name = "LogLevel", nullable = false, length = 20)
    private String logLevel;

    @Size(max = 50)
    @Nationalized
    @Column(name = "EntityType", length = 50)
    private String entityType;

    @Column(name = "EntityId")
    private Integer entityId;

    @Nationalized
    @Lob
    @Column(name = "Details")
    private String details;

    @Size(max = 50)
    @Nationalized
    @Column(name = "IpAddress", length = 50)
    private String ipAddress;

    @NotNull
    @ColumnDefault("getdate()")
    @Column(name = "CreatedAt", nullable = false)
    private Instant createdAt;


}
