# Kitchen Tracker context

This context defines the shared kitchen reference material being designed for Kitchen Tracker.

## Recipes

**Recipe**:
A permanent kitchen reference that explains how to make a component, preparation, technique, or complete dish. A recipe may be small, such as roasting a pepper or marinating olives, or broad, such as making Bolognese sauce.

**Recipe library**:
The shared collection of recipes used by kitchen staff to consult, check, and share preparation instructions without needing a verbal explanation.

**Open recipe editing**:
Any user may create or change a recipe. The recipe library must not depend on one person to transmit or maintain kitchen knowledge.

**Kitchen recipe visibility**:
Recipes are shared with everyone who has access to the kitchen. Access follows the kitchen boundary rather than individual recipe ownership.

**Current Menu**:
The recipe-book section that mirrors the kitchen menu hierarchy. It shows only dishes that contain at least one recipe and, inside each dish, only menu items that contain a recipe.

**Dish**:
A menu grouping made from items. A dish does not own a recipe; it appears in Current Menu when one or more of its items has a recipe.

**Recipe item**:
A menu item that owns one recipe. The recipe item is the link between a current menu item and its recipe content.

**Recipe creation boundary**:
Recipes are created and edited in the recipe book. Menu management does not create recipe content; it only provides the item where a recipe can be attached, searched, or rescued.

**Recipe assignment**:
An item can have zero or one current recipe. When creating a recipe for an item, the user chooses either an existing Old Recipe to rescue or a new recipe.

**Other Recipes**:
Recipes in the shared recipe book that are not attached to a dish or item in the current menu.

**Old Recipes**:
The storage area for recipes whose item or parent dish has been deleted from the current menu. Old Recipes remain available for rescue.

**Recipe rescue**:
The action of putting an Old Recipe back into Current Menu when a newly created or renamed menu item matches it. The user is notified and chooses whether to restore the existing recipe.

**Recipe name collision**:
When a new recipe would use the name of an older recipe, the older recipe keeps its history and is renamed by adding "(old recipe)" after its current name. If that name already exists, a number is added, such as "(old recipe 2)". The new recipe keeps the current name.

**Ingredient**:
A material used in a recipe, optionally with a quantity, unit, or preparation note.

**Step**:
An ordered instruction in a recipe describing an action or part of the preparation.

**Recipe media**:
Pictures attached as an extra to a recipe and shown after its ingredients and steps when an image communicates the preparation more clearly than text.

**Recipe attachment**:
A picture selected alongside a recipe's text and displayed at the bottom of the complete recipe. A recipe may have one or two attachments. An attachment is supporting context, not an ingredient or step.

**Text chunk**:
A movable piece of source text used while arranging a pasted message into recipe ingredients and steps. The chunk keeps the kitchen's original wording unless the user chooses to edit it.

**Recipe section**:
One of the two ordered text lists in a recipe: Ingredients or Steps. Both sections use the same open text-row interaction.

**Recipe line**:
One free-text entry in an Ingredients or Steps section. Pressing Enter saves the current line and opens the next one. A line has no product-imposed length cap.

**Complete recipe print**:
A printed recipe must include every ingredient line, every step, and all entered text. Long text wraps and continues onto additional paper or pages rather than being shortened, replaced with an ellipsis, or silently omitted. Recipe attachments remain digital visual clues and are not printed.

**Prep list**:
A separate operational tool for shift work. Recipes have no current relationship to prep lists. This is the canonical project term and is always written as two words. In user input, `preplist`, `preplis`, `prepli`, `playlist`, and obvious spelling variants mean **prep list** when the context is this kitchen tool. The project keeps `prep list` in user-facing language and `prep` in established technical names such as `/prep`, `usePrep`, and `prep_state`. `Playlist` keeps its ordinary meaning only in a clearly musical context.

_Avoid_: Treating a recipe as a prep task, linking recipe changes to prep lists, making one person a required editor, forcing polished prose, truncating recipe text in the editor or printout, or treating recipe media as decoration rather than kitchen context.
