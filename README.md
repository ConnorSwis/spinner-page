# Spin & Win

A lightweight, no-dependency spin-the-wheel app. Add your choices, spin, and let the wheel decide.

## How it works

### Adding choices

Type a choice into the **Add a Choice** input and press Enter or click `+`. Each choice gets a unique color on the wheel. You can add up to any number of options — labels truncate automatically when there are too many to fit.

### Managing choices

- **Disable/re-enable** — click any choice in the list to strike it out and remove it from the wheel without deleting it
- **Delete** — click the `✕` button on a choice to remove it permanently
- The **SPIN IT** button stays disabled until at least 2 active choices are on the wheel

### Spinning

Click **SPIN IT** to animate the wheel. It spins with a smooth ease-out over ~4.5 seconds, then shows a modal announcing the winner.

### Auto-disable setting

Toggle **Disable chosen options** in the Settings card to automatically strike out each winner after the modal is dismissed. Useful for elimination-style decisions where you don't want to repeat a result.

### Persistence

Choices and settings are saved to `localStorage` so your list survives page refreshes.

## Project structure

```
public/
├── index.html       # Markup
├── css/
│   └── styles.css   # All styles
├── js/
│   └── main.js      # Wheel logic, state, DOM
└── favicon.svg      # Wheel icon
```

## Deployment

This is a static site deployed via [Cloudflare Pages](https://pages.cloudflare.com/).