package com.kintai.config;

import com.kintai.entity.UserAccount;
import com.kintai.repository.UserAccountRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;

@Component
public class DataInitializer {
    
    @Autowired
    private UserAccountRepository userAccountRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @PostConstruct
    public void initData() {
        // 既存のデータをクリア
        userAccountRepository.deleteAll();
        
        // サンプルユーザーデータを作成
        UserAccount admin = new UserAccount();
        admin.setUsername("admin");
        admin.setPassword(passwordEncoder.encode("pass"));
        admin.setRole(UserAccount.UserRole.ADMIN);
        admin.setEmployeeId(1L);
        admin.setEnabled(true);
        userAccountRepository.save(admin);
        
        UserAccount user1 = new UserAccount();
        user1.setUsername("user1");
        user1.setPassword(passwordEncoder.encode("pass"));
        user1.setRole(UserAccount.UserRole.EMPLOYEE);
        user1.setEmployeeId(2L);
        user1.setEnabled(true);
        userAccountRepository.save(user1);
        
        UserAccount user2 = new UserAccount();
        user2.setUsername("user2");
        user2.setPassword(passwordEncoder.encode("pass"));
        user2.setRole(UserAccount.UserRole.EMPLOYEE);
        user2.setEmployeeId(3L);
        user2.setEnabled(true);
        userAccountRepository.save(user2);
    }
}
