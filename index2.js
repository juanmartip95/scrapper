const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const ObjectsToCsv = require('objects-to-csv');

async function scrapeTweets() {
    try {
        // Launch the browser and create a new page
        const browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();

        // Disable default navigation timeout
        page.setDefaultNavigationTimeout(0);

        // Wait for the user to log in manually
        console.log('Please log in to your Twitter account in the opened browser.');
        await new Promise(resolve => setTimeout(resolve, 30000)); // Add a delay of 30 seconds for the user to log in

        // Go to the desired Twitter search page
        await page.goto('https://twitter.com/search?q=Lena&src=trend_click&vertical=trends');

        // Wait for the tweets to load
        await page.waitForSelector('.css-1dbjc4n.r-16y2uox.r-1wbh5a2.r-1f0gr7q');

        // Extract the text from the tweets
        const tweetTexts = await page.$$eval('.css-1dbjc4n.r-16y2uox.r-1wbh5a2.r-1f0gr7q .css-901oao.css-16my406.r-poiln3.r-bcqeeo.r-qvutc0', (tweets) =>
            tweets.map((tweet) => tweet.textContent.trim())
        );

        // Store the tweet texts in a CSV file
        const csvData = tweetTexts.map((text) => ({ tweet: text }));
        const csv = new ObjectsToCsv(csvData);
        await csv.toDisk(path.join(__dirname, 'tweets.csv'));

        console.log('Tweets extracted and saved to tweets.csv');

        await browser.close();
    } catch (error) {
        console.error('Error occurred:', error);
    }
}

scrapeTweets();
