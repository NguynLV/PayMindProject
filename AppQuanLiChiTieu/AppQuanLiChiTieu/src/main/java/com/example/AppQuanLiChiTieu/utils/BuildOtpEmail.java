package com.example.AppQuanLiChiTieu.utils;

import java.time.Year;

public class BuildOtpEmail {

    // ─── Shared footer / wrapper ────────────────────────────────────────────────

    private static String wrap(String logoColor, String bodyHtml) {
        return """
<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

  <!-- Outer -->
  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0"
         style="background:#ffffff;">
    <tr>
      <td align="center" style="padding:40px 16px 0;">

        <!-- Logo -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
          <tr>
            <td>
              <span style="
                font-size:22px;font-weight:800;color:%s;
                font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
                letter-spacing:-0.5px;
              ">💰 QuanLiChiTieu</span>
            </td>
          </tr>
        </table>

        <!-- Content -->
        <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0"
               style="max-width:520px;">
          <tr><td style="text-align:left;">
            %s
          </td></tr>
        </table>

        <!-- Divider -->
        <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0"
               style="max-width:520px;margin-top:40px;">
          <tr>
            <td style="border-top:1px solid #e8e8e8;padding-top:24px;padding-bottom:32px;">
              <p style="margin:0 0 4px;font-size:12px;color:#8a8a8a;">
                Thư này được gửi đến bạn vì bạn đã yêu cầu xác minh tài khoản.
              </p>
              <p style="margin:0;font-size:12px;color:#8a8a8a;">
                Nếu bạn có câu hỏi, vui lòng
                <a href="mailto:support@quanlichitieu.vn" style="color:#1d1d1d;text-decoration:underline;">liên hệ với chúng tôi</a>.
              </p>
              <p style="margin:16px 0 0;font-size:11px;color:#b3b3b3;">
                © %d QuanLiChiTieu &nbsp;|&nbsp; Điều khoản sử dụng &nbsp;|&nbsp; Chính sách riêng tư
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>

</body>
</html>
""".formatted(logoColor, bodyHtml, Year.now().getValue());
    }

    // ─── Register OTP ────────────────────────────────────────────────────────────

    /**
     * Spotify-style OTP email for account registration.
     */
    public static String buildOtpEmailHtml(String firstName, String code) {
        String body = """
<p style="margin:0 0 8px;font-size:16px;color:#1d1d1d;line-height:1.6;">Xin chào!</p>

<p style="margin:0 0 24px;font-size:16px;color:#1d1d1d;line-height:1.6;">
  Hãy nhập mã này để hoàn tất đăng ký tài khoản <strong>QuanLiChiTieu</strong>:
</p>

<!-- OTP Code -->
<p style="
  margin:0 0 24px;
  font-size:48px;
  font-weight:800;
  color:#1d1d1d;
  letter-spacing:6px;
  font-family:'Courier New',Courier,monospace;
  line-height:1.1;
">%s</p>

<p style="margin:0 0 24px;font-size:16px;color:#1d1d1d;line-height:1.6;">
  Mã này có hiệu lực trong <strong>5 phút</strong> và chỉ dùng được một lần.
  Bằng việc nhập mã này, bạn cũng sẽ xác nhận địa chỉ email liên kết với tài khoản của mình.
</p>

<p style="margin:0 0 32px;font-size:16px;color:#1d1d1d;line-height:1.6;">
  Nếu không muốn đăng ký, bạn có thể yên tâm bỏ qua email này.
</p>

<p style="margin:0;font-size:16px;color:#1d1d1d;line-height:1.6;">
  Trân trọng!<br>
  <strong>QuanLiChiTieu</strong>
</p>
""".formatted(code);

        return wrap("#1db954", body);
    }

    // ─── Forgot Password OTP ─────────────────────────────────────────────────────

    /**
     * Spotify-style OTP email for forgot-password flow.
     */
    public static String buildForgotPasswordEmailHtml(String firstName, String code) {
        String body = """
<p style="margin:0 0 8px;font-size:16px;color:#1d1d1d;line-height:1.6;">Xin chào!</p>

<p style="margin:0 0 24px;font-size:16px;color:#1d1d1d;line-height:1.6;">
  Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong>QuanLiChiTieu</strong> của bạn.
  Hãy nhập mã này để tiếp tục:
</p>

<!-- OTP Code -->
<p style="
  margin:0 0 24px;
  font-size:48px;
  font-weight:800;
  color:#1d1d1d;
  letter-spacing:6px;
  font-family:'Courier New',Courier,monospace;
  line-height:1.1;
">%s</p>

<p style="margin:0 0 24px;font-size:16px;color:#1d1d1d;line-height:1.6;">
  Mã này có hiệu lực trong <strong>5 phút</strong> và chỉ dùng được một lần.
</p>

<p style="margin:0 0 32px;font-size:16px;color:#1d1d1d;line-height:1.6;">
  Nếu bạn không yêu cầu đặt lại mật khẩu, bạn có thể yên tâm bỏ qua email này.
  Tài khoản của bạn vẫn an toàn.
</p>

<p style="margin:0;font-size:16px;color:#1d1d1d;line-height:1.6;">
  Trân trọng!<br>
  <strong>QuanLiChiTieu</strong>
</p>
""".formatted(code);

        return wrap("#1d1d1d", body);
    }
}
