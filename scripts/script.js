const photos = document.querySelectorAll(".photo-carousel img");
let index = 0;

setInterval(() => {
  photos[index].classList.remove("active");
  index = (index + 1) % photos.length;
  photos[index].classList.add("active");
}, 6000);


const revealElements = document.querySelectorAll('.reveal');

function revealOnScroll() {
  revealElements.forEach(el => {
    const top = el.getBoundingClientRect().top;
    const triggerPoint = window.innerHeight - 80;

    if (top < triggerPoint) {
      el.classList.add('active');
    }
  });
}

window.addEventListener('scroll', revealOnScroll);
window.addEventListener('load', revealOnScroll);

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

lucide.createIcons();