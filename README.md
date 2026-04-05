# Zorvyn Finance Dashboard

**Developed by:** Md Irfan Safi  
**Contact:** itisirfan9091@gmail.com  

A responsive, interactive frontend finance dashboard built for the Zorvyn FinTech frontend engineering internship screening. 

## 💡 The Approach: Why Vanilla JS?

While I am very comfortable with modern frameworks like React, I intentionally chose to build this project using **plain HTML, CSS, and Vanilla JavaScript**. 

I wanted to demonstrate a strong, underlying grasp of core frontend fundamentals—specifically native DOM manipulation, event delegation, and unidirectional data flow—without relying on the abstraction of a heavy framework. My goal was to show that I understand *how* state management works under the hood, not just how to implement a library.

## ✨ Core Features

* **Native State Management:** The app relies on a single, centralized `appState` object. All UI components (tables, charts, KPIs) are derived directly from this state. When an action occurs, the state updates and triggers a controlled re-render cycle.
* **Simulated RBAC (Role-Based Access Control):** A dropdown toggles between 'Admin' and 'Viewer' modes. The UI dynamically reacts by locking down mutation actions (Add, Edit, Delete) for Viewers.
* **Data Persistence:** Integrated `localStorage` so that new transactions, edits, and deletions survive browser refreshes.
* **Interactive Ledger:** Includes real-time text filtering by category and chronological/reverse-chronological sorting.
* **Dynamic Analytics:** Utilizes **Chart.js** to visualize the balance trend (Line Chart) and categorical spending (Pie Chart). The Insights Engine automatically calculates ratios and highest-spend categories based on the current data state.

## 🛠️ Tech Stack

* **HTML5 & CSS3:** Built with semantic markup and modern CSS. Features CSS Grid/Flexbox layouts, fluid typography, and glassmorphism UI elements using `backdrop-filter` and custom CSS variables. No CSS framework (like Tailwind or Bootstrap) was used.
* **Vanilla JavaScript (ES6+):** Handles all logic, state, and DOM updates.
* **APIs:** `Intl.NumberFormat` and `Intl.DateTimeFormat` used for robust, localized currency and date formatting.
* **Libraries:** Chart.js (via CDN) for data visualization.

## 🚀 Getting Started

Because this project uses no build tools or package managers, setup is instant:

1. Extract the project folder.
2. Open `index.html` in any modern web browser.
3. *Note: To test the local storage, try adding a transaction or changing the sort order, then refresh the page.*

## 🧠 Architectural Highlights

* **Sanitization:** User inputs for transaction categories are passed through a custom `escapeHtml` function before rendering to prevent basic Cross-Site Scripting (XSS) vulnerabilities.
* **Empty States:** The UI gracefully handles empty arrays, displaying clear feedback when a search yields no results or if the ledger is entirely cleared.
* **Responsiveness:** The CSS utilizes media queries to stack the KPI cards, charts, and data tables vertically on tablet and mobile viewports, ensuring the UI remains highly usable on any device.

