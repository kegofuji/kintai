package com.kintai.controller;

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
import java.util.Arrays;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * AdminAdjustmentRequestControllerのユニットテスト
 */
@WebMvcTest(AdminAdjustmentRequestController.class)
@Import(TestSecurityConfig.class)
class AdminAdjustmentRequestControllerTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @MockBean
    private AdjustmentRequestService adjustmentRequestService;
    
    private AdjustmentRequest mockAdjustmentRequest;
    private AdjustmentRequest approvedRequest;
    private AdjustmentRequest rejectedRequest;
    
    @BeforeEach
    void setUp() {
        // 申請中の修正申請
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
        
        // 承認された修正申請
        approvedRequest = new AdjustmentRequest();
        approvedRequest.setAdjustmentRequestId(1L);
        approvedRequest.setEmployeeId(1L);
        approvedRequest.setTargetDate(LocalDate.now().minusDays(1));
        approvedRequest.setNewClockIn(LocalDateTime.now().withHour(9).withMinute(0));
        approvedRequest.setNewClockOut(LocalDateTime.now().withHour(18).withMinute(0));
        approvedRequest.setReason("交通機関の遅延のため");
        approvedRequest.setStatus(AdjustmentRequest.AdjustmentStatus.APPROVED);
        approvedRequest.setCreatedAt(LocalDateTime.now());
        approvedRequest.setUpdatedAt(LocalDateTime.now());
        
        // 却下された修正申請
        rejectedRequest = new AdjustmentRequest();
        rejectedRequest.setAdjustmentRequestId(1L);
        rejectedRequest.setEmployeeId(1L);
        rejectedRequest.setTargetDate(LocalDate.now().minusDays(1));
        rejectedRequest.setNewClockIn(LocalDateTime.now().withHour(9).withMinute(0));
        rejectedRequest.setNewClockOut(LocalDateTime.now().withHour(18).withMinute(0));
        rejectedRequest.setReason("交通機関の遅延のため");
        rejectedRequest.setStatus(AdjustmentRequest.AdjustmentStatus.REJECTED);
        rejectedRequest.setCreatedAt(LocalDateTime.now());
        rejectedRequest.setUpdatedAt(LocalDateTime.now());
    }
    
    @Test
    @DisplayName("修正申請承認API正常系テスト")
    void testApproveAdjustmentRequest_Success() throws Exception {
        // Given
        when(adjustmentRequestService.approveAdjustmentRequest(1L))
                .thenReturn(approvedRequest);
        
        // When & Then
        mockMvc.perform(post("/api/admin/attendance/adjustment/approve/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("修正申請が承認されました"))
                .andExpect(jsonPath("$.adjustmentRequestId").value(1))
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.employeeId").value(1));
        
        verify(adjustmentRequestService, times(1)).approveAdjustmentRequest(1L);
    }
    
    @Test
    @DisplayName("修正申請承認API異常系テスト - 申請が見つからない")
    void testApproveAdjustmentRequest_NotFound() throws Exception {
        // Given
        when(adjustmentRequestService.approveAdjustmentRequest(999L))
                .thenThrow(new AttendanceException("ADJUSTMENT_REQUEST_NOT_FOUND", "修正申請が見つかりません: 999"));
        
        // When & Then
        mockMvc.perform(post("/api/admin/attendance/adjustment/approve/999"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("ADJUSTMENT_REQUEST_NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("修正申請が見つかりません: 999"));
    }
    
    @Test
    @DisplayName("修正申請承認API異常系テスト - 承認不可状態")
    void testApproveAdjustmentRequest_NotPending() throws Exception {
        // Given
        when(adjustmentRequestService.approveAdjustmentRequest(1L))
                .thenThrow(new AttendanceException("INVALID_STATUS", "承認可能な状態ではありません"));
        
        // When & Then
        mockMvc.perform(post("/api/admin/attendance/adjustment/approve/1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("INVALID_STATUS"))
                .andExpect(jsonPath("$.message").value("承認可能な状態ではありません"));
    }
    
    @Test
    @DisplayName("修正申請却下API正常系テスト")
    void testRejectAdjustmentRequest_Success() throws Exception {
        // Given
        when(adjustmentRequestService.rejectAdjustmentRequest(1L))
                .thenReturn(rejectedRequest);
        
        // When & Then
        mockMvc.perform(post("/api/admin/attendance/adjustment/reject/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("修正申請が却下されました"))
                .andExpect(jsonPath("$.adjustmentRequestId").value(1))
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.employeeId").value(1));
        
        verify(adjustmentRequestService, times(1)).rejectAdjustmentRequest(1L);
    }
    
    @Test
    @DisplayName("修正申請却下API異常系テスト - 申請が見つからない")
    void testRejectAdjustmentRequest_NotFound() throws Exception {
        // Given
        when(adjustmentRequestService.rejectAdjustmentRequest(999L))
                .thenThrow(new AttendanceException("ADJUSTMENT_REQUEST_NOT_FOUND", "修正申請が見つかりません: 999"));
        
        // When & Then
        mockMvc.perform(post("/api/admin/attendance/adjustment/reject/999"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("ADJUSTMENT_REQUEST_NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("修正申請が見つかりません: 999"));
    }
    
    @Test
    @DisplayName("全修正申請一覧取得API正常系テスト")
    void testGetAllAdjustmentRequests_Success() throws Exception {
        // Given
        List<AdjustmentRequest> mockRequests = Arrays.asList(mockAdjustmentRequest);
        when(adjustmentRequestService.getAllAdjustmentRequests())
                .thenReturn(mockRequests);
        
        // When & Then
        mockMvc.perform(get("/api/admin/attendance/adjustment"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].adjustmentRequestId").value(1))
                .andExpect(jsonPath("$.count").value(1));
        
        verify(adjustmentRequestService, times(1)).getAllAdjustmentRequests();
    }
    
    @Test
    @DisplayName("状態別修正申請一覧取得API正常系テスト - PENDING")
    void testGetAdjustmentRequestsByStatus_Pending() throws Exception {
        // Given
        List<AdjustmentRequest> mockRequests = Arrays.asList(mockAdjustmentRequest);
        when(adjustmentRequestService.getAdjustmentRequestsByStatus(AdjustmentRequest.AdjustmentStatus.PENDING))
                .thenReturn(mockRequests);
        
        // When & Then
        mockMvc.perform(get("/api/admin/attendance/adjustment/status/PENDING"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.count").value(1));
        
        verify(adjustmentRequestService, times(1)).getAdjustmentRequestsByStatus(AdjustmentRequest.AdjustmentStatus.PENDING);
    }
    
    @Test
    @DisplayName("状態別修正申請一覧取得API異常系テスト - 無効な状態")
    void testGetAdjustmentRequestsByStatus_InvalidStatus() throws Exception {
        // When & Then
        mockMvc.perform(get("/api/admin/attendance/adjustment/status/INVALID"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("INVALID_STATUS"))
                .andExpect(jsonPath("$.message").value("無効な状態です: INVALID"));
    }
    
    @Test
    @DisplayName("承認待ち修正申請数取得API正常系テスト")
    void testGetPendingRequestCount_Success() throws Exception {
        // Given
        when(adjustmentRequestService.getPendingRequestCount())
                .thenReturn(5L);
        
        // When & Then
        mockMvc.perform(get("/api/admin/attendance/adjustment/pending-count"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.pendingCount").value(5));
        
        verify(adjustmentRequestService, times(1)).getPendingRequestCount();
    }
}
