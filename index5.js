const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { ADMIN_EMAIL, user_handle, ADMIN_PASSWORD } = require('./secret');

async function scrollPageToBottom(page) {
    await page.evaluate(async () => {
        const scrollDelay = 1000; // Delay between each scroll attempt

        let previousHeight = 0;
        let currentHeight = -1;

        while (previousHeight !== currentHeight) {
            previousHeight = currentHeight;
            window.scrollBy(0, window.innerHeight);
            await new Promise((resolve) => setTimeout(resolve, scrollDelay));
            currentHeight = document.documentElement.scrollHeight;
        }
    });
}


async function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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

    await page.goto('https://twitter.com/bankofengland/with_replies');

    const targetTweetCount = 10900; // Desired number of tweets to scrape
    const scrollDistance = 100; // Adjust the scroll distance as needed
    const delayAfterScroll = 8500; // Delay after each scroll
    const maxScrollAttempts = Math.ceil(targetTweetCount / 20); // Maximum number of scroll attempts

    let scrollAttempts = 0;
    let previousTweetCount = 0;
    let tweets = new Set(); // Store tweets in a Set to ensure uniqueness

    while (tweets.size < targetTweetCount && scrollAttempts < maxScrollAttempts) {
        try {
            await scrollPageToBottom(page);
            scrollAttempts++;
            await delay(delayAfterScroll); // Delay after each scroll

            // Scrape tweet text and date
            const newTweets = await page.$$eval('[data-testid="tweet"]', (elements) => {
                return elements.map((element) => {
                    const tweetTextElement = element.querySelector(
                        '.css-901oao.r-1nao33i.r-37j5jr.r-a023e6.r-16dba41.r-rjixqe.r-bcqeeo.r-bnwqim.r-qvutc0'
                    );
                    const tweetDateElement = element.querySelector('time[datetime]');
                    return {
                        text: tweetTextElement ? tweetTextElement.innerText : '',
                        date: tweetDateElement ? tweetDateElement.getAttribute('datetime') : '',
                    };
                });
            });

            // Add new tweets to the Set
            newTweets.forEach((tweet) => tweets.add(tweet));

            // Check if the number of unique tweets has increased or if no new tweets are found
            if (tweets.size === previousTweetCount || newTweets.length === 0) {
                console.log('No new tweets, stopping scrolling');
                break;
            }

            previousTweetCount = tweets.size;
        } catch (error) {
            console.error('Error occurred while scrolling:', error);
            break;
        }
    }

    tweets = [...tweets]; // Convert the Set back to an array

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
