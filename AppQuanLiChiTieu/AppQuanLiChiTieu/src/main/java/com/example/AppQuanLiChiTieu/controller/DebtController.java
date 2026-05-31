package com.example.AppQuanLiChiTieu.controller;

import com.example.AppQuanLiChiTieu.dto.request.DebtRequest;
import com.example.AppQuanLiChiTieu.dto.response.ApiResponse;
import com.example.AppQuanLiChiTieu.dto.response.DebtResponse;
import com.example.AppQuanLiChiTieu.service.DebtService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/debts")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DebtController {

    DebtService debtService;

    @GetMapping
    public ApiResponse<List<DebtResponse>> getAll() {
        return ApiResponse.<List<DebtResponse>>builder()
                .result(debtService.getMyDebts())
                .build();
    }

    @GetMapping("/{id}")
    public ApiResponse<DebtResponse> getById(@PathVariable Integer id) {
        return ApiResponse.<DebtResponse>builder()
                .result(debtService.getDebtById(id))
                .build();
    }

    @PostMapping
    public ApiResponse<DebtResponse> create(@RequestBody DebtRequest request) {
        return ApiResponse.<DebtResponse>builder()
                .result(debtService.createDebt(request))
                .build();
    }

    @PutMapping("/{id}")
    public ApiResponse<DebtResponse> update(@PathVariable Integer id, @RequestBody DebtRequest request) {
        return ApiResponse.<DebtResponse>builder()
                .result(debtService.updateDebt(id, request))
                .build();
    }

    @PutMapping("/{id}/status")
    public ApiResponse<DebtResponse> updateStatus(@PathVariable Integer id, @RequestParam String status) {
        return ApiResponse.<DebtResponse>builder()
                .result(debtService.updateStatus(id, status))
                .build();
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Integer id) {
        debtService.deleteDebt(id);
        return ApiResponse.<Void>builder()
                .message("Đã xóa khoản nợ thành công")
                .build();
    }
}
