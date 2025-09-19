package com.kintai.controller;

import com.kintai.dto.ReportGenerateRequest;
import com.kintai.dto.ReportGenerateResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.client.RestTemplate;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.containsString;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;

/**
 * レポートコントローラーのテスト
 */
@WebMvcTest(ReportController.class)
@AutoConfigureMockMvc(addFilters = false)
class ReportControllerTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @MockBean
    private RestTemplate restTemplate;
    
    private ReportGenerateRequest validRequest;
    private ReportGenerateResponse validResponse;
    
    @BeforeEach
    void setUp() {
        validRequest = new ReportGenerateRequest();
        validRequest.setEmployeeId(2L);
        validRequest.setYearMonth("2025-09");
        
        validResponse = new ReportGenerateResponse();
        validResponse.setUrl("http://localhost:8081/reports/tmp/report_2_202509.pdf");
    }
    
    @Test
    @WithMockUser
    void generateReport_正常系_有効なリクエスト_認証なし() throws Exception {
        // モックの設定
        ResponseEntity<ReportGenerateResponse> mockResponse = new ResponseEntity<>(validResponse, HttpStatus.OK);
        when(restTemplate.exchange(
            anyString(),
            any(),
            any(),
            eq(ReportGenerateResponse.class)
        )).thenReturn(mockResponse);
        
        // テスト実行
        mockMvc.perform(post("/api/reports/generate")
                .contentType("application/json")
                .content("{\"employeeId\":2,\"yearMonth\":\"2025-09\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url").value("http://localhost:8081/reports/tmp/report_2_202509.pdf"));
    }
    
    @Test
    void generateReport_正常系_有効なリクエスト_認証あり() throws Exception {
        // 認証ありの設定をテストするため、@Valueアノテーションをモック
        // 実際のテストでは、application-test.ymlで設定を変更
        
        // モックの設定
        ResponseEntity<ReportGenerateResponse> mockResponse = new ResponseEntity<>(validResponse, HttpStatus.OK);
        when(restTemplate.exchange(
            anyString(),
            any(),
            any(),
            eq(ReportGenerateResponse.class)
        )).thenReturn(mockResponse);
        
        // テスト実行
        mockMvc.perform(post("/api/reports/generate")
                .contentType("application/json")
                .content("{\"employeeId\":2,\"yearMonth\":\"2025-09\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url").value("http://localhost:8081/reports/tmp/report_2_202509.pdf"));
    }
    
    @Test
    void generateReport_異常系_従業員IDがnull() throws Exception {
        // テスト実行
        mockMvc.perform(post("/api/reports/generate")
                .contentType("application/json")
                .content("{\"employeeId\":null,\"yearMonth\":\"2025-09\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("従業員IDが無効です")));
    }
    
    @Test
    void generateReport_異常系_従業員IDが0以下() throws Exception {
        // テスト実行
        mockMvc.perform(post("/api/reports/generate")
                .contentType("application/json")
                .content("{\"employeeId\":0,\"yearMonth\":\"2025-09\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("従業員IDが無効です")));
    }
    
    @Test
    void generateReport_異常系_年月がnull() throws Exception {
        // テスト実行
        mockMvc.perform(post("/api/reports/generate")
                .contentType("application/json")
                .content("{\"employeeId\":2,\"yearMonth\":null}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("年月が指定されていません")));
    }
    
    @Test
    void generateReport_異常系_年月が空文字() throws Exception {
        // テスト実行
        mockMvc.perform(post("/api/reports/generate")
                .contentType("application/json")
                .content("{\"employeeId\":2,\"yearMonth\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("年月が指定されていません")));
    }
    
    @Test
    void generateReport_異常系_年月フォーマットが不正() throws Exception {
        // テスト実行
        mockMvc.perform(post("/api/reports/generate")
                .contentType("application/json")
                .content("{\"employeeId\":2,\"yearMonth\":\"2025/09\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("年月フォーマットが不正です")));
    }
    
    @Test
    void generateReport_異常系_リクエストがnull() throws Exception {
        // テスト実行
        mockMvc.perform(post("/api/reports/generate")
                .contentType("application/json")
                .content("null"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("リクエストがnullです")));
    }
    
    @Test
    void generateReport_異常系_FastAPIサービスがエラーを返す() throws Exception {
        // モックの設定 - FastAPIサービスがエラーを返す場合
        ResponseEntity<ReportGenerateResponse> mockResponse = new ResponseEntity<>(
            new ReportGenerateResponse("PDF生成に失敗しました"), 
            HttpStatus.INTERNAL_SERVER_ERROR
        );
        when(restTemplate.exchange(
            anyString(),
            any(),
            any(),
            eq(ReportGenerateResponse.class)
        )).thenReturn(mockResponse);
        
        // テスト実行
        mockMvc.perform(post("/api/reports/generate")
                .contentType("application/json")
                .content("{\"employeeId\":2,\"yearMonth\":\"2025-09\"}"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value("PDF生成に失敗しました"));
    }
    
    @Test
    void generateReport_異常系_FastAPIサービスとの通信エラー() throws Exception {
        // モックの設定 - 通信エラーが発生する場合
        when(restTemplate.exchange(
            anyString(),
            any(),
            any(),
            eq(ReportGenerateResponse.class)
        )).thenThrow(new RuntimeException("Connection refused"));
        
        // テスト実行
        mockMvc.perform(post("/api/reports/generate")
                .contentType("application/json")
                .content("{\"employeeId\":2,\"yearMonth\":\"2025-09\"}"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value(containsString("PDF生成サービスとの通信に失敗しました")));
    }
    
    @Test
    void generateReport_異常系_無効なJSON() throws Exception {
        // テスト実行
        mockMvc.perform(post("/api/reports/generate")
                .contentType("application/json")
                .content("{\"employeeId\":2,\"yearMonth\":\"2025-09\"")) // 閉じ括弧なし
                .andExpect(status().isBadRequest());
    }
    
    @Test
    void generateReport_異常系_ContentTypeが不正() throws Exception {
        // テスト実行
        mockMvc.perform(post("/api/reports/generate")
                .contentType("text/plain")
                .content("{\"employeeId\":2,\"yearMonth\":\"2025-09\"}"))
                .andExpect(status().isUnsupportedMediaType());
    }
}
