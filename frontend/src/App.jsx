import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Info, ChevronRight, Utensils, Share2, Heart, X, Filter, Tag as TagIcon, ArrowRight, Check, Star, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import recipesData from '../../scraper/data/processed_recipes.json';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Fixed Category Extraction
const getCategory = (title) => {
  const t = title.toLowerCase();
  if (t.includes('breakfast') || t.includes('egg') || t.includes('pancake')) return 'Breakfast';
  if (t.includes('dessert') || t.includes('cake') || t.includes('sweet') || t.includes('cookie')) return 'Dessert';
  if (t.includes('snack') || t.includes('chip') || t.includes('bite') || t.includes('fat bomb')) return 'Snack';
  return 'Dinner';
};

// Technical Utility: ISO 8601 Duration Parser
const parseISODuration = (duration) => {
  if (!duration || typeof duration !== 'string') return 0;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || 0, 10);
  const minutes = parseInt(match[2] || 0, 10);
  return hours * 60 + minutes;
};

// Technical Utility: Instruction Bolding (Smart Ingress)
const injectIngredientsIntoInstructions = (ingredients, instructions) => {
  if (!ingredients || !instructions) return instructions;
  
  const ingMap = new Map();
  ingredients.forEach(ing => {
    if (typeof ing !== 'string') return;
    const keywords = ing.toLowerCase()
      .replace(/\d+[\./]\d+|\d+|g |ml |cups? |tbsp |tsp |oz |slices? |bowl of |pinch |teelöffel |el |pkt |teig /g, '')
      .split(/\s+/)
      .filter(w => w.length > 3);
    
    keywords.forEach(kw => ingMap.set(kw, ing));
  });

  const sortedKeywords = Array.from(ingMap.keys()).sort((a, b) => b.length - a.length);

  return instructions.map(step => {
    let newStep = step;
    const matchedIngs = new Set();

    sortedKeywords.forEach(kw => {
      const fullIng = ingMap.get(kw);
      const regex = new RegExp(`\\b${kw}\\b`, 'gi');
      
      if (regex.test(step) && !matchedIngs.has(fullIng)) {
        if (!newStep.toLowerCase().includes(fullIng.toLowerCase())) {
          newStep = newStep.replace(regex, `**${fullIng}**`);
          matchedIngs.add(fullIng);
        }
      }
    });
    return newStep;
  });
};

// Technical Utility: LocalStorage Roundup Purge
const cleanupSyncedArticles = () => {
  const remoteKey = 'keto-vault-remote';
  const raw = localStorage.getItem(remoteKey);
  if (!raw) return;

  try {
    const recipes = JSON.parse(raw);
    const cleaned = recipes.filter(r => {
      const url = r.url?.toLowerCase() || '';
      const isArticle = url.includes('-ideas/') || 
                        url.includes('-recipes/') || 
                        url.includes('-treats/') || 
                        url.includes('-hacks/') || 
                        url.includes('-tips/');
      
      const hasEnoughIngredients = r.ingredients?.length >= 3;
      return !isArticle && hasEnoughIngredients;
    });

    if (cleaned.length !== recipes.length) {
      localStorage.setItem(remoteKey, JSON.stringify(cleaned));
      console.log(`Purged ${recipes.length - cleaned.length} non-recipe articles from ledger.`);
    }
  } catch (e) {
    console.error("Cleanup failed", e);
  }
};

// New Utility: Get Total Time String
const formatTime = (recipe) => {
  if (recipe.total_minutes) return `${recipe.total_minutes}m`;
  if (recipe.totalTime) return recipe.totalTime.replace('PT', '').toLowerCase();
  return '20m+';
};

const TagsWindow = ({ isOpen, onClose, allTags, activeTags, onToggleTag, onReset }) => {
  const [query, setSearchQuery] = useState('');
  const suggestions = useMemo(() => {
    if (!query) return [];
    return allTags.filter(t => t.toLowerCase().includes(query.toLowerCase()) && !activeTags.includes(t)).slice(0, 5);
  }, [query, allTags, activeTags]);

  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#0a0c0e]/90 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="modal-container w-full max-w-2xl overflow-hidden rounded-sm flex flex-col relative text-[#1a1e23] border border-white/5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="paper-texture" />
        <div className="p-6 md:p-10 relative z-10">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-sm font-black font-mono uppercase tracking-[0.4em] opacity-40 italic">Attribute Index</h2>
            <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-all"><X size={18} /></button>
          </div>

          <div className="relative mb-10">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20" size={20} />
            <input 
              autoFocus
              type="text" 
              placeholder="Search attributes..."
              className="w-full h-16 bg-black/5 border-b-2 border-black/10 px-12 text-xl font-mono font-bold focus:outline-none focus:border-black/30 placeholder:opacity-20 italic"
              value={query}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <AnimatePresence>
              {suggestions.length > 0 && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-full left-0 right-0 bg-white border border-black/5 shadow-xl z-50 rounded-b-sm">
                  {suggestions.map(s => (
                    <button key={s} onClick={() => { onToggleTag(s); setSearchQuery(''); }} className="w-full text-left px-6 py-4 hover:bg-black/5 font-mono font-black text-sm uppercase tracking-widest border-b border-black/[0.03] last:border-0">
                      {s}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-8">
            {activeTags.length > 0 && (
              <div>
                <span className="text-[8px] font-black font-mono uppercase tracking-widest opacity-30 mb-3 block">Selected Ledger Filters</span>
                <div className="flex flex-wrap gap-2">
                  {activeTags.map(tag => (
                    <button key={tag} onClick={() => onToggleTag(tag)} className="bg-[#1a1e23] text-white px-3 py-1.5 rounded-sm text-[9px] font-mono font-black uppercase tracking-widest flex items-center gap-2">
                      {tag} <X size={10} />
                    </button>
                  ))}
                  <button onClick={onReset} className="text-[9px] font-mono font-black uppercase tracking-widest text-red-600 px-3 py-1.5 border border-dashed border-red-600/30">Clear All</button>
                </div>
              </div>
            )}
            <div>
              <span className="text-[8px] font-black font-mono uppercase tracking-widest opacity-30 mb-3 block">Frequent Discovery Tags</span>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {allTags.filter(t => !activeTags.includes(t)).slice(0, 12).map(tag => (
                  <button key={tag} onClick={() => onToggleTag(tag)} className="text-left px-4 py-3 bg-black/5 hover:bg-black/10 border border-black/5 transition-all text-[10px] font-mono font-bold uppercase tracking-tight truncate">
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const FiltersDrawer = ({ isOpen, onClose, sortBy, setSortBy, maxTime, setMaxTime, ultraLowCarb, setUltraLowCarb }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[130] bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm z-[140] bg-[#fdfcf0] shadow-2xl flex flex-col text-[#1a1e23] filters-drawer">
            <div className="paper-texture" />
            <div className="p-6 md:p-8 relative z-10 flex flex-col h-full">
              <div className="flex justify-between items-center mb-10 pb-6 border-b border-black/5">
                <div>
                  <h2 className="text-lg font-black font-mono uppercase tracking-tighter italic leading-none">Filters</h2>
                  <p className="text-[7px] font-mono font-bold uppercase tracking-[0.4em] opacity-30 mt-1">Refine Ledger View</p>
                </div>
                <button onClick={onClose} className="p-3 bg-black/5 rounded-full"><X size={20} /></button>
              </div>
              <div className="flex-1 space-y-12 overflow-y-auto custom-scrollbar pr-2">
                <section>
                  <h3 className="text-[9px] font-black font-mono uppercase tracking-[0.3em] opacity-40 mb-6 flex items-center gap-2"><Filter size={10} /> Sort Order</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {['title', 'carbs', 'sodium'].map(option => (
                      <button key={option} onClick={() => setSortBy(option)} className={cn("w-full text-left px-4 py-4 border font-mono font-black text-[10px] uppercase tracking-widest transition-all", sortBy === option ? "bg-[#1a1e23] text-white border-[#1a1e23]" : "bg-black/5 border-transparent opacity-60 hover:opacity-100")}>
                        {option === 'title' ? 'Alphabetical (A-Z)' : `By ${option.charAt(0).toUpperCase() + option.slice(1)}`}
                      </button>
                    ))}
                  </div>
                </section>
                <section>
                  <h3 className="text-[9px] font-black font-mono uppercase tracking-[0.3em] opacity-40 mb-6 flex items-center gap-2"><Info size={10} /> Macro Constraints</h3>
                  <button onClick={() => setUltraLowCarb(!ultraLowCarb)} className={cn("w-full h-16 border-2 flex items-center justify-center font-mono font-black text-[10px] uppercase tracking-[0.2em] transition-all", ultraLowCarb ? "bg-[#8b0000] border-[#8b0000] text-white" : "border-black/10 opacity-40")}>
                    Ultra-Low Assay (≤ 2g)
                  </button>
                </section>
                <section>
                  <h3 className="text-[9px] font-black font-mono uppercase tracking-[0.3em] opacity-40 mb-6 flex items-center gap-2"><ArrowRight size={10} /> Maximum Execution Time</h3>
                  <div className="space-y-4 px-2">
                    <input type="range" min="10" max="120" step="10" value={maxTime} onChange={(e) => setMaxTime(parseInt(e.target.value))} className="w-full h-1 bg-black/10 appearance-none rounded-full accent-[#1a1e23]" />
                    <div className="flex justify-between font-mono font-black text-[10px] uppercase opacity-60 italic">
                      <span>10m</span>
                      <span className="text-sm text-[#1a1e23] underline decoration-black/10 decoration-2 underline-offset-4">{maxTime === 120 ? 'No Limit' : `${maxTime}m`}</span>
                      <span>120m</span>
                    </div>
                  </div>
                </section>
              </div>
              <div className="pt-8 border-t border-black/5">
                <button onClick={onClose} className="w-full h-14 bg-[#1a1e23] text-white font-mono font-black uppercase text-[11px] tracking-[0.4em] hover:bg-black transition-all shadow-xl">Apply Archive Filters</button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const SyncModal = ({ status, onClose }) => {
  if (!status.isOpen) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#0a0c0e]/95 backdrop-blur-xl">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="modal-container w-full max-w-lg overflow-hidden rounded-sm flex flex-col relative text-[#1a1e23] border border-white/5 shadow-2xl">
        <div className="paper-texture" />
        <div className="p-8 relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-emerald-500/10 flex items-center justify-center rounded-sm">
              <ArrowRight size={20} className={cn("text-emerald-600", status.step === 'processing' && "animate-spin")} />
            </div>
            <div>
              <h2 className="text-xl font-black font-mono uppercase tracking-tighter italic">Ledger Sync</h2>
              <p className="text-[8px] font-mono font-bold uppercase tracking-[0.3em] opacity-40">Verifying Remote Archives</p>
            </div>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-[9px] font-mono font-black uppercase tracking-widest opacity-50">{status.message}</span>
                {status.total > 0 && <span className="text-[9px] font-mono font-black">{status.progress} / {status.total}</span>}
              </div>
              <div className="h-1.5 bg-black/5 rounded-full overflow-hidden">
                <motion.div className="h-full bg-emerald-500" initial={{ width: 0 }} animate={{ width: status.total > 0 ? `${(status.progress / status.total) * 100}%` : '100%' }} transition={{ duration: 0.5 }} />
              </div>
            </div>
            {status.step === 'complete' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-4 border-t border-black/5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-sm">
                    <span className="block text-[7px] uppercase font-black opacity-40 tracking-widest mb-1">Archived</span>
                    <span className="text-xl font-black font-mono italic">{status.added.length}</span>
                  </div>
                  <div className="p-3 bg-black/5 border border-black/5 rounded-sm">
                    <span className="block text-[7px] uppercase font-black opacity-40 tracking-widest mb-1">Skipped</span>
                    <span className="text-xl font-black font-mono italic">{status.skippedCount}</span>
                  </div>
                </div>
                {status.added.length > 0 && (
                  <div className="max-h-32 overflow-y-auto custom-scrollbar pr-2">
                    <span className="text-[7px] uppercase font-black opacity-30 tracking-[0.3em] mb-2 block">New Ledger Entries</span>
                    <ul className="space-y-1">
                      {status.added.map((r, i) => (
                        <li key={i} className="text-[9px] font-mono font-bold uppercase truncate border-l-2 border-emerald-500 pl-2 py-0.5 bg-black/5">{r.title}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <button onClick={onClose} className="w-full h-12 bg-[#1a1e23] text-white font-mono font-black uppercase text-[10px] tracking-[0.3em] hover:bg-black transition-all">Confirm & Finalize</button>
              </motion.div>
            )}
            {status.step === 'error' && (
              <div className="pt-4 border-t border-red-500/10 space-y-4">
                <p className="text-[10px] font-mono font-bold text-red-600 bg-red-500/5 p-3 border border-red-500/10 uppercase italic">{status.message}</p>
                <button onClick={onClose} className="w-full h-12 bg-red-600 text-white font-mono font-black uppercase text-[10px] tracking-[0.3em] hover:bg-red-700 transition-all">Close Session</button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const RecipeModal = ({ recipe, isOpen, onClose, isFavorite, onToggleFavorite, isDeleted, onToggleDelete }) => {
  const [checkedIngredients, setCheckedIngredients] = useState(new Set());
  useEffect(() => { setCheckedIngredients(new Set()); }, [recipe?.title]);
  if (!isOpen || !recipe) return null;
  const toggleIngredient = (ing) => {
    const newChecked = new Set(checkedIngredients);
    if (newChecked.has(ing)) newChecked.delete(ing); else newChecked.add(ing);
    setCheckedIngredients(newChecked);
  };
  const category = getCategory(recipe.title);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-8 bg-[#0a0c0e]/98 backdrop-blur-xl" onClick={onClose}>
      <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} className="modal-container w-full max-w-4xl max-h-[95vh] overflow-hidden rounded-sm flex flex-col relative text-[#1a1e23] border border-white/5 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="paper-texture" />
        <div className="absolute top-4 right-4 flex items-center gap-2 z-50">
          <button onClick={(e) => onToggleFavorite(recipe.url, e)} className={cn("p-2 rounded-full border transition-all hover:scale-105", isFavorite ? "bg-amber-500/10 border-amber-500/20 text-amber-600" : "bg-black/5 border-black/5 text-black/20")}>
            <Star size={16} fill={isFavorite ? "currentColor" : "none"} />
          </button>
          <button onClick={(e) => onToggleDelete(recipe.url, e)} className={cn("p-2 rounded-full border transition-all", isDeleted ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" : "bg-black/5 border-black/5 text-black/20 hover:text-red-600")}>
            {isDeleted ? <Check size={16} /> : <Trash2 size={16} />}
          </button>
          <button onClick={onClose} className="p-2 bg-black/5 border border-black/5 text-black/40 hover:text-black transition-all rounded-full"><X size={16} /></button>
        </div>
        <div className="p-4 md:p-10 overflow-y-auto custom-scrollbar relative z-10 flex-1 flex flex-col">
          <span className="font-mono font-black text-[8px] uppercase tracking-[0.4em] opacity-30 mb-2 block letterpress">{category} Vault Log ID: #{recipe.url ? recipe.url.slice(-6) : '0000'}</span>
          <div className="flex flex-col md:flex-row gap-4 md:gap-8 mb-6 pb-6 border-b border-black/5">
            <div className="flex-1">
              <h2 className="text-lg md:text-xl font-black mb-2 leading-tight tracking-tighter italic pr-12 font-mono uppercase">{recipe.title}</h2>
              {recipe.url && <a href={recipe.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[8px] font-mono uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity"><Search size={8} /> Origin: {new URL(recipe.url).hostname}</a>}
            </div>
            {recipe.image && <div className="w-full md:w-48 h-32 recipe-clipping rounded-sm flex-shrink-0 grayscale-[0.2] contrast-125"><img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover" /></div>}
          </div>
          <div className="grid md:grid-cols-[1fr_1.2fr] gap-8 md:gap-12">
            <section>
              <h3 className="font-mono font-black text-[9px] uppercase tracking-[0.3em] mb-4 flex items-center gap-2 opacity-50"><Utensils size={10} /> Ingress</h3>
              <ul className="space-y-2">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className={clsx("flex items-start gap-2 p-1 -mx-1 rounded transition-all cursor-pointer", checkedIngredients.has(ing) ? "opacity-20" : "hover:bg-black/5")} onClick={() => toggleIngredient(ing)}>
                    <div className={clsx("mt-0.5 w-3 h-3 border flex items-center justify-center transition-all relative", checkedIngredients.has(ing) ? "border-transparent" : "border-[#1a1e23]/30")}>
                      <AnimatePresence>{checkedIngredients.has(ing) && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="checked-ink text-[10px] absolute">/</motion.span>}</AnimatePresence>
                    </div>
                    <span className={clsx("text-[10px] leading-tight font-mono font-bold tracking-tight", checkedIngredients.has(ing) && "line-through")}>{ing}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="border-l border-black/[0.05] pl-6 md:pl-10">
              <h3 className="font-mono font-black text-[9px] uppercase tracking-[0.3em] mb-4 flex items-center gap-2 opacity-50"><ArrowRight size={10} /> Execution</h3>
              <div className="space-y-4">
                {recipe.instructions.map((step, i) => (
                  <div key={i} className="relative pb-2 last:pb-0">
                    <div className="flex gap-2 items-baseline">
                      <span className="font-mono font-black italic text-[9px] opacity-20">{i + 1} //</span>
                      <p className="text-[10px] font-mono text-[#3d4a57] leading-snug tracking-tight">
                        {step.split('**').map((part, idx) => idx % 2 === 1 ? <strong key={idx} className="text-[#1a1e23] font-black underline decoration-black/5">{part}</strong> : part)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
        <div className="px-4 py-3 bg-black/[0.03] border-t border-black/[0.05] flex flex-row justify-between items-center relative z-10">
          <div className="flex gap-6">
            <div className="flex flex-col"><span className="text-[7px] uppercase font-black opacity-30 tracking-[0.2em]">Net Carbs</span><span className={cn("font-mono font-black text-sm", parseFloat(recipe.nutrition.carbohydrateContent) < 40 ? "text-[#004d40]" : "text-[#8b0000]")}>{recipe.nutrition.carbohydrateContent || '0.0'}g</span></div>
            <div className="flex flex-col"><span className="text-[7px] uppercase font-black opacity-30 tracking-[0.2em]">Sodium</span><span className={cn("font-mono font-black text-sm", parseFloat(recipe.nutrition.sodiumContent) < 100 ? "text-[#004d40]" : "text-[#8b0000]")}>{recipe.nutrition.sodiumContent || '0.0'}mg</span></div>
          </div>
          <div className="px-3 py-1 border border-black/5 rounded-full italic opacity-20 text-[7px] font-mono uppercase tracking-widest">Indexed Batch {new Date().toLocaleDateString()}</div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const Card = ({ recipe, index, onClick, isFavorite, onToggleFavorite, onToggleDelete, isDeleted, isSessionNew }) => {
  const category = getCategory(recipe.title);
  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: index * 0.02 }} onClick={() => onClick(recipe)} className="recipe-card p-4 flex flex-col h-full min-h-[280px] cursor-pointer group relative overflow-hidden">
      <div className="paper-texture" />
      <div className="absolute top-2 right-2 flex gap-1 z-20">
        <button onClick={(e) => onToggleFavorite(recipe.url, e)} className={cn("p-1.5 rounded-sm border transition-all", isFavorite ? "bg-amber-500/10 border-amber-500/20 text-amber-600" : "bg-white/80 border-black/5 text-black/10")}><Star size={12} fill={isFavorite ? "currentColor" : "none"} /></button>
        <button onClick={(e) => onToggleDelete(recipe.url, e)} className={cn("p-1.5 transition-all rounded-sm border", isDeleted ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" : "bg-white/80 border-black/5 text-black/10 hover:text-red-600")}>{isDeleted ? <Check size={12} /> : <Trash2 size={12} />}</button>
      </div>
      <div className={cn("card-tab !top-[-8px] !left-2 !px-2 !py-0.5 !text-[7px]", category === 'Dinner' && "bg-[#e63946]", category === 'Breakfast' && "bg-[#ffb703]", category === 'Dessert' && "bg-[#ff006e]", category === 'Snack' && "bg-[#2a9d8f]")}>{category}</div>
      {isSessionNew && <div className="absolute top-[-8px] right-12 px-2 py-0.5 bg-emerald-600 text-white text-[6px] font-mono font-black uppercase tracking-widest rounded-sm shadow-sm z-20 animate-pulse">Session New</div>}
      <div className="mb-3 pt-4">
        <h3 className="text-sm font-black leading-tight tracking-tighter pr-8 font-mono uppercase italic line-clamp-2">{recipe.title}</h3>
        <div className="mt-1"><span className="text-[7px] font-mono font-bold opacity-30 bg-black/5 px-1 py-0.5 rounded-sm uppercase tracking-tighter">Time // {formatTime(recipe)}</span></div>
      </div>
      {recipe.image && <div className="w-full h-24 mb-3 recipe-clipping rounded-sm grayscale-[0.3] contrast-110"><img src={recipe.image} alt="" className="w-full h-full object-cover" /></div>}
      <div className="mt-auto pt-3 border-t border-black/5 flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <div className="flex gap-3">
            <div className="flex flex-col"><span className="text-[6px] uppercase font-bold opacity-30 tracking-tight">Carb</span><span className={cn("font-black text-[10px] font-mono", parseFloat(recipe.nutrition.carbohydrateContent) < 40 ? "text-[#004d40]" : "text-[#8b0000]")}>{recipe.nutrition.carbohydrateContent || '0'}</span></div>
            <div className="flex flex-col"><span className="text-[6px] uppercase font-bold opacity-30 tracking-tight">Sod</span><span className={cn("font-black text-[10px] font-mono", parseFloat(recipe.nutrition.sodiumContent) < 100 ? "text-[#004d40]" : "text-[#8b0000]")}>{recipe.nutrition.sodiumContent || '0'}</span></div>
          </div>
          <div className="flex flex-wrap gap-1 justify-end">
            {recipe.ingredients.slice(0, 2).map((ing, i) => (
              <span key={i} className="text-[6px] font-mono font-bold uppercase tracking-tighter opacity-20 border border-black/10 px-1 py-0.5">{typeof ing === 'string' ? ing.split(',')[0].slice(0, 10) : '...'}</span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function App() {
  const [search, setSearch] = useState('');
  const [activeTags, setActiveTags] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [sortBy, setSortBy] = useState('title');
  const [maxTime, setMaxTime] = useState(() => {
    const saved = localStorage.getItem('keto-vault-max-time');
    return saved ? parseInt(saved) : 120;
  });
  const [ultraLowCarb, setUltraLowCarb] = useState(() => {
    const saved = localStorage.getItem('keto-vault-ultra-low');
    return saved ? JSON.parse(saved) : false;
  });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isTrashView, setIsTrashView] = useState(false);
  const [isTagsOpen, setIsTagsOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [remoteRecipes, setRemoteRecipes] = useState(() => JSON.parse(localStorage.getItem('keto-vault-remote') || '[]'));
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem('keto-vault-favorites') || '[]'));
  const [deletedIds, setDeletedIds] = useState(() => JSON.parse(localStorage.getItem('keto-vault-deleted') || '[]'));

  useEffect(() => {
    cleanupSyncedArticles();
    setRemoteRecipes(JSON.parse(localStorage.getItem('keto-vault-remote') || '[]'));
  }, []);

  useEffect(() => { localStorage.setItem('keto-vault-favorites', JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { localStorage.setItem('keto-vault-deleted', JSON.stringify(deletedIds)); }, [deletedIds]);
  useEffect(() => {
    localStorage.setItem('keto-vault-ultra-low', JSON.stringify(ultraLowCarb));
    localStorage.setItem('keto-vault-max-time', maxTime.toString());
  }, [ultraLowCarb, maxTime]);

  const toggleFavorite = (id, e) => {
    if (e) e.stopPropagation();
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const scrapeRecipeFull = async (url) => {
    try {
      const { CapacitorHttp } = await import('@capacitor/core');
      const res = await CapacitorHttp.request({ method: 'GET', url: url, headers: { 'User-Agent': 'KetoVaultScraper/1.0' } });
      if (res.status !== 200) return null;
      const parser = new DOMParser();
      const doc = parser.parseFromString(res.data, 'text/html');
      const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
      let recipeData = null;
      scripts.forEach(s => {
        try {
          const data = JSON.parse(s.textContent);
          const recipes = Array.isArray(data) ? data : [data];
          const found = recipes.find(r => r['@type'] === 'Recipe' || (r['@graph'] && r['@graph'].find(g => g['@type'] === 'Recipe')));
          if (found) recipeData = found['@type'] === 'Recipe' ? found : found['@graph'].find(g => g['@type'] === 'Recipe');
        } catch (e) {}
      });
      if (recipeData) {
        const ingredients = recipeData.recipeIngredient || [];
        const rawInstructions = Array.isArray(recipeData.recipeInstructions) ? recipeData.recipeInstructions.map(i => i.text || i) : [recipeData.recipeInstructions];
        return {
          ingredients,
          instructions: injectIngredientsIntoInstructions(ingredients, rawInstructions),
          nutrition: { carbohydrateContent: recipeData.nutrition?.carbohydrateContent, sodiumContent: recipeData.nutrition?.sodiumContent },
          image: Array.isArray(recipeData.image) ? recipeData.image[0] : (recipeData.image?.url || recipeData.image),
          total_minutes: parseISODuration(recipeData.totalTime || recipeData.prepTime)
        };
      }
      return null;
    } catch (err) { console.warn("Scrape failed", url, err); return null; }
  };

  const [syncStatus, setSyncStatus] = useState({ isOpen: false, step: 'idle', progress: 0, total: 0, added: [], skippedCount: 0, message: '' });

  const syncFromWebsite = async () => {
    if (syncStatus.isOpen) return;
    setSyncStatus({ isOpen: true, step: 'scanning', progress: 0, total: 0, added: [], skippedCount: 0, message: 'Scanning RSS Feed...' });
    try {
      const { CapacitorHttp } = await import('@capacitor/core');
      const rssRes = await CapacitorHttp.request({ method: 'GET', url: 'https://www.lowcarb-nocarb.com/feed/', headers: { 'Accept': 'application/xml' } });
      if (rssRes.status !== 200) throw new Error("Connection failed");
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(rssRes.data, "text/xml");
      const items = xmlDoc.querySelectorAll("item");
      const candidates = [];
      const existingUrls = new Set([...recipesData, ...remoteRecipes].map(r => r.url));
      items.forEach(item => {
        const link = item.querySelector("link")?.textContent;
        const title = item.querySelector("title")?.textContent;
        if (link && !existingUrls.has(link)) {
          if (!link.includes('-ideas/') && !link.includes('-recipes/') && !link.includes('-treats/') && !link.includes('-hacks/') && !link.includes('-tips/')) {
            candidates.push({ title, url: link });
          }
        }
      });
      if (candidates.length === 0) { setSyncStatus(prev => ({ ...prev, step: 'complete', message: 'Vault up to date.' })); return; }
      const processing = candidates.slice(0, 10);
      setSyncStatus(prev => ({ ...prev, step: 'processing', total: processing.length, message: `Archiving ${processing.length} entries...` }));
      const results = [];
      let skipped = candidates.length - processing.length;
      for (let i = 0; i < processing.length; i++) {
        setSyncStatus(prev => ({ ...prev, progress: i + 1, message: `Indexing: ${processing[i].title}` }));
        const deepData = await scrapeRecipeFull(processing[i].url);
        if (deepData) results.push({ ...processing[i], ...deepData, isNew: true, timestamp: Date.now() }); else skipped++;
      }
      if (results.length > 0) {
        const updatedRemote = [...results, ...remoteRecipes];
        localStorage.setItem('keto-vault-remote', JSON.stringify(updatedRemote));
        setRemoteRecipes(updatedRemote);
        setSyncStatus(prev => ({ ...prev, step: 'complete', added: results, skippedCount: skipped, message: `Archived ${results.length} recipes.` }));
      } else { setSyncStatus(prev => ({ ...prev, step: 'complete', skippedCount: skipped, message: 'No matches found.' })); }
    } catch (err) { setSyncStatus(prev => ({ ...prev, step: 'error', message: 'Sync failed: ' + err.message })); }
  };

  const [sessionNewUrls, setSessionNewUrls] = useState(new Set());
  const finishSync = () => {
    if (syncStatus.added.length > 0) {
      const newUrls = new Set(sessionNewUrls);
      syncStatus.added.forEach(r => newUrls.add(r.url));
      setSessionNewUrls(newUrls);
    }
    setSyncStatus(prev => ({ ...prev, isOpen: false }));
  };

  const toggleDelete = (id, e) => {
    if (e) e.stopPropagation();
    setDeletedIds(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
    if (!deletedIds.includes(id) && selectedRecipe?.url === id) setSelectedRecipe(null);
  };

  const availableTags = useMemo(() => ['Dinner', 'Breakfast', 'Dessert', 'Snack', 'No-Bake', 'Protein Rich', 'Quick Meal', '5 Ingredients', 'Chicken', 'Beef', 'Pork', 'Egg', 'Cheese', 'Avocado', 'Bacon', 'Salmon'], []);

  const filteredRecipes = useMemo(() => {
    const allRecipes = [...remoteRecipes, ...recipesData].filter(r => {
      const url = r.url?.toLowerCase() || '';
      const isArticle = url.includes('-ideas/') || 
                        url.includes('-recipes/') || 
                        url.includes('-treats/') || 
                        url.includes('-hacks/') || 
                        url.includes('-tips/');
      return !isArticle && r.ingredients?.length >= 3;
    });

    let filtered = allRecipes.filter(r => {
      const deleted = deletedIds.includes(r.url);
      if (isTrashView && !deleted) return false;
      if (!isTrashView && deleted) return false;
      if (showFavoritesOnly && !favorites.includes(r.url)) return false;
      const title = r.title.toLowerCase();
      const ings = r.ingredients.join(' ').toLowerCase();
      const cat = getCategory(r.title);
      if (!title.includes(search.toLowerCase()) && !ings.includes(search.toLowerCase())) return false;
      if (ultraLowCarb && (parseFloat(r.nutrition.carbohydrateContent) || 0) > 2) return false;
      if (maxTime !== 120 && (r.total_minutes || 0) > maxTime) return false;
      return activeTags.every(tag => {
        if (tag === 'No-Bake') return ings.includes('no bake') || title.includes('no bake');
        if (tag === 'Quick Meal') return (r.total_minutes || 0) > 0 && (r.total_minutes || 0) <= 20;
        if (tag === '5 Ingredients') return r.ingredients.length <= 5;
        if (tag === 'Protein Rich') return parseFloat(r.nutrition.proteinContent || 0) > 20;
        if (['Dinner', 'Breakfast', 'Dessert', 'Snack'].includes(tag)) return cat === tag;
        return ings.includes(tag.toLowerCase()) || title.includes(tag.toLowerCase());
      });
    });
    return filtered.sort((a, b) => {
      if (sortBy === 'carbs') return (parseFloat(a.nutrition.carbohydrateContent) || 0) - (parseFloat(b.nutrition.carbohydrateContent) || 0);
      if (sortBy === 'sodium') return (parseFloat(a.nutrition.sodiumContent) || 0) - (parseFloat(b.nutrition.sodiumContent) || 0);
      return a.title.localeCompare(b.title);
    });
  }, [search, activeTags, ultraLowCarb, sortBy, maxTime, favorites, deletedIds, showFavoritesOnly, isTrashView, recipesData, remoteRecipes]);

  const toggleTag = (tag) => setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  return (
    <div className="min-h-screen bg-[#0a0c0e] text-[#fdfcf0] pb-32 font-['Spectral',_serif]">
      <svg className="svg-paper-texture"><filter id="paper-grain"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" /><feColorMatrix type="saturate" values="0" /></filter><rect width="100%" height="100%" filter="url(#paper-grain)" /></svg>
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 md:pt-16 relative z-10">
        <header className="mb-12 md:mb-20 dark-context vault-header">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b border-white/5 pb-8 gap-6">
            <div className="flex items-end gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-14 md:h-14 bg-[#fdfcf0] rounded-sm flex items-center justify-center shadow-[0_0_30px_rgba(253,252,240,0.1)] rotate-3"><Utensils className="text-[#1a1e23]" size={20} md:size={32} strokeWidth={2.5} /></div>
              <div><h1 className="text-xl md:text-4xl font-black tracking-tighter uppercase italic leading-none font-mono text-[#fdfcf0]">The Keto Vault</h1><p className="text-[6px] md:text-[9px] font-mono font-bold uppercase tracking-[0.5em] opacity-40 mt-1 text-[#fdfcf0]">Archival Ledger // Verified Data</p></div>
            </div>
            <div className="flex flex-col gap-2 items-start md:items-end">
              <div className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-sm"><span className="text-[7px] font-mono font-bold uppercase tracking-widest text-emerald-500 text-[#fdfcf0]">Vault Status: Online // {recipesData.length + remoteRecipes.length} Indexed</span></div>
              <div className="flex gap-2">
                <button onClick={syncFromWebsite} className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-[8px] font-mono font-black uppercase tracking-widest bg-white/5 border-white/10 text-white/30 hover:text-white/60 text-[#fdfcf0]"><ArrowRight size={10} /> Sync Now</button>
                <button onClick={() => setIsTrashView(!isTrashView)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-[8px] font-mono font-black uppercase tracking-widest transition-all", isTrashView ? "bg-red-500/20 border-red-500/40 text-red-500" : "bg-white/5 border-white/10 text-white/30 hover:text-white/60 text-[#fdfcf0]")}><Trash2 size={10} /> {isTrashView ? "Recycle Bin Active" : "View Bin"}</button>
                <button onClick={() => setShowFavoritesOnly(!showFavoritesOnly)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-[8px] font-mono font-black uppercase tracking-widest transition-all", showFavoritesOnly ? "bg-amber-500/20 border-amber-500/40 text-amber-500" : "bg-white/5 border-white/10 text-white/30 hover:text-white/60 text-[#fdfcf0]")}><Star size={10} fill={showFavoritesOnly ? "currentColor" : "none"} /> Starred Only</button>
              </div>
            </div>
          </div>
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="relative group w-full lg:flex-1"><Search className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 text-white/10 group-focus-within:text-[#fdfcf0]" size={20} md:size={24} /><input type="text" placeholder="Inquire Archive..." className="w-full h-14 md:h-16 bg-white/[0.03] border border-white/10 rounded-sm pl-12 md:pl-16 pr-8 text-lg md:text-xl font-medium focus:outline-none focus:border-white/20 transition-all placeholder:text-white/5 font-mono uppercase tracking-tighter text-[#fdfcf0]" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <div className="flex gap-2 w-full lg:w-auto">
              <button onClick={() => setIsTagsOpen(true)} className="flex-1 lg:w-32 h-14 md:h-16 bg-white/5 border border-white/10 rounded-sm flex items-center justify-center gap-2 text-[9px] font-black font-mono uppercase tracking-widest text-white/40 hover:text-white group text-[#fdfcf0]"><TagIcon size={12} className="group-hover:text-amber-500" /> Tags {activeTags.length > 0 && `(${activeTags.length})`}</button>
              <button onClick={() => setIsFiltersOpen(true)} className="flex-1 lg:w-32 h-14 md:h-16 bg-white/5 border border-white/10 rounded-sm flex items-center justify-center gap-2 text-[9px] font-black font-mono uppercase tracking-widest text-white/40 hover:text-white group text-[#fdfcf0]"><Filter size={12} className="group-hover:text-emerald-500" /> Filters</button>
            </div>
          </div>
        </header>
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-10 gap-y-20">
          {filteredRecipes.map((recipe, idx) => (<Card key={recipe.url} recipe={recipe} index={idx} onClick={(r) => setSelectedRecipe(r)} isFavorite={favorites.includes(recipe.url)} onToggleFavorite={toggleFavorite} onToggleDelete={toggleDelete} isDeleted={deletedIds.includes(recipe.url)} isSessionNew={sessionNewUrls.has(recipe.url)} />))}
        </section>
        {filteredRecipes.length === 0 && (<div className="text-center py-60 opacity-10"><p className="text-3xl font-black uppercase tracking-[0.5em] italic">Archive Empty</p></div>)}
      </div>
      <AnimatePresence>{selectedRecipe && (<RecipeModal recipe={selectedRecipe} isOpen={!!selectedRecipe} onClose={() => setSelectedRecipe(null)} isFavorite={favorites.includes(selectedRecipe.url)} onToggleFavorite={toggleFavorite} onToggleDelete={toggleDelete} isDeleted={deletedIds.includes(selectedRecipe.url)} />)}</AnimatePresence>
      <TagsWindow isOpen={isTagsOpen} onClose={() => setIsTagsOpen(false)} allTags={availableTags} activeTags={activeTags} onToggleTag={toggleTag} onReset={() => setActiveTags([])} />
      <FiltersDrawer isOpen={isFiltersOpen} onClose={() => setIsFiltersOpen(false)} sortBy={sortBy} setSortBy={setSortBy} maxTime={maxTime} setMaxTime={setMaxTime} ultraLowCarb={ultraLowCarb} setUltraLowCarb={setUltraLowCarb} />
      <SyncModal status={syncStatus} onClose={finishSync} />
    </div>
  );
}