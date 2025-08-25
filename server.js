// 1. Import necessary packages
require('dotenv').config(); // Loads environment variables from .env file
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

// 2. Initialize the Express app
const app = express();
const PORT = process.env.PORT || 3000;

// 3. Add middleware to parse JSON request bodies
app.use(cors()); // Enable CORS for all routes
app.use(express.json());

// 4. Configure Nodemailer transporter
// This object is responsible for the actual email sending
const transporter = nodemailer.createTransport({
    service: 'gmail', // Use 'gmail', 'hotmail', etc.
    auth: {
        user: process.env.EMAIL_USER, // Your email from .env file
        pass: process.env.EMAIL_PASS  // Your app password from .env file
    }
});

// 5. Create the POST endpoint '/send-mail'
app.post('/send', async (req, res) => {
    // Destructure the recipient, subject, and text from the request body
    console.log(req.body);
    const { to, subject, text } = req.body;

    // Basic validation: ensure all required fields are present
    if (!to || !subject || !text) {
        return res.status(400).send('Missing required fields: to, subject, text');
    }

    // Define the email options
    const mailOptions = {
        from: `"Your App Name" <${process.env.EMAIL_USER}>`, // Sender address
        to: to,               // List of receivers
        subject: subject,     // Subject line
        text: text            // Plain text body
        // You can also add an html property for HTML emails: html: "<b>Hello world?</b>"
    };

    // 6. Send the email using a try-catch block for error handling
    try {
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully!');
        res.status(200).send('Email sent successfully!');
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).send('Error sending email.');
    }
});

app.get('/get', (req, res) => {
    res.send("Hello World!");
});

// 7. Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});