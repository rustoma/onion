import { connect } from 'puppeteer-real-browser';
import { Element } from 'domhandler';
import * as cheerio from 'cheerio';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import {
  Deal,
  HandleAsinDeal,
  PriceData,
  Product,
  ScraperJobNames,
  ScrapJob,
} from '@scraper/onion-scraper.interface';
import { Job } from 'bullmq';
import { SCRAPER_JOBS } from '@scraper/onion-scraper.consts';
import { Query } from '@prisma/client';
import { DbService } from 'lib/db';

@Processor('scraper')
export class OnionScraperConsumer extends WorkerHost {
  constructor(private db: DbService) {
    super();
  }

  async sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
  }

  async launchBrowser() {
    const { browser, page } = await connect({
      args: ['--start-maximized'],
      turnstile: true,
      headless: false,
      customConfig: {},
      connectOption: {
        defaultViewport: null,
      },
      // proxy:{
      //     host:'<proxy-host>',
      //     port:'<proxy-port>',
      //     username:'<proxy-username>',
      //     password:'<proxy-password>'
      // }
    });

    return { browser, page };
  }

  async handleGetBrowserFingerprints() {
    const { browser, page } = await this.launchBrowser();

    await page.goto('https://echo.free.beeceptor.com');

    await page.screenshot({
      path: './screenshots/browser-finger-1.jpg',
      fullPage: true,
    });

    await page.goto('https://tls.peet.ws/api/tls');

    await page.screenshot({
      path: './screenshots/browser-finger-2.jpg',
      fullPage: true,
    });

    await page.goto('https://fingerprint.com/products/bot-detection');

    await this.sleep(10000);

    await page.screenshot({
      path: './screenshots/browser-finger-3.jpg',
      fullPage: true,
    });

    await browser.close();
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

  async handleScrapByKeyword(query: Query) {
    const { keyword } = query;
    if (!keyword) return;
    // Maximum time for the while loop scrolling/loading process
    const SCROLL_TIMEOUT = 120000; // 120 seconds

    const { browser, page } = await this.launchBrowser();

    await page.goto(`https://www.hagglezon.com/en/s/${keyword}`);

    await page.waitForSelector('.user-options', { timeout: 60000 });

    await page.click('[data-test="user-options-btn"]');

    await page.waitForSelector('.currency-list', { timeout: 60000 });

    await page.click('input[name="currency"][value="PLN"]');

    await page.waitForSelector('.sub-menu button', { timeout: 60000 });

    await page.click('.sub-menu button');

    await page.waitForSelector('.search-results', { timeout: 60000 });

    await page.waitForSelector('.card-media:not(.fake-element)', {
      timeout: 60000,
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
      await this.sleep(10000);

      // Check if the loading spinner is still visible
      hasMoreContent = await page.evaluate(() => {
        return document.querySelector('.spinner-container') !== null;
      });
    }

    await this.sleep(10000);

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

    if (Array.isArray(deals) && deals.length) {
      await Promise.all(deals.map((deal) => this.handleDeal({ deal })));
    }
  }

  async handleDeal({ deal, priceAlert }: HandleAsinDeal) {
    const { title, asin, image, price } = deal;

    const product = await this.db.product.upsert({
      where: {
        asin,
      },
      update: {
        updatedAt: new Date(),
      },
      create: {
        title,
        asin,
        image,
      },
    });

    const activePrices = await this.db.price.findMany({
      where: {
        isActive: true,
        productId: product.id,
      },
    });

    const activePriceIds = activePrices.map((price) => price.id);

    await this.db.price.updateMany({
      where: {
        id: {
          in: activePriceIds,
        },
      },
      data: {
        isActive: false,
      },
    });

    await this.db.price.create({
      data: {
        price: price.value,
        url: price.url,
        isActive: true,
        productId: product.id,
      },
    });

    if (priceAlert && price?.value <= priceAlert) {
      console.log(
        `Handle price alert because price is ${price.value} and price alert is ${priceAlert} for product ${title}`,
      );
    }
  }

  async handleScrapByAsin(query: Query) {
    const { asin, priceAlert } = query;
    if (!asin) return;

    const { browser, page } = await this.launchBrowser();

    await page.goto(`https://www.hagglezon.com/en/s/${asin}`);

    await page.waitForSelector('.user-options', { timeout: 60000 });

    await page.click('[data-test="user-options-btn"]');

    await page.waitForSelector('.currency-list', { timeout: 60000 });

    await page.click('input[name="currency"][value="PLN"]');

    await page.waitForSelector('.sub-menu button', { timeout: 60000 });

    await page.click('.sub-menu button');

    await this.sleep(10000);

    await page.waitForSelector('.search-results-container', { timeout: 60000 });

    await page.waitForSelector('.card-media:not(.fake-element)', {
      timeout: 60000,
    });

    const html = await page.content();
    await browser.close();

    const $ = cheerio.load(html);

    const highlightedProduct = $('.highlighted-product');

    const titleElement = $(highlightedProduct).find(
      '.card-title span.text-wrapper',
    );

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

    if (!title) return null;

    const product = { title, asin, image: imageUrl ?? '', prices };

    const deals = this.findDeals([product]);

    if (Array.isArray(deals) && deals.length) {
      await this.handleDeal({ deal: deals[0], priceAlert });
    }
  }

  async process(job: Job<ScrapJob, void, ScraperJobNames>): Promise<any> {
    const { query } = job.data;

    switch (job.name) {
      case SCRAPER_JOBS.scrapByAsin: {
        await this.handleScrapByAsin(query);
        break;
      }
      case SCRAPER_JOBS.scrapByKeyword: {
        await this.handleScrapByKeyword(query);
        break;
      }
      case SCRAPER_JOBS.getBrowserFingerprints: {
        await this.handleGetBrowserFingerprints();
        break;
      }
    }
  }
}
