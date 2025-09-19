package com.kintai.controller;

import com.kintai.entity.AttendanceRecord;
import com.kintai.entity.AttendanceStatus;
import com.kintai.entity.Employee;
import com.kintai.repository.AttendanceRecordRepository;
import com.kintai.repository.EmployeeRepository;
import com.kintai.service.AttendanceReportService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Optional;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * 勤怠レポートコントローラーのテスト
 */
@WebMvcTest(AttendanceReportController.class)
@WithMockUser
class AttendanceReportControllerTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @MockBean
    private AttendanceReportService attendanceReportService;
    
    @MockBean
    private EmployeeRepository employeeRepository;
    
    @MockBean
    private AttendanceRecordRepository attendanceRecordRepository;
    
    private Employee testEmployee;
    private AttendanceRecord testRecord;
    
    @BeforeEach
    void setUp() {
        testEmployee = new Employee();
        testEmployee.setEmployeeId(1L);
        testEmployee.setEmployeeCode("EMP001");
        testEmployee.setLastName("田中");
        testEmployee.setFirstName("太郎");
        testEmployee.setEmail("tanaka@example.com");
        testEmployee.setHireDate(LocalDate.of(2020, 4, 1));
        
        testRecord = new AttendanceRecord();
        testRecord.setAttendanceId(1L);
        testRecord.setEmployeeId(1L);
        testRecord.setAttendanceDate(LocalDate.of(2024, 1, 15));
        testRecord.setClockInTime(LocalDateTime.of(2024, 1, 15, 9, 0));
        testRecord.setClockOutTime(LocalDateTime.of(2024, 1, 15, 18, 0));
        testRecord.setOvertimeMinutes(60);
        testRecord.setLateMinutes(0);
        testRecord.setEarlyLeaveMinutes(0);
        testRecord.setAttendanceStatus(AttendanceStatus.NORMAL);
    }
    
    @Test
    void generateAttendanceReport_正常系_データがある場合() throws Exception {
        // モックの設定
        when(employeeRepository.findById(1L)).thenReturn(Optional.of(testEmployee));
        when(attendanceRecordRepository.findByEmployeeAndMonth(1L, 2024, 1))
            .thenReturn(Arrays.asList(testRecord));
        
        // PDF生成のモック
        byte[] mockPdf = "Mock PDF Content".getBytes();
        when(attendanceReportService.generateAttendanceReportPdf(1L, "2024-01"))
            .thenReturn(mockPdf);
        
        // テスト実行
        mockMvc.perform(get("/api/attendance/report/1/2024-01"))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_PDF))
            .andExpect(header().string("Content-Disposition", 
                "form-data; name=\"attachment\"; filename=\"attendance_1_2024-01.pdf\""))
            .andExpect(content().bytes(mockPdf));
    }
    
    @Test
    void generateAttendanceReport_正常系_データなしの場合() throws Exception {
        // モックの設定
        when(employeeRepository.findById(1L)).thenReturn(Optional.of(testEmployee));
        when(attendanceRecordRepository.findByEmployeeAndMonth(1L, 2024, 1))
            .thenReturn(Arrays.asList());
        
        // PDF生成のモック
        byte[] mockPdf = "Mock PDF Content - No Data".getBytes();
        when(attendanceReportService.generateAttendanceReportPdf(1L, "2024-01"))
            .thenReturn(mockPdf);
        
        // テスト実行
        mockMvc.perform(get("/api/attendance/report/1/2024-01"))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_PDF))
            .andExpect(header().string("Content-Disposition", 
                "form-data; name=\"attachment\"; filename=\"attendance_1_2024-01.pdf\""))
            .andExpect(content().bytes(mockPdf));
    }
    
    @Test
    void generateAttendanceReport_異常系_従業員が存在しない場合() throws Exception {
        // モックの設定
        when(employeeRepository.findById(999L)).thenReturn(Optional.empty());
        when(attendanceReportService.generateAttendanceReportPdf(999L, "2024-01"))
            .thenThrow(new IllegalArgumentException("従業員が見つかりません: 999"));
        
        // テスト実行
        mockMvc.perform(get("/api/attendance/report/999/2024-01"))
            .andExpect(status().isNotFound());
    }
    
    @Test
    void generateAttendanceReport_異常系_年月フォーマットが不正な場合() throws Exception {
        // テスト実行
        mockMvc.perform(get("/api/attendance/report/1/invalid-format"))
            .andExpect(status().isBadRequest());
    }
    
    @Test
    void generateAttendanceReport_異常系_年月フォーマットが空の場合() throws Exception {
        // テスト実行
        mockMvc.perform(get("/api/attendance/report/1/"))
            .andExpect(status().isNotFound()); // パスが存在しない
    }
    
    @Test
    void generateAttendanceReport_異常系_従業員IDが数値でない場合() throws Exception {
        // テスト実行
        mockMvc.perform(get("/api/attendance/report/invalid/2024-01"))
            .andExpect(status().isBadRequest()); // 型変換エラー
    }
}
