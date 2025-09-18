package com.kintai.controller;

import com.kintai.entity.UserAccount;
import com.kintai.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Collections;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {
    
    @Autowired
    private AuthService authService;
    
    /**
     * ログイン
     * @param loginRequest ログインリクエスト
     * @param request HTTPリクエスト
     * @return ログイン結果
     */
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@Valid @RequestBody LoginRequest loginRequest, 
                                                   HttpServletRequest request) {
        try {
            // ユーザー認証
            Optional<UserAccount> userOpt = authService.authenticate(loginRequest.getUsername(), loginRequest.getPassword());
            
            if (userOpt.isPresent()) {
                UserAccount user = userOpt.get();
                
                // セッション作成
                HttpSession session = request.getSession(true);
                session.setAttribute("user", user);
                session.setAttribute("username", user.getUsername());
                session.setAttribute("role", user.getRole().name());
                session.setAttribute("employeeId", user.getEmployeeId());
                
                // Spring Securityの認証コンテキストを作成
                Authentication authentication = new UsernamePasswordAuthenticationToken(
                    user,
                    user.getPassword(),
                    user.getAuthorities()
                );
                
                // SecurityContextを作成して設定
                SecurityContext context = SecurityContextHolder.createEmptyContext();
                context.setAuthentication(authentication);
                SecurityContextHolder.setContext(context);
                
                // セッションにSecurityContextを保存
                session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);
                
                // レスポンス作成
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("message", "ログインに成功しました");
                response.put("username", user.getUsername());
                response.put("role", user.getRole().name());
                response.put("employeeId", user.getEmployeeId());
                response.put("sessionId", session.getId());
                
                return ResponseEntity.ok(response);
            } else {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "ユーザー名またはパスワードが正しくありません");
                
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "ログイン処理中にエラーが発生しました: " + e.getMessage());
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * ログアウト
     * @param request HTTPリクエスト
     * @return ログアウト結果
     */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout(HttpServletRequest request) {
        try {
            HttpSession session = request.getSession(false);
            if (session != null) {
                session.invalidate();
            }
            
            // セキュリティコンテキストをクリア
            SecurityContextHolder.clearContext();
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "ログアウトしました");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "ログアウト処理中にエラーが発生しました: " + e.getMessage());
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * 現在のセッション情報を取得
     * @param request HTTPリクエスト
     * @return セッション情報
     */
    @GetMapping("/session")
    public ResponseEntity<Map<String, Object>> getSession(HttpServletRequest request) {
        try {
            HttpSession session = request.getSession(false);
            
            if (session != null && session.getAttribute("user") != null) {
                Map<String, Object> response = new HashMap<>();
                response.put("authenticated", true);
                response.put("username", session.getAttribute("username"));
                response.put("role", session.getAttribute("role"));
                response.put("employeeId", session.getAttribute("employeeId"));
                response.put("sessionId", session.getId());
                
                return ResponseEntity.ok(response);
            } else {
                Map<String, Object> response = new HashMap<>();
                response.put("authenticated", false);
                response.put("message", "セッションが無効です");
                
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("authenticated", false);
            response.put("message", "セッション確認中にエラーが発生しました: " + e.getMessage());
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * ログインリクエスト用の内部クラス
     */
    public static class LoginRequest {
        private String username;
        private String password;
        
        public String getUsername() {
            return username;
        }
        
        public void setUsername(String username) {
            this.username = username;
        }
        
        public String getPassword() {
            return password;
        }
        
        public void setPassword(String password) {
            this.password = password;
        }
    }
}
