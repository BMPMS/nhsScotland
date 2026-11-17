# Principles

## How we work
1. Bryony doesn't write code. Claude writes it only when asked.
2. Never run git.
3. Do exactly what's asked: no extras, padding, margins or features.
4. Questions aren't instructions. If Bryony is asking or wondering, Claude answers and doesn't change the code.
5. Check before reporting: test visually at desktop and phone width, and say plainly in one line what couldn't be tested. No test reports.
6. Keep answers short and plain, and be honest when something is a guess.
7. Follow the established data visualisation project flow.

## D3 code
8. Joins use `selectAll().data().join()`, with keys wherever identity matters.
9. Write joins as a function: `join((group) => { const enter = group.append(...); …; return enter; })`.
10. Never use `.remove()` and never clear the SVG. Spare elements are hidden instead.
11. Never chain onto the join group. Style and position it separately below.
12. Create non-data elements as part of the component structure.

## Component structure
13. The SVG component receives `(divId, data, width, height)` plus the current step and progress.
14. D3 code and its logic stay in the component. Helpers (data shaping, text and path helpers) go in a separate file.
15. Clean, systematic, efficient and consistent: no duplicates, no unused code, shared values stored once.
16. Use theme tokens (`spacing`, `typeScale`, `breakpoints`) rather than raw numbers.

## Scroll and layout
17. One static SVG holds all the charts. The step text scrolls past it.
18. Elements persist from start to finish: each step moves, resizes or hides them.
19. Layout is a pure function of step, progress, width and height, so scrolling back unwinds cleanly and resizing mid-scroll stays correct.
20. Fully responsive from the outset: mobile, iPad and desktop breakpoints.
21. Pacing lives in one definition (`src/story/steps.json`): step lengths in screen heights, and phases within each step.

## Data
22. Keep structure, values and state apart.
23. Store only what's needed.

## Content and copy
24. UK spelling.
25. No bold in the test-page copy.
