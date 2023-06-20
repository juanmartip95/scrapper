const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { ADMIN_EMAIL, user_handle, ADMIN_PASSWORD } = require('./secret');

async function extractItems(page) {
    const tweetElements = await page.$$('[data-testid="tweet"]');
    const items = [];
    for (const element of tweetElements) {
        items.push({
            text: element.querySelector('.css-901oao.r-1nao33i.r-37j5jr.r-a023e6.r-16dba41.r-rjixqe.r-bcqeeo.r-bnwqim.r-qvutc0').innerText,
            date: element.querySelector('time[datetime]').getAttribute('datetime'),
        });
    }
    return items;
}

async function scrapeItems(page, extractItems, itemCount, scrollDelay = 800) {
    let items = [];
    try {
        let previousHeight;
        while (items.length < itemCount) {
            items = await page.evaluate(extractItems);
            previousHeight = await page.evaluate('document.body.scrollHeight');
            await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
            await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`);
            await page.waitForTimeout(scrollDelay);
        }
    } catch (e) {
        // Handle any errors during scrolling
    }
    return items;
}

const main = async () => {
    puppeteer.use(StealthPlugin());
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
        const nextButton = buttons.find((button) =>
            button.innerText.toLowerCase().includes('next')
        );
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
            const nextButton = buttons.find((button) =>
                button.innerText.toLowerCase().includes('next')
            );
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
        const loginButton = buttons.find((button) =>
            button.innerText.toLowerCase().includes('log in')
        );
        if (loginButton) {
            loginButton.click();
        }
    });
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    page.setDefaultNavigationTimeout(2 * 60 * 1000); // Increase timeout to 2 minutes

    // Navigate to the desired URL
    await page.goto('https://twitter.com/search?q=%23Klimakatastrophe&src=trend_click&vertical=trends');

    const targetTweetCount = 1000; // Desired number of tweets to scrape

    // Replace the scrollPageToBottom function call with the new scrapeItems function call
    const tweets = await scrapeItems(page, extractItems, targetTweetCount);

    for (const tweet of tweets) {
        console.log('Tweet text\t:', tweet.text);
        console.log('Tweet date\t:', tweet.date);
    }

    // Save tweets to CSV file
    const csvWriter = createCsvWriter({
        path: 'tweets.csv',
        header: [
            { id: 'text', title: 'Tweet text' },
            { id: 'date', title: 'Tweet date' },
        ],
    });

    const records = tweets.map((tweet) => ({
        text: tweet.text.replace(/\n/g, ''), // Remove line breaks from tweet text
        date: tweet.date,
    }));

    await csvWriter.writeRecords(records);

    // Display the counter
    console.log('Captured tweets:', tweets.length);

    // Close browser
    await browser.close();
};

main();
