const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');
const sharp = require('sharp');

const app = express();
const PORT = 8000;
const downloadDirectory = './downloads';

const initializeDownloadDirectory = (directory) => {
    return new Promise((resolve, reject) => {
        fs.mkdir(directory, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

const downloadAndConvertImages = (photos) => {
    photos.forEach((photo) => {
        const { url, filename } = photo;
        const imageFilePath = `${downloadDirectory}/${filename.replace('.webp', '.png')}`;

        axios({
            url: url,
            responseType: 'arraybuffer',
        })
            .then((response) => {
                sharp(response.data)
                    .webp()
                    .toFile(imageFilePath)
                    .then(() => {
                        console.log(`Image ${filename} saved as ${imageFilePath}`);
                    })
                    .catch((err) => {
                        console.log(`Error saving image ${filename}: ${err}`);
                    });
            })
            .catch((err) => {
                console.log(`Error downloading image ${filename}: ${err}`);
            });
    });
};

const scrapeWebsite = () => {
    const url = '';//onic

    axios(url)
        .then((response) => {
            const html = response.data;
            const $ = cheerio.load(html);
            const photos = [];

            $('img.full-block').each(function () {
                const imageUrl = $(this).attr('src');
                const imageFilename = imageUrl.split('/').pop();

                photos.push({
                    url: imageUrl,
                    filename: imageFilename,
                });
            });

            console.log(photos);
            downloadAndConvertImages(photos);
        })
        .catch((err) => {
            console.log(err);
        });
};

initializeDownloadDirectory(downloadDirectory)
    .then(() => {
        scrapeWebsite();
        app.listen(PORT, () => console.log(`Server running on PORT ${PORT}`));
    })
    .catch((err) => {
        console.log(`Error initializing download directory: ${err}`);
    });
