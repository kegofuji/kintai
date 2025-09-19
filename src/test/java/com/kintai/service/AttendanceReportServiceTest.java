package com.kintai.service;

import com.kintai.entity.AttendanceRecord;
import com.kintai.entity.AttendanceStatus;
import com.kintai.entity.Employee;
import com.kintai.repository.AttendanceRecordRepository;
import com.kintai.repository.EmployeeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

/**
 * 勤怠レポートサービスのテスト
 */
@ExtendWith(MockitoExtension.class)
class AttendanceReportServiceTest {
    
    @Mock
    private AttendanceRecordRepository attendanceRecordRepository;
    
    @Mock
    private EmployeeRepository employeeRepository;
    
    @InjectMocks
    private AttendanceReportService attendanceReportService;
    
    private Employee testEmployee;
    private AttendanceRecord testRecord1;
    private AttendanceRecord testRecord2;
    
    @BeforeEach
    void setUp() {
        testEmployee = new Employee();
        testEmployee.setEmployeeId(1L);
        testEmployee.setEmployeeCode("EMP001");
        testEmployee.setLastName("田中");
        testEmployee.setFirstName("太郎");
        testEmployee.setEmail("tanaka@example.com");
        testEmployee.setHireDate(LocalDate.of(2020, 4, 1));
        
        testRecord1 = new AttendanceRecord();
        testRecord1.setAttendanceId(1L);
        testRecord1.setEmployeeId(1L);
        testRecord1.setAttendanceDate(LocalDate.of(2024, 1, 15));
        testRecord1.setClockInTime(LocalDateTime.of(2024, 1, 15, 9, 0));
        testRecord1.setClockOutTime(LocalDateTime.of(2024, 1, 15, 18, 0));
        testRecord1.setOvertimeMinutes(60);
        testRecord1.setLateMinutes(0);
        testRecord1.setEarlyLeaveMinutes(0);
        testRecord1.setAttendanceStatus(AttendanceStatus.NORMAL);
        
        testRecord2 = new AttendanceRecord();
        testRecord2.setAttendanceId(2L);
        testRecord2.setEmployeeId(1L);
        testRecord2.setAttendanceDate(LocalDate.of(2024, 1, 16));
        testRecord2.setClockInTime(LocalDateTime.of(2024, 1, 16, 9, 30));
        testRecord2.setClockOutTime(LocalDateTime.of(2024, 1, 16, 18, 30));
        testRecord2.setOvertimeMinutes(0);
        testRecord2.setLateMinutes(30);
        testRecord2.setEarlyLeaveMinutes(0);
        testRecord2.setAttendanceStatus(AttendanceStatus.LATE);
    }
    
    @Test
    void generateAttendanceReportPdf_正常系_データがある場合() {
        // モックの設定
        when(employeeRepository.findById(1L)).thenReturn(Optional.of(testEmployee));
        when(attendanceRecordRepository.findByEmployeeAndMonth(1L, 2024, 1))
            .thenReturn(Arrays.asList(testRecord1, testRecord2));
        
        // テスト実行
        byte[] result = attendanceReportService.generateAttendanceReportPdf(1L, "2024-01");
        
        // 検証
        assertNotNull(result);
        assertTrue(result.length > 0);
    }
    
    @Test
    void generateAttendanceReportPdf_正常系_データなしの場合() {
        // モックの設定
        when(employeeRepository.findById(1L)).thenReturn(Optional.of(testEmployee));
        when(attendanceRecordRepository.findByEmployeeAndMonth(1L, 2024, 1))
            .thenReturn(Arrays.asList());
        
        // テスト実行
        byte[] result = attendanceReportService.generateAttendanceReportPdf(1L, "2024-01");
        
        // 検証
        assertNotNull(result);
        assertTrue(result.length > 0);
    }
    
    @Test
    void generateAttendanceReportPdf_異常系_従業員が存在しない場合() {
        // モックの設定
        when(employeeRepository.findById(999L)).thenReturn(Optional.empty());
        
        // テスト実行・検証
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> attendanceReportService.generateAttendanceReportPdf(999L, "2024-01")
        );
        
        assertEquals("従業員が見つかりません: 999", exception.getMessage());
    }
    
    @Test
    void generateAttendanceReportPdf_正常系_遅刻早退データがある場合() {
        // 遅刻・早退のテストデータを作成
        AttendanceRecord lateRecord = new AttendanceRecord();
        lateRecord.setAttendanceId(3L);
        lateRecord.setEmployeeId(1L);
        lateRecord.setAttendanceDate(LocalDate.of(2024, 1, 17));
        lateRecord.setClockInTime(LocalDateTime.of(2024, 1, 17, 10, 0));
        lateRecord.setClockOutTime(LocalDateTime.of(2024, 1, 17, 17, 0));
        lateRecord.setOvertimeMinutes(0);
        lateRecord.setLateMinutes(60);
        lateRecord.setEarlyLeaveMinutes(60);
        lateRecord.setAttendanceStatus(AttendanceStatus.LATE);
        
        // モックの設定
        when(employeeRepository.findById(1L)).thenReturn(Optional.of(testEmployee));
        when(attendanceRecordRepository.findByEmployeeAndMonth(1L, 2024, 1))
            .thenReturn(Arrays.asList(testRecord1, lateRecord));
        
        // テスト実行
        byte[] result = attendanceReportService.generateAttendanceReportPdf(1L, "2024-01");
        
        // 検証
        assertNotNull(result);
        assertTrue(result.length > 0);
    }
    
    @Test
    void generateAttendanceReportPdf_正常系_休暇データがある場合() {
        // 休暇のテストデータを作成
        AttendanceRecord vacationRecord = new AttendanceRecord();
        vacationRecord.setAttendanceId(4L);
        vacationRecord.setEmployeeId(1L);
        vacationRecord.setAttendanceDate(LocalDate.of(2024, 1, 18));
        vacationRecord.setClockInTime(null);
        vacationRecord.setClockOutTime(null);
        vacationRecord.setOvertimeMinutes(0);
        vacationRecord.setLateMinutes(0);
        vacationRecord.setEarlyLeaveMinutes(0);
        vacationRecord.setAttendanceStatus(AttendanceStatus.ABSENT);
        
        // モックの設定
        when(employeeRepository.findById(1L)).thenReturn(Optional.of(testEmployee));
        when(attendanceRecordRepository.findByEmployeeAndMonth(1L, 2024, 1))
            .thenReturn(Arrays.asList(vacationRecord));
        
        // テスト実行
        byte[] result = attendanceReportService.generateAttendanceReportPdf(1L, "2024-01");
        
        // 検証
        assertNotNull(result);
        assertTrue(result.length > 0);
    }
}
