require('dotenv').config();
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const TARGET_URL = 'https://www.facebook.com/p/Keto-Low-Carb-Kitchen-100088974451905/';
const DATA_DIR = path.join(__dirname, 'data');
const RAW_POSTS_FILE = path.join(DATA_DIR, 'raw_posts.json');
const COOKIES_FILE = path.join(DATA_DIR, 'cookies.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let browserInstance = null;
let currentData = [];

// Load existing data to avoid duplicates
if (fs.existsSync(RAW_POSTS_FILE)) {
    try {
        currentData = JSON.parse(fs.readFileSync(RAW_POSTS_FILE, 'utf8'));
    } catch (e) {
        console.error('Failed to parse existing raw_posts.json, starting fresh.');
    }
}

async function randomWait(min = 2000, max = 5000) {
    const ms = Math.floor(Math.random() * (max - min + 1) + min);
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function humanScroll(page) {
    const scrollCount = Math.floor(Math.random() * 3) + 2;
    for (let i = 0; i < scrollCount; i++) {
        const distance = Math.floor(Math.random() * 400) + 200;
        await page.mouse.wheel(0, distance);
        await randomWait(1500, 3000);
    }
}

function saveData() {
    console.log(`💾 Saving ${currentData.length} total entries to ${RAW_POSTS_FILE}...`);
    fs.writeFileSync(RAW_POSTS_FILE, JSON.stringify(currentData, null, 2));
}

async function gracefulShutdown() {
    console.log('\n🛑 Graceful shutdown initiated...');
    saveData();
    if (browserInstance) {
        await browserInstance.close();
    }
    process.exit(0);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

async function login(page) {
    console.log('🔐 Attempting Facebook Login...');
    await page.goto('https://www.facebook.com/');
    await randomWait(2000, 4000);

    // Handle cookie consent if it appears
    const cookieButton = page.locator('button[data-testid="cookie-policy-manage-dialog-accept-button"]').first();
    if (await cookieButton.isVisible()) {
        await cookieButton.click();
        await randomWait(1000, 2000);
    }

    await page.fill('#email', process.env.FB_EMAIL);
    await randomWait(500, 1500);
    await page.fill('#pass', process.env.FB_PASS);
    await randomWait(1000, 2000);
    await page.click('button[name="login"]');
    
    // Wait for feed to load or look for specific element indicating success
    await page.waitForURL(/facebook\.com\/(?:$|\?)/, { timeout: 30000 });
    console.log('✅ Login successful.');
    await randomWait(3000, 5000);
}

async function scrape() {
    console.log('🚀 Launching Human-Mimic Scraper...');
    const browser = await chromium.launch({ headless: false });
    browserInstance = browser;
    
    // Load cookies if they exist to persist session
    let contextOptions = {
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    const context = await browser.newContext(contextOptions);
    if (fs.existsSync(COOKIES_FILE)) {
        console.log('🍪 Loading existing session cookies...');
        const cookies = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf8'));
        await context.addCookies(cookies);
    }

    const page = await context.newPage();
    
    // Perform login ONLY if cookies are missing or expired
    if (!fs.existsSync(COOKIES_FILE)) {
        try {
            await login(page);
            const cookies = await context.cookies();
            fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));
        } catch (e) {
            console.warn('⚠️ Login automation failed, attempting to continue...');
        }
    }

    console.log(`🔗 Navigating to ${TARGET_URL}`);
    try {
        await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
    } catch (e) {
        console.warn('⚠️ Initial navigation timed out, trying to proceed with partial load...');
    }
    await randomWait(8000, 12000); // Give it extra time to settle

    const SEE_MORE_SELECTOR = 'div[role="button"]:has-text("See more")';
    const COMMENT_LINK_SELECTOR = 'div[role="button"]:has-text("comment")';

    // Loop for continuous scraping
    for (let i = 0; i < 20; i++) {
        console.log(`\n🔄 Cycle ${i + 1}/20...`);
        
        // Scroll and wait for new content
        const scrollAmount = 3500;
        const previousArticleCount = await page.locator('div[role="article"]').count();
        
        await page.evaluate((amt) => {
            window.scrollBy({ top: amt, behavior: 'smooth' });
        }, scrollAmount);
        
        console.log(`📏 Scrolled by: ${scrollAmount}px. Waiting for content to settle...`);
        await randomWait(6000, 10000); // More time for lazy-load
        
        // High-Speed Expansion
        const expandables = await page.locator(`${SEE_MORE_SELECTOR}, ${COMMENT_LINK_SELECTOR}`).all();
        console.log(`🚀 Rapidly expanding ${expandables.length} elements...`);
        for (const btn of expandables) {
            try { 
                if (await btn.isVisible()) {
                    await btn.click();
                    // Minimal wait for rapid expansion
                    await randomWait(200, 500); 
                }
            } catch (e) {}
        }
        
        console.log('⏳ Allowing DOM to settle after rapid expansion...');
        await randomWait(3000, 5000);

        // Final check for nested "See more" in comments
        const nestedSeeMore = await page.locator('div[role="article"] ' + SEE_MORE_SELECTOR).all();
        for (const nBtn of nestedSeeMore) {
            try { if (await nBtn.isVisible()) await nBtn.click(); } catch(e) {}
        }

        // Extraction logic with food-only filtering
        const newData = await page.evaluate(() => {
            const posts = Array.from(document.querySelectorAll('div[role="article"], div[data-ad-preview="message"], div[aria-label^="Post"]'));
            const foodKeywords = ['food', 'meal', 'dish', 'recipe', 'cooking', 'plate', 'keto', 'ingredients', 'delicious', 'yummy', 'homemade'];
            const recipeKeywords = ['ingredients', 'instructions', 'cup', 'tsp', 'tbsp', 'oven', 'minutes', 'almond flour', 'stevia', 'cream cheese', 'keto', 'low carb'];
            
            return posts.map(post => {
                const images = Array.from(post.querySelectorAll('img'));
                // Visual Filter: Only skip if it's CLEARLY not food (e.g., a person or text-only graphic)
                const hasImages = images.length > 0;
                const seemsLikeFood = images.some(img => {
                    const alt = (img.alt || '').toLowerCase();
                    return foodKeywords.some(kw => alt.includes(kw)) || alt.includes('may be an image of food') || alt === '';
                });

                if (hasImages && !seemsLikeFood) return null;

                const allText = post.innerText || post.textContent || "";
                
                // Recipe Check: Look for measurement + key term
                const hasMeasurements = ['cup', 'tsp', 'tbsp', ' oz', ' g ', ' lb'].some(kw => allText.toLowerCase().includes(kw));
                const hasBaseTerms = ['ingredients', 'instructions', 'directions', 'recipe', 'keto', 'cream cheese'].some(kw => allText.toLowerCase().includes(kw));

                if (!hasMeasurements && !hasBaseTerms && allText.length < 50) return null;

                const mainText = allText;
                
                // Detailed comment search: Target author or recipe-rich content
                const commentsNodes = Array.from(post.querySelectorAll('div[role="article"] div[dir="auto"]'));
                let firstComment = null;
                
                if (commentsNodes.length > 0) {
                    // 1. Look for author-match or recipe keywords specifically
                    const authorName = "Keto & Low Carb Kitchen";
                    const recipeKeywords = ['ingredients', 'instructions', 'cup', 'tsp', 'tbsp', 'oven', 'minutes', 'almond flour', 'stevia'];
                    
                    // Try to find a comment that looks like a recipe
                    const targetComment = commentsNodes.find(c => {
                        const content = c.innerText.toLowerCase();
                        // Look for measurements or ingredient keywords
                        const hasMeasurements = ['cup', 'tsp', 'tbsp', ' oz', ' g ', ' lb'].some(kw => content.includes(kw));
                        const hasIngredients = ['ingredients', 'instructions', 'directions', 'recipe'].some(kw => content.includes(kw));
                        const isKeto = ['keto', 'carb', 'sugar free', 'almond flour', 'cream cheese'].some(kw => content.includes(kw));
                        return (hasMeasurements || hasIngredients || isKeto) && content.length > 50;
                    });

                    if (targetComment) {
                        firstComment = targetComment.innerText;
                    } else {
                        // Fallback: just take the first substantial comment that isn't UI
                        const realComments = commentsNodes.filter(c => c.innerText.length > 20 && !['Like', 'Reply', 'Share', 'View more'].some(ui => c.innerText.includes(ui)));
                        if (realComments.length > 0) firstComment = realComments[0].innerText;
                    }
                }
                
                return {
                    text: mainText,
                    comment: firstComment,
                    timestamp: new Date().toISOString()
                };
            }).filter(p => p !== null && p.text.length > 20);
        });

        // Deduplicate and merge based on text content (main identifier)
        let addedCount = 0;
        // Deduplicate and merge based on text content (main identifier)
        newData.forEach(newItem => {
            // Clean text for comparison
            const cleanNewText = newItem.text.trim().substring(0, 200);
            const isDuplicate = currentData.some(oldItem => {
                const cleanOldText = oldItem.text.trim().substring(0, 200);
                return cleanOldText === cleanNewText;
            });
            
            if (!isDuplicate) {
                currentData.push(newItem);
                addedCount++;
                if (newItem.comment) console.log(`📖 Captured Recipe in Comment: ${newItem.comment.substring(0, 50)}...`);
                else console.log(`📝 Captured Post Text: ${newItem.text.substring(0, 50)}...`);
            }
        });

        console.log(`✅ Cycle complete. Added ${addedCount} new unique entries.`);
        saveData();
        
        await randomWait(3000, 6000);
    }

    console.log('🏁 Task complete.');
    await browser.close();
    browserInstance = null;
}

scrape().catch(async (err) => {
    console.error('❌ Scraper error:', err);
    await gracefulShutdown();
});

