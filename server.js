import dotenv from 'dotenv';
import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import schedule from 'node-schedule';
import sheets from './sheets.js';
const { appendEmailToSheet, getValueSheet, changeValueSheet, getAllValFromColumn } = sheets;

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

let currAdminPass = (Math.floor(Math.random() * 1000000)).toString().padStart(6, '0');

app.use(cors());
app.use(express.json());

const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS  
    }
});

app.post('/verifyAdmin', async (req, res) => {
    const {to} = req.body;
    const admins = await getAllValFromColumn(Number(process.env.ADMIN_COL));
    if (!to) {
        return res.status(400).send('Missing required fields: {to}');
    }
    else if(admins.find(admin => admin === to)===undefined){
        return res.status(400).send('You are not an admin');
    }
    const subject = "Email Verification - Admin Robotics Club";
    const code = (Math.floor(Math.random() * 1000000)).toString().padStart(6, '0');
    currAdminPass = code;
    const text = `The verification code for your email is: ${code}.\n\nIf you did not request this code, please ignore this email.`;
    const mailOptions = {
        from: `"Admin Robotics Club" <${process.env.EMAIL_USER}>`,
        to: to,               
        subject: subject,     
        text: text           
    };

    try {
        await transporter.sendMail(mailOptions);
        // console.log('Verification code sent successfully!');
        res.status(200).send(code);
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).send('Error sending email.');
    }
});

app.post('/enter', async (req, res) => {
    const {regNo} = req.body;
    try {
        await appendEmailToSheet(regNo);
        // console.log('Email sent and logged!');
        res.status(200).send("User Entered");
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error sending email or logging to sheet.');
    }
});

app.get('/get', (req, res) => {
    res.send("Hello World!");
});

app.post('/update', async (req, res) => {
    const { adminPass } = req.body;
    const CurrentAdminPass=await getValueSheet(1,2);
    if (adminPass != CurrentAdminPass) {
        return res.status(400).send('Wrong Admin Password');
    }
    try {
        const currentPassword = await getAllValFromColumn(Number(process.env.MEMBER_PASSWORD_COL));
        // console.log('Current password fetched successfully:', currentPassword);
        res.status(200).send(currentPassword.join(','));
    } catch (error) {
        console.error('Error fetching current password:', error);
        res.status(500).send('Error fetching current password.');
    }
});

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

            // Send the email
            const mailOptions = {
                from: `"LockWise" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'Your Robotics Club Password',
                text: `Hello,\n\nYour new password is: ${password}\n\nPlease keep it safe.\n\n- Robotics Club`
            };

            try {
                await transporter.sendMail(mailOptions);
                // console.log(`Email sent to ${email}`);
                await changeValueSheet(i, 5, password);
                // console.log(`Password updated in sheet for ${email}`);
            } catch (err) {
                console.error(`Failed to send/update for ${email}:`, err);
            }
        }
    } catch (err) {
        console.error('Scheduler failed:', err);
    }
};

app.post('/changepassword', async (req, res) => {
    const { adminPass } = req.body;
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
//================================================================================//
// const job = schedule.scheduleJob('59 59 23 * * *', async function(){
//   const data = await getAllValFromColumn(3);
//   console.log(data);
// });

const job = schedule.scheduleJob('59 59 23 * * *', async function () {
    await changePassword();
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});