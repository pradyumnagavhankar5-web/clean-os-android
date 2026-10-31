# Android device acceptance checklist

Run this in Expo Go compatible with SDK 58, then repeat important flows in a
preview APK when available. These are manual checks to perform; unchecked items
are not claims of completed device testing. Use demo information only.

Record: date ______ · phone/Android version ______ · Expo Go version ______ ·
source commit ______ · tester ______

## Navigation and first launch

- [ ] Start the cloud tunnel using the README, open its link on Android and wait
  for loading to finish without a crash.
- [ ] Welcome is readable; **Explore the demo** opens role selection clearly
  labelled as demo access.
- [ ] Facility Admin opens the dashboard. All five tabs open and Android Back
  returns from task details correctly.
- [ ] On fresh data created today, admin metrics show 7 tasks today, 2 completed,
  5 unfinished, 29% completion and 3 low-stock products.
- [ ] Facilities show cleaning areas; tapping an area filters its task list.

## Tasks and checklists

- [ ] Create a task for today with a facility, area, assignee, high priority,
  checklist and notes. Confirm it appears in search and filters.
- [ ] Empty title, impossible date and empty checklist show a useful error.
  Task dates accept DD/MM/YYYY.
- [ ] Edit the task, change its assignee and priority, and confirm the new values.
- [ ] **Start task** changes its status to in progress.
- [ ] **Complete task** with unchecked steps shows an error and leaves it open.
- [ ] Check every step and complete it. Dashboard completion increases for the
  selected role and the task is visible under Completed.
- [ ] Reopen a completed task. Confirm the status and dashboard update.
- [ ] Search for an absent title: an empty state appears. Clear filters to recover.

## Inventory and reorder enquiry

- [ ] Search and category/Low stock filters show the correct products. A search
  with no matches gives an empty state and working Clear filters action.
- [ ] Record 2 litres of floor cleaner as Stock in, then 1 litre as Stock out.
  The quantity rises by 1 overall and two movements appear with reason/date.
- [ ] Zero, negative, blank and nonnumeric quantities fail. Issuing more than the
  available stock fails and changes neither quantity nor history.
- [ ] Set a threshold equal to the current quantity: Low stock appears. Set it
  lower: the warning clears. A negative threshold fails.
- [ ] Prepare a reorder enquiry, remove/add products and change quantities. The
  preview reflects every edit; empty selections/invalid quantities cannot open it.
- [ ] Open WhatsApp enquiry. The prefilled text contains the chosen products and
  quantities, uses an Indian date and lets you choose the contact yourself.
  Return without sending unless you intend to contact that verified recipient.
- [ ] Returning from WhatsApp preserves app data. No stock changes just because an
  enquiry was prepared or opened.

## Roles, saving and recovery

- [ ] Switch to supervisor: task and inventory management remain available.
- [ ] Switch to staff and select Asha Patil: only her assigned tasks appear. She
  can update her checklist/status; task creation/editing and stock mutations are
  unavailable. Inventory remains readable.
- [ ] After changing a task and stock as a manager, close/reload CleanOS without
  clearing storage. Changes and the selected role persist.
- [ ] Cancel **Reset demo data**: data remains. Confirm a reset: fresh seed data
  returns and the welcome screen opens.
- [ ] If a load/save error is encountered, record the exact message. Retry should
  not silently replace data. Recovery replacement should require confirmation.
  Do not deliberately corrupt a user's saved data to test this.

## Android usability

- [ ] At a larger Android font size, labels and buttons remain readable without
  clipped text. Forms scroll above the keyboard.
- [ ] On a small phone, cards and filters fit, all controls can be reached, and
  system status/navigation bars do not cover content.
- [ ] TalkBack announces buttons, input labels, role selection and checklist
  states meaningfully; touch targets are comfortable.
- [ ] Switch between tabs, open/close forms, and press Android Back repeatedly:
  no crash, stuck overlay or lost saved changes.

Record failures with screen, action, expected result and actual result. Add the
phone/Android version and source commit so another tester can reproduce them.
