const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const savePhoto = async (url, filename) => {
    const response = await axios.get(url, {
        responseType: 'arraybuffer',
    });
    const filePath = path.join(__dirname, 'downloads', filename);
    fs.writeFileSync(filePath, response.data);
    console.log(`Downloaded photo saved: ${filePath}`);
};

async function scrollPageToBottom(page, scrollDistance, scrollInterval) {
    let previousHeight = await page.evaluate('document.documentElement.scrollHeight');

    while (true) {
        try {
            await page.evaluate(`window.scrollBy(0, ${scrollDistance})`);
            await page.waitForTimeout(scrollInterval);

            const currentHeight = await page.evaluate('document.documentElement.scrollHeight');
            if (currentHeight === previousHeight) {
                break; // No new changes, stop scrolling
            }

            previousHeight = currentHeight;
        } catch (error) {
            console.error('Error occurred while scrolling:', error);
            break;
        }
    }
}

(async () => {
    try {
        const browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();
        await page.goto('');//URL here best

        const scrollDistance = 25000; // Adjust the scroll distance as needed
        const scrollInterval = 1500; // Adjust the interval between scrolls as needed
        const maxScrollAttempts = 50; // Maximum number of scroll attempts

        let scrollAttempts = 0;
        let previousHeight = 0;

        while (scrollAttempts < maxScrollAttempts) {
            try {
                await scrollPageToBottom(page, scrollDistance, scrollInterval);
                scrollAttempts++;

                const currentHeight = await page.evaluate('document.documentElement.scrollHeight');
                if (currentHeight === previousHeight) {
                    console.log('No new changes, stop scrolling');
                    break; // No new changes, stop scrolling
                }

                previousHeight = currentHeight;
            } catch (error) {
                console.error('Error occurred while scrolling:', error);
                break;
            }
        }

        const photoUrls = await page.$$eval('img[src$=".jpg"]', (images) =>
            images.map((image) => ({
                url: image.src,
                filename: image.src.split('/').pop(),
            }))
        );



        console.log('Total photos found:', photoUrls.length);

        for (const { url, filename } of photoUrls) {
            await savePhoto(url, filename);
        }

        await browser.close();
    } catch (error) {
        console.error('Error occurred:', error);
    }
})();
