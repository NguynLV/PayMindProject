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
public class RolePermissionId implements Serializable {
    private static final long serialVersionUID = 7291193148420529127L;
    @NotNull
    @Column(name = "RoleId", nullable = false)
    private Integer roleId;

    @NotNull
    @Column(name = "PermissionId", nullable = false)
    private Integer permissionId;


}