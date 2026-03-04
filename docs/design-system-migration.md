# Design System Refactor Notes

## How tokens were inferred

Token values were reverse-engineered by scanning recurring color and utility usage across the shared component layer and admin/candidate pages.

- Most frequent color values were treated as semantic candidates (`text`, `surface`, `border`, `action`, `status`, `danger`).
- Repeated spacing/radius/shadow values were mapped into core scales.
- Existing app aliases (`--color-*`) were preserved as compatibility bridges to avoid breaking existing pages.

## What changed

1. Added source token file: `src/app/design-tokens.json`.
2. Added semantic + core CSS variable system (light + dark) in `src/app/styles.css`.
3. Refactored Tailwind config to use tokenized colors, spacing, radius, shadows, typography.
4. Refactored shared primitives to semantic tokens:
   - `Button` (size/style/state/tone)
   - `FormInputField` (size/state)
   - `FormSelectField`
   - `Table`
   - `ModalShell`
   - `QueryStates`
   - `Sidebar`
5. Added new primitives:
   - `Card`
   - `layout/Stack`
   - `layout/Inline`
6. Added `/design` route with live design system documentation.

## Migration guidance

- New or updated UI should use semantic token utilities (`text-*`, `surface-*`, `border-*`, `action-*`).
- Avoid raw hex values in shared components.
- Prefer `Card`, `Button`, `FormInputField`, and `DataTable` for page assembly.
- Use the `/design` page as the reference source for approved variants and token usage.
