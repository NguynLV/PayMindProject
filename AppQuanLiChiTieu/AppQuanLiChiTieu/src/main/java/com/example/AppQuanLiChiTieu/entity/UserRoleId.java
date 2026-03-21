package com.example.AppQuanLiChiTieu.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.validation.constraints.NotNull;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;

@Getter
@Setter
@EqualsAndHashCode
@Embeddable
public class UserRoleId implements Serializable {
    private static final long serialVersionUID = -1527618112363441528L;
    @NotNull
    @Column(name = "UserId", nullable = false)
    private Integer userId;

    @NotNull
    @Column(name = "RoleId", nullable = false)
    private Integer roleId;


}