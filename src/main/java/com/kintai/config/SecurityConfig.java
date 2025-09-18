package com.kintai.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.security.web.session.HttpSessionEventPublisher;

@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
    
    @Bean
    public CsrfTokenRepository csrfTokenRepository() {
        HttpSessionCsrfTokenRepository repository = new HttpSessionCsrfTokenRepository();
        repository.setHeaderName("X-CSRF-TOKEN");
        return repository;
    }
    
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
    
    @Bean
    public HttpSessionEventPublisher httpSessionEventPublisher() {
        return new HttpSessionEventPublisher();
    }
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // CSRF設定
            .csrf(csrf -> csrf
                .csrfTokenRepository(csrfTokenRepository())
                .ignoringRequestMatchers(new AntPathRequestMatcher("/api/attendance/health"))
                .ignoringRequestMatchers(new AntPathRequestMatcher("/api/auth/**"))
            )
            // セッション管理設定
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                .maximumSessions(1)
                .maxSessionsPreventsLogin(false)
            )
            // 認証設定
            .authorizeHttpRequests(authz -> authz
                // 認証エンドポイントは認証不要（最初に評価）
                .requestMatchers(new AntPathRequestMatcher("/api/auth/**")).permitAll()
                // ヘルスチェックは認証不要
                .requestMatchers(new AntPathRequestMatcher("/api/attendance/health")).permitAll()
                // CSRFトークン取得は認証不要
                .requestMatchers(new AntPathRequestMatcher("/api/attendance/csrf-token")).permitAll()
                .requestMatchers(new AntPathRequestMatcher("/api/vacation/csrf-token")).permitAll()
                // その他のAPIは認証必須
                .requestMatchers(new AntPathRequestMatcher("/api/**")).authenticated()
                // その他のリクエストは認証必須
                .anyRequest().authenticated()
            )
            // フォームログイン無効化（APIのみのため）
            .formLogin(form -> form.disable())
            // HTTP Basic認証無効化
            .httpBasic(basic -> basic.disable())
            // ログアウト設定
            .logout(logout -> logout
                .logoutUrl("/api/auth/logout")
                .logoutSuccessUrl("/")
                .invalidateHttpSession(true)
                .deleteCookies("JSESSIONID")
            );
        
        return http.build();
    }
}
