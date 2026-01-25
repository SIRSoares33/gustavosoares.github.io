const items = document.querySelectorAll('.timeline-item');
let maxProgress = 0;

items.forEach((item, index) => {
  const dot = item.querySelector('.timeline-dot');

  function activate() {
    dot.classList.add('completed');

    const progress = ((index + 1) / items.length) * 100;
    maxProgress = Math.max(maxProgress, progress);

    document.documentElement.style.setProperty('--timeline-progress', maxProgress + '%');
  }

  // Desktop hover
  item.addEventListener('mouseenter', activate);

  // Mobile tap
  item.addEventListener('click', activate);
});

let lang = "pt";

const button = document.getElementById("langBtn");
const elements = document.querySelectorAll("[data-pt][data-en]");

button.addEventListener("click", () => {
  lang = lang === "pt" ? "en" : "pt";

  elements.forEach(el => {
    el.textContent = el.dataset[lang];
  });

  button.textContent = lang === "pt" ? "EN" : "PT";
});
