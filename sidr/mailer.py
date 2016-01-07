from flask import current_app
import smtplib


def send(email, name, subject, content):
    msg = 'Subject: %s\n\n%s' % (subject, content)
    server = smtplib.SMTP('smtp.gmail.com:587')
    server.starttls()
    server.login(current_app.config['EMAIL_USER'], current_app.config['EMAIL_PASSWORD'])
    server.sendmail(current_app.config['EMAIL_ADDR'], email, msg)
    server.quit()
