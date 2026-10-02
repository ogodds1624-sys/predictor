# How the predicted coefficient is generated

This note describes what the site actually does. The number on the screen is a random draw from a prepared list. It is not a forecast of a live Aviator round, and it is not connected to a casino.

## 1. Build the odds pool

When the page loads, `sampleOdds()` in `src/components/altimeter/predictor.tsx` creates 50 different values.

- Lowest value: **1.00**
- Highest value: **20.00**
- Step: **0.01** (two decimal places)
- Each value is chosen with `100 + Math.floor(Math.random() * 1901)`, then divided by 100
- Duplicates are skipped until the pool has 50 unique numbers

That list is stored as the arranged odds. It does not change again until the page is opened fresh.

## 2. Show the first coefficient

One number is picked at random from those 50 and written into the large **Predicted coefficient** in the center, for example `4.61x`.

The same number is saved immediately as the first signal record.

## 3. Wait for the loading bar

The red bar under **Next signal** shrinks from full to empty over **30 seconds** (`.signal-load` in `src/styles.css`).

**Next signal** cannot be tapped. It only shows **Loading...** while the bar is moving. Nothing new is chosen during those 30 seconds.

## 4. Project the next odds

When the bar animation finishes, `projectNext()` runs:

1. Pick one of the 50 odds again, at random. The same number can appear more than once.
2. Replace the center coefficient with that value, shown as `n.xx` plus `x`.
3. Flash the coefficient so the change is visible.
4. Save that value at the front of the signal record.

The bar then starts another 30 second run. The next coefficient appears only when that run finishes. The bar and the number stay on the same timer.

## 5. Signal record

Each projected coefficient is stored with an id and a time.

- Newest value is shown first.
- At most 10 records are kept.
- When the 10th is passed, the list clears and starts again from one record.

The list is also saved in the browser (`localStorage`, key `aviator-predictor-v1`) so a reload can restore a list that is still under 10.

## 6. Picture-in-picture

On the full page, the bar’s end is what projects the next odds.

In the small picture-in-picture window, the page timer may be paused, so a separate 30 second timer calls the same `projectNext()` function. The window shows only the coefficient. **Next signal** is not used there.

## Short version

| Step | What happens |
| --- | --- |
| Open the page | 50 odds from 1.00 to 20.00 are created |
| First view | One of those 50 is shown and saved |
| Next 30 seconds | The loading bar runs. The coefficient stays still |
| Bar finishes | A new random odd from the same 50 is projected and saved |
| Repeat | The bar starts again |
