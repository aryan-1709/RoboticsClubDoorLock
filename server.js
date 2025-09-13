import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch'; // for making API calls
import sheets from './sheets.js';

const { appendEmailToSheet, getValueSheet, changeValueSheet, getAllValFromColumn } = sheets;

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

let currAdminPass = (Math.floor(Math.random() * 1000000)).toString().padStart(6, '0');

app.use(cors());
app.use(express.json());

//=========================//
// Helper: Send Email via Brevo
//=========================//
async function sendEmailBrevo(to, subject, htmlContent) {
    const url = "https://api.brevo.com/v3/smtp/email";

    const body = {
        sender: {
            name: "Robotics Club",
            email: process.env.EMAIL_USER   // must match a verified Brevo sender
        },
        to: [{ email: to }],
        subject: subject,
        htmlContent: htmlContent
    };

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "accept": "application/json",
            "api-key": process.env.BREVO_API_KEY,
            "content-type": "application/json"
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(`Brevo email failed: ${response.statusText}`);
    }

    return response.json();
}

//=========================//
// Routes
//=========================//

// Verify admin and send OTP
app.post('/verifyAdmin', async (req, res) => {
    const { to } = req.body;
    const admins = await getAllValFromColumn(Number(process.env.ADMIN_COL));

    if (!to) {
        return res.status(400).send('Missing required fields: {to}');
    } else if (!admins.includes(to)) {
        return res.status(400).send('You are not an admin');
    }

    const code = (Math.floor(Math.random() * 1000000)).toString().padStart(6, '0');
    currAdminPass = code;

    const subject = "Email Verification - Admin Robotics Club";
    const htmlContent = `
        <html>
          <body>
            <h3>Email Verification</h3>
            <p>The verification code for your email is: <b>${code}</b></p>
            <p>If you did not request this code, please ignore this email.</p>
          </body>
        </html>
    `;

    try {
        await sendEmailBrevo(to, subject, htmlContent);
        res.status(200).send(code);
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).send('Error sending email.');
    }
});

// Log entry
app.post('/enter', async (req, res) => {
    const { regNo } = req.body;
    try {
        await appendEmailToSheet(regNo);
        res.status(200).send("User Entered");
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error logging to sheet.');
    }
});

// Get test
app.get('/get', (req, res) => {
    res.send("Hello World!");
});

// Update password fetch
app.post('/update', async (req, res) => {
    const { adminPass } = req.body;
    const CurrentAdminPass = await getValueSheet(1, 2);

    if (adminPass != CurrentAdminPass) {
        return res.status(400).send('Wrong Admin Password');
    }

    try {
        const currentPassword = await getAllValFromColumn(Number(process.env.MEMBER_PASSWORD_COL));
        res.status(200).send(currentPassword.join(','));
    } catch (error) {
        console.error('Error fetching current password:', error);
        res.status(500).send('Error fetching current password.');
    }
});

// Change passwords and send via email
const changePassword = async () => {
    try {
        const emails = await getAllValFromColumn(Number(process.env.MEMBER_EMAIL_COL));
        const regNos = await getAllValFromColumn(Number(process.env.MEMBER_REG_NO_COL));

        if (!emails || !regNos || emails.length !== regNos.length) {
            console.error('Mismatch or missing data in email/reg no columns.');
            return;
        }

        for (let i = 0; i < emails.length; i++) {
            const email = emails[i];
            const regNo = regNos[i];
            if (!email || !regNo) continue;

            const regStr = String(regNo);
            const last4 = regStr.slice(-4);
            const rand4 = Math.floor(1000 + Math.random() * 9000);
            const password = `${last4}${rand4}`;

            const subject = 'Your Robotics Club Password';
            const htmlContent = `
                <html>
                  <body>
                    <p>Hello,</p>
                    <p>Your new password is: <b>${password}</b></p>
                    <p>Please keep it safe.</p>
                    <p>- Robotics Club</p>
                  </body>
                </html>
            `;

            try {
                await sendEmailBrevo(email, subject, htmlContent);
                await changeValueSheet(i, 5, password);
            } catch (err) {
                console.error(`Failed for ${email}:`, err);
            }
        }
    } catch (err) {
        console.error('Scheduler failed:', err);
    }
};

// Manual or cron-triggered password reset
app.post('/changepassword', async (req, res) => {
    const { adminPass, cron_job_pass } = req.body;

    if (cron_job_pass && cron_job_pass === process.env.CRON_JOB_PASSWROD) {
        try {
            await changePassword();
            return res.status(200).send("Password changed successfully");
        } catch (error) {
            console.error(error);
            return res.status(500).send("Error changing password");
        }
    }

    if (currAdminPass !== adminPass) {
        return res.status(400).send("Wrong password");
    }

    currAdminPass = (Math.floor(Math.random() * 1000000)).toString().padStart(6, '0');

    try {
        await changePassword();
        res.status(200).send("Password changed successfully");
    } catch (error) {
        console.error(error);
        res.status(500).send("Error changing password");
    }
});

//=========================//
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
