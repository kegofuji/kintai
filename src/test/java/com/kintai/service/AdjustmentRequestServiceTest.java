package com.kintai.service;

import com.kintai.dto.AdjustmentRequestDto;
import com.kintai.entity.AdjustmentRequest;
import com.kintai.entity.AttendanceRecord;
import com.kintai.entity.Employee;
import com.kintai.exception.AttendanceException;
import com.kintai.repository.AdjustmentRequestRepository;
import com.kintai.repository.AttendanceRecordRepository;
import com.kintai.repository.EmployeeRepository;
import com.kintai.util.TimeCalculator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.test.context.TestPropertySource;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

/**
 * AdjustmentRequestServiceのユニットテスト
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
class AdjustmentRequestServiceTest {
    
    @SpyBean
    private AdjustmentRequestService adjustmentRequestService;
    
    @MockBean
    private AdjustmentRequestRepository adjustmentRequestRepository;
    
    @MockBean
    private AttendanceRecordRepository attendanceRecordRepository;
    
    @MockBean
    private EmployeeRepository employeeRepository;
    
    @MockBean
    private TimeCalculator timeCalculator;
    
    private Employee mockEmployee;
    private AdjustmentRequestDto validRequestDto;
    private AdjustmentRequest mockAdjustmentRequest;
    private AttendanceRecord mockAttendanceRecord;
    
    @BeforeEach
    void setUp() {
        // モック従業員
        mockEmployee = new Employee();
        mockEmployee.setEmployeeId(1L);
        mockEmployee.setEmployeeCode("EMP001");
        mockEmployee.setLastName("テスト");
        mockEmployee.setFirstName("太郎");
        mockEmployee.setEmail("test@example.com");
        
        // 有効なリクエストDTO
        validRequestDto = new AdjustmentRequestDto();
        validRequestDto.setEmployeeId(1L);
        validRequestDto.setTargetDate(LocalDate.now().minusDays(1));
        validRequestDto.setNewClockIn(LocalDateTime.now().withHour(9).withMinute(0));
        validRequestDto.setNewClockOut(LocalDateTime.now().withHour(18).withMinute(0));
        validRequestDto.setReason("交通機関の遅延のため");
        
        // モックの修正申請
        mockAdjustmentRequest = new AdjustmentRequest();
        mockAdjustmentRequest.setAdjustmentRequestId(1L);
        mockAdjustmentRequest.setEmployeeId(1L);
        mockAdjustmentRequest.setTargetDate(LocalDate.now().minusDays(1));
        mockAdjustmentRequest.setNewClockIn(LocalDateTime.now().withHour(9).withMinute(0));
        mockAdjustmentRequest.setNewClockOut(LocalDateTime.now().withHour(18).withMinute(0));
        mockAdjustmentRequest.setReason("交通機関の遅延のため");
        mockAdjustmentRequest.setStatus(AdjustmentRequest.AdjustmentStatus.PENDING);
        
        // モックの勤怠記録
        mockAttendanceRecord = new AttendanceRecord();
        mockAttendanceRecord.setAttendanceId(1L);
        mockAttendanceRecord.setEmployeeId(1L);
        mockAttendanceRecord.setAttendanceDate(LocalDate.now().minusDays(1));
        mockAttendanceRecord.setClockInTime(LocalDateTime.now().withHour(8).withMinute(30));
        mockAttendanceRecord.setClockOutTime(LocalDateTime.now().withHour(17).withMinute(30));
        mockAttendanceRecord.setAttendanceFixedFlag(false);
    }
    
    @Test
    @DisplayName("修正申請作成正常系テスト")
    void testCreateAdjustmentRequest_Success() {
        // Given
        when(employeeRepository.findById(1L)).thenReturn(Optional.of(mockEmployee));
        when(adjustmentRequestRepository.findByEmployeeIdAndTargetDate(1L, LocalDate.now().minusDays(1)))
                .thenReturn(Optional.empty());
        when(adjustmentRequestRepository.save(any(AdjustmentRequest.class)))
                .thenReturn(mockAdjustmentRequest);
        
        // When
        AdjustmentRequest result = adjustmentRequestService.createAdjustmentRequest(validRequestDto);
        
        // Then
        assertNotNull(result);
        assertEquals(1L, result.getAdjustmentRequestId());
        assertEquals(AdjustmentRequest.AdjustmentStatus.PENDING, result.getStatus());
        verify(employeeRepository, times(1)).findById(1L);
        verify(adjustmentRequestRepository, times(1)).findByEmployeeIdAndTargetDate(1L, LocalDate.now().minusDays(1));
        verify(adjustmentRequestRepository, times(1)).save(any(AdjustmentRequest.class));
    }
    
    @Test
    @DisplayName("修正申請作成異常系テスト - 従業員が見つからない")
    void testCreateAdjustmentRequest_EmployeeNotFound() {
        // Given
        when(employeeRepository.findById(1L)).thenReturn(Optional.empty());
        
        // When & Then
        AttendanceException exception = assertThrows(AttendanceException.class, () -> {
            adjustmentRequestService.createAdjustmentRequest(validRequestDto);
        });
        
        assertEquals("従業員が見つかりません: 1", exception.getMessage());
        verify(employeeRepository, times(1)).findById(1L);
        verify(adjustmentRequestRepository, never()).save(any(AdjustmentRequest.class));
    }
    
    @Test
    @DisplayName("修正申請作成異常系テスト - 未来日指定")
    void testCreateAdjustmentRequest_FutureDate() {
        // Given
        validRequestDto.setTargetDate(LocalDate.now().plusDays(1));
        when(employeeRepository.findById(1L)).thenReturn(Optional.of(mockEmployee));
        
        // When & Then
        AttendanceException exception = assertThrows(AttendanceException.class, () -> {
            adjustmentRequestService.createAdjustmentRequest(validRequestDto);
        });
        
        assertEquals("対象日は過去日または当日のみ指定可能です", exception.getMessage());
    }
    
    @Test
    @DisplayName("修正申請作成異常系テスト - 出勤時間が退勤時間より後")
    void testCreateAdjustmentRequest_InvalidTimeOrder() {
        // Given
        validRequestDto.setNewClockIn(LocalDateTime.now().withHour(18).withMinute(0));
        validRequestDto.setNewClockOut(LocalDateTime.now().withHour(9).withMinute(0));
        when(employeeRepository.findById(1L)).thenReturn(Optional.of(mockEmployee));
        
        // When & Then
        AttendanceException exception = assertThrows(AttendanceException.class, () -> {
            adjustmentRequestService.createAdjustmentRequest(validRequestDto);
        });
        
        assertEquals("出勤時間は退勤時間より前である必要があります", exception.getMessage());
    }
    
    @Test
    @DisplayName("修正申請作成異常系テスト - 既存申請あり")
    void testCreateAdjustmentRequest_ExistingRequest() {
        // Given
        when(employeeRepository.findById(1L)).thenReturn(Optional.of(mockEmployee));
        when(adjustmentRequestRepository.findByEmployeeIdAndTargetDate(1L, LocalDate.now().minusDays(1)))
                .thenReturn(Optional.of(mockAdjustmentRequest));
        
        // When & Then
        AttendanceException exception = assertThrows(AttendanceException.class, () -> {
            adjustmentRequestService.createAdjustmentRequest(validRequestDto);
        });
        
        assertEquals("該当日の修正申請は既に存在します", exception.getMessage());
    }
    
    @Test
    @DisplayName("修正申請承認正常系テスト")
    void testApproveAdjustmentRequest_Success() {
        // Given
        when(adjustmentRequestRepository.findById(1L)).thenReturn(Optional.of(mockAdjustmentRequest));
        when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDate(1L, LocalDate.now().minusDays(1)))
                .thenReturn(Optional.of(mockAttendanceRecord));
        when(attendanceRecordRepository.save(any(AttendanceRecord.class)))
                .thenReturn(mockAttendanceRecord);
        when(adjustmentRequestRepository.save(any(AdjustmentRequest.class)))
                .thenReturn(mockAdjustmentRequest);
        
        doNothing().when(timeCalculator).calculateAttendanceMetrics(any(AttendanceRecord.class));
        
        // When
        AdjustmentRequest result = adjustmentRequestService.approveAdjustmentRequest(1L);
        
        // Then
        assertNotNull(result);
        verify(adjustmentRequestRepository, times(1)).findById(1L);
        verify(attendanceRecordRepository, times(1)).findByEmployeeIdAndAttendanceDate(1L, LocalDate.now().minusDays(1));
        verify(timeCalculator, times(1)).calculateAttendanceMetrics(any(AttendanceRecord.class));
        verify(attendanceRecordRepository, times(1)).save(any(AttendanceRecord.class));
        verify(adjustmentRequestRepository, times(1)).save(any(AdjustmentRequest.class));
    }
    
    @Test
    @DisplayName("修正申請承認異常系テスト - 申請が見つからない")
    void testApproveAdjustmentRequest_NotFound() {
        // Given
        when(adjustmentRequestRepository.findById(1L)).thenReturn(Optional.empty());
        
        // When & Then
        AttendanceException exception = assertThrows(AttendanceException.class, () -> {
            adjustmentRequestService.approveAdjustmentRequest(1L);
        });
        
        assertEquals("修正申請が見つかりません: 1", exception.getMessage());
    }
    
    @Test
    @DisplayName("修正申請承認異常系テスト - 承認不可状態")
    void testApproveAdjustmentRequest_NotPending() {
        // Given
        mockAdjustmentRequest.setStatus(AdjustmentRequest.AdjustmentStatus.APPROVED);
        when(adjustmentRequestRepository.findById(1L)).thenReturn(Optional.of(mockAdjustmentRequest));
        
        // When & Then
        AttendanceException exception = assertThrows(AttendanceException.class, () -> {
            adjustmentRequestService.approveAdjustmentRequest(1L);
        });
        
        assertEquals("承認可能な状態ではありません", exception.getMessage());
    }
    
    @Test
    @DisplayName("修正申請却下正常系テスト")
    void testRejectAdjustmentRequest_Success() {
        // Given
        when(adjustmentRequestRepository.findById(1L)).thenReturn(Optional.of(mockAdjustmentRequest));
        when(adjustmentRequestRepository.save(any(AdjustmentRequest.class)))
                .thenReturn(mockAdjustmentRequest);
        
        // When
        AdjustmentRequest result = adjustmentRequestService.rejectAdjustmentRequest(1L);
        
        // Then
        assertNotNull(result);
        verify(adjustmentRequestRepository, times(1)).findById(1L);
        verify(adjustmentRequestRepository, times(1)).save(any(AdjustmentRequest.class));
        verify(attendanceRecordRepository, never()).save(any(AttendanceRecord.class));
    }
    
    @Test
    @DisplayName("修正申請却下異常系テスト - 申請が見つからない")
    void testRejectAdjustmentRequest_NotFound() {
        // Given
        when(adjustmentRequestRepository.findById(1L)).thenReturn(Optional.empty());
        
        // When & Then
        AttendanceException exception = assertThrows(AttendanceException.class, () -> {
            adjustmentRequestService.rejectAdjustmentRequest(1L);
        });
        
        assertEquals("修正申請が見つかりません: 1", exception.getMessage());
    }
    
    @Test
    @DisplayName("修正申請却下異常系テスト - 却下不可状態")
    void testRejectAdjustmentRequest_NotPending() {
        // Given
        mockAdjustmentRequest.setStatus(AdjustmentRequest.AdjustmentStatus.APPROVED);
        when(adjustmentRequestRepository.findById(1L)).thenReturn(Optional.of(mockAdjustmentRequest));
        
        // When & Then
        AttendanceException exception = assertThrows(AttendanceException.class, () -> {
            adjustmentRequestService.rejectAdjustmentRequest(1L);
        });
        
        assertEquals("却下可能な状態ではありません", exception.getMessage());
    }
}
