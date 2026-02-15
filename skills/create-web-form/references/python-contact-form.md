# Python Contact Form Reference

> Source: <https://mailtrap.io/blog/python-contact-form/>

This reference covers how to build a contact form in Python, including creating HTML forms, handling form submissions with Flask, sending emails with `smtplib`, and validating user input.

---

## Overview

A Python contact form typically involves:

- An **HTML front end** with a form for user input (name, email, message)
- A **Python back end** (usually Flask or Django) to receive and process form data
- An **email-sending mechanism** (using `smtplib` or a transactional email API) to deliver form submissions
- **Input validation** on both the client side (HTML5 attributes) and server side (Python logic)

---

## Setting Up a Flask Project

### Install Flask

```bash
pip install Flask
```

### Basic Project Structure

```
contact-form/
    app.py
    templates/
        contact.html
        success.html
    static/
        style.css
```

### Minimal Flask Application

```python
from flask import Flask, render_template, request, redirect, url_for

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('contact.html')

if __name__ == '__main__':
    app.run(debug=True)
```

---

## Creating the HTML Contact Form

### Basic Contact Form Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contact Us</title>
</head>
<body>
    <h1>Contact Us</h1>
    <form method="POST" action="/contact">
        <div>
            <label for="name">Name:</label>
            <input type="text" id="name" name="name" required />
        </div>
        <div>
            <label for="email">Email:</label>
            <input type="email" id="email" name="email" required />
        </div>
        <div>
            <label for="subject">Subject:</label>
            <input type="text" id="subject" name="subject" required />
        </div>
        <div>
            <label for="message">Message:</label>
            <textarea id="message" name="message" rows="5" required></textarea>
        </div>
        <button type="submit">Send Message</button>
    </form>
</body>
</html>
```

### Key HTML Form Attributes

| Attribute  | Description |
|------------|-------------|
| `method`   | HTTP method -- use `POST` for contact forms to keep data out of the URL |
| `action`   | The server endpoint that processes the form data |
| `required` | HTML5 attribute that enforces client-side validation |
| `name`     | Identifies each field in the submitted form data |

---

## Handling Form Submissions in Flask

### Processing POST Requests

```python
from flask import Flask, render_template, request, redirect, url_for, flash

app = Flask(__name__)
app.secret_key = 'your-secret-key'

@app.route('/contact', methods=['GET', 'POST'])
def contact():
    if request.method == 'POST':
        name = request.form.get('name')
        email = request.form.get('email')
        subject = request.form.get('subject')
        message = request.form.get('message')

        # Validate inputs
        if not name or not email or not message:
            flash('Please fill in all required fields.', 'error')
            return redirect(url_for('contact'))

        # Send the email
        send_email(name, email, subject, message)

        flash('Your message has been sent successfully!', 'success')
        return redirect(url_for('contact'))

    return render_template('contact.html')
```

### Accessing Form Data

Flask provides `request.form` to access submitted form data:

| Method | Description |
|--------|-------------|
| `request.form['key']` | Raises `KeyError` if the key is missing |
| `request.form.get('key')` | Returns `None` if the key is missing (safer) |
| `request.form.get('key', 'default')` | Returns a default value if the key is missing |

---

## Sending Emails with `smtplib`

### Basic Email Sending Function

```python
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_email(name, email, subject, message):
    sender_email = "your-email@example.com"
    receiver_email = "recipient@example.com"
    password = "your-email-password"

    # Create the email message
    msg = MIMEMultipart()
    msg['From'] = sender_email
    msg['To'] = receiver_email
    msg['Subject'] = f"Contact Form: {subject}"

    # Email body
    body = f"""
    New contact form submission:

    Name: {name}
    Email: {email}
    Subject: {subject}
    Message: {message}
    """
    msg.attach(MIMEText(body, 'plain'))

    # Send the email
    try:
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login(sender_email, password)
            server.send_message(msg)
    except Exception as e:
        print(f"Error sending email: {e}")
        raise
```

### Common SMTP Server Settings

| Provider | SMTP Server | Port (TLS) | Port (SSL) |
|----------|-------------|------------|------------|
| Gmail | `smtp.gmail.com` | 587 | 465 |
| Outlook | `smtp-mail.outlook.com` | 587 | -- |
| Yahoo | `smtp.mail.yahoo.com` | 587 | 465 |
| Mailtrap (testing) | `sandbox.smtp.mailtrap.io` | 587 | 465 |

### Using Environment Variables for Credentials

Never hard-code email credentials. Use environment variables instead:

```python
import os

SMTP_SERVER = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_USERNAME = os.environ.get('SMTP_USERNAME')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD')
```

---

## Server-Side Validation

### Validating Form Input

```python
import re

def validate_contact_form(name, email, message):
    errors = []

    if not name or len(name.strip()) < 2:
        errors.append('Name must be at least 2 characters long.')

    if not email or not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
        errors.append('Please provide a valid email address.')

    if not message or len(message.strip()) < 10:
        errors.append('Message must be at least 10 characters long.')

    return errors
```

### Integrating Validation into the Route

```python
@app.route('/contact', methods=['GET', 'POST'])
def contact():
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip()
        subject = request.form.get('subject', '').strip()
        message = request.form.get('message', '').strip()

        errors = validate_contact_form(name, email, message)

        if errors:
            for error in errors:
                flash(error, 'error')
            return render_template('contact.html',
                                   name=name, email=email,
                                   subject=subject, message=message)

        send_email(name, email, subject, message)
        flash('Message sent successfully!', 'success')
        return redirect(url_for('contact'))

    return render_template('contact.html')
```

---

## Using Mailtrap for Email Testing

Mailtrap provides a safe sandbox SMTP server for testing email sending without delivering to real inboxes.

### Mailtrap Configuration

```python
import smtplib
from email.mime.text import MIMEText

def send_test_email(name, email, subject, message):
    sender = "from@example.com"
    receiver = "to@example.com"

    body = f"Name: {name}\nEmail: {email}\nSubject: {subject}\nMessage: {message}"

    msg = MIMEText(body)
    msg['Subject'] = f"Contact Form: {subject}"
    msg['From'] = sender
    msg['To'] = receiver

    with smtplib.SMTP("sandbox.smtp.mailtrap.io", 2525) as server:
        server.login("your_mailtrap_username", "your_mailtrap_password")
        server.sendmail(sender, receiver, msg.as_string())
```

---

## Using Flask-Mail Extension

Flask-Mail simplifies email configuration and sending within Flask applications.

### Installation and Setup

```bash
pip install Flask-Mail
```

```python
from flask import Flask
from flask_mail import Mail, Message

app = Flask(__name__)

app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_DEFAULT_SENDER')

mail = Mail(app)
```

### Sending Email with Flask-Mail

```python
@app.route('/contact', methods=['POST'])
def contact():
    name = request.form.get('name')
    email = request.form.get('email')
    subject = request.form.get('subject')
    message_body = request.form.get('message')

    msg = Message(
        subject=f"Contact Form: {subject}",
        recipients=['admin@example.com'],
        reply_to=email
    )
    msg.body = f"From: {name} ({email})\n\n{message_body}"

    try:
        mail.send(msg)
        flash('Message sent successfully!', 'success')
    except Exception as e:
        flash('An error occurred. Please try again later.', 'error')

    return redirect(url_for('contact'))
```

---

## CSRF Protection

Cross-Site Request Forgery (CSRF) protection prevents malicious sites from submitting forms on behalf of a user.

### Using Flask-WTF for CSRF

```bash
pip install Flask-WTF
```

```python
from flask_wtf import FlaskForm
from wtforms import StringField, TextAreaField, SubmitField
from wtforms.validators import DataRequired, Email

class ContactForm(FlaskForm):
    name = StringField('Name', validators=[DataRequired()])
    email = StringField('Email', validators=[DataRequired(), Email()])
    subject = StringField('Subject', validators=[DataRequired()])
    message = TextAreaField('Message', validators=[DataRequired()])
    submit = SubmitField('Send Message')
```

In the template, include the CSRF token:

```html
<form method="POST" action="/contact">
    {{ form.hidden_tag() }}
    <!-- form fields here -->
</form>
```

---

## Complete Example Application

```python
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Flask, render_template, request, redirect, url_for, flash

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-key')

def send_email(name, email, subject, message):
    sender = os.environ.get('MAIL_USERNAME')
    receiver = os.environ.get('MAIL_RECIPIENT')
    password = os.environ.get('MAIL_PASSWORD')

    msg = MIMEMultipart()
    msg['From'] = sender
    msg['To'] = receiver
    msg['Subject'] = f"Contact Form: {subject}"

    body = f"Name: {name}\nEmail: {email}\nSubject: {subject}\n\n{message}"
    msg.attach(MIMEText(body, 'plain'))

    with smtplib.SMTP(os.environ.get('SMTP_SERVER', 'smtp.gmail.com'), 587) as server:
        server.starttls()
        server.login(sender, password)
        server.send_message(msg)

@app.route('/')
def home():
    return redirect(url_for('contact'))

@app.route('/contact', methods=['GET', 'POST'])
def contact():
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip()
        subject = request.form.get('subject', '').strip()
        message = request.form.get('message', '').strip()

        if not all([name, email, message]):
            flash('Please fill in all required fields.', 'error')
            return render_template('contact.html')

        try:
            send_email(name, email, subject, message)
            flash('Your message has been sent!', 'success')
        except Exception:
            flash('Failed to send message. Please try again.', 'error')

        return redirect(url_for('contact'))

    return render_template('contact.html')

if __name__ == '__main__':
    app.run(debug=True)
```

---

## Key Takeaways

1. **Use Flask** as a lightweight Python web framework for handling contact form submissions via `request.form`.
2. **Use `smtplib`** or **Flask-Mail** for sending emails from the contact form.
3. **Validate input** on both the client side (HTML5 `required`, `type="email"`) and server side (Python regex, length checks).
4. **Never hard-code credentials** -- use environment variables or a `.env` file.
5. **Use Mailtrap** or a similar service for testing email delivery without sending to real inboxes.
6. **Add CSRF protection** using Flask-WTF to guard against cross-site request forgery attacks.
7. **Flash messages** provide user feedback for successful submissions and validation errors.
8. **Use `MIMEMultipart`** for constructing well-formatted email messages with headers and body content.
