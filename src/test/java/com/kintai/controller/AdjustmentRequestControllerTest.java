package com.kintai.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kintai.dto.AdjustmentRequestDto;
import com.kintai.entity.AdjustmentRequest;
import com.kintai.exception.AttendanceException;
import com.kintai.service.AdjustmentRequestService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import com.kintai.config.TestSecurityConfig;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * AdjustmentRequestControllerのユニットテスト
 */
@WebMvcTest(AdjustmentRequestController.class)
@Import(TestSecurityConfig.class)
class AdjustmentRequestControllerTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @MockBean
    private AdjustmentRequestService adjustmentRequestService;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    private AdjustmentRequestDto validRequestDto;
    private AdjustmentRequest mockAdjustmentRequest;
    
    @BeforeEach
    void setUp() {
        // 有効なリクエストDTOの設定
        validRequestDto = new AdjustmentRequestDto();
        validRequestDto.setEmployeeId(1L);
        validRequestDto.setTargetDate(LocalDate.now().minusDays(1)); // 昨日
        validRequestDto.setNewClockIn(LocalDateTime.now().withHour(9).withMinute(0));
        validRequestDto.setNewClockOut(LocalDateTime.now().withHour(18).withMinute(0));
        validRequestDto.setReason("交通機関の遅延のため");
        
        // モックの修正申請オブジェクト
        mockAdjustmentRequest = new AdjustmentRequest();
        mockAdjustmentRequest.setAdjustmentRequestId(1L);
        mockAdjustmentRequest.setEmployeeId(1L);
        mockAdjustmentRequest.setTargetDate(LocalDate.now().minusDays(1));
        mockAdjustmentRequest.setNewClockIn(LocalDateTime.now().withHour(9).withMinute(0));
        mockAdjustmentRequest.setNewClockOut(LocalDateTime.now().withHour(18).withMinute(0));
        mockAdjustmentRequest.setReason("交通機関の遅延のため");
        mockAdjustmentRequest.setStatus(AdjustmentRequest.AdjustmentStatus.PENDING);
        mockAdjustmentRequest.setCreatedAt(LocalDateTime.now());
        mockAdjustmentRequest.setUpdatedAt(LocalDateTime.now());
    }
    
    @Test
    @DisplayName("修正申請作成API正常系テスト")
    void testCreateAdjustmentRequest_Success() throws Exception {
        // Given
        when(adjustmentRequestService.createAdjustmentRequest(any(AdjustmentRequestDto.class)))
                .thenReturn(mockAdjustmentRequest);
        
        // When & Then
        mockMvc.perform(post("/api/attendance/adjustment")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequestDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("修正申請が正常に作成されました"))
                .andExpect(jsonPath("$.adjustmentRequestId").value(1))
                .andExpect(jsonPath("$.status").value("PENDING"));
        
        verify(adjustmentRequestService, times(1)).createAdjustmentRequest(any(AdjustmentRequestDto.class));
    }
    
    @Test
    @DisplayName("修正申請作成API異常系テスト - 従業員が見つからない")
    void testCreateAdjustmentRequest_EmployeeNotFound() throws Exception {
        // Given
        when(adjustmentRequestService.createAdjustmentRequest(any(AdjustmentRequestDto.class)))
                .thenThrow(new AttendanceException("EMPLOYEE_NOT_FOUND", "従業員が見つかりません: 999"));
        
        // When & Then
        mockMvc.perform(post("/api/attendance/adjustment")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequestDto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("EMPLOYEE_NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("従業員が見つかりません: 999"));
    }
    
    @Test
    @DisplayName("修正申請作成API異常系テスト - 未来日指定")
    void testCreateAdjustmentRequest_FutureDate() throws Exception {
        // Given
        validRequestDto.setTargetDate(LocalDate.now().plusDays(1)); // 明日
        when(adjustmentRequestService.createAdjustmentRequest(any(AdjustmentRequestDto.class)))
                .thenThrow(new AttendanceException("INVALID_DATE", "対象日は過去日または当日のみ指定可能です"));
        
        // When & Then
        mockMvc.perform(post("/api/attendance/adjustment")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequestDto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("INVALID_DATE"))
                .andExpect(jsonPath("$.message").value("対象日は過去日または当日のみ指定可能です"));
    }
    
    @Test
    @DisplayName("修正申請作成API異常系テスト - 出勤時間が退勤時間より後")
    void testCreateAdjustmentRequest_InvalidTimeOrder() throws Exception {
        // Given
        validRequestDto.setNewClockIn(LocalDateTime.now().withHour(18).withMinute(0)); // 18:00
        validRequestDto.setNewClockOut(LocalDateTime.now().withHour(9).withMinute(0));  // 9:00
        when(adjustmentRequestService.createAdjustmentRequest(any(AdjustmentRequestDto.class)))
                .thenThrow(new AttendanceException("INVALID_TIME_ORDER", "出勤時間は退勤時間より前である必要があります"));
        
        // When & Then
        mockMvc.perform(post("/api/attendance/adjustment")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequestDto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("INVALID_TIME_ORDER"))
                .andExpect(jsonPath("$.message").value("出勤時間は退勤時間より前である必要があります"));
    }
    
    @Test
    @DisplayName("修正申請作成API異常系テスト - バリデーションエラー（理由が空）")
    void testCreateAdjustmentRequest_ValidationError() throws Exception {
        // Given
        validRequestDto.setReason(""); // 空の理由
        
        // When & Then
        mockMvc.perform(post("/api/attendance/adjustment")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequestDto)))
                .andExpect(status().isBadRequest());
    }
    
    @Test
    @DisplayName("修正申請一覧取得API正常系テスト")
    void testGetAdjustmentRequests_Success() throws Exception {
        // Given
        List<AdjustmentRequest> mockRequests = Arrays.asList(mockAdjustmentRequest);
        when(adjustmentRequestService.getAdjustmentRequestsByEmployee(1L))
                .thenReturn(mockRequests);
        
        // When & Then
        mockMvc.perform(get("/api/attendance/adjustment/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].adjustmentRequestId").value(1))
                .andExpect(jsonPath("$.data[0].employeeId").value(1))
                .andExpect(jsonPath("$.count").value(1));
        
        verify(adjustmentRequestService, times(1)).getAdjustmentRequestsByEmployee(1L);
    }
    
    @Test
    @DisplayName("修正申請一覧取得API正常系テスト - 空のリスト")
    void testGetAdjustmentRequests_EmptyList() throws Exception {
        // Given
        when(adjustmentRequestService.getAdjustmentRequestsByEmployee(1L))
                .thenReturn(Arrays.asList());
        
        // When & Then
        mockMvc.perform(get("/api/attendance/adjustment/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.count").value(0));
    }
}
