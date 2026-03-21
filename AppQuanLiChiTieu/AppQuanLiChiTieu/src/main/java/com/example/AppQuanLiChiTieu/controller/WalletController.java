package com.example.AppQuanLiChiTieu.controller;

import com.example.AppQuanLiChiTieu.dto.response.ApiResponse;
import com.example.AppQuanLiChiTieu.dto.response.WalletResponse;
import com.example.AppQuanLiChiTieu.service.WalletService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import com.example.AppQuanLiChiTieu.dto.request.WalletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/wallets")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class WalletController {

    WalletService walletService;

    @GetMapping
    public ApiResponse<List<WalletResponse>> getMyWallets() {
        return ApiResponse.<List<WalletResponse>>builder()
                .result(walletService.getMyWallets())
                .build();
    }

    @PostMapping
    public ApiResponse<WalletResponse> createWallet(@RequestBody @Valid WalletRequest request) {
        return ApiResponse.<WalletResponse>builder()
                .result(walletService.createWallet(request))
                .build();
    }

    @PutMapping("/{id}")
    public ApiResponse<WalletResponse> updateWallet(@PathVariable Integer id, @RequestBody @Valid WalletRequest request) {
        return ApiResponse.<WalletResponse>builder()
                .result(walletService.updateWallet(id, request))
                .build();
    }

    @DeleteMapping("/{id}")
    public ApiResponse<String> deleteWallet(@PathVariable Integer id) {
        walletService.deleteWallet(id);
        return ApiResponse.<String>builder()
                .result("Lưu trữ ví thành công")
                .build();
    }
}
