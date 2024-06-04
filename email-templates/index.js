const config = require("../config");

const Templates = {

  passwordReset({ name, token }) {
    return {
      subject: "Password Reset",
      html: `
      <p>Hi ${name},</p>
      <p>You have requested to reset your password.</p>
      <p>Please click on the link below to reset your password.</p>
      <p><a href="${config.app.protocol}://${config.app.base_url}/reset-password/${token}">Reset Password</a></p>
      <p> This link will expire in 1 hour.</p>
      <p>Thanks,</p>
      <p>Team</p>
      <p> Pullse AI </p>
      <p>If you did not request a password reset, please ignore this email or reply to let us know.</p>`
    };
  },

  emailVerification({ name, token }) {
    return {
      subject: "Email Verification",
      html: `
      <p>Hi ${name},</p>
      <p>Please click on the link below to verify your email.</p>
      <p><a href="${config.app.protocol}://${config.app.base_url}/verify-email/${token}">Verify Email</a></p>
      <p>Thanks,</p>
      <p>Team</p>
      <p> Pullse AI </p>
      <p>If you did not request a password reset, please ignore this email or reply to let us know.</p>`
    }
  }


};

module.exports = Templates;
