(function () {
  "use strict";

  const API_URL = "https://nexus.gustavosoares.dev.br/ai";
  const CLIENT_ID = "e99bb38f-e686-470c-803d-300f937d864a";
  const MAX_MESSAGE_LENGTH = 100;
  const REQUEST_TIMEOUT = 45000;

  const initialMessages = [
    {
      id: "welcome",
      role: "assistant",
      content:
        "Olá! Sou Bag, assistente virtual do Gustavo. Ainda estou em desenvolvimento, logo estarei mais inteligente. Enquanto isso, aproveite o portfólio e veja os projetos que ele desenvolveu."
    }
  ];

  const suggestedQuestions = [
    "Conheça o Logos Server",
    "Quais tecnologias o Gustavo utiliza?",
    "Veja os projetos .NET",
    "O que é o projeto Janus?"
  ];

  const SAFE_LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

  function getSafeLinkUrl(value) {
    try {
      const url = new URL(String(value || "").trim(), window.location.href);
      return SAFE_LINK_PROTOCOLS.has(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  }

  function appendTextWithBreaks(parent, value) {
    String(value).split("\n").forEach((part, index) => {
      if (index > 0) parent.appendChild(document.createElement("br"));
      parent.appendChild(document.createTextNode(part));
    });
  }

  function appendInlineMarkdown(parent, source) {
    const text = String(source || "");
    let plainText = "";
    let index = 0;

    const flushPlainText = () => {
      if (!plainText) return;
      appendTextWithBreaks(parent, plainText);
      plainText = "";
    };

    const appendFormatted = (tagName, content) => {
      flushPlainText();
      const element = document.createElement(tagName);
      appendInlineMarkdown(element, content);
      parent.appendChild(element);
    };

    while (index < text.length) {
      if (text[index] === "\\" && index + 1 < text.length) {
        plainText += text[index + 1];
        index += 2;
        continue;
      }

      if (text[index] === "`") {
        const delimiterLength = text.slice(index).match(/^`+/)[0].length;
        const delimiter = "`".repeat(delimiterLength);
        const closingIndex = text.indexOf(delimiter, index + delimiterLength);

        if (closingIndex !== -1) {
          flushPlainText();
          const code = document.createElement("code");
          code.textContent = text.slice(index + delimiterLength, closingIndex).replace(/\n/g, " ");
          parent.appendChild(code);
          index = closingIndex + delimiterLength;
          continue;
        }
      }

      if (text[index] === "[") {
        const labelEnd = text.indexOf("](", index + 1);
        const urlEnd = labelEnd === -1 ? -1 : text.indexOf(")", labelEnd + 2);

        if (labelEnd !== -1 && urlEnd !== -1) {
          const label = text.slice(index + 1, labelEnd);
          const safeUrl = getSafeLinkUrl(text.slice(labelEnd + 2, urlEnd));

          if (label && safeUrl) {
            flushPlainText();
            const link = document.createElement("a");
            link.href = safeUrl;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            appendInlineMarkdown(link, label);
            parent.appendChild(link);
            index = urlEnd + 1;
            continue;
          }
        }
      }

      const formats = [
        { delimiter: "**", tagName: "strong" },
        { delimiter: "__", tagName: "strong" },
        { delimiter: "~~", tagName: "del" },
        { delimiter: "*", tagName: "em" },
        { delimiter: "_", tagName: "em" }
      ];
      const format = formats.find(({ delimiter }) => text.startsWith(delimiter, index));

      if (format) {
        const contentStart = index + format.delimiter.length;
        const closingIndex = text.indexOf(format.delimiter, contentStart);

        if (closingIndex > contentStart) {
          appendFormatted(format.tagName, text.slice(contentStart, closingIndex));
          index = closingIndex + format.delimiter.length;
          continue;
        }
      }

      plainText += text[index];
      index += 1;
    }

    flushPlainText();
  }

  function splitTableRow(line) {
    const value = String(line).trim().replace(/^\|/, "").replace(/\|$/, "");
    const cells = [];
    let cell = "";
    let isEscaped = false;
    let isCode = false;

    for (const character of value) {
      if (isEscaped) {
        cell += character;
        isEscaped = false;
      } else if (character === "\\") {
        isEscaped = true;
      } else if (character === "`") {
        isCode = !isCode;
        cell += character;
      } else if (character === "|" && !isCode) {
        cells.push(cell.trim());
        cell = "";
      } else {
        cell += character;
      }
    }

    cells.push(cell.trim());
    return cells;
  }

  function getTableAlignments(line) {
    const cells = splitTableRow(line);
    if (!cells.length || !cells.every((cell) => /^:?-{3,}:?$/.test(cell))) return null;

    return cells.map((cell) => {
      if (cell.startsWith(":") && cell.endsWith(":")) return "center";
      if (cell.endsWith(":")) return "right";
      return "left";
    });
  }

  function isHorizontalRule(line) {
    return /^\s{0,3}(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/.test(line);
  }

  function isBlockStart(lines, index) {
    const line = lines[index] || "";
    const nextLine = lines[index + 1] || "";

    return (
      /^\s{0,3}(`{3,}|~{3,})/.test(line) ||
      /^\s{0,3}#{1,6}\s+/.test(line) ||
      /^\s{0,3}>/.test(line) ||
      /^\s{0,3}(?:[-+*]|\d+[.)])\s+/.test(line) ||
      isHorizontalRule(line) ||
      (line.includes("|") && Boolean(getTableAlignments(nextLine)))
    );
  }

  function appendMarkdownBlocks(parent, markdown) {
    const lines = String(markdown || "").replace(/\r\n?/g, "\n").split("\n");
    let index = 0;

    while (index < lines.length) {
      const line = lines[index];

      if (!line.trim()) {
        index += 1;
        continue;
      }

      const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})\s*([^\s]*)\s*$/);
      if (fenceMatch) {
        const fenceCharacter = fenceMatch[1][0];
        const minimumFenceLength = fenceMatch[1].length;
        const codeLines = [];
        index += 1;

        while (
          index < lines.length &&
          !new RegExp(`^\\s{0,3}${fenceCharacter}{${minimumFenceLength},}\\s*$`).test(lines[index])
        ) {
          codeLines.push(lines[index]);
          index += 1;
        }

        if (index < lines.length) index += 1;

        const pre = document.createElement("pre");
        const code = document.createElement("code");
        const language = fenceMatch[2].replace(/[^a-z0-9_+#.-]/gi, "");
        if (language) code.dataset.language = language;
        code.textContent = codeLines.join("\n");
        pre.appendChild(code);
        parent.appendChild(pre);
        continue;
      }

      if (isHorizontalRule(line)) {
        parent.appendChild(document.createElement("hr"));
        index += 1;
        continue;
      }

      const headingMatch = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
      if (headingMatch) {
        const heading = document.createElement(`h${headingMatch[1].length}`);
        appendInlineMarkdown(heading, headingMatch[2]);
        parent.appendChild(heading);
        index += 1;
        continue;
      }

      if (/^\s{0,3}>/.test(line)) {
        const quoteLines = [];
        while (index < lines.length && /^\s{0,3}>/.test(lines[index])) {
          quoteLines.push(lines[index].replace(/^\s{0,3}>\s?/, ""));
          index += 1;
        }
        const blockquote = document.createElement("blockquote");
        appendMarkdownBlocks(blockquote, quoteLines.join("\n"));
        parent.appendChild(blockquote);
        continue;
      }

      const alignments = line.includes("|") ? getTableAlignments(lines[index + 1] || "") : null;
      if (alignments) {
        const headers = splitTableRow(line);
        const wrapper = document.createElement("div");
        wrapper.className = "ai-chat__table-wrap";
        wrapper.tabIndex = 0;
        wrapper.setAttribute("role", "region");
        wrapper.setAttribute("aria-label", "Tabela da resposta");

        const table = document.createElement("table");
        const head = document.createElement("thead");
        const headRow = document.createElement("tr");
        headers.forEach((header, cellIndex) => {
          const cell = document.createElement("th");
          cell.scope = "col";
          cell.className = `ai-chat__table-cell--${alignments[cellIndex] || "left"}`;
          appendInlineMarkdown(cell, header);
          headRow.appendChild(cell);
        });
        head.appendChild(headRow);
        table.appendChild(head);

        const body = document.createElement("tbody");
        index += 2;
        while (index < lines.length && lines[index].trim() && lines[index].includes("|")) {
          const row = document.createElement("tr");
          splitTableRow(lines[index]).forEach((value, cellIndex) => {
            const cell = document.createElement("td");
            cell.className = `ai-chat__table-cell--${alignments[cellIndex] || "left"}`;
            appendInlineMarkdown(cell, value);
            row.appendChild(cell);
          });
          body.appendChild(row);
          index += 1;
        }
        table.appendChild(body);
        wrapper.appendChild(table);
        parent.appendChild(wrapper);
        continue;
      }

      const listMatch = line.match(/^\s{0,3}((?:\d+[.)])|[-+*])\s+(.+)$/);
      if (listMatch) {
        const isOrdered = /^\d/.test(listMatch[1]);
        const list = document.createElement(isOrdered ? "ol" : "ul");
        if (isOrdered) list.start = Number.parseInt(listMatch[1], 10) || 1;

        while (index < lines.length) {
          const itemMatch = lines[index].match(/^\s{0,3}((?:\d+[.)])|[-+*])\s+(.+)$/);
          if (!itemMatch || /^\d/.test(itemMatch[1]) !== isOrdered) break;

          const item = document.createElement("li");
          appendInlineMarkdown(item, itemMatch[2]);
          list.appendChild(item);
          index += 1;
        }
        parent.appendChild(list);
        continue;
      }

      const paragraphLines = [line];
      index += 1;
      while (index < lines.length && lines[index].trim() && !isBlockStart(lines, index)) {
        paragraphLines.push(lines[index]);
        index += 1;
      }

      const paragraph = document.createElement("p");
      appendInlineMarkdown(paragraph, paragraphLines.join("\n"));
      parent.appendChild(paragraph);
    }
  }

  function renderMarkdownMessage(parent, content) {
    const markdown = document.createElement("div");
    markdown.className = "ai-chat__markdown";
    appendMarkdownBlocks(markdown, content);
    parent.appendChild(markdown);
  }

  class AiChatWidget {
    constructor(options = {}) {
      this.options = options;
      this.messages = Array.isArray(options.messages)
        ? [...options.messages]
        : [...initialMessages];
      this.isLoading = Boolean(options.isLoading);
      this.error = options.error || null;
      this.isOpen = false;
      this.messageSequence = 0;
      this.lastFailedContent = null;
      this.mount();
      this.bindEvents();
      this.renderMessages();
      this.renderFutureStates();
      this.refreshIcons();
    }

    mount() {
      this.root = document.createElement("section");
      this.root.className = "ai-chat";
      this.root.setAttribute("aria-label", "Bag");
      this.root.innerHTML = `
        <button class="ai-chat__backdrop" type="button" tabindex="-1" aria-hidden="true"></button>

        <button
          class="ai-chat__launcher"
          type="button"
          aria-label="Abrir Bag"
          aria-expanded="false"
          aria-controls="portfolio-ai-chat"
        >
          <i data-lucide="message-circle" aria-hidden="true"></i>
          <span class="ai-chat__tooltip" role="tooltip">Conversar com a IA</span>
        </button>

        <section
          id="portfolio-ai-chat"
          class="ai-chat__panel"
          role="dialog"
          aria-labelledby="ai-chat-title"
          aria-hidden="true"
          inert
        >
          <header class="ai-chat__header">
            <span class="ai-chat__avatar" aria-hidden="true">
              <i data-lucide="sparkles"></i>
            </span>
            <div class="ai-chat__identity">
              <h2 id="ai-chat-title">Bag</h2>
              <p>Pergunte sobre minha experiência</p>
              <span class="ai-chat__status ai-chat__status--online">Online</span>
            </div>
            <div class="ai-chat__header-actions">
              <button class="ai-chat__icon-button ai-chat__clear" type="button" aria-label="Iniciar nova conversa" title="Nova conversa">
                <i data-lucide="rotate-ccw" aria-hidden="true"></i>
              </button>
              <button class="ai-chat__icon-button ai-chat__close" type="button" aria-label="Fechar assistente" title="Fechar assistente">
                <i data-lucide="x" aria-hidden="true"></i>
              </button>
            </div>
          </header>

          <div class="ai-chat__messages" role="log" aria-live="polite" aria-relevant="additions text">
            <ol class="ai-chat__message-list"></ol>
            <div class="ai-chat__suggestions" aria-label="Sugestões de perguntas"></div>
            <div class="ai-chat__future-states"></div>
          </div>

          <form class="ai-chat__composer" novalidate>
            <div class="ai-chat__composer-row">
              <label class="sr-only" for="ai-chat-message">Mensagem para o assistente</label>
              <textarea
                id="ai-chat-message"
                class="ai-chat__input"
                rows="1"
                maxlength="${MAX_MESSAGE_LENGTH}"
                autocapitalize="sentences"
                enterkeyhint="send"
                placeholder="Em desenvolvimento..."
                aria-label="Mensagem para o assistente"
                aria-describedby="ai-chat-hint"
              ></textarea>
              <button class="ai-chat__send" type="submit" aria-label="Enviar mensagem" disabled>
                <i data-lucide="send-horizontal" aria-hidden="true"></i>
              </button>
            </div>
            <p id="ai-chat-hint" class="ai-chat__composer-hint">
              <span>Enter para enviar · Shift + Enter para nova linha</span>
              <span class="ai-chat__character-count">0/${MAX_MESSAGE_LENGTH}</span>
            </p>
          </form>
        </section>
      `;

      document.body.appendChild(this.root);

      this.backdrop = this.root.querySelector(".ai-chat__backdrop");
      this.launcher = this.root.querySelector(".ai-chat__launcher");
      this.panel = this.root.querySelector(".ai-chat__panel");
      this.closeButton = this.root.querySelector(".ai-chat__close");
      this.clearButton = this.root.querySelector(".ai-chat__clear");
      this.status = this.root.querySelector(".ai-chat__status");
      this.messageArea = this.root.querySelector(".ai-chat__messages");
      this.messageList = this.root.querySelector(".ai-chat__message-list");
      this.suggestions = this.root.querySelector(".ai-chat__suggestions");
      this.futureStates = this.root.querySelector(".ai-chat__future-states");
      this.form = this.root.querySelector(".ai-chat__composer");
      this.input = this.root.querySelector(".ai-chat__input");
      this.sendButton = this.root.querySelector(".ai-chat__send");
      this.characterCount = this.root.querySelector(".ai-chat__character-count");
    }

    bindEvents() {
      this.launcher.addEventListener("click", () => this.open());
      this.closeButton.addEventListener("click", () => this.close());
      this.clearButton.addEventListener("click", () => this.clear());
      this.backdrop.addEventListener("click", () => {
        if (window.matchMedia("(max-width: 600px)").matches) {
          this.close();
        }
      });

      this.input.addEventListener("input", () => {
        this.resizeInput();
        this.updateCharacterCount();
        this.updateSendButton();
      });

      this.input.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
          event.preventDefault();
          this.submit();
        }
      });

      this.form.addEventListener("submit", (event) => {
        event.preventDefault();
        this.submit();
      });

      document.addEventListener("keydown", (event) => {
        if (!this.isOpen) return;

        if (event.key === "Escape") {
          event.preventDefault();
          this.close();
        } else if (event.key === "Tab") {
          this.trapFocus(event);
        }
      });
    }

    open() {
      if (this.isOpen) return;

      this.isOpen = true;
      this.root.classList.add("is-open");
      this.panel.removeAttribute("inert");
      this.panel.setAttribute("aria-hidden", "false");
      this.launcher.setAttribute("aria-expanded", "true");
      this.launcher.setAttribute("aria-label", "Assistente de inteligência artificial aberto");
      document.body.classList.add("ai-chat-open");

      this.focusInitialControl();
      this.scrollToLatest();
    }

    close() {
      if (!this.isOpen) return;

      this.isOpen = false;
      this.root.classList.remove("is-open");
      this.panel.setAttribute("inert", "");
      this.panel.setAttribute("aria-hidden", "true");
      this.launcher.setAttribute("aria-expanded", "false");
      this.launcher.setAttribute("aria-label", "Abrir assistente de inteligência artificial");
      document.body.classList.remove("ai-chat-open");
      this.launcher.focus({ preventScroll: true });
    }

    async submit() {
      const content = this.input.value.trim();

      if (!content || this.isLoading) return;

      if (content.length > MAX_MESSAGE_LENGTH) {
        this.setError(`A mensagem deve ter no máximo ${MAX_MESSAGE_LENGTH} caracteres.`);
        return;
      }

      this.addMessage({ role: "user", content });
      this.input.value = "";
      this.resizeInput();
      this.updateCharacterCount();
      this.updateSendButton();
      this.setError(null);

      if (typeof this.options.onSend === "function") {
        await this.options.onSend(content);
        return;
      }

      await this.requestAiResponse(content);
    }

    async requestAiResponse(content) {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
      this.lastFailedContent = null;
      this.setStatus("Respondendo…", "loading");
      this.setLoading(true);

      try {
        const response = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            ClientId: CLIENT_ID,
            Input: content
          }),
          signal: controller.signal
        });

        const responseText = (await response.text()).trim();

        if (!response.ok) {
          throw new Error(`A API respondeu com o status ${response.status}.`);
        }

        if (!responseText) {
          throw new Error("A API retornou uma resposta vazia.");
        }

        this.addMessage({ role: "assistant", content: responseText });
        this.lastFailedContent = null;
        this.setStatus("Online", "online");
      } catch (error) {
        const timedOut = error && error.name === "AbortError";
        this.lastFailedContent = content;
        this.setStatus("Indisponível", "error");
        this.setError(
          timedOut
            ? "A resposta demorou demais. Tente novamente."
            : "Não foi possível falar com a IA agora. Tente novamente em instantes."
        );
      } finally {
        window.clearTimeout(timeoutId);
        this.setLoading(false);
        this.focusInputOnDesktop();
      }
    }

    addMessage(message) {
      const wasNearLatest = this.isNearLatest();
      const safeMessage = {
        id: message.id || `local-${Date.now()}-${this.messageSequence++}`,
        role: ["assistant", "user", "system"].includes(message.role)
          ? message.role
          : "assistant",
        content: String(message.content || ""),
        createdAt: message.createdAt
      };

      this.messages.push(safeMessage);
      this.appendMessage(safeMessage);
      this.syncSuggestionsVisibility();
      this.refreshIcons();
      if (safeMessage.role === "user" || wasNearLatest) this.scrollToLatest();
    }

    appendMessage(message) {
      const item = document.createElement("li");
      const isUser = message.role === "user";
      item.className = `ai-chat__message ai-chat__message--${isUser ? "user" : "assistant"}`;
      item.dataset.messageId = message.id;

      if (!isUser) {
        const avatar = document.createElement("span");
        avatar.className = "ai-chat__message-avatar";
        avatar.setAttribute("aria-hidden", "true");
        avatar.innerHTML = '<i data-lucide="sparkles"></i>';
        item.appendChild(avatar);
      }

      const bubble = document.createElement("div");
      bubble.className = "ai-chat__bubble";

      if (isUser) {
        const plainText = document.createElement("p");
        plainText.className = "ai-chat__plain-text";
        plainText.textContent = message.content;
        bubble.appendChild(plainText);
      } else {
        renderMarkdownMessage(bubble, message.content);
      }

      item.appendChild(bubble);
      this.messageList.appendChild(item);
    }

    renderMessages() {
      this.messageList.replaceChildren();
      this.messages.forEach((message) => this.appendMessage(message));
      this.renderSuggestions();
      this.refreshIcons();
    }

    renderSuggestions() {
      this.suggestions.replaceChildren();
      this.syncSuggestionsVisibility();

      const label = document.createElement("p");
      label.className = "ai-chat__suggestions-label";
      label.textContent = "Sugestões rápidas";
      this.suggestions.appendChild(label);

      suggestedQuestions.forEach((question) => {
        const button = document.createElement("button");
        button.className = "ai-chat__suggestion";
        button.type = "button";
        button.textContent = question;
        button.addEventListener("click", () => {
          this.suggestions
            .querySelectorAll(".ai-chat__suggestion")
            .forEach((suggestion) => suggestion.classList.remove("is-selected"));
          button.classList.add("is-selected");
          this.input.value = question;
          this.resizeInput();
          this.updateCharacterCount();
          this.updateSendButton();
          this.input.focus();
        });
        this.suggestions.appendChild(button);
      });
    }

    syncSuggestionsVisibility() {
      const hasUserMessage = this.messages.some((message) => message.role === "user");
      this.suggestions.hidden = hasUserMessage;
      this.root.classList.toggle("has-user-message", hasUserMessage);
    }

    renderFutureStates() {
      const wasNearLatest = this.isNearLatest();
      this.futureStates.replaceChildren();

      if (this.isLoading) {
        const loading = document.createElement("div");
        loading.className = "ai-chat__future-state";
        loading.setAttribute("role", "status");
        loading.innerHTML = `
          <span class="ai-chat__typing-dots" aria-hidden="true"><span></span><span></span><span></span></span>
          <span>Preparando resposta…</span>
        `;
        this.futureStates.appendChild(loading);
      }

      if (this.error) {
        const error = document.createElement("div");
        error.className = "ai-chat__error";
        error.setAttribute("role", "alert");

        const errorMessage = document.createElement("span");
        errorMessage.textContent = this.error;
        error.appendChild(errorMessage);

        if (this.lastFailedContent) {
          const retryButton = document.createElement("button");
          retryButton.className = "ai-chat__retry";
          retryButton.type = "button";
          retryButton.textContent = "Tentar novamente";
          retryButton.addEventListener("click", () => this.retryLastMessage());
          error.appendChild(retryButton);
        }

        this.futureStates.appendChild(error);
      }

      this.input.disabled = this.isLoading;
      this.clearButton.disabled = this.isLoading;
      this.updateSendButton();
      if (wasNearLatest) this.scrollToLatest();
    }

    setMessages(messages) {
      this.messages = Array.isArray(messages) ? [...messages] : [];
      this.renderMessages();
      this.scrollToLatest();
    }

    setLoading(isLoading) {
      this.isLoading = Boolean(isLoading);
      this.renderFutureStates();
    }

    setError(error) {
      this.error = error || null;
      this.renderFutureStates();
    }

    clear() {
      this.messages = [...initialMessages];
      this.error = null;
      this.isLoading = false;
      this.lastFailedContent = null;
      this.input.value = "";
      this.setStatus("Online", "online");
      this.renderMessages();
      this.renderFutureStates();
      this.resizeInput();
      this.updateCharacterCount();
      this.focusInputOnDesktop();
      this.scrollToLatest();
    }

    retryLastMessage() {
      if (!this.lastFailedContent || this.isLoading) return;

      const content = this.lastFailedContent;
      this.setError(null);
      this.requestAiResponse(content);
    }

    isDesktopInputMode() {
      return window.matchMedia("(min-width: 601px) and (pointer: fine)").matches;
    }

    focusInitialControl() {
      const target = this.isDesktopInputMode() ? this.input : this.closeButton;
      target.focus({ preventScroll: true });
    }

    focusInputOnDesktop() {
      if (this.isDesktopInputMode()) {
        this.input.focus({ preventScroll: true });
      }
    }

    trapFocus(event) {
      const focusableElements = Array.from(
        this.panel.querySelectorAll(
          'button:not([disabled]):not([hidden]), textarea:not([disabled]), [href]:not([hidden]), [tabindex]:not([tabindex="-1"]):not([hidden])'
        )
      ).filter((element) => element.getClientRects().length > 0);

      if (!focusableElements.length) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    isNearLatest() {
      const remainingScroll =
        this.messageArea.scrollHeight - this.messageArea.scrollTop - this.messageArea.clientHeight;
      return remainingScroll <= 96;
    }

    resizeInput() {
      this.input.style.height = "auto";
      this.input.style.height = `${Math.min(this.input.scrollHeight, 112)}px`;
    }

    updateSendButton() {
      const messageLength = this.input.value.trim().length;
      this.sendButton.disabled =
        this.isLoading || messageLength === 0 || messageLength > MAX_MESSAGE_LENGTH;
    }

    updateCharacterCount() {
      const length = this.input.value.length;
      this.characterCount.textContent = `${length}/${MAX_MESSAGE_LENGTH}`;
      this.characterCount.classList.toggle("is-near-limit", length >= 90);
    }

    setStatus(label, state) {
      this.status.textContent = label;
      this.status.className = `ai-chat__status ai-chat__status--${state}`;
    }

    scrollToLatest() {
      window.requestAnimationFrame(() => {
        this.messageArea.scrollTop = this.messageArea.scrollHeight;
      });
    }

    refreshIcons() {
      if (window.lucide) {
        window.lucide.createIcons();
      }
    }
  }

  window.AiChatWidget = AiChatWidget;

  const initialize = () => {
    if (!document.querySelector(".ai-chat")) {
      window.portfolioAiChat = new AiChatWidget();
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
