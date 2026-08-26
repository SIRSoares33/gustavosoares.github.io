(function () {
  "use strict";

  const article = document.querySelector("[data-markdown-source]");
  const articleBody = document.getElementById("articleBody");

  if (!article || !articleBody || !window.portfolioMarkdown) return;

  async function loadArticle() {
    try {
      const response = await fetch(article.dataset.markdownSource);

      if (!response.ok) {
        throw new Error(`Unable to load article: ${response.status}`);
      }

      const markdown = await response.text();
      const markdownWithoutTitle = markdown.replace(/^\s*#\s+[^\n]+\n?/, "");
      window.portfolioMarkdown.render(markdownWithoutTitle, articleBody);
      articleBody.removeAttribute("aria-live");
    } catch {
      articleBody.replaceChildren();
      const errorMessage = document.createElement("p");
      errorMessage.className = "article-load-state";
      errorMessage.setAttribute("role", "alert");
      errorMessage.textContent = "Não foi possível carregar o artigo.";
      articleBody.appendChild(errorMessage);
    }
  }

  loadArticle();
})();
