package com.kintai.service;

import com.kintai.entity.AttendanceRecord;
import com.kintai.entity.Employee;
import com.kintai.entity.SubmissionStatus;
import com.kintai.entity.VacationRequest;
import com.kintai.entity.VacationStatus;
import com.kintai.repository.AttendanceRecordRepository;
import com.kintai.repository.EmployeeRepository;
import com.kintai.repository.VacationRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 管理者機能サービス
 */
@Service
@Transactional
public class AdminService {
    
    @Autowired
    private EmployeeRepository employeeRepository;
    
    @Autowired
    private AttendanceRecordRepository attendanceRecordRepository;
    
    @Autowired
    private VacationRequestRepository vacationRequestRepository;
    
    /**
     * 全社員一覧取得
     * @return 社員一覧
     */
    public List<Employee> getAllEmployees() {
        return employeeRepository.findAll();
    }
    
    /**
     * 勤怠承認処理
     * @param employeeId 従業員ID
     * @param yearMonth 年月（yyyy-MM形式）
     * @return 承認成功の場合true
     */
    public boolean approveAttendance(Long employeeId, String yearMonth) {
        try {
            // 該当月の勤怠記録を取得
            String[] parts = yearMonth.split("-");
            int year = Integer.parseInt(parts[0]);
            int month = Integer.parseInt(parts[1]);
            List<AttendanceRecord> records = attendanceRecordRepository.findByEmployeeAndMonth(employeeId, year, month);
            
            if (records.isEmpty()) {
                return false;
            }
            
            // 勤怠記録を承認済みに更新
            for (AttendanceRecord record : records) {
                record.setAttendanceFixedFlag(true);
            }
            attendanceRecordRepository.saveAll(records);
            
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }
    
    /**
     * 有給申請承認処理
     * @param vacationId 有給申請ID
     * @param approved 承認する場合true、却下する場合false
     * @return 処理成功の場合true
     */
    public boolean approveVacation(Long vacationId, boolean approved) {
        try {
            VacationRequest vacationRequest = vacationRequestRepository.findById(vacationId)
                    .orElse(null);
            
            if (vacationRequest == null) {
                return false;
            }
            
            // ステータスを更新
            if (approved) {
                vacationRequest.setStatus(VacationStatus.APPROVED);
            } else {
                vacationRequest.setStatus(VacationStatus.REJECTED);
            }
            
            vacationRequestRepository.save(vacationRequest);
            
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }
    
    /**
     * 未承認有給申請一覧取得
     * @return 未承認申請一覧
     */
    public List<VacationRequest> getPendingVacations() {
        return vacationRequestRepository.findByStatusOrderByCreatedAtDesc(VacationStatus.PENDING);
    }

    /**
     * ステータス別 有給申請一覧取得
     * @param status 取得対象ステータス
     * @return 有給申請一覧
     */
    public List<VacationRequest> getVacationsByStatus(VacationStatus status) {
        return vacationRequestRepository.findByStatusOrderByCreatedAtDesc(status);
    }
    
    /**
     * 月末申請一覧取得
     * @param status 申請状態（SUBMITTED, APPROVED, REJECTED）
     * @return 月末申請一覧
     */
    public List<Map<String, Object>> getMonthlySubmissions(String status) {
        try {
            List<Map<String, Object>> submissions = new ArrayList<>();
            
            // 全ての社員を取得
            List<Employee> employees = employeeRepository.findAll();
            
            for (Employee employee : employees) {
                // 各社員の勤怠記録から月末申請情報を抽出（過去12ヶ月分）
                LocalDate endDate = LocalDate.now();
                LocalDate startDate = endDate.minusMonths(12);
                List<AttendanceRecord> records = attendanceRecordRepository
                    .findByEmployeeIdAndAttendanceDateBetweenOrderByAttendanceDateDesc(
                        employee.getEmployeeId(), startDate, endDate);
                
                // 年月ごとにグループ化
                Map<String, List<AttendanceRecord>> monthlyRecords = new HashMap<>();
                for (AttendanceRecord record : records) {
                    String yearMonth = record.getAttendanceDate().format(DateTimeFormatter.ofPattern("yyyy-MM"));
                    monthlyRecords.computeIfAbsent(yearMonth, k -> new ArrayList<>()).add(record);
                }
                
                // 各月の申請状態を確認
                for (Map.Entry<String, List<AttendanceRecord>> entry : monthlyRecords.entrySet()) {
                    String yearMonth = entry.getKey();
                    List<AttendanceRecord> monthRecords = entry.getValue();
                    
                    if (!monthRecords.isEmpty()) {
                        SubmissionStatus submissionStatus = monthRecords.get(0).getSubmissionStatus();
                        boolean isFixed = monthRecords.get(0).getAttendanceFixedFlag();
                        
                        // 状態フィルタリング
                        if (status == null || status.equals(submissionStatus.name())) {
                            Map<String, Object> submission = new HashMap<>();
                            submission.put("employeeId", employee.getEmployeeId());
                            submission.put("employeeName", employee.getLastName() + " " + employee.getFirstName());
                            submission.put("yearMonth", yearMonth);
                            submission.put("submissionStatus", submissionStatus.name());
                            submission.put("submissionStatusDisplay", submissionStatus.getDisplayName());
                            submission.put("attendanceFixedFlag", isFixed);
                            submission.put("recordCount", monthRecords.size());
                            submission.put("createdAt", monthRecords.get(0).getCreatedAt());
                            submission.put("updatedAt", monthRecords.get(0).getUpdatedAt());
                            
                            submissions.add(submission);
                        }
                    }
                }
            }
            
            // 更新日時でソート（新しい順）
            submissions.sort((a, b) -> {
                LocalDate dateA = ((java.time.LocalDateTime) a.get("updatedAt")).toLocalDate();
                LocalDate dateB = ((java.time.LocalDateTime) b.get("updatedAt")).toLocalDate();
                return dateB.compareTo(dateA);
            });
            
            return submissions;
            
        } catch (Exception e) {
            e.printStackTrace();
            return new ArrayList<>();
        }
    }
    
    /**
     * 月末申請承認/却下処理
     * @param employeeId 従業員ID
     * @param yearMonth 年月
     * @param approved 承認する場合true、却下する場合false
     * @return 処理成功の場合true
     */
    public boolean approveMonthlySubmission(Long employeeId, String yearMonth, boolean approved) {
        try {
            // 該当月の勤怠記録を取得
            YearMonth requestYearMonth = YearMonth.parse(yearMonth, DateTimeFormatter.ofPattern("yyyy-MM"));
            List<AttendanceRecord> records = attendanceRecordRepository.findByEmployeeAndMonth(
                employeeId, 
                requestYearMonth.getYear(), 
                requestYearMonth.getMonthValue()
            );
            
            if (records.isEmpty()) {
                return false;
            }
            
            // 申請済みかチェック
            boolean isSubmitted = records.stream().anyMatch(record -> 
                record.getSubmissionStatus() == SubmissionStatus.SUBMITTED);
            
            if (!isSubmitted) {
                return false;
            }
            
            // 勤怠記録を更新
            for (AttendanceRecord record : records) {
                if (approved) {
                    record.setAttendanceFixedFlag(true);
                    record.setSubmissionStatus(SubmissionStatus.APPROVED);
                } else {
                    record.setSubmissionStatus(SubmissionStatus.REJECTED);
                }
            }
            attendanceRecordRepository.saveAll(records);
            
            return true;
            
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }
}