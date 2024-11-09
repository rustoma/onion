import { Injectable } from '@nestjs/common';
import { connect } from 'puppeteer-real-browser';

import * as cheerio from 'cheerio';
import { Element } from 'domhandler';

export interface PriceData {
  domain: string;
  value: number;
  url: string;
}

interface Product {
  title: string;
  asin: string;
  image: string;
  prices: PriceData[];
}

interface Deal {
  title: string;
  asin: string;
  image: string;
  price: Omit<PriceData, 'domain'>;
}

@Injectable()
export class OnionScrapperService {
  async sleep(ms: number) {
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

  extractASIN(url: string): string | null {
    if (!url) return null;
    const match = url.match(/\/dp\/([A-Z0-9]+)/);
    return match ? match[1] : null;
  }

  extractLinkDomainPriceFromPriceItem(priceItem: Element): PriceData {
    const $ = cheerio.load('<div>' + priceItem.toString() + '</div>'); // Wrapping priceItem as a Cheerio object

    const priceElement = $(priceItem).find('.price-value');
    const domainLink = $(priceItem).find('.buy-button').attr('href');

    // Extract domain from the URL if it matches "amazon.xx" pattern
    const domainMatch = domainLink ? domainLink.match(/amazon\.(\w{2})/) : null;
    const domain = domainMatch ? domainMatch[1] : null;

    const priceText = priceElement.text().trim();

    const priceValue = priceText
      ? parseFloat(priceText.replace(/[^\d,.-]+/g, '').replace(',', '.'))
      : null;

    const url = domainLink ? domainLink.split('?')[0] : null;

    return domain && priceValue && url
      ? { domain, value: priceValue, url }
      : null;
  }

  findDeals(products: Product[]): Deal[] {
    return products
      .map((product) => {
        const { title, asin, image, prices } = product;

        const priceObject: Record<string, { value: number; url: string }> = {};

        prices.forEach(({ domain, value, url }) => {
          priceObject[domain] = { value, url };
        });

        // Convert the price object to an array for sorting
        const pricesArray = Object.entries(priceObject).map(
          ([domain, { value, url }]) => ({
            domain,
            value,
            url,
          }),
        );

        // Sort prices by value
        pricesArray.sort((a, b) => a.value - b.value);

        const lowestPrice = pricesArray[0];
        const secondLowestPrice = pricesArray[1];

        if (lowestPrice && secondLowestPrice) {
          const priceDifferencePercentage =
            ((secondLowestPrice.value - lowestPrice.value) /
              secondLowestPrice.value) *
            100;

          if (priceDifferencePercentage > 5) {
            const { url, value } = lowestPrice;

            return {
              asin,
              title,
              image,
              price: { value: value, url: url },
            };
          }

          return null;
        } else {
          console.log(`Not enough prices found for comparison.`);
          return null;
        }
      })
      .filter(Boolean);
  }

  async scrapByKeywordApi() {
    // Maximum time for the while loop scrolling/loading process
    const SCROLL_TIMEOUT = 15000; // 60 seconds

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
        break;
      }

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await this.sleep(5000);

      // Check if the loading spinner is still visible
      hasMoreContent = await page.evaluate(() => {
        return document.querySelector('.spinner-container') !== null;
      });
    }

    await this.sleep(2000);

    const html = await page.content();
    await browser.close();
    const $ = cheerio.load(html);

    const products: Product[] = [];

    $('.product-card').each((_, product) => {
      const titleElement = $(product).find('.card-title span.text-wrapper');

      const buyUrl = $(product)
        .find('.list-prices .price-item .buy-button')
        .attr('href');

      const asin = buyUrl ? this.extractASIN(buyUrl) : null;

      const imageUrl = $(product)
        .find('.card-media .carousel__slider .carousel__slide img')
        .attr('src');

      const title = titleElement.text().trim();

      // Extract prices with domain, price, and product link details
      const prices = $(product)
        .find('.list-prices .price-item')
        .map((_, priceItem) =>
          this.extractLinkDomainPriceFromPriceItem(priceItem),
        )
        .get()
        .filter(Boolean); // Filter out any null entries

      if (asin && title) {
        products.push({ title, asin, image: imageUrl ?? '', prices });
      }
    });

    const deals = this.findDeals(products);

    console.dir(deals, { depth: null });
  }

  async scrapByAsinApi() {
    const { browser, page } = await this.launchBrowser();

    await page.goto('https://www.hagglezon.com/en/s/B07W9LRB2J'); // TODO: Replace URL

    await page.waitForSelector('.user-options', { timeout: 10000 });

    await page.click('[data-test="user-options-btn"]');

    await page.waitForSelector('.currency-list', { timeout: 10000 });

    await page.click('input[name="currency"][value="PLN"]');

    await page.waitForSelector('.sub-menu button', { timeout: 10000 });

    await page.click('.sub-menu button');

    await this.sleep(3000);

    await page.waitForSelector('.search-results-container', { timeout: 10000 });

    await page.waitForSelector('.card-media:not(.fake-element)', {
      timeout: 10000,
    });

    const html = await page.content();
    await browser.close();

    const $ = cheerio.load(html);

    const highlightedProduct = $('.highlighted-product');

    const titleElement = $(highlightedProduct).find(
      '.card-title span.text-wrapper',
    );

    const buyUrl = $(highlightedProduct)
      .find('.list-prices .price-item .buy-button')
      .attr('href');

    const asin = buyUrl ? this.extractASIN(buyUrl) : null;

    const imageUrl = $(highlightedProduct)
      .find('.card-media .carousel__slider .carousel__slide img')
      .attr('src');

    const title = titleElement.text().trim();

    // Extract prices with domain, price, and product link details
    const prices = $(highlightedProduct)
      .find('.list-prices .price-item')
      .map((_, priceItem) =>
        this.extractLinkDomainPriceFromPriceItem(priceItem),
      )
      .get()
      .filter(Boolean); // Filter out any null entries

    if (!asin || !title) return null;

    const product = { title, asin, image: imageUrl ?? '', prices };

    const deals = this.findDeals([product]);

    console.dir(deals, { depth: null });
  }
}
