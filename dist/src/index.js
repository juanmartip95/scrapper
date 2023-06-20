"use strict";
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { Browser } = require('puppeteer');
const { ADMIN_EMAIL, user_handle, ADMIN_PASSWORD } = require('../secret');
const main = async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto('https://twitter.com/i/flow/login');
    await page.waitForNetworkIdle({ idleTime: 1500 });
    // Select the user input
    await page.waitForSelector('input[autocomplete="username"]');
    await page.type('input[autocomplete="username"]', ADMIN_EMAIL, { delay: 50 });
    // Press the Next button
    await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('div[role="button"]'));
        const nextButton = buttons.find(button => button.innerText.toLowerCase().includes('next'));
        if (nextButton) {
            nextButton.click();
        }
    });
    await page.waitForNetworkIdle({ idleTime: 1500 });
    // Sometimes Twitter suspects suspicious activities, so it asks for your handle/phone number
    const extractedText = await page.evaluate(() => document.body.innerText);
    if (extractedText.includes('Enter your phone number or username')) {
        await page.waitForSelector('input[autocomplete="on"]');
        await page.type('input[autocomplete="on"]', user_handle, { delay: 50 });
        // Press the Next button
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('div[role="button"]'));
            const nextButton = buttons.find(button => button.innerText.toLowerCase().includes('next'));
            if (nextButton) {
                nextButton.click();
            }
        });
        await page.waitForNetworkIdle({ idleTime: 1500 });
    }
    // Select the password input
    await page.waitForSelector('input[autocomplete="current-password"]');
    await page.type('input[autocomplete="current-password"]', ADMIN_PASSWORD, { delay: 50 });
    // Press the Login button
    await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('div[role="button"]'));
        const loginButton = buttons.find(button => button.innerText.toLowerCase().includes('log in'));
        if (loginButton) {
            loginButton.click();
        }
    });
    await page.waitForNetworkIdle({ idleTime: 2000 });
    // Either close the browser or continue with further automation
    // await browser.close();
};
main();
