require('dotenv').config();
const { google } = require('googleapis');
const path = require('path');
const keyPath = path.join('robotics-club-door-lock-592445d6ec57.json');
const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const SPREADSHEET_ID = process.env.SPREADSHEET_ID; 
const SHEET_NAME = 'PasswordResetListRoboticsClub'; 

async function appendEmailToSheet(email) {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    const now = new Date().toISOString();
    const values = [[email, now]];

    try {
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:B`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values,
            },
        });
        console.log('Email logged to Google Sheets.');
    } catch (err) {
        console.error('Failed to log to Google Sheets:', err);
        throw err;
    }
}

module.exports = { appendEmailToSheet };
