package com.example.AppQuanLiChiTieu.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    UNCATEGORIZED_EXCEPTION(9999, "Lỗi không xác định", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_KEY(1001, "Khóa không hợp lệ", HttpStatus.BAD_REQUEST),
    UNAUTHORIZED(1007, "Bạn không có quyền truy cập", HttpStatus.FORBIDDEN),
    USER_NOT_EXISTED(1005, "Người dùng không tồn tại", HttpStatus.NOT_FOUND),
    UNAUTHENTICATED(1006, "Chưa xác thực", HttpStatus.UNAUTHORIZED),
    CANNOT_SEND_EMAIL(1008, "Không thể gửi email", HttpStatus.BAD_REQUEST),
    USER_EXISTED(1002, "Người dùng đã tồn tại", HttpStatus.BAD_REQUEST),
    OTP_INVALID(1009, "Mã OTP không hợp lệ", HttpStatus.BAD_REQUEST),
    INVALID_PASSWORD(1004, "Mật khẩu không đúng", HttpStatus.BAD_REQUEST),
    PASSWORD_MISMATCH(1010, "Mật khẩu không khớp", HttpStatus.BAD_REQUEST),
    TRANSACTION_NOT_EXISTED(1011, "Giao dịch không tồn tại", HttpStatus.NOT_FOUND),
    PREMIUM_REQUIRED(1012, "Chức năng Premium! Nâng cấp ngay nha homie.", HttpStatus.FORBIDDEN),
    WALLET_NAME_EXISTED(1013, "Tên ví đã tồn tại", HttpStatus.BAD_REQUEST),
    ;


    private final int code;
    private final String message;
    private final HttpStatus statusCode;

    ErrorCode(int code, String message, HttpStatus statusCode) {
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
    }
}
