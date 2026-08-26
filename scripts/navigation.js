document.documentElement.classList.add("js");

const navigationToggle = document.querySelector(".nav-toggle");
const primaryNavigation = document.querySelector(".nav");

if (navigationToggle && primaryNavigation) {
  const mobileBreakpoint = window.matchMedia("(max-width: 980px)");

  const updateNavigationLabel = () => {
    const isOpen = navigationToggle.getAttribute("aria-expanded") === "true";
    const isEnglish = document.documentElement.lang.toLowerCase().startsWith("en");

    navigationToggle.setAttribute(
      "aria-label",
      isEnglish
        ? `${isOpen ? "Close" : "Open"} navigation menu`
        : `${isOpen ? "Fechar" : "Abrir"} menu de navegação`
    );
  };

  const closeNavigation = () => {
    primaryNavigation.classList.remove("is-open");
    navigationToggle.setAttribute("aria-expanded", "false");
    updateNavigationLabel();
  };

  navigationToggle.addEventListener("click", () => {
    const willOpen = navigationToggle.getAttribute("aria-expanded") !== "true";
    primaryNavigation.classList.toggle("is-open", willOpen);
    navigationToggle.setAttribute("aria-expanded", String(willOpen));
    updateNavigationLabel();
  });

  primaryNavigation.addEventListener("click", (event) => {
    if (event.target.closest("a") && mobileBreakpoint.matches) {
      closeNavigation();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeNavigation();
      navigationToggle.focus();
    }
  });

  mobileBreakpoint.addEventListener("change", closeNavigation);

  new MutationObserver(updateNavigationLabel).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["lang"]
  });

  updateNavigationLabel();
}
