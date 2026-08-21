const photos = document.querySelectorAll(".photo-carousel img");

if (photos.length > 1) {
  let currentPhoto = 0;

  window.setInterval(() => {
    photos[currentPhoto].classList.remove("active");
    currentPhoto = (currentPhoto + 1) % photos.length;
    photos[currentPhoto].classList.add("active");
  }, 6000);
}

const revealElements = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("active");
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -70px", threshold: 0.08 }
  );

  revealElements.forEach((element) => revealObserver.observe(element));
} else {
  revealElements.forEach((element) => element.classList.add("active"));
}

let language = "pt";
const languageButton = document.getElementById("langBtn");

languageButton.addEventListener("click", () => {
  language = language === "pt" ? "en" : "pt";

  document.querySelectorAll("[data-pt][data-en]").forEach((element) => {
    element.textContent = element.dataset[language];
  });

  const isPortuguese = language === "pt";
  document.documentElement.lang = isPortuguese ? "pt-BR" : "en";
  languageButton.textContent = isPortuguese ? "EN" : "PT";
  languageButton.setAttribute(
    "aria-label",
    isPortuguese ? "Mudar idioma para inglês" : "Switch language to Portuguese"
  );
});

if (window.lucide) {
  window.lucide.createIcons();
}
