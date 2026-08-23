(function () {
  "use strict";

  const API_URL = "https://logos.tail75da53.ts.net/ai";
  const CLIENT_ID = "e99bb38f-e686-470c-803d-300f937d864a";
  const MAX_MESSAGE_LENGTH = 100;
  const REQUEST_TIMEOUT = 45000;

  const initialMessages = [
    {
      id: "welcome",
      role: "assistant",
      content:
        "Olá! Sou o assistente virtual do Gustavo. Pergunte sobre seus projetos, experiências e tecnologias."
    }
  ];

  const suggestedQuestions = [
    "Conheça o Logos Server",
    "Quais tecnologias o Gustavo utiliza?",
    "Veja os projetos .NET",
    "O que é o projeto Janus?"
  ];

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
      this.mount();
      this.bindEvents();
      this.renderMessages();
      this.renderFutureStates();
      this.refreshIcons();
    }

    mount() {
      this.root = document.createElement("section");
      this.root.className = "ai-chat";
      this.root.setAttribute("aria-label", "Assistente de inteligência artificial");
      this.root.innerHTML = `
        <button class="ai-chat__backdrop" type="button" tabindex="-1" aria-hidden="true"></button>

        <button
          class="ai-chat__launcher"
          type="button"
          aria-label="Abrir assistente de inteligência artificial"
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
          aria-label="Assistente virtual do portfólio"
          aria-hidden="true"
          inert
        >
          <header class="ai-chat__header">
            <span class="ai-chat__avatar" aria-hidden="true">
              <i data-lucide="sparkles"></i>
            </span>
            <div class="ai-chat__identity">
              <h2>Assistente do Gustavo</h2>
              <p>Pergunte sobre minha experiência e meus projetos</p>
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
                placeholder="Pergunte sobre meus projetos..."
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
        const canSendWithEnter = window.matchMedia("(pointer: fine)").matches;

        if (event.key === "Enter" && !event.shiftKey && canSendWithEnter) {
          event.preventDefault();
          this.submit();
        }
      });

      this.form.addEventListener("submit", (event) => {
        event.preventDefault();
        this.submit();
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && this.isOpen) {
          event.preventDefault();
          this.close();
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

      this.input.focus({ preventScroll: true });
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
        this.setStatus("Online", "online");
      } catch (error) {
        const timedOut = error && error.name === "AbortError";
        this.setStatus("Indisponível", "error");
        this.setError(
          timedOut
            ? "A resposta demorou demais. Tente novamente."
            : "Não foi possível falar com a IA agora. Tente novamente em instantes."
        );
      } finally {
        window.clearTimeout(timeoutId);
        this.setLoading(false);
        this.input.focus({ preventScroll: true });
      }
    }

    addMessage(message) {
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
      this.suggestions.hidden = true;
      this.refreshIcons();
      this.scrollToLatest();
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

      const bubble = document.createElement("p");
      bubble.className = "ai-chat__bubble";
      bubble.textContent = message.content;
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
      this.suggestions.hidden = this.messages.some((message) => message.role === "user");

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

    renderFutureStates() {
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
        const error = document.createElement("p");
        error.className = "ai-chat__error";
        error.setAttribute("role", "alert");
        error.textContent = this.error;
        this.futureStates.appendChild(error);
      }

      this.input.disabled = this.isLoading;
      this.clearButton.disabled = this.isLoading;
      this.updateSendButton();
      this.scrollToLatest();
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
      this.input.value = "";
      this.setStatus("Online", "online");
      this.renderMessages();
      this.renderFutureStates();
      this.resizeInput();
      this.updateCharacterCount();
      this.input.focus({ preventScroll: true });
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
