package com.kintai.service;

import com.kintai.entity.UserAccount;
import com.kintai.repository.UserAccountRepository;
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
}
