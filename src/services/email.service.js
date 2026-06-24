const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

let transporter;

async function getTransporter() {
  if (transporter) return transporter;

  const isGmail = process.env.SMTP_HOST && process.env.SMTP_HOST.includes('gmail');
  const transportConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 465,
    secure: process.env.SMTP_PORT == 465 || true, 
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };

  if (isGmail) {
    transportConfig.service = 'gmail';
  }

  transporter = nodemailer.createTransport(transportConfig);
  return transporter;
}

class EmailService {
  compileTemplate(templateName, context) {
    const basePath = path.join(__dirname, '../templates/base.hbs');
    const templatePath = path.join(__dirname, `../templates/${templateName}.hbs`);
    
    const baseSource = fs.readFileSync(basePath, 'utf8');
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    
    const fullContext = {
      ...context,
      currentYear: new Date().getFullYear()
    };

    const compiledTemplate = handlebars.compile(templateSource)(fullContext);
    
    const compiledBase = handlebars.compile(baseSource)({
      body: compiledTemplate,
      currentYear: fullContext.currentYear
    });

    return compiledBase;
  }

  async sendEmail({ to, subject, templateName, context, html }) {
    try {
      const mailTransporter = await getTransporter();
      
      let finalHtml = html;
      if (templateName && context) {
        finalHtml = this.compileTemplate(templateName, context);
      }

      // Buscamos primero el Logo.png local en src/templates/Logo.png, 
      // y como respaldo buscamos en el frontend SIAT.
      let logoPath = path.join(__dirname, '../templates/Logo.png');
      if (!fs.existsSync(logoPath)) {
        logoPath = path.join(__dirname, '../../../SIAT/Logo.png');
      }

      const mailOptions = {
        from: '"SIAT Soporte" <no-reply@siat-med.com>',
        to,
        subject,
        html: finalHtml,
      };

      if (fs.existsSync(logoPath)) {
        mailOptions.attachments = [
          {
            filename: 'Logo.png',
            path: logoPath,
            cid: 'logo_siat'
          }
        ];
      }

      const info = await mailTransporter.sendMail(mailOptions);
      console.log('Correo enviado: %s', info.messageId);
      
      return info;
    } catch (error) {
      console.error('Error al enviar el correo: ', error);
      throw new Error('Error al enviar el correo');
    }
  }
}

module.exports = new EmailService();
