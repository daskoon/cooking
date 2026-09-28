const fs = require('fs');
const path = require('path');

const RAW_POSTS_FILE = path.join(__dirname, 'data', 'raw_posts.json');
const RECIPES_FILE = path.join(__dirname, 'data', 'recipes.json');

const INGREDIENTS_REGEX = /(Ingredients|What’s in the box|For the crust|Pizza toppings|List|You will need):?/i;
const INSTRUCTIONS_REGEX = /(Instructions|Steps|How to make|Directions|To make):?/i;
const NUTRITION_REGEX = /(Approx Nutrition|Net carbs|Protein|Fat|Calories|Nutrition):?/i;
const MEASURE_REGEX = /\b(cup|tsp|tbsp|oz|lb|g|ml|pinch|dash|large|small|medium|clove|slice|ounce|teaspoon|tablespoon)\b/i;
const NOISE_REGEX = /\b(started at|down to|lbs to|lost \d+|weight loss|journey|transformed)\b/i;

function parseRecipe(text) {
    if (!text) return null;

    // Split logic based on identified headers
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let currentSection = 'intro';
    const recipe = {
        title: lines[0] || 'Unknown Recipe',
        intro: [],
        ingredients: [],
        instructions: [],
        nutrition: {},
        raw: text
    };

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];

        if (INGREDIENTS_REGEX.test(line)) {
            currentSection = 'ingredients';
            continue;
        } else if (INSTRUCTIONS_REGEX.test(line)) {
            currentSection = 'instructions';
            continue;
        } else if (NUTRITION_REGEX.test(line)) {
            currentSection = 'nutrition';
            // Simple key-value extraction for nutrition
            const parts = line.split(':');
            if (parts.length === 2) {
                recipe.nutrition[parts[0].trim()] = parts[1].trim();
            }
            continue;
        }

        if (currentSection === 'intro') recipe.intro.push(line);
        else if (currentSection === 'ingredients') recipe.ingredients.push(line);
        else if (currentSection === 'instructions') recipe.instructions.push(line);
        else if (currentSection === 'nutrition') {
             const parts = line.split(':');
             if (parts.length === 2) {
                 recipe.nutrition[parts[0].trim()] = parts[1].trim();
             }
        }
    }

    // Post-process intro to clean up fluff
    recipe.intro = recipe.intro.join(' ').substring(0, 200) + '...';

    // Basic validity check: Must have ingredients or measurements
    const hasMeasurements = recipe.ingredients.some(line => MEASURE_REGEX.test(line) || /\d/.test(line));
    const isWeightLossStory = NOISE_REGEX.test(text.toLowerCase()) && !recipe.ingredients.length;
    const isTruncated = text.includes('See more');

    if (isWeightLossStory || (recipe.ingredients.length < 3 && !hasMeasurements) || isTruncated) {
        return null;
    }

    return recipe;
}

function processAll() {
    if (!fs.existsSync(RAW_POSTS_FILE)) {
        console.log('❌ No raw data found. Run the scraper first.');
        return;
    }

    const rawData = JSON.parse(fs.readFileSync(RAW_POSTS_FILE, 'utf8'));
    const recipes = [];

    for (const entry of rawData) {
        // Check main post text
        let recipe = parseRecipe(entry.text);
        
        // If no recipe in post, check comment (many FB pages put recipe in first comment)
        if (!recipe && entry.comment) {
            recipe = parseRecipe(entry.comment);
            if (recipe) {
                recipe.title = entry.text.split('\n')[0] || recipe.title; // Try to use post title
            }
        }

        if (recipe) recipes.push(recipe);
    }

    fs.writeFileSync(RECIPES_FILE, JSON.stringify(recipes, null, 2));
    console.log(`✅ Processed ${recipes.length} recipes from ${rawData.length} entries.`);
}

if (require.main === module) {
    processAll();
}

module.exports = { parseRecipe };
