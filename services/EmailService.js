const nodemailer = require('nodemailer');
const Promise = require("bluebird");
const config = require('../config')
const errors = require("../errors");
const templates = require("../email-templates");
const logger = require('../logger');

class EmailService {

  constructor() {
    this.transporter = nodemailer.createTransport({
        debug: config.smtp.debug,
        host: config.smtp.host,
        port: config.smtp.port,
        // secure: config.smtp.port, // use TLS
        auth: {
          user: config.smtp.user,
          pass: config.smtp.password
        },
    });
  }

  async sendEmailTemplate({ to, cc, template, data }) {
    try {
      if (!to) {
        throw new errors.ValidationFailed("to is required.", { field_name: "to" });
      }
      if (!template || !templates[template]) {
        throw new errors.ValidationFailed("template is required.", { field_name: "template" });
      }
      let { subject, html } = templates[template](data);
      return this.sendEmail({ to, cc, subject, html });
    } catch (error) {
      console.error('Error sending email: ', error);
      throw error;
    }
  }

  async sendEmail({ to, subject, html, cc }) {
    try {
      logger.info('Sending Email');
      const info = await this.transporter.sendMail({ from: config.smtp.from, to, subject, html, cc });
      logger.info('Email sent: ', info.response);
      return info;
    } catch (error) {
      logger.error('Error sending email: ', error);
      throw error;
    }
  }
}

module.exports = EmailService;
