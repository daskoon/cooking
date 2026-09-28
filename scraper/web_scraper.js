const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

const SITEMAP_URL = 'https://www.lowcarb-nocarb.com/sitemap_index.xml';
const DATA_DIR = path.join(__dirname, 'data');
const WEB_RECIPES_FILE = path.join(DATA_DIR, 'web_recipes.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

async function getRecipeUrls(limit = 20) {
    console.log('🔍 Fetching sitemap...');
    try {
        const response = await axios.get(SITEMAP_URL);
        const parser = new XMLParser();
        const jObj = parser.parse(response.data);
        
        // Handle Sitemap Index
        let urls = [];
        if (jObj.sitemapindex) {
            const recipeSitemap = jObj.sitemapindex.sitemap.find(s => s.loc.includes('post-sitemap'))?.loc 
                               || jObj.sitemapindex.sitemap[0].loc;
            console.log(`📂 Found sitemap index. Moving to: ${recipeSitemap}`);
            const subRes = await axios.get(recipeSitemap);
            const subObj = parser.parse(subRes.data);
            urls = subObj.urlset.url.map(u => u.loc);
        } else {
            urls = jObj.urlset.url.map(u => u.loc);
        }

        // Filter: Keep only posts that look like recipes (avoid blog/categories/pantry)
        const filteredUrls = urls.filter(url => {
            const parts = new URL(url).pathname.split('/').filter(Boolean);
            if (parts.length === 0) return false;
            const slug = parts[0];
            const excludes = ['blog', 'kitchen-pantry', 'category', 'tag', 'about', 'contact', 'privacy-policy', 'shop'];
            return !excludes.includes(slug) && !url.includes('sitemap');
        });

        console.log(`✅ Found ${filteredUrls.length} potential recipes after filtering. Limiting to ${limit}.`);
        return filteredUrls.slice(0, limit);
    } catch (error) {
        console.error('❌ Error fetching sitemap:', error.message);
        return [];
    }
}

async function scrapeRecipe(page, url) {
    console.log(`📖 Scraping: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const recipeData = await page.evaluate(() => {
        const title = document.querySelector('h1')?.innerText || 'Untitled';
        
        // Try JSON-LD first (most reliable)
        const jsonLdScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        for (const script of jsonLdScripts) {
            try {
                const data = JSON.parse(script.innerText);
                const graph = data['@graph'] || [data];
                const recipe = graph.find(item => item['@type'] === 'Recipe' || (Array.isArray(item['@type']) && item['@type'].includes('Recipe')));
                
                if (recipe) {
                    // Extract Image: can be string, object, or array
                    let image = '';
                    if (recipe.image) {
                        if (typeof recipe.image === 'string') image = recipe.image;
                        else if (Array.isArray(recipe.image)) image = recipe.image[0].url || recipe.image[0];
                        else if (typeof recipe.image === 'object') image = recipe.image.url || '';
                    }

                    return {
                        title: recipe.name || title,
                        image: image,
                        prepTime: recipe.prepTime || '',
                        cookTime: recipe.cookTime || '',
                        totalTime: recipe.totalTime || '',
                        ingredients: recipe.recipeIngredient || [],
                        instructions: Array.isArray(recipe.recipeInstructions) 
                            ? recipe.recipeInstructions.map(i => i.text || i)
                            : [recipe.recipeInstructions],
                        nutrition: recipe.nutrition || {}
                    };
                }
            } catch (e) {}
        }

        // Fallback to DOM selectors
        const ingredients = Array.from(document.querySelectorAll('.wprm-recipe-ingredient, .recipe-ingredients li'))
            .map(el => el.innerText.trim());
        
        const instructions = Array.from(document.querySelectorAll('.wprm-recipe-instruction, .recipe-instructions li'))
            .map(el => el.innerText.trim());

        // Fallback Image
        const mainImage = document.querySelector('.wprm-recipe-image img, article img, .entry-content img')?.src || '';

        // Fallback Time
        const prepTime = document.querySelector('.wprm-recipe-prep_time')?.innerText || '';
        const cookTime = document.querySelector('.wprm-recipe-cook_time')?.innerText || '';

        const nutrition = {};
        const nutrients = document.querySelectorAll('.wprm-nutrition-label-container .wprm-recipe-nutrition');
        nutrients.forEach(n => {
            const label = n.querySelector('.wprm-recipe-nutrition-label')?.innerText.replace(':', '').trim();
            const value = n.querySelector('.wprm-recipe-nutrition-value')?.innerText.trim();
            const unit = n.querySelector('.wprm-recipe-nutrition-unit')?.innerText.trim();
            if (label) nutrition[label] = `${value}${unit}`;
        });

        return { title, image: mainImage, prepTime, cookTime, ingredients, instructions, nutrition };
    });

    return { ...recipeData, url };
}

async function run(limit = 20) {
    const urls = await getRecipeUrls(limit);
    if (urls.length === 0) return;

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const results = [];
    for (const url of urls) {
        try {
            const recipe = await scrapeRecipe(page, url);
            if (recipe.ingredients.length > 0) {
                results.push(recipe);
                console.log(`✅ Captured: ${recipe.title}`);
            }
        } catch (e) {
            console.error(`⚠️ Failed to scrape ${url}:`, e.message);
        }
    }

    fs.writeFileSync(WEB_RECIPES_FILE, JSON.stringify(results, null, 2));
    console.log(`\n🎉 Successfully scraped ${results.length} recipes to web_recipes.json`);
    
    await browser.close();
}

const limit = process.argv[2] ? parseInt(process.argv[2]) : 20;
run(limit);
