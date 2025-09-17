package com.kintai.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kintai.dto.ClockInRequest;
import com.kintai.dto.ClockOutRequest;
import com.kintai.dto.ClockResponse;
import com.kintai.exception.AttendanceException;
import com.kintai.service.AttendanceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * AttendanceControllerのユニットテスト
 */
@WebMvcTest(AttendanceController.class)
class AttendanceControllerTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @MockBean
    private AttendanceService attendanceService;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @BeforeEach
    void setUp() {
        // テスト前のセットアップ
    }
    
    @Test
    @DisplayName("出勤API正常系テスト")
    void testClockIn_Success() throws Exception {
        // Given
        ClockInRequest request = new ClockInRequest(1L);
        ClockResponse.ClockData data = new ClockResponse.ClockData(1L, null, null, 5, null, null, null);
        ClockResponse response = new ClockResponse(true, "出勤打刻完了（5分遅刻）", data);
        
        when(attendanceService.clockIn(any(ClockInRequest.class))).thenReturn(response);
        
        // When & Then
        mockMvc.perform(post("/api/attendance/clock-in")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("出勤打刻完了（5分遅刻）"))
                .andExpect(jsonPath("$.data.attendanceId").value(1))
                .andExpect(jsonPath("$.data.lateMinutes").value(5));
    }
    
    @Test
    @DisplayName("退勤API正常系テスト")
    void testClockOut_Success() throws Exception {
        // Given
        ClockOutRequest request = new ClockOutRequest(1L);
        ClockResponse.ClockData data = new ClockResponse.ClockData(1L, null, null, 0, 0, 10, 0);
        ClockResponse response = new ClockResponse(true, "退勤打刻完了（10分残業）", data);
        
        when(attendanceService.clockOut(any(ClockOutRequest.class))).thenReturn(response);
        
        // When & Then
        mockMvc.perform(post("/api/attendance/clock-out")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("退勤打刻完了（10分残業）"))
                .andExpect(jsonPath("$.data.attendanceId").value(1))
                .andExpect(jsonPath("$.data.overtimeMinutes").value(10));
    }
    
    @Test
    @DisplayName("出勤APIバリデーションエラーテスト")
    void testClockIn_ValidationError() throws Exception {
        // Given
        ClockInRequest request = new ClockInRequest(null); // 無効なリクエスト
        
        // When & Then
        mockMvc.perform(post("/api/attendance/clock-in")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
    
    @Test
    @DisplayName("出勤API重複打刻エラーテスト")
    void testClockIn_AlreadyClockedInError() throws Exception {
        // Given
        ClockInRequest request = new ClockInRequest(1L);
        
        when(attendanceService.clockIn(any(ClockInRequest.class))).thenThrow(
                new AttendanceException(AttendanceException.ALREADY_CLOCKED_IN, "既に出勤打刻済みです"));
        
        // When & Then
        mockMvc.perform(post("/api/attendance/clock-in")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("ALREADY_CLOCKED_IN"))
                .andExpect(jsonPath("$.message").value("既に出勤打刻済みです"));
    }
    
    @Test
    @DisplayName("退勤API出勤前退勤エラーテスト")
    void testClockOut_NotClockedInError() throws Exception {
        // Given
        ClockOutRequest request = new ClockOutRequest(1L);
        
        when(attendanceService.clockOut(any(ClockOutRequest.class))).thenThrow(
                new AttendanceException(AttendanceException.NOT_CLOCKED_IN, "出勤打刻がされていません"));
        
        // When & Then
        mockMvc.perform(post("/api/attendance/clock-out")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("NOT_CLOCKED_IN"))
                .andExpect(jsonPath("$.message").value("出勤打刻がされていません"));
    }
    
    @Test
    @DisplayName("ヘルスチェックAPIテスト")
    void testHealth() throws Exception {
        // When & Then
        mockMvc.perform(get("/api/attendance/health"))
                .andExpect(status().isOk())
                .andExpect(content().string("勤怠管理システムは正常に動作しています"));
    }
}
