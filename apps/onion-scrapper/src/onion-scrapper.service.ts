import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import { connect } from 'puppeteer-real-browser';

import { ConfigService } from '@nestjs/config';

interface PriceData {
  domain: string;
  priceValue: number;
  productLink: string;
}

@Injectable()
export class OnionScrapperService {
  constructor(
    private readonly httpService: HttpService,
    private configService: ConfigService,
  ) {}

  // async launchBrowser() {
  //   const { browser, page } = await connect({
  //     headless: false,
  //
  //     args: [],
  //
  //     customConfig: {},
  //
  //     turnstile: true,
  //
  //     connectOption: {},
  //
  //     disableXvfb: false,
  //     ignoreAllFlags: false,
  //     // proxy:{
  //     //     host:'<proxy-host>',
  //     //     port:'<proxy-port>',
  //     //     username:'<proxy-username>',
  //     //     password:'<proxy-password>'
  //     // }
  //   });
  //
  //   return { browser, page };
  // }

  // async countProductCards(page) {
  //   let totalCount = 0;
  //   const timeout = 60000; // 60 seconds
  //   const startTime = Date.now();
  //
  //   while (true) {
  //     // Count current .product-card elements
  //     const productCards = await page.$$('.product-card');
  //     totalCount = productCards.length;
  //
  //     // Check if the spinner-container exists
  //     const spinnerExists = (await page.$('.spinner-container')) !== null;
  //
  //     // If spinner does not exist, break the loop
  //     if (!spinnerExists) {
  //       break;
  //     }
  //
  //     // Scroll to the bottom of the page
  //     await page.evaluate(() => {
  //       window.scrollTo(0, document.body.scrollHeight);
  //     });
  //
  //     // Check if we've reached the timeout
  //     if (Date.now() - startTime > timeout) {
  //       console.log('Timeout reached while waiting for more product cards.');
  //       break;
  //     }
  //   }
  //
  //   return totalCount;
  // }

  async scrapByKeywordApi() {
    const apiKey = this.configService.get<string>('SCRAPING_FISH_API_KEY');

    const payload = {
      api_key: apiKey,
      url: 'https://www.hagglezon.com/en/s/benq',
      // render_js: 'true',
      js_scenario: JSON.stringify({
        steps: [
          { wait_for: '.user-options' },
          { click: '[data-test="user-options-btn"]' },
          { wait_for: '.currency-list' },
          { click: 'input[name="currency"][value="PLN"]' },
          { wait_for: '.sub-menu button' },
          { click: '.sub-menu button' },
          { wait_for: '.search-results' },
          { wait_for: '.card-media:not(.fake-element)' },
          // { scroll: 5000 },
          // {
          //   evaluate: 'window.scrollTo(0, document.body.scrollHeight)',
          // },
          // { wait: 5000 },
          // {
          //   evaluate: 'window.scrollTo(0, document.body.scrollHeight)',
          // },
          // { scroll: 5000 },
          // { wait: 5000 },
          // {
          //   evaluate: `() => new Promise((resolve) => {
          //     const checkSpinner = setInterval(() => {
          //       window.scrollTo(0, document.body.scrollHeight);
          //
          //       console.log("Another iteration")
          //
          //       // Check if the spinner-container exists
          //       const spinnerExists = document.querySelector('.spinner-container') !== null;
          //
          //       // If spinner does not exist, resolve the promise
          //       if (!spinnerExists) {
          //         clearInterval(checkSpinner);
          //         resolve();
          //       }
          //     }, 3000);
          //   });
          // `,
          // },
        ],
      }),
    };

    const response = await firstValueFrom(
      this.httpService.get('https://scraping.narf.ai/api/v1/', {
        params: payload,
      }),
    );

    // console.dir(response, { depth: null });

    const data = response.data;

    fs.writeFileSync('./tmp/test-sync.txt', data);

    const $ = cheerio.load(data);

    // Scrape product data
    const products = $('.product-card')
      .map((_, card) => {
        const title = $(card)
          .find('.card-title span.text-wrapper')
          .text()
          .trim();
        // const imageUrl = $(card).find('.carousel__inner-slide img').attr('src') || '';
        const price = $(card).find('.price-value').text().trim();

        return { title, price };
      })
      .get();

    console.dir(products, { depth: null });
  }

  async scrapByAsinApi() {
    const apiKey = this.configService.get<string>('SCRAPING_FISH_API_KEY');

    const payload = {
      api_key: apiKey,
      url: 'https://www.hagglezon.com/en/s/B0D4V6GYX3',
      js_scenario: JSON.stringify({
        steps: [
          { wait_for: '.user-options' },
          { click: '[data-test="user-options-btn"]' },
          { wait_for: '.currency-list' },
          { click: 'input[name="currency"][value="PLN"]' },
          { wait_for: '.sub-menu button' },
          { click: '.sub-menu button' },
          { wait: 3000 },
          { wait_for: '.search-results-container' },
          { wait_for: '.list-prices' },
        ],
      }),
    };

    const response = await firstValueFrom(
      this.httpService.get('https://scraping.narf.ai/api/v1/', {
        params: payload,
      }),
    );

    const data = response.data;

    const $ = cheerio.load(data);

    const prices = $('.list-prices .price-item')
      .map((_, priceItem) => {
        const priceElement = $(priceItem);
        const domainLink = priceElement.find('.buy-button').attr('href');
        const domainMatch = domainLink
          ? domainLink.match(/amazon\.(\w{2})/)
          : null;
        const domain = domainMatch ? domainMatch[1] : null;

        const priceText = priceElement.find('.price-value').text();
        const priceValue = priceText
          ? parseFloat(priceText.replace(/[^\d,.-]+/g, '').replace(',', '.'))
          : null;
        const productLink = domainLink ? domainLink.split('?')[0] : null;

        return domain && priceValue && productLink
          ? { domain, priceValue, productLink }
          : null;
      })
      .get()
      .filter(Boolean) as PriceData[]; // Use .get() to convert Cheerio object to array

    // Create an object to hold single price per domain
    const priceObject: Record<
      string,
      { priceValue: number; productLink: string }
    > = {};
    prices.forEach(({ domain, priceValue, productLink }) => {
      priceObject[domain] = { priceValue, productLink };
    });

    // Convert the price object to an array for sorting
    const pricesArray = Object.entries(priceObject).map(
      ([domain, { priceValue, productLink }]) => ({
        domain,
        priceValue,
        productLink,
      }),
    );

    // Sort prices by value
    pricesArray.sort((a, b) => a.priceValue - b.priceValue);

    const lowestPrice = pricesArray[0];
    const secondLowestPrice = pricesArray[1];

    console.dir(pricesArray, { depth: null });

    if (lowestPrice && secondLowestPrice) {
      const priceDifferencePercentage =
        ((secondLowestPrice.priceValue - lowestPrice.priceValue) /
          secondLowestPrice.priceValue) *
        100;

      if (priceDifferencePercentage > 20) {
        console.log(
          `The price for ${lowestPrice.domain} is lower than 20% compared to ${secondLowestPrice.domain}.`,
        );
      } else {
        console.log(
          `The price for ${lowestPrice.domain} is NOT lower than 20% compared to ${secondLowestPrice.domain}.`,
        );
      }
    } else {
      console.log(`Not enough prices found for comparison.`);
    }
  }
}
