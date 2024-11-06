import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import * as cheerio from 'cheerio';
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

  async sleep(ms) {
    return new Promise((res) => setTimeout(res, ms));
  }

  async launchBrowser() {
    const { browser, page } = await connect({
      args: ['--start-maximized'],

      headless: false,

      customConfig: {},

      turnstile: true,

      connectOption: {
        defaultViewport: null,
      },

      disableXvfb: false,
      ignoreAllFlags: false,
      // proxy:{
      //     host:'<proxy-host>',
      //     port:'<proxy-port>',
      //     username:'<proxy-username>',
      //     password:'<proxy-password>'
      // }
    });

    return { browser, page };
  }

  async scrapByKeywordApi() {
    // Maximum time for the while loop scrolling/loading process
    const SCROLL_TIMEOUT = 60000; // 60 seconds

    const { browser, page } = await this.launchBrowser();

    await page.goto('https://www.hagglezon.com/en/s/benq'); // Replace with your URL

    await page.waitForSelector('.user-options', { timeout: 10000 });

    await page.click('[data-test="user-options-btn"]');

    await page.waitForSelector('.currency-list', { timeout: 10000 });

    await page.click('input[name="currency"][value="PLN"]');

    await page.waitForSelector('.sub-menu button', { timeout: 10000 });

    await page.click('.sub-menu button');

    await page.waitForSelector('.search-results', { timeout: 10000 });

    await page.waitForSelector('.card-media:not(.fake-element)', {
      timeout: 10000,
    });

    // Scroll and wait strategy with a timeout for loading additional content
    const startScrollTime = Date.now();
    let hasMoreContent = true;
    while (hasMoreContent) {
      // Check if scrolling timeout has been reached
      if (Date.now() - startScrollTime > SCROLL_TIMEOUT) {
        console.log('Scrolling timeout reached.');
        break;
      }

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await this.sleep(5000);

      // Check if the loading spinner is still visible
      hasMoreContent = await page.evaluate(() => {
        return document.querySelector('.spinner-container') !== null;
      });
    }

    await this.sleep(5000);

    const products = await page.evaluate(() => {
      const allProducts = [];
      const productElements = document.querySelectorAll('.product-card');
      const productsArray = Array.from(productElements);

      for (const product of productsArray) {
        const titleElement = product.querySelector(
          '.card-title span.text-wrapper',
        );

        const title = titleElement ? titleElement.textContent.trim() : '';

        // Extract prices with domain, price, and product link details
        const priceItems = product.querySelectorAll('.list-prices .price-item');

        const prices = Array.from(priceItems)
          .map((priceItem) => {
            const priceElement = priceItem.querySelector('.price-value');
            const buyButton = priceItem.querySelector(
              '.buy-button',
            ) as HTMLAnchorElement;
            const domainLink = buyButton ? buyButton.href : null;

            // Extract domain from the URL if it matches "amazon.xx" pattern
            const domainMatch = domainLink
              ? domainLink.match(/amazon\.(\w{2})/)
              : null;
            const domain = domainMatch ? domainMatch[1] : null;

            const priceText = priceElement
              ? priceElement.textContent.trim()
              : null;
            const priceValue = priceText
              ? parseFloat(
                  priceText.replace(/[^\d,.-]+/g, '').replace(',', '.'),
                )
              : null;
            const productLink = domainLink ? domainLink.split('?')[0] : null;

            return domain && priceValue && productLink
              ? { domain, priceValue, productLink }
              : null;
          })
          .filter(Boolean) as PriceData[]; // Filter out any null entries

        allProducts.push({ title, prices });
      }
      return allProducts;
    });

    products.forEach(({ prices, title }) => {
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

      if (lowestPrice && secondLowestPrice) {
        const priceDifferencePercentage =
          ((secondLowestPrice.priceValue - lowestPrice.priceValue) /
            secondLowestPrice.priceValue) *
          100;

        if (priceDifferencePercentage > 20) {
          console.log(
            `Product ${title} - The price for ${lowestPrice.domain} is lower than 20% compared to ${secondLowestPrice.domain}.`,
          );
        } else {
          console.log(
            `Product ${title} - The price for ${lowestPrice.domain} is NOT lower than 20% compared to ${secondLowestPrice.domain}.`,
          );
        }
      } else {
        console.log(`Not enough prices found for comparison.`);
      }
    });

    // Close browser after interactions are done
    await browser.close();
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