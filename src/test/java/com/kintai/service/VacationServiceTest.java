package com.kintai.service;

import com.kintai.dto.VacationRequestDto;
import com.kintai.entity.Employee;
import com.kintai.entity.VacationRequest;
import com.kintai.entity.VacationStatus;
import com.kintai.exception.VacationException;
import com.kintai.repository.EmployeeRepository;
import com.kintai.repository.VacationRequestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * VacationServiceのユニットテスト
 */
class VacationServiceTest {
    
    @Mock
    private VacationRequestRepository vacationRequestRepository;
    
    @Mock
    private EmployeeRepository employeeRepository;
    
    @InjectMocks
    private VacationService vacationService;
    
    private Employee testEmployee;
    private VacationRequest testVacationRequest;
    
    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        
        // テスト用の従業員データ
        testEmployee = new Employee("EMP001", "田中", "太郎", "tanaka@example.com", LocalDate.of(2020, 4, 1));
        testEmployee.setEmployeeId(1L);
        testEmployee.setIsActive(true);
        
        // テスト用の有給申請データ
        testVacationRequest = new VacationRequest(1L, LocalDate.of(2025, 9, 20), LocalDate.of(2025, 9, 22), "帰省のため");
        testVacationRequest.setVacationId(1L);
        testVacationRequest.setDays(3);
        testVacationRequest.setStatus(VacationStatus.PENDING);
    }
    
    @Test
    @DisplayName("有給申請成功テスト")
    void testCreateVacationRequest_Success() {
        // Given
        Long employeeId = 1L;
        LocalDate startDate = LocalDate.of(2025, 9, 20);
        LocalDate endDate = LocalDate.of(2025, 9, 22);
        String reason = "帰省のため";
        
        when(employeeRepository.findByEmployeeId(employeeId)).thenReturn(Optional.of(testEmployee));
        when(vacationRequestRepository.existsOverlappingRequest(employeeId, startDate, endDate)).thenReturn(false);
        when(vacationRequestRepository.save(any(VacationRequest.class))).thenReturn(testVacationRequest);
        
        // When
        VacationRequestDto response = vacationService.createVacationRequest(employeeId, startDate, endDate, reason);
        
        // Then
        assertTrue(response.isSuccess());
        assertEquals("有給申請を受け付けました", response.getMessage());
        assertNotNull(response.getData());
        assertTrue(response.getData() instanceof VacationRequestDto.VacationData);
        
        VacationRequestDto.VacationData data = (VacationRequestDto.VacationData) response.getData();
        assertEquals(1L, data.getVacationId());
        assertEquals(1L, data.getEmployeeId());
        assertEquals(startDate, data.getStartDate());
        assertEquals(endDate, data.getEndDate());
        assertEquals(3, data.getDays());
        assertEquals("PENDING", data.getStatus());
        
        verify(vacationRequestRepository).save(any(VacationRequest.class));
    }
    
    @Test
    @DisplayName("従業員不存在エラーテスト")
    void testCreateVacationRequest_EmployeeNotFound() {
        // Given
        Long employeeId = 999L;
        LocalDate startDate = LocalDate.of(2025, 9, 20);
        LocalDate endDate = LocalDate.of(2025, 9, 22);
        String reason = "帰省のため";
        
        when(employeeRepository.findByEmployeeId(employeeId)).thenReturn(Optional.empty());
        
        // When & Then
        VacationException exception = assertThrows(VacationException.class, () -> {
            vacationService.createVacationRequest(employeeId, startDate, endDate, reason);
        });
        
        assertEquals(VacationException.EMPLOYEE_NOT_FOUND, exception.getErrorCode());
        assertEquals("従業員が見つかりません", exception.getMessage());
    }
    
    @Test
    @DisplayName("退職者申請エラーテスト")
    void testCreateVacationRequest_RetiredEmployee() {
        // Given
        Long employeeId = 1L;
        LocalDate startDate = LocalDate.of(2025, 9, 20);
        LocalDate endDate = LocalDate.of(2025, 9, 22);
        String reason = "帰省のため";
        
        testEmployee.setRetirementDate(LocalDate.now().minusDays(1));
        
        when(employeeRepository.findByEmployeeId(employeeId)).thenReturn(Optional.of(testEmployee));
        
        // When & Then
        VacationException exception = assertThrows(VacationException.class, () -> {
            vacationService.createVacationRequest(employeeId, startDate, endDate, reason);
        });
        
        assertEquals(VacationException.RETIRED_EMPLOYEE, exception.getErrorCode());
        assertEquals("退職済みの従業員です", exception.getMessage());
    }
    
    @Test
    @DisplayName("日付範囲不正エラーテスト - 開始日が終了日より後")
    void testCreateVacationRequest_InvalidDateRange_StartAfterEnd() {
        // Given
        Long employeeId = 1L;
        LocalDate startDate = LocalDate.of(2025, 9, 22);
        LocalDate endDate = LocalDate.of(2025, 9, 20);
        String reason = "帰省のため";
        
        when(employeeRepository.findByEmployeeId(employeeId)).thenReturn(Optional.of(testEmployee));
        
        // When & Then
        VacationException exception = assertThrows(VacationException.class, () -> {
            vacationService.createVacationRequest(employeeId, startDate, endDate, reason);
        });
        
        assertEquals(VacationException.INVALID_DATE_RANGE, exception.getErrorCode());
        assertEquals("開始日は終了日より前である必要があります", exception.getMessage());
    }
    
    @Test
    @DisplayName("日付範囲不正エラーテスト - 過去の日付")
    void testCreateVacationRequest_InvalidDateRange_PastDate() {
        // Given
        Long employeeId = 1L;
        LocalDate startDate = LocalDate.now().minusDays(1);
        LocalDate endDate = LocalDate.now().plusDays(1);
        String reason = "帰省のため";
        
        when(employeeRepository.findByEmployeeId(employeeId)).thenReturn(Optional.of(testEmployee));
        
        // When & Then
        VacationException exception = assertThrows(VacationException.class, () -> {
            vacationService.createVacationRequest(employeeId, startDate, endDate, reason);
        });
        
        assertEquals(VacationException.INVALID_DATE_RANGE, exception.getErrorCode());
        assertEquals("過去の日付は申請できません", exception.getMessage());
    }
    
    @Test
    @DisplayName("重複申請エラーテスト")
    void testCreateVacationRequest_DuplicateRequest() {
        // Given
        Long employeeId = 1L;
        LocalDate startDate = LocalDate.of(2025, 9, 20);
        LocalDate endDate = LocalDate.of(2025, 9, 22);
        String reason = "帰省のため";
        
        when(employeeRepository.findByEmployeeId(employeeId)).thenReturn(Optional.of(testEmployee));
        when(vacationRequestRepository.existsOverlappingRequest(employeeId, startDate, endDate)).thenReturn(true);
        
        // When & Then
        VacationException exception = assertThrows(VacationException.class, () -> {
            vacationService.createVacationRequest(employeeId, startDate, endDate, reason);
        });
        
        assertEquals(VacationException.DUPLICATE_REQUEST, exception.getErrorCode());
        assertEquals("既に申請済みの日付を含んでいます", exception.getMessage());
    }
    
    @Test
    @DisplayName("ステータス更新成功テスト - 承認")
    void testUpdateVacationStatus_Success_Approved() {
        // Given
        Long vacationId = 1L;
        VacationStatus newStatus = VacationStatus.APPROVED;
        
        when(vacationRequestRepository.findById(vacationId)).thenReturn(Optional.of(testVacationRequest));
        when(vacationRequestRepository.save(any(VacationRequest.class))).thenReturn(testVacationRequest);
        
        // When
        VacationRequestDto response = vacationService.updateVacationStatus(vacationId, newStatus);
        
        // Then
        assertTrue(response.isSuccess());
        assertEquals("申請を承認しました", response.getMessage());
        assertNotNull(response.getData());
        assertTrue(response.getData() instanceof VacationRequestDto.VacationData);
        
        verify(vacationRequestRepository).save(any(VacationRequest.class));
    }
    
    @Test
    @DisplayName("ステータス更新成功テスト - 却下")
    void testUpdateVacationStatus_Success_Rejected() {
        // Given
        Long vacationId = 1L;
        VacationStatus newStatus = VacationStatus.REJECTED;
        
        when(vacationRequestRepository.findById(vacationId)).thenReturn(Optional.of(testVacationRequest));
        when(vacationRequestRepository.save(any(VacationRequest.class))).thenReturn(testVacationRequest);
        
        // When
        VacationRequestDto response = vacationService.updateVacationStatus(vacationId, newStatus);
        
        // Then
        assertTrue(response.isSuccess());
        assertEquals("申請を却下しました", response.getMessage());
        assertNotNull(response.getData());
        assertTrue(response.getData() instanceof VacationRequestDto.VacationData);
        
        verify(vacationRequestRepository).save(any(VacationRequest.class));
    }
    
    @Test
    @DisplayName("申請不存在エラーテスト")
    void testUpdateVacationStatus_VacationNotFound() {
        // Given
        Long vacationId = 999L;
        VacationStatus newStatus = VacationStatus.APPROVED;
        
        when(vacationRequestRepository.findById(vacationId)).thenReturn(Optional.empty());
        
        // When & Then
        VacationException exception = assertThrows(VacationException.class, () -> {
            vacationService.updateVacationStatus(vacationId, newStatus);
        });
        
        assertEquals(VacationException.VACATION_NOT_FOUND, exception.getErrorCode());
        assertEquals("申請が見つかりません", exception.getMessage());
    }
    
    @Test
    @DisplayName("ステータス変更不正エラーテスト - 既に処理済み")
    void testUpdateVacationStatus_InvalidStatusChange_AlreadyProcessed() {
        // Given
        Long vacationId = 1L;
        VacationStatus newStatus = VacationStatus.APPROVED;
        
        testVacationRequest.setStatus(VacationStatus.APPROVED); // 既に承認済み
        
        when(vacationRequestRepository.findById(vacationId)).thenReturn(Optional.of(testVacationRequest));
        
        // When & Then
        VacationException exception = assertThrows(VacationException.class, () -> {
            vacationService.updateVacationStatus(vacationId, newStatus);
        });
        
        assertEquals(VacationException.INVALID_STATUS_CHANGE, exception.getErrorCode());
        assertEquals("既に処理済みの申請は変更できません", exception.getMessage());
    }
    
    @Test
    @DisplayName("ステータス変更不正エラーテスト - 同じステータス")
    void testUpdateVacationStatus_InvalidStatusChange_SameStatus() {
        // Given
        Long vacationId = 1L;
        VacationStatus newStatus = VacationStatus.PENDING; // 同じステータス
        
        when(vacationRequestRepository.findById(vacationId)).thenReturn(Optional.of(testVacationRequest));
        
        // When & Then
        VacationException exception = assertThrows(VacationException.class, () -> {
            vacationService.updateVacationStatus(vacationId, newStatus);
        });
        
        assertEquals(VacationException.INVALID_STATUS_CHANGE, exception.getErrorCode());
        assertEquals("同じステータスに変更することはできません", exception.getMessage());
    }
    
    @Test
    @DisplayName("従業員の有給申請一覧取得テスト")
    void testGetVacationRequestsByEmployee() {
        // Given
        Long employeeId = 1L;
        List<VacationRequest> expectedRequests = Arrays.asList(testVacationRequest);
        
        when(vacationRequestRepository.findByEmployeeIdOrderByCreatedAtDesc(employeeId)).thenReturn(expectedRequests);
        
        // When
        List<VacationRequest> result = vacationService.getVacationRequestsByEmployee(employeeId);
        
        // Then
        assertEquals(1, result.size());
        assertEquals(testVacationRequest, result.get(0));
        
        verify(vacationRequestRepository).findByEmployeeIdOrderByCreatedAtDesc(employeeId);
    }
}
