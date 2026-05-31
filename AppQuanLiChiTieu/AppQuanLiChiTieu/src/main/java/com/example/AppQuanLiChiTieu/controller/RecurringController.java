package com.example.AppQuanLiChiTieu.controller;

import com.example.AppQuanLiChiTieu.dto.request.RecurringTransactionRequest;
import com.example.AppQuanLiChiTieu.dto.response.ApiResponse;
import com.example.AppQuanLiChiTieu.dto.response.RecurringTransactionResponse;
import com.example.AppQuanLiChiTieu.service.RecurringService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/recurring")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RecurringController {

    RecurringService recurringService;

    @GetMapping
    public ApiResponse<List<RecurringTransactionResponse>> getAll() {
        return ApiResponse.<List<RecurringTransactionResponse>>builder()
                .result(recurringService.getMyRecurringTransactions())
                .build();
    }

    @GetMapping("/{id}")
    public ApiResponse<RecurringTransactionResponse> getById(@PathVariable Integer id) {
        return ApiResponse.<RecurringTransactionResponse>builder()
                .result(recurringService.getRecurringTransactionById(id))
                .build();
    }

    @PostMapping
    public ApiResponse<RecurringTransactionResponse> create(@RequestBody RecurringTransactionRequest request) {
        return ApiResponse.<RecurringTransactionResponse>builder()
                .result(recurringService.createRecurringTransaction(request))
                .build();
    }

    @PutMapping("/{id}")
    public ApiResponse<RecurringTransactionResponse> update(
            @PathVariable Integer id,
            @RequestBody RecurringTransactionRequest request) {
        return ApiResponse.<RecurringTransactionResponse>builder()
                .result(recurringService.updateRecurringTransaction(id, request))
                .build();
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Integer id) {
        recurringService.deleteRecurringTransaction(id);
        return ApiResponse.<Void>builder()
                .message("Đã xóa giao dịch định kỳ thành công")
                .build();
    }

    @PostMapping("/{id}/trigger")
    public ApiResponse<RecurringTransactionResponse> trigger(@PathVariable Integer id) {
        return ApiResponse.<RecurringTransactionResponse>builder()
                .result(recurringService.triggerRecurringTransaction(id))
                .build();
    }
}
