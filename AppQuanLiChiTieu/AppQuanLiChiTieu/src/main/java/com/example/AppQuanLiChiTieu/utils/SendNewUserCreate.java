

package com.example.AppQuanLiChiTieu.utils;

import java.time.Year;

public class SendNewUserCreate {

    public static String sendNewUserCreate(String username , String password) {

        return """
                <!doctype html>
                <html lang="vi">
                  <head>
                    <meta charset="utf-8">
                    <meta name="x-apple-disable-message-reformatting">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                  </head>
                  <body style="margin:0;padding:0;background:#f6f7f9;">
                    <!-- Preheader (hidden) -->
                    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
                      Your Healthcare Laboratory Account Information
                    </div>

                    <!-- Wrapper -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%%" style="background:#f6f7f9;">
                      <tr>
                        <td align="center" style="padding:24px 12px;">
                          <!-- Card -->
                          <table role="presentation" cellpadding="0" cellspacing="0" width="100%%" style="max-width:640px;background:#ffffff;border-radius:12px;border:1px solid #e9edf3;">
                            <!-- Header -->
                            <tr>
                              <td align="center" style="padding:28px 24px 0 24px;">
                                <div style="font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:1.2;font-weight:700;color:#27ae60;">
                                  Healthcare Laboratory 
                                </div>
                              </td>
                            </tr>

                            <!-- Title -->
                            <tr>
                              <td align="center" style="padding:24px 24px 0 24px;">
                                <div style="font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:1.3;font-weight:700;color:#0b1f33;">
                                  Your Account Details
                                </div>
                              </td>
                            </tr>

                            <!-- Body text -->
                            <tr>
                              <td align="center" style="padding:12px 28px 0 28px;">
                                <div style="font-family:Arial,Helvetica,sans-serif;color:#334155;font-size:14px;line-height:22px;">
                                 Here is your account information for the Healthcare Laboratory system.
                                </div>
                              </td>
                            </tr>

                            <!-- Account info box -->
                            <tr>
                              <td style="padding:20px 28px 0 28px;">
                                <table role="presentation" cellpadding="0" cellspacing="0" width="100%%">
                                  <tr>
                                    <td style="padding:16px 24px;border:1px dashed #cbd5e1;border-radius:10px;background:#f8fafc;">
                                      <!-- Username -->
                                      <div style="margin-bottom:16px;">
                                        <div style="font-family:Arial,Helvetica,sans-serif;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">
                                          Username
                                        </div>
                                        <div style="font-family:SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:18px;font-weight:700;color:#0b1f33;letter-spacing:0.5px;">
                                          %1$s
                                        </div>
                                      </div>
                                      
                                      <!-- Divider -->
                                      <div style="border-top:1px dashed #cbd5e1;margin:16px 0;"></div>
                                      
                                      <!-- Account Email -->
                                      <div>
                                        <div style="font-family:Arial,Helvetica,sans-serif;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">
                                          Password
                                        </div>
                                        <div style="font-family:SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:18px;font-weight:700;color:#0b1f33;letter-spacing:0.5px;">
                                          %2$s
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>

                            <!-- Note -->
                            <tr>
                              <td align="center" style="padding:18px 28px 0 28px;">
                                <div style="font-family:Arial,Helvetica,sans-serif;color:#475569;font-size:13px;line-height:20px;">
                                 Please keep this information safe and do not share it with anyone.
                                </div>
                                <div style="font-family:Arial,Helvetica,sans-serif;color:#64748b;font-size:12px;line-height:20px;margin-top:4px;">
                                 If you did not request this email, please contact support.
                                </div>
                              </td>
                            </tr>

                            <!-- Divider -->
                            <tr>
                              <td style="padding:24px 24px 0 24px;">
                                <hr style="border:none;border-top:1px solid #eef2f7;margin:0;">
                              </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                              <td align="center" style="padding:16px 24px 28px 24px;">
                                <div style="font-family:Arial,Helvetica,sans-serif;color:#94a3b8;font-size:12px;line-height:18px;">
                                  © %3$d Laboratory Management • Automated message – please do not reply
                                </div>
                              </td>
                            </tr>
                          </table>
                          <!-- /Card -->
                        </td>
                      </tr>
                    </table>
                  </body>
                </html>
                """.formatted(username,password, Year.now().getValue());
    }
}