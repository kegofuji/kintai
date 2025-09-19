package com.kintai.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kintai.dto.AdjustmentRequestDto;
import com.kintai.entity.AdjustmentRequest;
import com.kintai.entity.AttendanceRecord;
import com.kintai.entity.Employee;
import com.kintai.repository.AdjustmentRequestRepository;
import com.kintai.repository.AttendanceRecordRepository;
import com.kintai.repository.EmployeeRepository;
import com.kintai.config.TestConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureWebMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * 打刻修正申請の統合テスト
 * 
 * テストケース:
 * 1. 正常申請 → 正常承認 → 勤怠データ更新を検証
 * 2. 不正申請（未来日や重複申請） → 400 エラーを検証
 */
@SpringBootTest
@AutoConfigureWebMvc
@ActiveProfiles("test")
@Import(TestConfig.class)
@Transactional
class AdjustmentRequestIntegrationTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private AdjustmentRequestRepository adjustmentRequestRepository;

    @Autowired
    private AttendanceRecordRepository attendanceRecordRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private MockMvc mockMvc;

    private Employee testEmployee;
    private LocalDate testDate;
    private LocalDateTime testClockIn;
    private LocalDateTime testClockOut;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
        
        // テスト用の従業員を作成
        testEmployee = new Employee("EMP001", "テスト", "太郎", "test@example.com", LocalDate.now().minusYears(1));
        testEmployee.setEmployeeId(1L);
        employeeRepository.save(testEmployee);

        // テスト用の日時を設定（昨日の日付）
        testDate = LocalDate.now().minusDays(1);
        testClockIn = LocalDateTime.of(testDate, LocalTime.of(9, 30)); // 30分遅刻
        testClockOut = LocalDateTime.of(testDate, LocalTime.of(19, 0)); // 1時間残業
    }

    /**
     * 正常申請 → 正常承認 → 勤怠データ更新のテスト
     */
    @Test
    void testNormalAdjustmentRequestFlow() throws Exception {
        // 1. 修正申請を送信
        AdjustmentRequestDto requestDto = new AdjustmentRequestDto();
        requestDto.setEmployeeId(testEmployee.getEmployeeId());
        requestDto.setTargetDate(testDate);
        requestDto.setNewClockIn(testClockIn);
        requestDto.setNewClockOut(testClockOut);
        requestDto.setReason("交通機関の遅延のため");

        String requestJson = objectMapper.writeValueAsString(requestDto);

        // 申請送信
        String responseJson = mockMvc.perform(post("/api/attendance/adjustment")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.adjustmentRequestId").exists())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        // 申請IDを取得
        Long adjustmentRequestId = objectMapper.readTree(responseJson)
                .get("adjustmentRequestId").asLong();

        // 2. 申請が正しく保存されていることを確認
        AdjustmentRequest savedRequest = adjustmentRequestRepository.findById(adjustmentRequestId).orElse(null);
        assertNotNull(savedRequest);
        assertEquals(testEmployee.getEmployeeId(), savedRequest.getEmployeeId());
        assertEquals(testDate, savedRequest.getTargetDate());
        assertEquals(testClockIn, savedRequest.getNewClockIn());
        assertEquals(testClockOut, savedRequest.getNewClockOut());
        assertEquals("交通機関の遅延のため", savedRequest.getReason());
        assertEquals(AdjustmentRequest.AdjustmentStatus.PENDING, savedRequest.getStatus());

        // 3. 管理者が申請を承認
        mockMvc.perform(post("/api/admin/attendance/adjustment/approve/" + adjustmentRequestId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.adjustmentRequestId").value(adjustmentRequestId))
                .andExpect(jsonPath("$.status").value("APPROVED"));

        // 4. 承認後、申請の状態が更新されていることを確認
        AdjustmentRequest approvedRequest = adjustmentRequestRepository.findById(adjustmentRequestId).orElse(null);
        assertNotNull(approvedRequest);
        assertEquals(AdjustmentRequest.AdjustmentStatus.APPROVED, approvedRequest.getStatus());

        // 5. 勤怠記録が正しく更新されていることを確認
        AttendanceRecord attendanceRecord = attendanceRecordRepository
                .findByEmployeeIdAndAttendanceDate(testEmployee.getEmployeeId(), testDate)
                .orElse(null);
        
        assertNotNull(attendanceRecord);
        assertEquals(testClockIn, attendanceRecord.getClockInTime());
        assertEquals(testClockOut, attendanceRecord.getClockOutTime());
        
        // 6. 遅刻・早退・残業・深夜の集計が再計算されていることを確認
        assertTrue(attendanceRecord.getLateMinutes() > 0, "遅刻時間が正しく計算されている");
        assertEquals(0, attendanceRecord.getEarlyLeaveMinutes(), "早退時間は0である");
        // 残業時間の計算を確認（9:30-19:00で実働8.5時間、標準8時間なので残業30分）
        assertTrue(attendanceRecord.getOvertimeMinutes() > 0, "残業時間が正しく計算されている");
        
        // 7. 勤怠ステータスが正しく設定されていることを確認
        assertNotNull(attendanceRecord.getAttendanceStatus());
    }

    /**
     * 未来日申請のテスト（400エラー）
     */
    @Test
    void testFutureDateAdjustmentRequest() throws Exception {
        // 未来日の修正申請を作成
        AdjustmentRequestDto requestDto = new AdjustmentRequestDto();
        requestDto.setEmployeeId(testEmployee.getEmployeeId());
        requestDto.setTargetDate(LocalDate.now().plusDays(1)); // 未来日
        requestDto.setNewClockIn(testClockIn);
        requestDto.setNewClockOut(testClockOut);
        requestDto.setReason("テスト理由");

        String requestJson = objectMapper.writeValueAsString(requestDto);

        // 申請送信（400エラーが期待される）
        mockMvc.perform(post("/api/attendance/adjustment")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("INVALID_DATE"));

        // 申請が保存されていないことを確認
        long requestCount = adjustmentRequestRepository.count();
        assertEquals(0, requestCount, "未来日の申請は保存されない");
    }

    /**
     * 重複申請のテスト（400エラー）
     */
    @Test
    void testDuplicateAdjustmentRequest() throws Exception {
        // 1回目の申請を作成
        AdjustmentRequestDto requestDto = new AdjustmentRequestDto();
        requestDto.setEmployeeId(testEmployee.getEmployeeId());
        requestDto.setTargetDate(testDate);
        requestDto.setNewClockIn(testClockIn);
        requestDto.setNewClockOut(testClockOut);
        requestDto.setReason("1回目の申請");

        String requestJson = objectMapper.writeValueAsString(requestDto);

        // 1回目の申請送信（成功）
        mockMvc.perform(post("/api/attendance/adjustment")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isOk());

        // 2回目の申請送信（同じ日付で重複申請）
        requestDto.setReason("2回目の申請");
        String duplicateRequestJson = objectMapper.writeValueAsString(requestDto);

        mockMvc.perform(post("/api/attendance/adjustment")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(duplicateRequestJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("DUPLICATE_REQUEST"));

        // 申請が1件のみ保存されていることを確認
        long requestCount = adjustmentRequestRepository.count();
        assertEquals(1, requestCount, "重複申請は保存されない");
    }

    /**
     * 出勤時間が退勤時間より後の場合のテスト（400エラー）
     */
    @Test
    void testInvalidTimeOrderAdjustmentRequest() throws Exception {
        // 出勤時間が退勤時間より後の申請を作成
        AdjustmentRequestDto requestDto = new AdjustmentRequestDto();
        requestDto.setEmployeeId(testEmployee.getEmployeeId());
        requestDto.setTargetDate(testDate);
        requestDto.setNewClockIn(testClockOut); // 出勤時間を退勤時間に設定
        requestDto.setNewClockOut(testClockIn); // 退勤時間を出勤時間に設定
        requestDto.setReason("時間設定ミス");

        String requestJson = objectMapper.writeValueAsString(requestDto);

        // 申請送信（400エラーが期待される）
        mockMvc.perform(post("/api/attendance/adjustment")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("INVALID_TIME_ORDER"));

        // 申請が保存されていないことを確認
        long requestCount = adjustmentRequestRepository.count();
        assertEquals(0, requestCount, "無効な時間順序の申請は保存されない");
    }

    /**
     * 存在しない従業員IDでの申請テスト（400エラー）
     */
    @Test
    void testNonExistentEmployeeAdjustmentRequest() throws Exception {
        // 存在しない従業員IDでの申請を作成
        AdjustmentRequestDto requestDto = new AdjustmentRequestDto();
        requestDto.setEmployeeId(999L); // 存在しない従業員ID
        requestDto.setTargetDate(testDate);
        requestDto.setNewClockIn(testClockIn);
        requestDto.setNewClockOut(testClockOut);
        requestDto.setReason("テスト理由");

        String requestJson = objectMapper.writeValueAsString(requestDto);

        // 申請送信（400エラーが期待される）
        mockMvc.perform(post("/api/attendance/adjustment")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("EMPLOYEE_NOT_FOUND"));

        // 申請が保存されていないことを確認
        long requestCount = adjustmentRequestRepository.count();
        assertEquals(0, requestCount, "存在しない従業員の申請は保存されない");
    }

    /**
     * 理由が空の場合のテスト（400エラー）
     */
    @Test
    void testEmptyReasonAdjustmentRequest() throws Exception {
        // 理由が空の申請を作成
        AdjustmentRequestDto requestDto = new AdjustmentRequestDto();
        requestDto.setEmployeeId(testEmployee.getEmployeeId());
        requestDto.setTargetDate(testDate);
        requestDto.setNewClockIn(testClockIn);
        requestDto.setNewClockOut(testClockOut);
        requestDto.setReason(""); // 空の理由

        String requestJson = objectMapper.writeValueAsString(requestDto);

        // 申請送信（400エラーが期待される）
        mockMvc.perform(post("/api/attendance/adjustment")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isBadRequest());
    }

    /**
     * 理由が500文字を超える場合のテスト（400エラー）
     */
    @Test
    void testTooLongReasonAdjustmentRequest() throws Exception {
        // 理由が500文字を超える申請を作成
        AdjustmentRequestDto requestDto = new AdjustmentRequestDto();
        requestDto.setEmployeeId(testEmployee.getEmployeeId());
        requestDto.setTargetDate(testDate);
        requestDto.setNewClockIn(testClockIn);
        requestDto.setNewClockOut(testClockOut);
        requestDto.setReason("a".repeat(501)); // 501文字の理由

        String requestJson = objectMapper.writeValueAsString(requestDto);

        // 申請送信（400エラーが期待される）
        mockMvc.perform(post("/api/attendance/adjustment")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isBadRequest());
    }

    /**
     * 存在しない申請IDでの承認テスト（400エラー）
     */
    @Test
    void testApproveNonExistentAdjustmentRequest() throws Exception {
        // 存在しない申請IDで承認を試行
        mockMvc.perform(post("/api/admin/attendance/adjustment/approve/999"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("ADJUSTMENT_REQUEST_NOT_FOUND"));
    }

    /**
     * 既に承認済みの申請の再承認テスト（400エラー）
     */
    @Test
    void testApproveAlreadyApprovedAdjustmentRequest() throws Exception {
        // 1. 修正申請を作成
        AdjustmentRequestDto requestDto = new AdjustmentRequestDto();
        requestDto.setEmployeeId(testEmployee.getEmployeeId());
        requestDto.setTargetDate(testDate);
        requestDto.setNewClockIn(testClockIn);
        requestDto.setNewClockOut(testClockOut);
        requestDto.setReason("テスト理由");

        String requestJson = objectMapper.writeValueAsString(requestDto);

        // 申請送信
        String responseJson = mockMvc.perform(post("/api/attendance/adjustment")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        Long adjustmentRequestId = objectMapper.readTree(responseJson)
                .get("adjustmentRequestId").asLong();

        // 2. 1回目の承認（成功）
        mockMvc.perform(post("/api/admin/attendance/adjustment/approve/" + adjustmentRequestId))
                .andExpect(status().isOk());

        // 3. 2回目の承認（400エラー）
        mockMvc.perform(post("/api/admin/attendance/adjustment/approve/" + adjustmentRequestId))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("INVALID_STATUS"));
    }

    /**
     * 深夜勤務を含む修正申請のテスト
     */
    @Test
    void testNightShiftAdjustmentRequest() throws Exception {
        // 深夜勤務の修正申請を作成
        LocalDateTime nightClockIn = LocalDateTime.of(testDate, LocalTime.of(23, 0));
        LocalDateTime nightClockOut = LocalDateTime.of(testDate.plusDays(1), LocalTime.of(6, 0));

        AdjustmentRequestDto requestDto = new AdjustmentRequestDto();
        requestDto.setEmployeeId(testEmployee.getEmployeeId());
        requestDto.setTargetDate(testDate);
        requestDto.setNewClockIn(nightClockIn);
        requestDto.setNewClockOut(nightClockOut);
        requestDto.setReason("深夜勤務の修正");

        String requestJson = objectMapper.writeValueAsString(requestDto);

        // 申請送信
        String responseJson = mockMvc.perform(post("/api/attendance/adjustment")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        Long adjustmentRequestId = objectMapper.readTree(responseJson)
                .get("adjustmentRequestId").asLong();

        // 承認
        mockMvc.perform(post("/api/admin/attendance/adjustment/approve/" + adjustmentRequestId))
                .andExpect(status().isOk());

        // 深夜勤務時間が正しく計算されていることを確認
        AttendanceRecord attendanceRecord = attendanceRecordRepository
                .findByEmployeeIdAndAttendanceDate(testEmployee.getEmployeeId(), testDate)
                .orElse(null);

        assertNotNull(attendanceRecord);
        assertTrue(attendanceRecord.getNightShiftMinutes() > 0, "深夜勤務時間が正しく計算されている");
    }
}
