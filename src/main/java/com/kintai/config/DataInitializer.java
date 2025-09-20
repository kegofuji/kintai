package com.kintai.config;

import com.kintai.entity.Employee;
import com.kintai.entity.UserAccount;
import com.kintai.repository.EmployeeRepository;
import com.kintai.repository.UserAccountRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.time.LocalDate;

@Component
@Profile("!test")
public class DataInitializer {
    
    @Autowired
    private UserAccountRepository userAccountRepository;
    
    @Autowired
    private EmployeeRepository employeeRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @PostConstruct
    public void initData() {
        try {
            System.out.println("DataInitializer: Starting data initialization...");
            // 既存のデータをクリア
            userAccountRepository.deleteAll();
            employeeRepository.deleteAll();
            System.out.println("DataInitializer: Cleared existing data");
        
        // サンプル従業員データを作成
        Employee emp1 = new Employee("EMP001", "田中", "太郎", "tanaka@example.com", LocalDate.of(2020, 4, 1));
        emp1.setIsActive(true);
        Employee savedEmp1 = employeeRepository.save(emp1);
        if (savedEmp1 == null) {
            System.err.println("DataInitializer: Failed to save employee 1");
            return;
        }
        System.out.println("Created employee 1 with ID: " + savedEmp1.getEmployeeId());
        
        Employee emp2 = new Employee("EMP002", "山田", "太郎", "yamada@example.com", LocalDate.of(2020, 4, 1));
        emp2.setIsActive(true);
        Employee savedEmp2 = employeeRepository.save(emp2);
        if (savedEmp2 == null) {
            System.err.println("DataInitializer: Failed to save employee 2");
            return;
        }
        System.out.println("Created employee 2 with ID: " + savedEmp2.getEmployeeId());
        
        Employee emp3 = new Employee("EMP003", "佐藤", "花子", "sato@example.com", LocalDate.of(2020, 4, 1));
        emp3.setIsActive(true);
        Employee savedEmp3 = employeeRepository.save(emp3);
        if (savedEmp3 == null) {
            System.err.println("DataInitializer: Failed to save employee 3");
            return;
        }
        System.out.println("Created employee 3 with ID: " + savedEmp3.getEmployeeId());
        
        Employee emp4 = new Employee("EMP004", "田中", "次郎", "tanaka2@example.com", LocalDate.of(2020, 4, 1));
        emp4.setIsActive(true);
        Employee savedEmp4 = employeeRepository.save(emp4);
        if (savedEmp4 == null) {
            System.err.println("DataInitializer: Failed to save employee 4");
            return;
        }
        System.out.println("Created employee 4 with ID: " + savedEmp4.getEmployeeId());
        
        // サンプルユーザーデータを作成
        UserAccount admin = new UserAccount();
        admin.setUsername("admin");
        admin.setPassword(passwordEncoder.encode("pass"));
        admin.setRole(UserAccount.UserRole.ADMIN);
        admin.setEmployeeId(savedEmp1.getEmployeeId());
        admin.setEnabled(true);
        userAccountRepository.save(admin);
        
        UserAccount user1 = new UserAccount();
        user1.setUsername("user1");
        user1.setPassword(passwordEncoder.encode("pass"));
        user1.setRole(UserAccount.UserRole.EMPLOYEE);
        user1.setEmployeeId(savedEmp2.getEmployeeId());
        user1.setEnabled(true);
        userAccountRepository.save(user1);
        System.out.println("Created user1 with employeeId: " + savedEmp2.getEmployeeId());
        
        UserAccount user2 = new UserAccount();
        user2.setUsername("user2");
        user2.setPassword(passwordEncoder.encode("pass"));
        user2.setRole(UserAccount.UserRole.EMPLOYEE);
        user2.setEmployeeId(savedEmp3.getEmployeeId());
        user2.setEnabled(true);
        userAccountRepository.save(user2);
        System.out.println("DataInitializer: Data initialization completed successfully");
        } catch (Exception e) {
            System.err.println("DataInitializer: Error during data initialization: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
