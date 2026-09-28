import json
import re
import os

def process_recipes(input_path, output_path):
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found.")
        return

    with open(input_path, 'r', encoding='utf-8') as f:
        recipes = json.load(f)

    processed_recipes = []
    
    # Common keto ingredients to check (lowercase)
    # We want to match "chicken" in "Add the chicken"
    for recipe in recipes:
        ingredients = recipe.get('ingredients', [])
        instructions = recipe.get('instructions', [])
        
        # Build a mapping of keyword -> full ingredient string
        ing_map = {}
        for ing in ingredients:
            if not isinstance(ing, str): continue
            # Clean ingredient to find keywords
            clean_ing = re.sub(r'\d+[\./]\d+|\d+|g |ml |cups? |tbsp |tsp |oz |slices? |bowl of |pinch |teelöffel |el |pkt |teig ', '', ing.lower()).strip()
            words = clean_ing.split()
            for word in words:
                s_word = str(word)
                if len(s_word) > 3: # Ignore short words
                    ing_map[s_word] = str(ing)

        new_instructions = []
        for step in instructions:
            s_step = str(step)
            new_step = s_step
            matched_ings = set()
            
            # Sort keywords by length descending
            sorted_keywords = sorted(ing_map.keys(), key=len, reverse=True)
            
            for s_word in sorted_keywords:
                full_ing = str(ing_map[s_word])
                pattern = r'\b' + re.escape(s_word) + r'\b'
                if re.search(pattern, s_step.lower()) and full_ing not in matched_ings:
                    if full_ing.lower() not in new_step.lower():
                        new_step = re.sub(pattern, f"**{full_ing}**", new_step, flags=re.IGNORECASE, count=1)
                        matched_ings.add(full_ing)
            
            new_instructions.append(new_step)
        
        # Helper to parse ISO 8601 duration
        def parse_iso_duration(duration):
            if not duration or not isinstance(duration, str): return 0
            # E.g. PT10M, PT1H30M
            match = re.search(r'PT(?:(\d+)H)?(?:(\d+)M)?', duration)
            if not match: return 0
            hours = int(match.group(1) or 0)
            minutes = int(match.group(2) or 0)
            return hours * 60 + minutes

        total_mins = parse_iso_duration(recipe.get('totalTime', ''))
        if not total_mins:
            # Fallback if totalTime is missing but we have prep/cook
            total_mins = parse_iso_duration(recipe.get('prepTime', '')) + parse_iso_duration(recipe.get('cookTime', ''))

        processed_recipes.append({
            'title': recipe.get('title'),
            'image': recipe.get('image'),
            'url': recipe.get('url'),
            'prepTime': recipe.get('prepTime'),
            'cookTime': recipe.get('cookTime'),
            'totalTime': recipe.get('totalTime'),
            'total_minutes': total_mins,
            'ingredients': ingredients,
            'instructions': new_instructions,
            'nutrition': recipe.get('nutrition', {})
        })

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(processed_recipes, f, indent=2)
    
    print(f"Processed {len(processed_recipes)} recipes saved to {output_path}")

if __name__ == "__main__":
    input_file = "scraper/data/web_recipes.json"
    output_file = "scraper/data/processed_recipes.json"
    process_recipes(input_file, output_file)
