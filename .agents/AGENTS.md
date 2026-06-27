# Antigravity Agent Rules for Master Project

## iPad Responsive Table Layout Rules

When styling tables in this repository for iPad (Mini, Air, Pro) and mobile devices, follow these guidelines to prevent layout breakage and overflow:

1. **Avoid Cưỡng ép `min-width: 850px` on Tablet Tables**:
   The global stylesheet `globals.css` forces `.app-responsive-table-wrapper table` to have a `min-width: 850px !important` on mobile/tablet. This will cause tables inside cards or split layouts (where available width on iPad is less than 850px) to overflow and get cut off.
   * **Fix**: Always apply the class `wrapperClassName="mkt-plan-table-no-min"` to `<Table>` instances when they need to fit within card bounds on iPad. This overrides `min-width` to `0 !important`.

2. **Responsive Column Padding & Card Padding**:
   On iPad screens (width <= 1024px), standard card padding (`p-4` or 24px) leaves too little horizontal space.
   * **Fix**: Use media queries to reduce `.app-card` padding to `16px !important` and table cell padding (`th, td`) to `6px 8px !important` on tablets.

3. **Prevent Scroll & Clipping Shift on List Tables**:
   For simple list views on the left column of a split layout, horizontal scrolling is undesired and causes the table content to shift, clipping letters on the left.
   * **Fix**: 
     - Set `fixedLayout={false}` on the `<Table>` component so it uses `table-layout: auto` and wraps content naturally.
     - Add `wrapperStyle={{ overflowX: "hidden" }}` to completely disable horizontal scrolling, forcing the browser to fit the table exactly to 100% of the card width.
