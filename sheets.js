require('dotenv').config();
const { Console } = require('console');
const { google } = require('googleapis');
const path = require('path');
const fs = require("fs");
const isRender = process.env.RENDER === 'true';
const keyPath = isRender
  ? '/etc/secrets/robotics-club-door-lock-592445d6ec57.json'
  : path.join('etc', 'secrets', 'robotics-club-door-lock-592445d6ec57.json');

if (!fs.existsSync(keyPath)) {
  const keyJson = Buffer.from(process.env.GOOGLE_KEY_JSON, "base64").toString("utf-8");
  fs.writeFileSync(keyPath, keyJson);
}
else{
    console.log("Key file exists");
}
const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const SPREADSHEET_ID = process.env.SPREADSHEET_ID; 
const SHEET_NAME = 'PasswordResetListRoboticsClub'; 

async function appendEmailToSheet(email) {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    console.log('Google Sheets API client created.');
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

async function getValueSheet(row, col) {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    console.log('Google Sheets API client created.');

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:C`,
        });
        const rows = response.data.values;
        if (rows.length) {
            // Assuming the password is in the first third column and first row
            return rows[row][col];
        } else {
            throw new Error('No data found');
        }
    } catch (err) {
        console.error('Failed to retrieve from Google Sheets:', err);
        throw err;
    }
}

async function changeValueSheet(row, col, newValue) {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    console.log('Google Sheets API client created.');

    try {
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!${String.fromCharCode(65 + col)}${row + 1}`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[newValue]],
            },
        });
        console.log('Value updated successfully in Google Sheets.');
    } catch (err) {
        console.error('Failed to update Google Sheets:', err);
        throw err;
    }
}

module.exports = { appendEmailToSheet, getValueSheet, changeValueSheet };
