const packageTabs = Array.from(document.querySelectorAll("[role='tab'][aria-controls]"));

const activatePackage = (selectedTab, shouldFocus = false) => {
  packageTabs.forEach((tab) => {
    const isSelected = tab === selectedTab;
    const panel = document.getElementById(tab.getAttribute("aria-controls"));

    tab.classList.toggle("is-active", isSelected);
    tab.setAttribute("aria-selected", String(isSelected));
    tab.tabIndex = isSelected ? 0 : -1;

    if (panel) {
      panel.hidden = !isSelected;
    }
  });

  if (shouldFocus) {
    selectedTab.focus();
  }
};

packageTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => activatePackage(tab));

  tab.addEventListener("keydown", (event) => {
    let nextIndex = index;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % packageTabs.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (index - 1 + packageTabs.length) % packageTabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = packageTabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    activatePackage(packageTabs[nextIndex], true);
  });
});

const copyText = async (text) => {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const temporaryField = document.createElement("textarea");
  temporaryField.value = text;
  temporaryField.setAttribute("readonly", "");
  temporaryField.style.position = "fixed";
  temporaryField.style.opacity = "0";
  document.body.appendChild(temporaryField);
  temporaryField.select();

  const copied = document.execCommand("copy");
  temporaryField.remove();

  if (!copied) {
    throw new Error("Copy command was not available.");
  }
};

document.querySelectorAll(".copy-button[data-copy-target]").forEach((button) => {
  button.setAttribute("aria-live", "polite");

  button.addEventListener("click", async () => {
    const target = document.getElementById(button.dataset.copyTarget);

    if (!target) {
      return;
    }

    const isEnglish = document.documentElement.lang.toLowerCase().startsWith("en");

    try {
      await copyText(target.textContent.trim());
      button.textContent = isEnglish ? "Copied!" : "Copiado!";
    } catch {
      button.textContent = isEnglish ? "Copy failed" : "Falha ao copiar";
    }

    window.setTimeout(() => {
      const language = document.documentElement.lang.toLowerCase().startsWith("en") ? "en" : "pt";
      button.textContent = button.dataset[language];
    }, 1800);
  });
});

const requestedPanel = packageTabs.find(
  (tab) => `#${tab.getAttribute("aria-controls")}` === window.location.hash
);

if (requestedPanel) {
  activatePackage(requestedPanel);
}
