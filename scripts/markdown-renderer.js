(function () {
  "use strict";

  const SAFE_LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

  function getSafeLink(value) {
    try {
      const url = new URL(String(value || "").trim(), window.location.href);
      return SAFE_LINK_PROTOCOLS.has(url.protocol) ? url : null;
    } catch {
      return null;
    }
  }

  function appendInlineMarkdown(parent, source) {
    const text = String(source || "");
    let plainText = "";
    let index = 0;

    const flushText = () => {
      if (!plainText) return;
      parent.appendChild(document.createTextNode(plainText));
      plainText = "";
    };

    while (index < text.length) {
      if (text[index] === "`") {
        const closingIndex = text.indexOf("`", index + 1);

        if (closingIndex > index + 1) {
          flushText();
          const code = document.createElement("code");
          code.textContent = text.slice(index + 1, closingIndex);
          parent.appendChild(code);
          index = closingIndex + 1;
          continue;
        }
      }

      if (text[index] === "[") {
        const labelEnd = text.indexOf("](", index + 1);
        const urlEnd = labelEnd === -1 ? -1 : text.indexOf(")", labelEnd + 2);

        if (labelEnd > index + 1 && urlEnd > labelEnd + 2) {
          const url = getSafeLink(text.slice(labelEnd + 2, urlEnd));

          if (url) {
            flushText();
            const link = document.createElement("a");
            link.href = url.href;
            if (url.origin !== window.location.origin && url.protocol.startsWith("http")) {
              link.target = "_blank";
              link.rel = "noopener noreferrer";
            }
            appendInlineMarkdown(link, text.slice(index + 1, labelEnd));
            parent.appendChild(link);
            index = urlEnd + 1;
            continue;
          }
        }
      }

      if (text.startsWith("**", index)) {
        const closingIndex = text.indexOf("**", index + 2);

        if (closingIndex > index + 2) {
          flushText();
          const strong = document.createElement("strong");
          appendInlineMarkdown(strong, text.slice(index + 2, closingIndex));
          parent.appendChild(strong);
          index = closingIndex + 2;
          continue;
        }
      }

      plainText += text[index];
      index += 1;
    }

    flushText();
  }

  function isHorizontalRule(line) {
    return /^\s{0,3}(?:(?:-\s*){3,}|(?:\*\s*){3,}|(?:_\s*){3,})$/.test(line);
  }

  function render(markdown, target) {
    if (!target) {
      throw new Error("A render target is required.");
    }

    const lines = String(markdown || "").replace(/\r\n?/g, "\n").split("\n");
    const fragment = document.createDocumentFragment();
    let index = 0;

    while (index < lines.length) {
      const line = lines[index];

      if (!line.trim()) {
        index += 1;
        continue;
      }

      const headingMatch = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
      if (headingMatch) {
        const heading = document.createElement(`h${headingMatch[1].length}`);
        appendInlineMarkdown(heading, headingMatch[2]);
        fragment.appendChild(heading);
        index += 1;
        continue;
      }

      if (isHorizontalRule(line)) {
        fragment.appendChild(document.createElement("hr"));
        index += 1;
        continue;
      }

      if (/^\s{0,3}>/.test(line)) {
        const quote = document.createElement("blockquote");
        const paragraph = document.createElement("p");
        const quoteLines = [];

        while (index < lines.length && /^\s{0,3}>/.test(lines[index])) {
          quoteLines.push(lines[index].replace(/^\s{0,3}>\s?/, ""));
          index += 1;
        }

        appendInlineMarkdown(paragraph, quoteLines.join(" "));
        quote.appendChild(paragraph);
        fragment.appendChild(quote);
        continue;
      }

      const listMatch = line.match(/^\s{0,3}([-+*]|\d+[.)])\s+(.+)$/);
      if (listMatch) {
        const isOrdered = /^\d/.test(listMatch[1]);
        const list = document.createElement(isOrdered ? "ol" : "ul");

        while (index < lines.length) {
          const itemMatch = lines[index].match(/^\s{0,3}([-+*]|\d+[.)])\s+(.+)$/);
          if (!itemMatch || /^\d/.test(itemMatch[1]) !== isOrdered) break;

          const item = document.createElement("li");
          appendInlineMarkdown(item, itemMatch[2]);
          list.appendChild(item);
          index += 1;
        }

        fragment.appendChild(list);
        continue;
      }

      const paragraphLines = [];
      while (
        index < lines.length &&
        lines[index].trim() &&
        !/^\s{0,3}(#{1,6})\s+/.test(lines[index]) &&
        !/^\s{0,3}>/.test(lines[index]) &&
        !/^\s{0,3}([-+*]|\d+[.)])\s+/.test(lines[index]) &&
        !isHorizontalRule(lines[index])
      ) {
        paragraphLines.push(lines[index].trim());
        index += 1;
      }

      const paragraph = document.createElement("p");
      appendInlineMarkdown(paragraph, paragraphLines.join(" "));
      fragment.appendChild(paragraph);
    }

    target.replaceChildren(fragment);
  }

  window.portfolioMarkdown = { render };
})();
