package com.example.AppQuanLiChiTieu.controller;

import com.example.AppQuanLiChiTieu.dto.request.TransactionRequest;
import com.example.AppQuanLiChiTieu.dto.response.ApiResponse;
import com.example.AppQuanLiChiTieu.dto.response.TransactionResponse;
import com.example.AppQuanLiChiTieu.service.TransactionService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/transactions")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TransactionController {

    TransactionService transactionService;

    @GetMapping
    public ApiResponse<List<TransactionResponse>> getMyTransactions() {
        return ApiResponse.<List<TransactionResponse>>builder()
                .result(transactionService.getMyTransactions())
                .build();
    }

    @PostMapping
    public ApiResponse<TransactionResponse> createTransaction(
            @RequestBody @Valid TransactionRequest request) {
        return ApiResponse.<TransactionResponse>builder()
                .result(transactionService.createTransaction(request))
                .build();
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportTransactions() {
        byte[] excelContent = transactionService.exportTransactionsToExcel();
        
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=GiaoDich.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(excelContent);
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteTransaction(@PathVariable Integer id) {
        transactionService.deleteTransaction(id);
        return ApiResponse.<Void>builder()
                .message("Xóa giao dịch thành công")
                .build();
    }
}
