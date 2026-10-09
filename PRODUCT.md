# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React + TypeScript + Vite, plain CSS with design tokens. Chosen by the project brief (Interval 1).

## Users

Players who want a calm, personal game they can open in a browser tab and spend a few unhurried minutes in. They play solo, often on a laptop or phone, with no account. They come back to *their* kitchen, which is named by them.

## Product Purpose

A cozy baking game about discovering recipes by experimenting with ingredients, remembering what you make, keeping a recipe book, and making a kitchen your own (literally, since Interval 8's decorating). Success is a player who feels the kitchen is theirs and wants to come back to see what else they can make.

## Positioning

Not an idle or clicker game: nothing accumulates while you're away, and there are no numbers to grind. Progress is what you've discovered and made; Crumbs, XP and levels exist only to give discoveries a little weight and open up new ingredients to experiment with. The interface is the kitchen itself (counter, recipe box, jars, index cards), not a dashboard around a game.

## Constraints

- Works without an account; saves stay in the browser (IndexedDB).
- A save is never discarded without the player's explicit say-so.
- No fake content: an unfinished area says it's unfinished.
- Accessible from the start: keyboard, screen readers, contrast, reduced motion.
- Keep dependencies minimal.

## Gameplay rules to preserve

These are decisions later work builds on. Change them on purpose, not by accident.

- **Selection is presence, not quantity.** An ingredient is in the bowl or it isn't. The bowl holds at most 5, needs at least 2 to mix, and can't hold the same ingredient twice.
- **Order never matters.** Selections are normalized (unique ids, sorted) before matching.
- **A recipe is an exact ingredient set.** No two recipes share a set; tests enforce this. Extra or missing ingredients mean it's not that recipe.
- **Every bake produces something.** Unmatched sets become a *Kitchen Experiment*. Its description is deterministic for a given set. Experiments are never saved as recipes and never appear in the Recipe Book.
- **Discovery happens once.** The first bake of a recipe records `{ recipeId, discoveredAt }`, and rebakes change nothing in the save.
- **Undiscovered recipes stay secret.** The Recipe Book shows a blank card for each ordinary recipe, with no name, ingredients, rarity or look. A *secret* recipe has no card at all until it's found (see Interval 6). The count shown is of ordinary recipes only.
- **Catalogs are static; saves store ids.** Ingredient and recipe ids are permanent once shipped. Saves never copy catalog data. A save that references an id the catalog no longer has stays loadable.
- **Every completed bake is remembered.** Each bake, whether a new recipe, a rebake or an experiment, becomes exactly one creation `{ id, ingredientIds, recipeId | null, bakedAt }`. Baking the same thing twice makes two creations. Creations store ids and a time only.
- **Memory is bounded.** The kitchen keeps the last 50 bakes (`MAX_BAKED_CREATIONS`). Past that, the oldest are let go. This is a keepsake, not an archive.
- **Memories never affect discovery.** Discoveries and creations are separate lists; trimming history never touches discoveries, and a creation is never how a recipe counts as found.
- **Experiments can be remembered without becoming recipes.** A remembered experiment has no recipe id, never appears in the Recipe Book and never counts toward it.
- **Bake again prepares, it never bakes.** It lays a discovered recipe's ingredients in the bowl, unmixed. The player can change them, and must still mix and bake. Undiscovered recipes never offer it.
- **The bowl isn't saved.** A prepared or half-filled bowl lives only in the open tab; a refresh starts with an empty bowl.
- **Undiscovered recipes give a few gentle hints, never the answer.** How many ingredients they need, the family divider they sit behind, and (once every ingredient they need is owned) a line Marmalade scribbled. Never a name, an ingredient, a rarity or a look. See Interval 6 for the rules.
- **Ingredients are owned, never lost.** Through Interval 4 every pantry held the whole catalog. From Interval 5 a new kitchen starts with five (flour, sugar, butter, egg, vanilla) and adds the rest from the Pantry. Anything a kitchen already owns stays owned forever: no upgrade, rebalance or reset of progression ever takes an ingredient away.

## Portability, installs and sound (Interval 4)

- **Saves stay local-first.** The kitchen lives in this browser. There is no account and no cloud save.
- **A save file is the portability mechanism.** Settings downloads the whole logical save as `homemade-<kitchen>.json` and opens one back. It's also how a player keeps a backup and how memories leave the browser.
- **An import never overwrites without consent.** Choosing a file only reads and checks it. The player sees what's in it (kitchen, baker, recipes, memories, last saved) and must confirm. The current save is archived in the same step, never deleted. Unreadable, foreign, damaged or newer-version files are refused in plain words, and the current save is untouched.
- **Imports are never repaired.** A file goes through exactly the checks and migrations a stored save does. Anything that fails is refused, not patched.
- **Renaming never changes identity.** The player and kitchen names can change at any time, with the onboarding rules. The player id and everything else in the save stay the same.
- **Installing is optional and never nagged.** Where the browser offers it, Settings has a quiet *Install Homemade*. Nowhere else, and never a fake button where installing isn't possible.
- **Offline play continues from the local save.** Once loaded, the game opens and bakes without a network. Nothing needs a connection.
- **Updates wait for the player.** A new version downloads in the background and a small note offers *Refresh* or *Later*. The game never reloads by itself, and an update never touches the save.
- **Audio is optional and player-controlled.** A handful of short, quiet effects tied to actions (jar, take out, whisk, oven timer, a new recipe's chime by rarity, a new level, a new ingredient, a tutorial card). No music, nothing on page load, and the sound setting governs all of it. Sound and motion are separate choices.

## Progression (Interval 5)

The loop is *experiment → discover → see its rarity → earn Crumbs and XP → add an ingredient → discover more*. Progression serves discovery; it never replaces it.

- **Rarity is fixed.** Every recipe has one authored rarity (common, uncommon, rare, epic, legendary, mythic). It's part of the recipe, the same every bake, and never rolled. High rarities are genuinely scarce.
- **First discoveries earn; nothing else does.** A recipe's first bake pays Crumbs and Baker XP by its rarity, exactly once. Rebakes and Kitchen Experiments earn nothing, so there is nothing to farm. Reward values live in domain code (`RARITY_REWARDS`); screens only show them.
- **One currency: Crumbs.** Earned, kept and spent only by the player. Never bought, never expiring, never regenerating, never needed to bake. There is no energy, no timer, no waiting.
- **Levels open up access, not power.** Baker Levels 1–11 (1–10 until Interval 6) come from total XP (derived, never stored). A level makes ingredients available to add; it never makes baking faster, luckier, better or rarer. No stats.
- **Adding an ingredient is clear and permanent.** Each locked ingredient shows its level and Crumb cost up front, and why it can't be added yet. The player confirms; the Crumbs, the ingredient and its small XP thank-you change in one save write.
- **Nothing can get stuck.** Costs are balanced so that whatever order ingredients are added in, the next one is always reachable from discoveries the pantry allows. A test checks every reachable pantry.
- **Undiscovered recipes still give nothing away.** Locked ingredients never say which recipes they're for, and a blank Recipe Book card never shows rarity or ingredients.
- **Existing kitchens keep everything.** Upgrading an Interval 4 save keeps every owned ingredient, discovery, date, memory, name and setting. Crumbs start at 0 (an existing kitchen already owns everything Crumbs could buy). XP is the sum of each recipe already in the book, counted once, so the level matches the book; those recipes stay discovered and can't pay again. The tutorial is marked done.
- **The tutorial is short, skippable and replayable.** A brand-new kitchen opens on Marmalade's nine-card tutorial, which guides one real bake (shortbread, from the starter pantry). Skip is always one control away and takes nothing away. *Replay the tutorial* in Settings teaches it again; it pays no reward of its own and a replayed discovery is already found, so replaying can't earn anything.
- **Marmalade is company, not a nag.** She speaks during the tutorial, for a first card, the first recipe of a new rarity, a new level and a new ingredient. An ordinary bake gets no reaction.
- **Story stays light.** The kitchen's old recipe box has faded cards; baking a recipe writes its card back in. Since Interval 7 it has chapters (see below).

## Families, secrets and clues (Interval 6)

Interval 6 adds seven ingredients and fifteen recipes (19 and 27 in all), and gives the discovery space some structure and some surprise without turning it into a checklist.

- **Family is theme, nothing else.** Every recipe belongs to exactly one family: Classics, Chocolate, Warm & Spiced, Nutty, Fruity, Sweet & Sticky or Strange & Wonderful. It decides which divider the card is filed behind and nothing more: never whether a bake matches, never a reward, never a rarity.
- **Secret is not a rarity.** A recipe's family, its rarity and whether it's secret are three separate, authored facts. Secrets can be Rare, Epic, Legendary or Mythic (never Common or Uncommon) and belong to an ordinary family. Today's three are Rare, Epic and Legendary; the first Mythic is *not* secret.
- **A secret doesn't exist until it's found.** Before its first bake a secret has no card, slot, count, family hint, rarity or clue, and isn't in the page at all (not merely hidden). The main count is "found of visible"; secrets found are counted separately ("Secrets found: 1"), so the total never reveals how many secrets there are. A family whose only recipes were undiscovered secrets would get no divider (the catalog checks forbid such a family).
- **Secrets are found by baking, like everything else.** The same exact-set, order-independent match. No chance, no timer, no hidden condition. Once found, a secret appears in its family marked *Secret* in words, can be baked again, and pays its rarity's reward exactly once.
- **Progression never depends on a secret.** The balance test assumes no secret is ever found.
- **Clue rules.** Every blank card shows how many ingredients it needs; the divider it sits behind is its family. Once every ingredient it needs is on the player's shelf, it also shows a line Marmalade scribbled: a feeling, a texture or a time of day, never an ingredient's name (a catalog check enforces this). Clues are free: never bought, never paid for with Crumbs. Secrets get no clues.
- **Families show light progress, with no reward.** Each divider shows "3 of 5 discovered" (plus any secrets found there). Finishing a family earns nothing; Marmalade just notices the first one. Family rewards were considered and left out: discoveries already pay, and a completion bonus would push toward a checklist.
- **The first Mythic is Millionaire's Shortbread:** a shortbread base, salted caramel and chocolate, made from flour, butter, brown sugar, sea salt and chocolate chips (no white sugar: that's the twist). Difficult but fair: five ingredients, two of them late, its family and count on the card, and once they're all owned, Marmalade's scribble about three layers and a salty-sweet middle. It pays the Mythic reward (300 Crumbs, 320 XP) once.
- **One more level, for a reason.** Level 11 (1,100 XP) opens sea salt, the Mythic's last ingredient. Levels 1–10 and Interval 5's seven additions keep their exact thresholds, levels and prices, so nobody's level or plans move. The new additions are cheaper than their level suggests so that a kitchen upgraded from Interval 4 (which owns the old twelve but started with no Crumbs) can always buy its way in.
- **Progression stays deterministic and can't deadlock.** A test walks every order of pantry additions from a new kitchen (thousands of pantries) and from that upgraded kitchen, and checks there's always an affordable next step. Two new recipes (Meringue Kiss, Honeycomb Crunch) use only older ingredients, so upgraded kitchens have something new to find straight away.
- **Nothing is copied into the save.** Families, secrecy, clues and milestones are worked out from the catalog and the list of discoveries. The save version stays 4; older saves keep every name, setting, ingredient, discovery and date, and the new ingredients start locked.
- **Marmalade has a few new firsts:** the first secret, the first Mythic (with a starstruck face of its own), the first finished family and a kitchen's first pantry addition. Each is said once, because each happens once.

## Story chapters (Interval 7)

The kitchen has a history. The old recipe box's cards were wiped blank; as the player bakes, notes in another hand turn up (labels, scraps, pencil in the margins), and Marmalade reads them with the player. The first arc is five short chapters: *The Faded Recipe Box*, *Notes in the Margins*, *The Second Shelf*, *Recipes Someone Hid* and *The Last Card*. It ends on an open thread (a card addressed to "M." and a key that fits nothing yet), not an answer.

- **Deterministic.** Scenes are read in one fixed order. A scene opens once every scene before it has been seen and its own requirement is met. Requirements are things already done in the kitchen: the tutorial behind them (finished *or* skipped), 4 recipes found, a first Warm & Spiced card, 3 ingredients added beyond the starter five, a first secret *or* 12 recipes found, and the first Mythic. No chance, no timers, no number of bakes, logins or Crumbs spent.
- **Never dependent on a secret.** Chapter 4 opens with a first secret or with 12 recipes, so a player who never finds one still reads the whole arc (a test reads it with every non-secret recipe and no secrets). No requirement asks for a whole family.
- **Optional-light.** A waiting scene is never opened for the player. It's mentioned once where they are (under a bake or a pantry addition that opened it) and in words in the kitchen and on the Recipe Book's bookmark, then it waits. Scenes are a handful of beats, a line or two each. Baking never needs the story.
- **Skippable, and skipping costs nothing.** Skip marks the scene seen: its notes, clues and any reward still arrive, and it can be replayed.
- **Replay is reward-idempotent.** Any seen scene can be replayed from Recipe Box Notes. A replay writes nothing: no Crumbs, no XP, no change to what's seen or complete.
- **Small, one-time rewards.** Completing chapters 2–5 tucks 10, 15, 20 and 25 Crumbs between the cards (70 in all), paid as a chapter's last scene is first seen. No XP. Progression is balanced without them; the anti-deadlock test ignores them.
- **A chapter completes only when its last scene is seen,** never just because its requirements are met.
- **Secret clues come from the story, and only from it.** Each of the three secrets gets one note (in chapters 2, 3 and 4) that hints at what it was for and what it was like, never an ingredient's name (a content check enforces this). Clues are never bought. Reading one doesn't find anything: a secret is still found only by baking its exact ingredients, and until then it stays out of the Recipe Book. Once baked, Marmalade pencils "Found it." beside its clue.
- **Story doesn't replace discovery.** It follows discoveries and never gates a recipe, an ingredient or a level. No new recipes or levels were added for it.
- **Saved as ids only.** The save holds `story.seenSceneIds`; chapters, completion, notes and clues are derived from it and the static content. Save version 5.
- **Existing kitchens catch up.** A version 4 save upgrades with no scenes seen (nothing is marked seen on the player's behalf) and every other field exactly as it was, tutorial state included, so nobody is sent through the tutorial again. Its first chapter is ready straight away, and whatever its progress has already earned follows one scene at a time, as fast as the player cares to read.
- **Marmalade** reads each scene with the player. She knows the kitchen but not the whole story: she's surprised by notes, remembers small things after a discovery, and never explains the mystery.

## Kitchen decorating (Interval 8)

The kitchen becomes visibly the player's. The thread left open at the end of Chapter 5 pays off: the brass key opens a cupboard under the counter, and what was put away in it can come out again.

- **Cosmetic only.** A decoration never affects a recipe, a rarity, XP, Crumb rewards, baking, an ingredient or a level. There are no stats, no passive income, no decoration rarity and no power. Nothing about a bake reads the decorating state (a test bakes the same recipes in a bare and a decorated kitchen and compares the outcomes).
- **Curated spots, not freeform placement.** Seven fixed spots in the kitchen picture: the wall, the window, a wall shelf, three along the back of the counter (left, under the window, right) and a towel on the cupboard door. Each spot holds nothing or exactly one thing. No dragging, no stacking, no overlap, and the counter objects the player uses never move.
- **Owned versus out.** The save keeps the decorations the player owns (in the order they arrived, never removed) and, separately, which one is out in each spot (`decorating.equippedBySlot`). Only something owned can be out, and only in its own spot. Putting something else out sends the old piece back to the cupboard, still owned. Ids only: names and drawings live in the catalog.
- **When it opens.** The cupboard opens the moment Chapter 5 ends, however that happened. A save that had already finished Chapter 5 finds it open straight away after upgrading; no story is replayed. A one-scene epilogue, *Chapter 6: The Old Cupboard*, is what's found inside (Marmalade recognises some of it, not all). It plays the first time the cupboard is opened in the kitchen, or can be read in the Recipe Box Notes, and it's skippable. It pays nothing: the cupboard is the reward. E., R. and M. stay unexplained.
- **Free to start.** The cupboard holds a starter set (six pieces, four of them the Cottage theme) the moment it opens. Nothing is put out for the player; the kitchen looks the same until they choose.
- **Deterministic rewards.** Keepsakes are earned once by something already done: a first Mythic (the framed gold seal), a first Legendary (a little lemon tree), a first secret (a framed scrap), every Classics card (an old rolling pin), every Fruity card (a fruit-print towel). Each rule reads only the save; nothing is rolled, timed or random.
- **Retroactive, never twice.** One idempotent rule hands over everything earned and not yet owned, after every bake and scene, on load and on import. A kitchen that earned a keepsake long before the cupboard opened finds it waiting inside. The same milestone never grants twice (reloads, replays, rebakes and imports included), and nothing earned is ever taken away, even if a later catalog would no longer count the milestone.
- **Cosmetic Crumb purchases.** Seven themed pieces can be bought for 40–80 Crumbs each (395 in all), after a confirm that says it's just for looks and how many Crumbs will be left. One write takes the Crumbs and hands the piece over. No duplicates, no refunds, no second currency, no rotating stock, no random drops. Anything that can be earned is never for sale. The cupboard only opens after the first Mythic, which needs sea salt (Level 11, the last addition), so by then a kitchen is at the top level with most of its pantry bought, and decorations barely compete with ingredients.
- **Themes are just groupings.** Cottage, Warm Bakery and Garden Kitchen help the cupboard sort itself. There's no "apply theme" button and nothing for matching. Marmalade notices the first time a whole set is out at once.
- **Marmalade, sparingly.** Three one-time remarks per kitchen, remembered in the save so none is repeated: the first thing put out, the first whole set out together, and the framed scrap going on the shelf. Swapping things about otherwise gets no comment.
- **Saved and portable.** Save version 6 adds `decorating { ownedDecorationIds, equippedBySlot, noticedMomentIds }`. Older saves upgrade with an empty cupboard (the migration never reads the catalog); earned pieces arrive on the first load. Save files carry decorations exactly. A file with something out that it doesn't own, or out in a spot that doesn't exist, is refused as damaged (never repaired). A decoration id the catalog doesn't know is kept but not shown, like a retired recipe.

## Recipe expansion (Interval 8)

- **Seven new recipes, no new ingredients.** Coconut, strawberry jam, white chocolate and pistachios each had only one card that wasn't secret; now every pantry addition is in at least two visible recipes (a catalog check). Warm & Spiced, the thinnest divider, gained two. Every family now has four or five visible cards.
- **New rarities only.** Three Common, two Uncommon, one Rare and one Epic (Pistachio Nougat); no new Legendary, Mythic or secret. Existing recipes keep their rarities. Each tier is still no bigger than the one below it.
- **Progression stays deadlock-free, at the same cap.** The extra early XP let a kitchen buy honey (100 Crumbs) before it could afford anything after, which the anti-deadlock walk caught. A second honey recipe from the starter shelf (Honey Madeleine) fixed it without touching any price or level. No new ingredient needed a new level gate, so Level 11 stays the top.
- **No new secret.** None of the ideas improved on the three secrets' story clues, so none was added.

## Voice

Warm, plain, a little playful, never cutesy. Short sentences, written like a note left on the counter. Controls say what they do ("Open the kitchen", "Keep my kitchen"). Errors say what happened and what's safe.

## Open decisions

- Whether finishing a family should ever earn something (deliberately not, for now).
- Who E., R. and M. are (deliberately unanswered; the key now opens the cupboard, and that's all it explains).
- Whether memories should ever be kept beyond the cap.
- Whether to offer background music (deliberately not yet).
- Whether archived saves should ever be visible to the player (today they're kept, but only reachable through browser devtools).
