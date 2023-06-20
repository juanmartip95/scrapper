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

async function captureImagesFromPage(page) {
    const photoUrls = await page.$$eval('img[src$=".webp"]', (images) =>
        images.map((image) => ({
            url: image.src,
            filename: image.src.split('/').pop(),
        }))
    );

    console.log('Total photos found:', photoUrls.length);

    for (const { url, filename } of photoUrls) {
        await savePhoto(url, filename);
    }
}

async function captureImagesFromWebsite(initialUrl, currentPage = 1) {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(0); // Disable navigation timeout
    await page.goto(initialUrl);

    const scrollDistance = 9000; // Adjust the scroll distance as needed
    const scrollInterval = 1500; // Adjust the interval between scrolls as needed

    await scrollPageToBottom(page, scrollDistance, scrollInterval);

    await captureImagesFromPage(page);

    const nextPageButton = await page.evaluate((currentPage) => {
        const nextPageLink = document.querySelector(`.post-page-numbers.current[aria-current="page"] + a.post-page-numbers:nth-child(${currentPage + 1})`);
        return nextPageLink ? nextPageLink.href : null;
    }, currentPage);

    if (nextPageButton) {
        const nextPageNumber = currentPage + 1;
        console.log(`Navigating to page ${nextPageNumber}`);
        await browser.close();
        await captureImagesFromWebsite(nextPageButton, nextPageNumber); // Recursively capture images from the next page
    } else {
        await browser.close();
        console.log('All images captured!');
    }
}

(async () => {
    try {
        const initialUrl = ''; // Initial URL here cong
        await captureImagesFromWebsite(initialUrl);
    } catch (error) {
        console.error('Error occurred:', error);
    }
})();
