# Mom's Meds - Manual Test Plan

## Scope and environment
- **Page/flows covered:** Calendar view (day/week/month), Cabinet view, Add Medication wizard, Medication Detail, Refill modal, Settings, local storage persistence, and notification prompts.
- **Recommended environment:** Latest Chrome (mobile emulator and desktop), with and without notification support. Clear `localStorage` between runs when noted.
- **Seed data:** The app seeds one medication (Atorvastatin) if `localStorage` is empty; keep this for quick smoke checks.

## Baseline smoke checks (fastest)
1) **App load** - Navigate to the root page.
   - Expect background gradient shell with bottom navigation visible and no console errors.
2) **Navigation tabs** - Tap **Calendar** and **Cabinet** buttons.
   - Verify active tab styling (lifted icon, underline) switches and selected medication (if any) is cleared when switching.
3) **Default data renders** - In Cabinet, confirm seeded Atorvastatin card shows strength, form, schedule chips, and inventory badge state; in Calendar Day view, confirm at least one task exists for bedtime.

## Cabinet view
### Magic Reminders prompt
- When notification permission is not granted, ensure the "START REMINDERS" card appears; clicking requests permission and updates state to hide the prompt on success. In unsupported browsers, verify the fallback alert text appears.

### Add Medication wizard (step-by-step)
1) Open **Add New Pill**.
2) **Photo intake (Step 1)**
   - Add multiple images; thumbnails render with delete buttons and "Analyze X Photos" enabled. Remove one image and ensure the count updates.
   - Click **Analyze**: loading state shows "Reading Labels...". On success, confirm fields in Step 2 prefill (name/strength/form/instructions/rxNumber/quantity/refillsRemaining). On failure, an alert appears and flow proceeds to Step 2.
   - Use **Skip & Type Manually** to jump to Step 2 without images.
3) **Details (Step 2)**
   - Edit text inputs, choose color tag, set refills (including clicking **NO REFILLS**), and adjust instructions. Verify color selection ring and refills input accept clearing to blank.
   - Click **Next: Schedule**.
4) **Scheduling (Step 3)**
   - Toggle "Must take with food?" to switch between meal and time blocks; available chips change accordingly and previous selections clear.
   - Select at least one time block; **Save Medication** stays disabled until a selection exists, then saves and closes modal.
5) **Post-save card**
   - New medication card appears with chosen color dot, schedule chips, and image placeholder/preview. Selecting the card opens Medication Detail.

### Cabinet history
- Archive: From Medication Detail (active med), press **Archive Medication**; card moves to History list and no longer appears in active grid.
- History modal shows archived items; selecting one opens detail view.
- Restore: In detail view, **Restore Medication** moves it back to active grid.
- Permanent delete: From archived item detail, **Delete Forever** removes it entirely; verify it disappears from history.

## Medication Detail view
- **Back navigation** returns to Cabinet with previous scroll position intact.
- **Editing metadata:** Use **Edit** to change name/strength/form/instructions/pharmacy/doctor/notes/color and refills. Saving reflects updates on the card and in Calendar.
- **Schedule editing:**
  - Open a schedule block, change time, dose (including fractional values), and notification toggle/time. Ensure duplicate time blocks are rejected with an alert.
  - Add new block via **Add Dose**; remove via **Delete** inside modal.
- **Notifications toggle** inside block respects enable/disable and time input formatting.
- **Inventory updates:**
  - Use **Refill Now** or **Order Pickup** (opens Refill modal) to adjust counts; verify "Refill Soon/Final Doses" badges update on Cabinet cards and Calendar alerts.
- **Logs snapshot:** Recent activity list shows timestamps and doses; verify new logs appear after Calendar interactions (see Calendar tests).

## Refill modal
- **Refill Now:** Enter amount; submission increases inventory, resets refill alerts, appends history entry, and optionally updates refills remaining if provided.
- **Schedule Pickup:** Set expected date and alert toggle/time; card should show "Refill Pickup Due" on that date in Calendar Day view.

## Calendar view
### Day mode
- Task list grouped by time blocks, sorted by sortOrder. Verify progress ring percentage matches completed/total tasks.
- Tapping incomplete task immediately marks it taken (green state); inventory decreases by scheduled dose.
- Tapping completed task opens confirmation modal; choosing "I haven't taken" removes log and restores inventory.
- Refill alerts: When inventory <= threshold and refillsRemaining != 0, "Refills Needed" cards appear with Call/Refill actions.
- Expected refills: When `refillExpectedDate` matches selected date, "Refill Pickup Due" banner shows with **Complete** button opening Refill modal.

### Week mode
- Week range updates via prev/next buttons. Each active med shows daily dots: complete (green check), partial (orange), missed past (red dot), future scheduled (color outline), and hidden when no inventory/schedule.
- Clicking a day cell switches to Day view for that date.

### Month mode
- Calendar grid displays month navigation; today highlights. Day chips show scheduled meds as colored dots (up to four + "+").
- Status dots for past days: complete/partial/missed/empty state indicators. Selecting a day opens Day view.
- Refill pickups add blue ring and indicator dot.

## Settings
- From Cabinet header, open Settings. Toggle daily summary on/off and adjust time; ensure values persist after navigation and reload.

## Persistence and storage
- Clear `localStorage`, reload: seed medication reappears. Add a new med, reload: data persists (meds, logs, settings, refill history).
- Toggle a log in Calendar, reload: status remains. Delete/restore a med and confirm state persists across refresh.

## Accessibility and UI polish
- Tab focus order on buttons and inputs within modals is logical; pressing Esc closes modals.
- Buttons show pressed/hover states; disabled buttons (e.g., Save Medication with no schedule) cannot be clicked.
- Images retain aspect ratio and have rounded corners.

## Bug-hunt stress tests (advanced)
- Set medication with **0 refills remaining** and low inventory: ensure "Refills Needed" suppression works and Cabinet shows "Finishing Strong" when <= 3 units.
- Create medication with **no schedule blocks** (attempt by deselecting all on Step 3): Save remains disabled.
- Add overlapping schedule blocks via edit modal: expect duplicate-time alert and no save.
- Log intake for future date where projected inventory is insufficient: task should not render for that day until inventory is increased.
- Delete a medication permanently, then add another with same name: ensure logs from deleted med do not appear.
- Switch rapidly between Day/Week/Month after editing schedule: verify view updates without stale data or crashes.
