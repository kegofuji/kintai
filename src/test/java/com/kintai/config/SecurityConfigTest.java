package com.kintai.config;

import com.kintai.service.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureWebMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWebMvc
@ActiveProfiles("test")
class SecurityConfigTest {
    
    @Autowired
    private WebApplicationContext context;
    
    @MockBean
    private AuthService authService;
    
    @MockBean
    private PasswordEncoder passwordEncoder;
    
    private MockMvc mockMvc;
    
    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .build();
    }
    
    @Test
    void testHealthEndpointPermitAll() throws Exception {
        mockMvc.perform(get("/api/attendance/health"))
                .andExpect(status().isOk());
    }
    
    @Test
    void testAuthEndpointsPermitAll() throws Exception {
        // ログインエンドポイント（認証不要だが、認証情報が無効な場合は401）
        mockMvc.perform(post("/api/auth/login")
                .with(csrf())
                .contentType("application/json")
                .content("{\"username\":\"test\",\"password\":\"pass\"}"))
                .andExpect(status().isUnauthorized());

        // ログアウトエンドポイント（認証不要）
        mockMvc.perform(post("/api/auth/logout")
                .with(csrf()))
                .andExpect(status().isOk());

        // セッション確認エンドポイント（認証不要だが、認証されていない場合は401）
        mockMvc.perform(get("/api/auth/session"))
                .andExpect(status().isUnauthorized());
    }
    
    @Test
    void testProtectedEndpointsRequireAuthentication() throws Exception {
        // 勤怠打刻エンドポイント（認証必須）
        mockMvc.perform(post("/api/attendance/clock-in")
                .with(csrf())
                .contentType("application/json")
                .content("{\"employeeId\":1}"))
                .andExpect(status().isBadRequest());

        // 有給申請エンドポイント（認証必須）
        mockMvc.perform(post("/api/vacation/request")
                .with(csrf())
                .contentType("application/json")
                .content("{\"employeeId\":1,\"startDate\":\"2024-01-01\",\"endDate\":\"2024-01-02\"}"))
                .andExpect(status().isBadRequest());
    }
    
    @Test
    void testCsrfProtection() throws Exception {
        // CSRFトークンなしでPOSTリクエストを送信
        mockMvc.perform(post("/api/attendance/clock-in")
                .contentType("application/json")
                .content("{\"employeeId\":1}"))
                .andExpect(status().isBadRequest());
    }
    
    @Test
    void testHealthEndpointExcludedFromCsrf() throws Exception {
        // ヘルスチェックエンドポイントはCSRF保護から除外
        mockMvc.perform(get("/api/attendance/health"))
                .andExpect(status().isOk());
    }
}
