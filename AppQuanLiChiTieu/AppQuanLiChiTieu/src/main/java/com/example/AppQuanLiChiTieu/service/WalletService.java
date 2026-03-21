package com.example.AppQuanLiChiTieu.service;

import com.example.AppQuanLiChiTieu.dto.response.WalletResponse;
import com.example.AppQuanLiChiTieu.dto.request.WalletRequest;
import com.example.AppQuanLiChiTieu.entity.Wallet;
import com.example.AppQuanLiChiTieu.entity.User;
import com.example.AppQuanLiChiTieu.exception.AppException;
import com.example.AppQuanLiChiTieu.exception.ErrorCode;
import com.example.AppQuanLiChiTieu.repository.UserRepository;
import com.example.AppQuanLiChiTieu.repository.WalletRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class WalletService {

    final WalletRepository walletRepository;
    final UserRepository userRepository;

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
    }

    public WalletResponse toWalletResponse(Wallet wallet) {
        return WalletResponse.builder()
                .id(wallet.getId())
                .name(wallet.getName())
                .balance(wallet.getBalance())
                .type(wallet.getType())
                .isDefault(wallet.getIsDefault())
                .build();
    }

    public List<WalletResponse> getMyWallets() {
        User user = getCurrentUser();
        List<Wallet> wallets = walletRepository.findByUserAndIsDeletedFalse(user);

        // Auto-generate a default "Cash" wallet if none exist
        if (wallets.isEmpty()) {
            Wallet defaultWallet = new Wallet();
            defaultWallet.setUser(user);
            defaultWallet.setName("Tiền mặt");
            defaultWallet.setBalance(BigDecimal.ZERO);
            defaultWallet.setType("Cash");
            defaultWallet.setIsDefault(true);
            defaultWallet.setIsDeleted(false);
            defaultWallet.setCreatedAt(Instant.now());
            
            wallets.add(walletRepository.save(defaultWallet));
        }

        return wallets.stream().map(this::toWalletResponse).collect(Collectors.toList());
    }
    public WalletResponse createWallet(WalletRequest request) {
        User user = getCurrentUser();
        Wallet wallet = new Wallet();
        wallet.setUser(user);
        wallet.setName(request.getName());
        wallet.setBalance(request.getBalance());
        wallet.setType("Custom"); // Defaulting type or could add to request DTO later
        wallet.setIsDefault(false);
        wallet.setIsDeleted(false);
        wallet.setCreatedAt(Instant.now());

        Wallet savedWallet = walletRepository.save(wallet);
        return toWalletResponse(savedWallet);
    }

    public WalletResponse updateWallet(Integer id, WalletRequest request) {
        User user = getCurrentUser();
        Wallet wallet = walletRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION));
        
        if (!wallet.getUser().getId().equals(user.getId()) || Boolean.TRUE.equals(wallet.getIsDeleted())) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION); // Not found/authorized
        }

        wallet.setName(request.getName());
        wallet.setBalance(request.getBalance());

        Wallet savedWallet = walletRepository.save(wallet);
        return toWalletResponse(savedWallet);
    }

    public void deleteWallet(Integer id) {
        User user = getCurrentUser();
        Wallet wallet = walletRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION));
        
        if (!wallet.getUser().getId().equals(user.getId()) || Boolean.TRUE.equals(wallet.getIsDeleted())) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION); // Not found/authorized
        }

        if (Boolean.TRUE.equals(wallet.getIsDefault())) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION); // Cannot delete default wallet
        }

        wallet.setIsDeleted(true);
        walletRepository.save(wallet);
    }
}
