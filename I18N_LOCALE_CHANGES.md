# i18n Locale Code Enhancement

## Summary

The i18n system has been updated to properly support full locale codes (`pt-BR` and `en-US`) instead of simplified codes (`pt` and `en`), while maintaining full backward compatibility.

## Changes Made

### 1. Core i18n Module (`src/lib/i18n.ts`)

#### Updated Locale Codes
- **SUPPORTED_LOCALES**: Changed from `["pt", "en"]` to `["pt-BR", "en-US"]`
- **DEFAULT_LOCALE**: Changed from `"pt"` to `"pt-BR"`
- **Dictionary keys**: Updated from `pt` and `en` to `"pt-BR"` and `"en-US"`

#### Added Backward Compatibility
- **LOCALE_ALIASES**: Maps legacy codes to full locale codes
  - `pt` → `pt-BR`
  - `en` → `en-US`

#### New Functions
- **`normalizeLocale(value: string): Locale | undefined`**
  - Accepts full locale codes: `pt-BR`, `en-US`
  - Accepts legacy simplified codes: `pt`, `en`
  - Accepts and normalizes other Portuguese/English variants: `pt-PT` → `pt-BR`, `en-GB` → `en-US`
  - Returns `undefined` for unsupported locales

- **Updated `isLocale()`**: Now checks for valid full locale codes only

### 2. Server-side Locale Resolution (`src/lib/i18n.server.ts`)

#### Enhanced Accept-Language Header Parsing
- Now properly handles full locale codes in Accept-Language headers
  - Example: `Accept-Language: pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7`
- Uses `normalizeLocale()` to handle both full and simplified codes
- Respects locale priority/quality values

#### Updated Query Parameter Handling
- Supports both formats: `?lang=pt` and `?lang=pt-BR`
- Automatically normalizes to the correct full locale code

## Backward Compatibility

✅ **Fully Maintained** - All existing functionality continues to work:

1. **Legacy URL parameters still work:**
   - `/view/abc123?lang=pt` → resolves to `pt-BR`
   - `/view/abc123?lang=en` → resolves to `en-US`

2. **Simplified Accept-Language headers still work:**
   - `Accept-Language: pt` → resolves to `pt-BR`
   - `Accept-Language: en` → resolves to `en-US`

3. **Full locale codes work as expected:**
   - `/view/abc123?lang=pt-BR` → resolves to `pt-BR`
   - `Accept-Language: pt-BR,en-US;q=0.9` → respects priority

4. **Other locale variants map to supported locales:**
   - `pt-PT` (European Portuguese) → `pt-BR`
   - `en-GB` (British English) → `en-US`

## Test Scenarios

### URL Query Parameters
```
✅ /view/abc123?lang=pt      → pt-BR (legacy)
✅ /view/abc123?lang=pt-BR   → pt-BR (full code)
✅ /view/abc123?lang=en      → en-US (legacy)
✅ /view/abc123?lang=en-US   → en-US (full code)
✅ /view/abc123?lang=pt-PT   → pt-BR (normalized)
```

### Accept-Language Headers
```
✅ pt-BR,pt;q=0.9            → pt-BR (prefers full code)
✅ pt                        → pt-BR (legacy fallback)
✅ en-US,en;q=0.9            → en-US (prefers full code)
✅ en                        → en-US (legacy fallback)
✅ pt-PT,pt-BR;q=0.9         → pt-BR (normalized)
✅ fr,pt-BR;q=0.9,en;q=0.8   → pt-BR (skips unsupported, finds match)
```

### Fallback Behavior
```
✅ No Accept-Language header → pt-BR (default)
✅ Unsupported locale only   → pt-BR (default)
```

## Implementation Details

### Locale Resolution Priority (in order)

1. **Explicit Override** (`?lang=` query parameter)
   - Supports both full and legacy codes
   - Normalized via `normalizeLocale()`

2. **Accept-Language Header**
   - Parses all locale tags in priority order
   - Normalizes each tag via `normalizeLocale()`
   - Returns first supported match

3. **Default Locale**
   - Falls back to `pt-BR` if no match found

### Architecture Benefits

- **Type Safety**: TypeScript ensures only valid `Locale` types (`"pt-BR" | "en-US"`) are used
- **Future-Proof**: Easy to add new locale codes (e.g., `es-ES`, `fr-FR`)
- **Clean Migration**: No breaking changes for existing users or code
- **Standards Compliant**: Uses proper BCP 47 language tags

## Files Modified

1. `src/lib/i18n.ts` - Core i18n configuration and helpers
2. `src/lib/i18n.server.ts` - Server-side locale resolution

## Files NOT Modified

- Dictionary content remains unchanged (already in Brazilian Portuguese)
- All React components continue to work without changes
- HTML `lang` attribute already set to `pt-BR` in `src/app/layout.tsx`

## Build Verification

✅ Build successful: `bun run build`
✅ No TypeScript errors
✅ No linting errors
✅ All pages generated successfully

## Next Steps (Optional Enhancements)

1. **Add more locale variants** if needed:
   ```typescript
   const LOCALE_ALIASES: Record<string, Locale> = {
     pt: "pt-BR",
     "pt-PT": "pt-BR",
     en: "en-US",
     "en-GB": "en-US",
     "en-CA": "en-US",
     // Add more as needed
   };
   ```

2. **Add locale switcher UI** to allow users to manually select language

3. **Store locale preference** in cookies for persistence across visits

4. **Add more translations** for additional languages (es-ES, fr-FR, etc.)
