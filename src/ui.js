import { INVENTORY_SIZE, ITEMS } from './inventory.js';
import { SKILLS, levelProgress } from './skills.js';

function element(tag, className, text = '') {
  const el = document.createElement(tag);
  el.className = className;
  el.textContent = text;
  return el;
}

export function createUI({ onDrop }) {
  const buttons = [...document.querySelectorAll('[data-panel]')];
  const panels = [...document.querySelectorAll('.panel')];

  function toggle(id) {
    for (const panel of panels) panel.hidden = panel.id === id ? !panel.hidden : true;
    for (const button of buttons) {
      button.setAttribute('aria-expanded', String(!document.getElementById(button.dataset.panel).hidden));
    }
  }
  for (const button of buttons) button.addEventListener('click', () => toggle(button.dataset.panel));

  const grid = document.querySelector('#inventory-grid');
  const countEl = document.querySelector('#inventory-count');
  const slots = Array.from({ length: INVENTORY_SIZE }, (_, index) => {
    const slot = element('button', 'slot');
    slot.type = 'button';
    slot.addEventListener('click', () => onDrop(index));
    grid.append(slot);
    return slot;
  });

  const skillList = document.querySelector('#skill-list');
  const skillRows = Object.entries(SKILLS).map(([skill, { name }]) => {
    const row = element('div', 'skill');
    const level = element('span', 'skill-level');
    const fill = element('div', 'skill-bar-fill');
    const bar = element('div', 'skill-bar');
    const xpText = element('span', 'skill-xp');
    bar.append(fill);
    row.append(element('span', 'skill-name', name), level, bar, xpText);
    skillList.append(row);
    return { skill, level, fill, xpText };
  });

  return {
    update(inventory, xp) {
      inventory.slots.forEach((item, i) => {
        slots[i].dataset.item = item ?? '';
        slots[i].disabled = !item;
        slots[i].setAttribute('aria-label', item ? `Drop ${ITEMS[item].name}` : 'Empty slot');
      });
      const used = inventory.slots.filter(Boolean).length;
      countEl.textContent = `${used}/${INVENTORY_SIZE}`;

      for (const row of skillRows) {
        const value = Math.floor(xp[row.skill]);
        const progress = levelProgress(value);
        row.level.textContent = progress.level;
        row.fill.style.width = `${Math.round(progress.fraction * 100)}%`;
        row.xpText.textContent = progress.nextLevelXp === null
          ? `${value.toLocaleString()} xp`
          : `${value.toLocaleString()} / ${progress.nextLevelXp.toLocaleString()} xp`;
      }
    },
  };
}
