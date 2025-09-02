// 1. Import necessary packages
require('dotenv').config(); // Loads environment variables from .env file
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const { appendEmailToSheet } = require('./sheets');

// 2. Initialize the Express app
const app = express();
const PORT = process.env.PORT || 3000;

// 3. Add middleware to parse JSON request bodies
app.use(cors()); // Enable CORS for all routes
app.use(express.json());

// 4. Configure Nodemailer transporter
// This object is responsible for the actual email sending
const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS  
    }
});

app.post('/send', async (req, res) => {
    console.log(req.body);
    const { to, subject, text } = req.body;

    if (!to || !subject || !text) {
        return res.status(400).send('Missing required fields: to, subject, text');
    }
    const mailOptions = {
        from: `"Your App Name" <${process.env.EMAIL_USER}>`,
        to: to,              
        subject: subject,    
        text: text            
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully!');
        res.status(200).send('Email sent successfully!');
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).send('Error sending email.');
    }
});

app.post('/verify', async (req, res) => {
    const {to} = req.body;
    if (!to) {
        return res.status(400).send('Missing required fields: {to}');
    }
    const subject = "Email Verification - Admin Robotics Club";
    const code = (Math.floor(Math.random() * 1000000)).toString().padStart(6, '0');
    const text = `The verification code for your email is: ${code}.\n\nIf you did not request this code, please ignore this email.`;
    const mailOptions = {
        from: `"Admin Robotics Club" <${process.env.EMAIL_USER}>`,
        to: to,               
        subject: subject,     
        text: text           
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Verification code sent successfully!');
        // change this afterwards
        res.status(200).send(code);
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).send('Error sending email.');
    }
});

app.post('/reset', async (req, res) => {
    const {user} = req.body;
    const password = (Math.floor(Math.random() * 1000000)).toString().padStart(6, '0');
    const subject = "Password Reset Robotics Club Door";
    const text = `New password for robotics club door is : ${password}`;
    const mailOptions = {
        from: `"Admin Robotics Club" <${process.env.EMAIL_USER}>`, 
        to: process.env.EMAIL_USER,              
        subject: subject,     
        text: text
    };
    try {
        await transporter.sendMail(mailOptions);
        await appendEmailToSheet(user);
        console.log('Email sent and logged!');
        res.status(200).send(password);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error sending email or logging to sheet.');
    }
});

app.get('/get', (req, res) => {
    res.send("Hello World!");
});

app.get('/current', (req, res) => {
    res.send("Current status: OK");
});

// 7. Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});