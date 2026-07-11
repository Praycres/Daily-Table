# Daily Table — Ring 1

This folder is the complete first live version of Daily Table.

## What it reads from your Google Sheet

Google Sheet ID:
`1Qg6BIwSfSVAz1_fU0mQImpfZYeSu8WnBC7pbzG8ku44`

Tabs used:

- `Dashboard`
- `Weekly Menu`
- `Pratherisms`

The Google Sheet must remain:
**Anyone with the link → Viewer**

## One small Google Sheet update

On the `Dashboard` tab, add these three labels in Column A:

- Schedule 1
- Schedule 2
- Schedule 3

Enter the corresponding schedule items in Column B.

For example:

| Column A | Column B |
|---|---|
| Schedule 1 | 9:00 Isaiah 117 House |
| Schedule 2 | 3:30 Appointment |
| Schedule 3 | 6:30 Small Group |

If all three are blank, Daily Table will say:

> Enjoy the margin today.

## Upload to GitHub

1. Open the `Praycres/Daily-Table` repository.
2. Click **Add file** → **Upload files**.
3. Upload:
   - `index.html`
   - `style.css`
   - `script.js`
   - the entire `assets` folder
4. Click **Commit changes**.

## Turn on GitHub Pages

1. In the repository, open **Settings**.
2. Select **Pages**.
3. Under **Build and deployment**, choose:
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/(root)**
4. Click **Save**.

Your site should appear at:

`https://praycres.github.io/Daily-Table/`

GitHub Pages may take a few minutes to publish the first time.

## What Ring 1 does

- Reads meals from the Weekly Menu tab.
- Reads Focus, Scripture, Word of the Year, Gentle Reminder, and Schedule from Dashboard.
- Changes the greeting automatically by time of day.
- Shows friendly text when Dinner, Focus, or Schedule are blank.
- Shows one Kitchen Whiteboard Pratherism on Saturdays and Sundays.
- Refreshes Google Sheet information every 10 minutes.

## Ring 1.1

Automatic Google Calendar syncing will be added after Ring 1 is live and tested on the Echo Show.
