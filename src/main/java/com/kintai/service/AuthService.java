package com.kintai.service;

import com.kintai.entity.UserAccount;
import com.kintai.repository.UserAccountRepository;
import com.kintai.util.PasswordValidator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class AuthService {
    
    @Autowired
    private UserAccountRepository userAccountRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Autowired
    private PasswordValidator passwordValidator;
    
    /**
     * ユーザー認証
     * @param username ユーザー名
     * @param password パスワード
     * @return 認証成功時はユーザーアカウント、失敗時は空
     */
    public Optional<UserAccount> authenticate(String username, String password) {
        Optional<UserAccount> userOpt = userAccountRepository.findByUsernameAndEnabled(username, true);
        
        if (userOpt.isPresent()) {
            UserAccount user = userOpt.get();
            if (passwordEncoder.matches(password, user.getPassword())) {
                return Optional.of(user);
            }
        }
        
        return Optional.empty();
    }
    
    /**
     * ユーザー名でユーザーを検索
     * @param username ユーザー名
     * @return ユーザーアカウント（存在しない場合は空）
     */
    public Optional<UserAccount> findByUsername(String username) {
        return userAccountRepository.findByUsernameAndEnabled(username, true);
    }
    
    /**
     * 社員IDでユーザーを検索
     * @param employeeId 社員ID
     * @return ユーザーアカウント（存在しない場合は空）
     */
    public Optional<UserAccount> findByEmployeeId(Long employeeId) {
        return userAccountRepository.findByEmployeeId(employeeId);
    }
    
    /**
     * パスワードをエンコード
     * @param rawPassword 生のパスワード
     * @return エンコードされたパスワード
     */
    public String encodePassword(String rawPassword) {
        return passwordEncoder.encode(rawPassword);
    }
    
    /**
     * パスワードの強度を検証
     * @param password 検証するパスワード
     * @param employeeCode 社員コード（重複チェック用）
     * @return 検証結果
     */
    public PasswordValidator.PasswordValidationResult validatePassword(String password, String employeeCode) {
        return passwordValidator.validate(password, employeeCode);
    }
    
    /**
     * パスワードの強度を検証（社員コードなし）
     * @param password 検証するパスワード
     * @return 検証結果
     */
    public PasswordValidator.PasswordValidationResult validatePassword(String password) {
        return passwordValidator.validate(password, null);
    }
}
