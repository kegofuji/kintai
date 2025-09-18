package com.kintai.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 従業員エンティティ
 */
@Entity
@Table(name = "employees")
public class Employee {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "employee_id")
    private Long employeeId;
    
    @Column(name = "employee_code", nullable = false, unique = true)
    private String employeeCode;
    
    @Column(name = "last_name", nullable = false)
    private String lastName;
    
    @Column(name = "first_name", nullable = false)
    private String firstName;
    
    @Column(name = "email", nullable = false, unique = true)
    private String email;
    
    @Column(name = "hire_date", nullable = false)
    private LocalDate hireDate;
    
    @Column(name = "retirement_date")
    private LocalDate retirementDate;
    
    @Column(name = "is_active", nullable = false, columnDefinition = "BOOLEAN DEFAULT TRUE")
    private Boolean isActive = true;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
    
    // デフォルトコンストラクタ
    public Employee() {
    }
    
    // コンストラクタ
    public Employee(String employeeCode, String lastName, String firstName, String email, LocalDate hireDate) {
        this.employeeCode = employeeCode;
        this.lastName = lastName;
        this.firstName = firstName;
        this.email = email;
        this.hireDate = hireDate;
        this.isActive = true;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    // ゲッター・セッター
    public Long getEmployeeId() {
        return employeeId;
    }
    
    public void setEmployeeId(Long employeeId) {
        this.employeeId = employeeId;
    }
    
    public String getEmployeeCode() {
        return employeeCode;
    }
    
    public void setEmployeeCode(String employeeCode) {
        this.employeeCode = employeeCode;
    }
    
    public String getLastName() {
        return lastName;
    }
    
    public void setLastName(String lastName) {
        this.lastName = lastName;
    }
    
    public String getFirstName() {
        return firstName;
    }
    
    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }
    
    public String getEmail() {
        return email;
    }
    
    public void setEmail(String email) {
        this.email = email;
    }
    
    public LocalDate getHireDate() {
        return hireDate;
    }
    
    public void setHireDate(LocalDate hireDate) {
        this.hireDate = hireDate;
    }
    
    public LocalDate getRetirementDate() {
        return retirementDate;
    }
    
    public void setRetirementDate(LocalDate retirementDate) {
        this.retirementDate = retirementDate;
    }
    
    public Boolean getIsActive() {
        return isActive;
    }
    
    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
    
    /**
     * 退職済みかどうかを判定
     * @return 退職済みの場合true
     */
    public boolean isRetired() {
        return retirementDate != null || !isActive;
    }
}
