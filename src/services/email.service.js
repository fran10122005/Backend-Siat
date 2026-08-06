const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

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

  isConfigured() {
    return Boolean(
      process.env.EMAILJS_SERVICE_ID &&
      process.env.EMAILJS_TEMPLATE_ID &&
      process.env.EMAILJS_PUBLIC_KEY &&
      process.env.EMAILJS_PRIVATE_KEY
    );
  }

  async sendEmail({ to, subject, templateName, context, html }) {
    try {
      const {
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        EMAILJS_PUBLIC_KEY,
        EMAILJS_PRIVATE_KEY
      } = process.env;

      if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY || !EMAILJS_PRIVATE_KEY) {
        console.warn(`📧 [EmailJS no configurado completamente] Correo omitido. Para: ${to} | Asunto: ${subject}`);
        console.warn('Revisa tus variables de entorno: EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY');
        return { skipped: true, to, subject };
      }
      
      let finalHtml = html;
      if (templateName && context) {
        finalHtml = this.compileTemplate(templateName, context);
      }

      const payload = {
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        accessToken: EMAILJS_PRIVATE_KEY,
        template_params: {
          to_email: to,
          subject: subject,
          html_content: finalHtml
        }
      };

      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`EmailJS API error: ${response.status} ${errorText}`);
      }

      console.log('Correo enviado correctamente vía EmailJS a:', to);
      return { success: true, to };
    } catch (error) {
      console.error('Error al enviar el correo con EmailJS: ', error);
      throw new Error('Error al enviar el correo');
    }
  }
}

module.exports = new EmailService();
