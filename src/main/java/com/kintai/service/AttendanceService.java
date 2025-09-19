package com.kintai.service;

import com.kintai.dto.ClockInRequest;
import com.kintai.dto.ClockOutRequest;
import com.kintai.dto.ClockResponse;
import com.kintai.dto.MonthlySubmitRequest;
import com.kintai.entity.AttendanceRecord;
import com.kintai.entity.AttendanceStatus;
import com.kintai.entity.Employee;
import com.kintai.entity.SubmissionStatus;
import com.kintai.entity.VacationRequest;
import com.kintai.exception.AttendanceException;
import com.kintai.repository.AttendanceRecordRepository;
import com.kintai.repository.EmployeeRepository;
import com.kintai.repository.VacationRequestRepository;
import com.kintai.util.TimeCalculator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

/**
 * 勤怠管理サービス
 */
@Service
@Transactional
public class AttendanceService {
    
    @Autowired
    private AttendanceRecordRepository attendanceRecordRepository;
    
    @Autowired
    private EmployeeRepository employeeRepository;
    
    @Autowired
    private TimeCalculator timeCalculator;
    
    @Autowired
    private VacationRequestRepository vacationRequestRepository;
    
    /**
     * 出勤打刻処理
     * @param request 出勤打刻リクエスト
     * @return 打刻レスポンス
     */
    public ClockResponse clockIn(ClockInRequest request) {
        Long employeeId = request.getEmployeeId();
        LocalDate today = LocalDate.now();
        LocalDateTime now = timeCalculator.getCurrentTokyoTime();
        
        // 1. 従業員存在チェック
        Employee employee = employeeRepository.findByEmployeeId(employeeId)
                .orElseThrow(() -> new AttendanceException(
                        AttendanceException.EMPLOYEE_NOT_FOUND, 
                        "従業員が見つかりません"));
        
        // 2. 退職者チェック
        if (employee.isRetired()) {
            throw new AttendanceException(
                    AttendanceException.RETIRED_EMPLOYEE, 
                    "退職済みの従業員です");
        }
        
        // 3. 重複出勤チェック
        if (attendanceRecordRepository.existsByEmployeeIdAndAttendanceDateAndClockInTimeIsNotNull(employeeId, today)) {
            throw new AttendanceException(
                    AttendanceException.ALREADY_CLOCKED_IN, 
                    "既に出勤打刻済みです");
        }
        
        // 4. 出勤打刻記録作成
        AttendanceRecord attendanceRecord = new AttendanceRecord(employeeId, today);
        attendanceRecord.setClockInTime(now);
        
        // 5. 遅刻時間計算
        int lateMinutes = timeCalculator.calculateLateMinutes(now);
        attendanceRecord.setLateMinutes(lateMinutes);
        
        // 6. 勤怠ステータス設定
        if (lateMinutes > 0) {
            attendanceRecord.setAttendanceStatus(AttendanceStatus.LATE);
        }
        
        // 7. データベース保存
        AttendanceRecord savedRecord = attendanceRecordRepository.save(attendanceRecord);
        
        // 8. レスポンス作成
        ClockResponse.ClockData data = new ClockResponse.ClockData(
                savedRecord.getAttendanceId(),
                savedRecord.getClockInTime(),
                null,
                savedRecord.getLateMinutes(),
                null,
                null,
                null
        );
        
        String message = lateMinutes > 0 ? 
                String.format("出勤打刻完了（%d分遅刻）", lateMinutes) : 
                "出勤打刻完了";
        
        return new ClockResponse(true, message, data);
    }
    
    /**
     * 退勤打刻処理
     * @param request 退勤打刻リクエスト
     * @return 打刻レスポンス
     */
    public ClockResponse clockOut(ClockOutRequest request) {
        try {
            Long employeeId = request.getEmployeeId();
            LocalDate today = LocalDate.now();
            LocalDateTime now = timeCalculator.getCurrentTokyoTime();
            
            // 1. 従業員存在チェック
            Employee employee = employeeRepository.findByEmployeeId(employeeId)
                    .orElseThrow(() -> new AttendanceException(
                            AttendanceException.EMPLOYEE_NOT_FOUND, 
                            "従業員が見つかりません"));
            
            // 2. 退職者チェック
            if (employee.isRetired()) {
                throw new AttendanceException(
                        AttendanceException.RETIRED_EMPLOYEE, 
                        "退職済みの従業員です");
            }
            
            // 3. 出勤済みチェック
            AttendanceRecord attendanceRecord = attendanceRecordRepository
                    .findEditableRecord(employeeId, today)
                    .orElseThrow(() -> new AttendanceException(
                            AttendanceException.NOT_CLOCKED_IN, 
                            "出勤打刻がされていません"));
            
            // 4. 既に退勤済みチェック
            if (attendanceRecord.getClockOutTime() != null) {
                throw new AttendanceException(
                        AttendanceException.ALREADY_CLOCKED_IN, 
                        "既に退勤打刻済みです");
            }
            
            // 5. 退勤時刻設定
            attendanceRecord.setClockOutTime(now);
            
            // 6. 時間計算
            LocalDateTime clockInTime = attendanceRecord.getClockInTime();
            
            // 早退時間計算
            int earlyLeaveMinutes = timeCalculator.calculateEarlyLeaveMinutes(now);
            attendanceRecord.setEarlyLeaveMinutes(earlyLeaveMinutes);
            
            // 実働時間計算
            int workingMinutes = timeCalculator.calculateWorkingMinutes(clockInTime, now);
            
            // 残業時間計算
            int overtimeMinutes = timeCalculator.calculateOvertimeMinutes(workingMinutes);
            attendanceRecord.setOvertimeMinutes(overtimeMinutes);
            
            // 深夜勤務時間計算
            int nightShiftMinutes = timeCalculator.calculateNightShiftMinutes(clockInTime, now);
            attendanceRecord.setNightShiftMinutes(nightShiftMinutes);
            
            // 7. 勤怠ステータス更新
            updateAttendanceStatus(attendanceRecord, earlyLeaveMinutes, overtimeMinutes, nightShiftMinutes);
            
            // 8. データベース保存
            AttendanceRecord savedRecord = attendanceRecordRepository.save(attendanceRecord);
            
            // 9. レスポンス作成
            ClockResponse.ClockData data = new ClockResponse.ClockData(
                    savedRecord.getAttendanceId(),
                    savedRecord.getClockInTime(),
                    savedRecord.getClockOutTime(),
                    savedRecord.getLateMinutes(),
                    savedRecord.getEarlyLeaveMinutes(),
                    savedRecord.getOvertimeMinutes(),
                    savedRecord.getNightShiftMinutes()
            );
            
            String message = buildClockOutMessage(overtimeMinutes, earlyLeaveMinutes, nightShiftMinutes);
            
            return new ClockResponse(true, message, data);
        } catch (AttendanceException e) {
            throw e;
        } catch (Exception e) {
            e.printStackTrace();
            throw new AttendanceException("INTERNAL_ERROR", "内部エラーが発生しました: " + e.getMessage());
        }
    }
    
    /**
     * 勤怠ステータスを更新
     * @param record 勤怠記録
     * @param earlyLeaveMinutes 早退分数
     * @param overtimeMinutes 残業分数
     * @param nightShiftMinutes 深夜勤務分数
     */
    private void updateAttendanceStatus(AttendanceRecord record, int earlyLeaveMinutes, 
                                      int overtimeMinutes, int nightShiftMinutes) {
        boolean isLate = record.getLateMinutes() > 0;
        boolean isEarlyLeave = earlyLeaveMinutes > 0;
        boolean isOvertime = overtimeMinutes > 0;
        boolean isNightShift = nightShiftMinutes > 0;
        
        if (isLate && isEarlyLeave) {
            record.setAttendanceStatus(AttendanceStatus.LATE_AND_EARLY_LEAVE);
        } else if (isLate) {
            record.setAttendanceStatus(AttendanceStatus.LATE);
        } else if (isEarlyLeave) {
            record.setAttendanceStatus(AttendanceStatus.EARLY_LEAVE);
        } else if (isNightShift) {
            record.setAttendanceStatus(AttendanceStatus.NIGHT_SHIFT);
        } else if (isOvertime) {
            record.setAttendanceStatus(AttendanceStatus.OVERTIME);
        } else {
            record.setAttendanceStatus(AttendanceStatus.NORMAL);
        }
    }
    
    /**
     * 退勤メッセージを構築
     * @param overtimeMinutes 残業分数
     * @param earlyLeaveMinutes 早退分数
     * @param nightShiftMinutes 深夜勤務分数
     * @return メッセージ
     */
    private String buildClockOutMessage(int overtimeMinutes, int earlyLeaveMinutes, int nightShiftMinutes) {
        StringBuilder message = new StringBuilder("退勤打刻完了");
        
        if (overtimeMinutes > 0) {
            message.append(String.format("（%d分残業）", overtimeMinutes));
        }
        
        if (earlyLeaveMinutes > 0) {
            message.append(String.format("（%d分早退）", earlyLeaveMinutes));
        }
        
        if (nightShiftMinutes > 0) {
            message.append(String.format("（%d分深夜勤務）", nightShiftMinutes));
        }
        
        return message.toString();
    }
    
    /**
     * 勤怠履歴取得
     * @param employeeId 従業員ID
     * @return 勤怠履歴レスポンス
     */
    public ClockResponse getAttendanceHistory(Long employeeId) {
        try {
            // 1. 従業員存在チェック
            Employee employee = employeeRepository.findByEmployeeId(employeeId)
                    .orElseThrow(() -> new AttendanceException(
                            AttendanceException.EMPLOYEE_NOT_FOUND, 
                            "従業員が見つかりません"));
            
            // 2. 退職者チェック
            if (employee.isRetired()) {
                throw new AttendanceException(
                        AttendanceException.RETIRED_EMPLOYEE, 
                        "退職済みの従業員です");
            }
            
            // 3. 勤怠履歴を取得（過去30日分）
            LocalDate endDate = LocalDate.now();
            LocalDate startDate = endDate.minusDays(30);
            
            List<AttendanceRecord> records = attendanceRecordRepository
                    .findByEmployeeIdAndAttendanceDateBetweenOrderByAttendanceDateDesc(employeeId, startDate, endDate);
            
            return new ClockResponse(true, "勤怠履歴を取得しました", records);
            
        } catch (AttendanceException e) {
            throw e;
        } catch (Exception e) {
            e.printStackTrace();
            throw new AttendanceException("INTERNAL_ERROR", "勤怠履歴の取得に失敗しました: " + e.getMessage());
        }
    }
    
    /**
     * 指定月の勤怠履歴取得
     * @param employeeId 従業員ID
     * @param year 年
     * @param month 月
     * @return 勤怠履歴レスポンス
     */
    public ClockResponse getAttendanceHistoryForMonth(Long employeeId, int year, int month) {
        try {
            // 1. 従業員存在チェック
            Employee employee = employeeRepository.findByEmployeeId(employeeId)
                    .orElseThrow(() -> new AttendanceException(
                            AttendanceException.EMPLOYEE_NOT_FOUND, 
                            "従業員が見つかりません"));
            
            // 2. 退職者チェック
            if (employee.isRetired()) {
                throw new AttendanceException(
                        AttendanceException.RETIRED_EMPLOYEE, 
                        "退職済みの従業員です");
            }
            
            // 3. 指定月の勤怠履歴を取得
            List<AttendanceRecord> records = attendanceRecordRepository
                    .findByEmployeeAndMonth(employeeId, year, month);
            
            return new ClockResponse(true, "指定月の勤怠履歴を取得しました", records);
            
        } catch (AttendanceException e) {
            throw e;
        } catch (Exception e) {
            e.printStackTrace();
            throw new AttendanceException("INTERNAL_ERROR", "月別勤怠履歴の取得に失敗しました: " + e.getMessage());
        }
    }
    
    /**
     * 月末申請処理
     * @param request 月末申請リクエスト
     * @return 申請レスポンス
     */
    public ClockResponse submitMonthly(MonthlySubmitRequest request) {
        try {
            Long employeeId = request.getEmployeeId();
            String yearMonth = request.getYearMonth();
            
            // 1. 従業員存在チェック
            Employee employee = employeeRepository.findByEmployeeId(employeeId)
                    .orElseThrow(() -> new AttendanceException(
                            AttendanceException.EMPLOYEE_NOT_FOUND, 
                            "従業員が見つかりません"));
            
            // 2. 退職者チェック
            if (employee.isRetired()) {
                throw new AttendanceException(
                        AttendanceException.RETIRED_EMPLOYEE, 
                        "退職済みの従業員です");
            }
            
            // 3. 未来月申請チェック
            YearMonth currentMonth = YearMonth.now();
            YearMonth requestMonth = YearMonth.parse(yearMonth, DateTimeFormatter.ofPattern("yyyy-MM"));
            if (requestMonth.isAfter(currentMonth)) {
                throw new AttendanceException(
                        "FUTURE_MONTH_NOT_ALLOWED", 
                        "未来月の申請はできません");
            }
            
            // 4. 該当月の勤怠記録を取得
            YearMonth requestYearMonth = YearMonth.parse(yearMonth, DateTimeFormatter.ofPattern("yyyy-MM"));
            List<AttendanceRecord> records = attendanceRecordRepository.findByEmployeeAndMonth(employeeId, requestYearMonth.getYear(), requestYearMonth.getMonthValue());
            
            if (records.isEmpty()) {
                throw new AttendanceException(
                        "NO_RECORDS_FOUND", 
                        "該当月の勤怠記録が見つかりません");
            }
            
            // 5. 既に確定済みかチェック
            boolean alreadyFixed = records.stream().anyMatch(AttendanceRecord::getAttendanceFixedFlag);
            if (alreadyFixed) {
                throw new AttendanceException(
                        "ALREADY_SUBMITTED", 
                        "既に申請済みです");
            }
            
            // 6. 未打刻チェック（全営業日で出勤・退勤の両方が打刻されているか）
            List<AttendanceRecord> incompleteRecords = records.stream()
                    .filter(record -> record.getClockInTime() == null || record.getClockOutTime() == null)
                    .toList();
            
            if (!incompleteRecords.isEmpty()) {
                throw new AttendanceException(
                        "INCOMPLETE_ATTENDANCE", 
                        "未打刻の日があります");
            }
            
            // 7. 未承認有給申請チェック
            LocalDate monthStart = requestYearMonth.atDay(1);
            LocalDate monthEnd = requestYearMonth.atEndOfMonth();
            
            List<VacationRequest> pendingVacationRequests = vacationRequestRepository
                    .findPendingVacationRequestsInPeriod(employeeId, monthStart, monthEnd);
            
            if (!pendingVacationRequests.isEmpty()) {
                throw new AttendanceException(
                        "PENDING_VACATION_REQUESTS", 
                        "未承認の有給申請があります");
            }
            
            // 8. 勤怠記録を申請済み状態に更新
            for (AttendanceRecord record : records) {
                record.setSubmissionStatus(SubmissionStatus.SUBMITTED);
            }
            attendanceRecordRepository.saveAll(records);
            
            // 9. レスポンス作成
            ClockResponse.MonthlySubmitData data = new ClockResponse.MonthlySubmitData(
                    employeeId, 
                    yearMonth, 
                    records.size()
            );
            
            String message = String.format("%sの勤怠を申請しました", yearMonth);
            return new ClockResponse(true, message, data);
            
        } catch (AttendanceException e) {
            throw e;
        } catch (Exception e) {
            e.printStackTrace();
            throw new AttendanceException("INTERNAL_ERROR", "内部エラーが発生しました: " + e.getMessage());
        }
    }
    
    /**
     * 月末申請承認処理
     * @param employeeId 従業員ID
     * @param yearMonth 年月
     * @return 承認レスポンス
     */
    public ClockResponse approveMonthlySubmission(Long employeeId, String yearMonth) {
        try {
            // 1. 従業員存在チェック
            employeeRepository.findByEmployeeId(employeeId)
                    .orElseThrow(() -> new AttendanceException(
                            AttendanceException.EMPLOYEE_NOT_FOUND, 
                            "従業員が見つかりません"));
            
            // 2. 該当月の勤怠記録を取得
            YearMonth requestYearMonth = YearMonth.parse(yearMonth, DateTimeFormatter.ofPattern("yyyy-MM"));
            List<AttendanceRecord> records = attendanceRecordRepository.findByEmployeeAndMonth(employeeId, requestYearMonth.getYear(), requestYearMonth.getMonthValue());
            
            if (records.isEmpty()) {
                throw new AttendanceException(
                        "NO_RECORDS_FOUND", 
                        "該当月の勤怠記録が見つかりません");
            }
            
            // 3. 申請済みかチェック
            boolean isSubmitted = records.stream().anyMatch(record -> 
                record.getSubmissionStatus() == SubmissionStatus.SUBMITTED);
            
            if (!isSubmitted) {
                throw new AttendanceException(
                        "NOT_SUBMITTED", 
                        "申請されていません");
            }
            
            // 4. 既に承認済みかチェック
            boolean alreadyApproved = records.stream().anyMatch(AttendanceRecord::getAttendanceFixedFlag);
            if (alreadyApproved) {
                throw new AttendanceException(
                        "ALREADY_APPROVED", 
                        "既に承認済みです");
            }
            
            // 5. 勤怠記録を承認状態に更新
            for (AttendanceRecord record : records) {
                record.setAttendanceFixedFlag(true);
                record.setSubmissionStatus(SubmissionStatus.APPROVED);
            }
            attendanceRecordRepository.saveAll(records);
            
            // 6. レスポンス作成
            ClockResponse.MonthlySubmitData data = new ClockResponse.MonthlySubmitData(
                    employeeId, 
                    yearMonth, 
                    records.size()
            );
            
            String message = String.format("%sの勤怠を承認しました", yearMonth);
            return new ClockResponse(true, message, data);
            
        } catch (AttendanceException e) {
            throw e;
        } catch (Exception e) {
            e.printStackTrace();
            throw new AttendanceException("INTERNAL_ERROR", "内部エラーが発生しました: " + e.getMessage());
        }
    }
    
    /**
     * 今日の勤怠状況取得
     * @param employeeId 従業員ID
     * @return 勤怠レスポンス
     */
    public ClockResponse getTodayAttendance(Long employeeId) {
        LocalDate today = LocalDate.now();
        
        // 1. 従業員存在チェック
        Employee employee = employeeRepository.findByEmployeeId(employeeId)
                .orElseThrow(() -> new AttendanceException(
                        AttendanceException.EMPLOYEE_NOT_FOUND, 
                        "従業員が見つかりません"));
        
        // 2. 退職者チェック
        if (employee.isRetired()) {
            throw new AttendanceException(
                    AttendanceException.RETIRED_EMPLOYEE, 
                    "退職済みの従業員です");
        }
        
        // 3. 今日の勤怠記録を取得
        Optional<AttendanceRecord> attendanceRecord = attendanceRecordRepository
                .findByEmployeeIdAndAttendanceDate(employeeId, today);
        
        if (attendanceRecord.isPresent()) {
            AttendanceRecord record = attendanceRecord.get();
            ClockResponse.ClockData clockData = new ClockResponse.ClockData(
                    record.getAttendanceId(),
                    record.getClockInTime(),
                    record.getClockOutTime(),
                    record.getLateMinutes(),
                    record.getEarlyLeaveMinutes(),
                    record.getOvertimeMinutes(),
                    record.getNightShiftMinutes()
            );
            ClockResponse response = new ClockResponse();
            response.setSuccess(true);
            response.setMessage("今日の勤怠状況を取得しました");
            response.setData(clockData);
            return response;
        } else {
            // 今日の記録がない場合はnullを返す
            ClockResponse response = new ClockResponse();
            response.setSuccess(true);
            response.setMessage("今日の勤怠記録はありません");
            response.setData(null);
            return response;
        }
    }
}
