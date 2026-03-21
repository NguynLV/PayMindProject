package com.example.AppQuanLiChiTieu.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CategoryRequest {
    @NotBlank(message = "Tên danh mục không được để trống")
    String name;

    @NotBlank(message = "Icon không được để trống")
    String icon;

    @NotBlank(message = "Màu sắc không được để trống")
    String color;

    @NotBlank(message = "Loại giao dịch không được để trống (INCOME/EXPENSE)")
    String type;

    Boolean isMain;
}
