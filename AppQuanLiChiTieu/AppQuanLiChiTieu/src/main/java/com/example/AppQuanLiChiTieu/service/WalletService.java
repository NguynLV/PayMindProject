package com.example.AppQuanLiChiTieu.service;

import com.example.AppQuanLiChiTieu.dto.response.WalletResponse;
import com.example.AppQuanLiChiTieu.dto.request.WalletRequest;
import com.example.AppQuanLiChiTieu.entity.Wallet;
import com.example.AppQuanLiChiTieu.exception.AppException;
import com.example.AppQuanLiChiTieu.exception.ErrorCode;
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
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        List<Wallet> wallets = walletRepository.findByOwnerEmailAndIsDeletedFalse(currentUserEmail);

        // Clean up duplicates (caused by previous race conditions)
        java.util.Set<String> seenNames = new java.util.HashSet<>();
        java.util.Iterator<Wallet> iterator = wallets.iterator();
        while (iterator.hasNext()) {
            Wallet w = iterator.next();
            if (seenNames.contains(w.getName())) {
                w.setIsDeleted(true);
                walletRepository.save(w);
                iterator.remove();
            } else {
                seenNames.add(w.getName());
            }
        }

        // Auto-generate a default "Cash" wallet if none exist
        if (wallets.isEmpty()) {
            Wallet defaultWallet = new Wallet();
            defaultWallet.setName("Tiền mặt");
            defaultWallet.setBalance(BigDecimal.ZERO);
            defaultWallet.setType("Cash");
            defaultWallet.setIsDefault(true);
            defaultWallet.setIsDeleted(false);
            defaultWallet.setCreatedAt(Instant.now());
            defaultWallet.setOwnerEmail(currentUserEmail);
            
            wallets.add(walletRepository.save(defaultWallet));
        }

        return wallets.stream().map(this::toWalletResponse).collect(Collectors.toList());
    }

    public WalletResponse createWallet(WalletRequest request) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();

        if (walletRepository.findFirstByOwnerEmailAndNameAndIsDeletedFalse(currentUserEmail, request.getName()).isPresent()) {
            throw new AppException(ErrorCode.WALLET_NAME_EXISTED);
        }

        Wallet wallet = new Wallet();
        wallet.setName(request.getName());
        wallet.setBalance(request.getBalance());
        wallet.setOwnerEmail(currentUserEmail);
        wallet.setType("Custom");
        wallet.setIsDefault(false);
        wallet.setIsDeleted(false);
        wallet.setCreatedAt(Instant.now());

        Wallet savedWallet = walletRepository.save(wallet);
        return toWalletResponse(savedWallet);
    }

    public WalletResponse updateWallet(Integer id, WalletRequest request) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        Wallet wallet = walletRepository.findByIdAndOwnerEmailAndIsDeletedFalse(id, currentUserEmail)
                .orElseThrow(() -> new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION));

        Wallet existing = walletRepository.findFirstByOwnerEmailAndNameAndIsDeletedFalse(currentUserEmail, request.getName()).orElse(null);
        if (existing != null && !existing.getId().equals(id)) {
            throw new AppException(ErrorCode.WALLET_NAME_EXISTED);
        }

        wallet.setName(request.getName());
        wallet.setBalance(request.getBalance());

        Wallet savedWallet = walletRepository.save(wallet);
        return toWalletResponse(savedWallet);
    }

    public void deleteWallet(Integer id) {
        String currentUserEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        Wallet wallet = walletRepository.findByIdAndOwnerEmailAndIsDeletedFalse(id, currentUserEmail)
                .orElseThrow(() -> new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION));

        if (Boolean.TRUE.equals(wallet.getIsDefault())) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION); // Cannot delete default wallet
        }

        wallet.setIsDeleted(true);
        walletRepository.save(wallet);
    }
}
