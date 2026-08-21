const NOW_DATA_URL = "data/now.json";

const PUBLIC_STATUS_LABELS = {
  "in-progress": { pt: "Em andamento", en: "In progress" },
  next: { pt: "Próximo passo", en: "Next step" },
  planning: { pt: "Em planejamento", en: "In planning" },
  definition: { pt: "Em definição", en: "In definition" },
  studying: { pt: "Em estudo", en: "Studying" },
  documenting: { pt: "Em documentação", en: "Documenting" },
  horizon: { pt: "No horizonte", en: "On the horizon" },
  completed: { pt: "Concluído", en: "Completed" },
  paused: { pt: "Pausado", en: "Paused" }
};

const ROADMAP_LABELS = {
  now: {
    title: { pt: "Agora", en: "Now" },
    description: { pt: "As próximas decisões e entregas em atenção direta.", en: "The next decisions and deliverables receiving direct attention." }
  },
  next: {
    title: { pt: "Em seguida", en: "Next" },
    description: { pt: "A sequência prevista depois dos marcos atuais.", en: "The planned sequence after the current milestones." }
  },
  horizon: {
    title: { pt: "No horizonte", en: "On the horizon" },
    description: { pt: "Direções futuras, ainda sem compromisso de data.", en: "Future directions, without committed dates." }
  }
};

const getCurrentLanguage = () => document.documentElement.lang.toLowerCase().startsWith("en") ? "en" : "pt";

const localize = (value) => {
  if (typeof value === "string") return value;
  return value?.[getCurrentLanguage()] || value?.pt || value?.en || "";
};

const setTranslatedText = (element, value) => {
  if (typeof value === "string") {
    element.textContent = value;
    return element;
  }

  element.dataset.pt = value?.pt || "";
  element.dataset.en = value?.en || value?.pt || "";
  element.textContent = localize(value);
  return element;
};

const createElement = (tag, className, content) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (content !== undefined) setTranslatedText(element, content);
  return element;
};

const formatPublicDate = (date, locale) => new Intl.DateTimeFormat(locale, {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "UTC"
}).format(new Date(`${date}T00:00:00Z`));

const createDate = (date, className = "") => {
  const time = createElement("time", className);
  time.dateTime = date;
  setTranslatedText(time, {
    pt: formatPublicDate(date, "pt-BR"),
    en: formatPublicDate(date, "en-US")
  });
  return time;
};

const createStatus = (status) => {
  const badge = createElement("span", `public-status status-${status}`, PUBLIC_STATUS_LABELS[status] || status);
  badge.dataset.status = status;
  return badge;
};

const createTagList = (items, className = "now-tags", tag = "div") => {
  const list = createElement(tag, className);
  items.forEach((item) => list.append(createElement("span", "", item)));
  return list;
};

const createTranslatedList = (items, className = "detail-list") => {
  const list = createElement("ul", className);
  items.forEach((item) => list.append(createElement("li", "", item)));
  return list;
};

const createDetailSection = (title, content) => {
  const section = createElement("section", "work-detail-section");
  section.append(createElement("h4", "", title), content);
  return section;
};

const getCurrentWork = (data, group = "focus") => data.workItems.filter((item) => item.group === group);

const getRoadmap = (data) => ["now", "next", "horizon"].map((horizon) => ({
  horizon,
  items: data.roadmap[horizon] || []
}));

const getRecentUpdates = (data) => [...data.recentUpdates].sort((left, right) => {
  if (!left.date) return 1;
  if (!right.date) return -1;
  return right.date.localeCompare(left.date);
});

const getActivitySummary = (data) => {
  const activeStatuses = new Set(["in-progress", "next", "planning", "definition", "studying", "documenting"]);
  const plannedStatuses = new Set(["next", "planning", "definition"]);

  return [
    {
      label: { pt: "Frentes em andamento", en: "Active initiatives" },
      value: data.workItems.filter((item) => item.horizon === "now" && activeStatuses.has(item.status)).length,
      note: { pt: "entre construção, definição e documentação", en: "across building, definition, and documentation" }
    },
    {
      label: { pt: "Próximas frentes planejadas", en: "Planned next initiatives" },
      value: data.workItems.filter((item) => plannedStatuses.has(item.status)).length,
      note: { pt: "sem apresentá-las como implementadas", en: "without presenting them as implemented" }
    },
    {
      label: { pt: "Marcos técnicos concluídos", en: "Completed technical milestones" },
      value: data.workItems.reduce((total, item) => total + item.milestones.filter((milestone) => milestone.completed).length, 0),
      note: { pt: "confirmados nos cards públicos", en: "confirmed in the public cards" }
    },
    {
      label: { pt: "Trilha de estudo atual", en: "Current study track" },
      value: data.studyTracks.length,
      note: { pt: "organizada sem prazo público artificial", en: "organized without an artificial public deadline" }
    }
  ];
};

const renderSnapshotDate = (data) => {
  const target = document.getElementById("snapshotDate");
  const formatted = createDate(data.snapshotDate);
  target.dateTime = formatted.dateTime;
  target.dataset.pt = formatted.dataset.pt;
  target.dataset.en = formatted.dataset.en;
  target.textContent = formatted.textContent;
};

const renderActivitySummary = (data) => {
  const container = document.getElementById("activitySummary");
  getActivitySummary(data).forEach((item) => {
    const card = createElement("article", "activity-card");
    card.append(
      createElement("strong", "activity-value", String(item.value)),
      createElement("span", "activity-label", item.label),
      createElement("small", "", item.note)
    );
    container.append(card);
  });
};

const renderMilestones = (milestones) => {
  const list = createElement("ul", "milestone-list");
  milestones.forEach((milestone) => {
    const item = createElement("li", milestone.completed ? "is-complete" : "is-planned");
    const state = createElement(
      "span",
      "milestone-state",
      milestone.completed ? { pt: "Concluído", en: "Completed" } : { pt: "Planejado", en: "Planned" }
    );
    item.append(state, createElement("span", "", milestone.title));
    list.append(item);
  });
  return list;
};

const renderWorkCard = (item) => {
  const card = createElement("details", "work-card");
  const summary = createElement("summary", "work-card-summary");
  const headingRow = createElement("span", "work-card-heading");
  const project = createElement("span", "work-project", item.project);
  headingRow.append(project, createStatus(item.status));

  const title = createElement("span", "work-card-title", item.publicTitle);
  title.setAttribute("role", "heading");
  title.setAttribute("aria-level", "3");
  const category = createElement("span", "work-category", item.category);
  const description = createElement("span", "work-summary", item.summary);
  const quickTags = createTagList(item.technologies.slice(0, 5), "now-tags", "span");
  const next = createElement("span", "work-next");
  next.append(
    createElement("span", "", { pt: "Próximo marco", en: "Next milestone" }),
    createElement("strong", "", item.nextMilestone)
  );
  const expandHint = createElement("span", "work-expand-hint", { pt: "Ver detalhes", en: "View details" });
  expandHint.setAttribute("aria-hidden", "true");

  summary.append(headingRow, title, category, description, quickTags, next, expandHint);
  card.append(summary);

  const details = createElement("div", "work-card-details");
  details.append(
    createDetailSection(
      { pt: "Problema técnico", en: "Technical problem" },
      createElement("p", "", item.problem)
    ),
    createDetailSection(
      { pt: "Momento atual", en: "Current stage" },
      createElement("p", "", item.currentMoment)
    )
  );

  if (item.milestones.length) {
    details.append(createDetailSection(
      { pt: "Marcos confirmados", en: "Confirmed milestones" },
      renderMilestones(item.milestones)
    ));
  }

  if (item.considerations?.length) {
    details.append(createDetailSection(
      { pt: "Decisões e pontos em estudo", en: "Decisions and points under study" },
      createTranslatedList(item.considerations)
    ));
  }

  details.append(createDetailSection(
    { pt: "Próximos passos", en: "Next steps" },
    createTranslatedList(item.nextSteps)
  ));

  const technologyTitle = item.technologiesAreCandidates
    ? { pt: "Tecnologias candidatas", en: "Candidate technologies" }
    : { pt: "Tecnologias relacionadas", en: "Related technologies" };
  details.append(createDetailSection(technologyTitle, createTagList(item.technologies)));

  if (item.related) {
    details.append(createDetailSection(
      { pt: "Relação com o ecossistema", en: "Ecosystem relationship" },
      createElement("p", "", item.related)
    ));
  }

  const footer = createElement("footer", "work-card-footer");
  const updated = createElement("p", "work-card-updated");
  updated.append(
    createElement("span", "", { pt: "Atualizado em", en: "Updated on" }),
    createDate(item.lastUpdated)
  );
  footer.append(updated);

  if (item.links?.length) {
    const links = createElement("div", "work-card-links");
    item.links.forEach((link) => {
      if (!link.url) return;
      const anchor = createElement("a", "work-link", link.label);
      anchor.href = link.url;
      anchor.append(createElement("span", "", "↗"));
      links.append(anchor);
    });
    if (links.children.length) footer.append(links);
  }

  details.append(footer);
  card.append(details);
  return card;
};

const renderWork = (data) => {
  const focus = document.getElementById("focusWork");
  getCurrentWork(data, "focus").forEach((item) => focus.append(renderWorkCard(item)));

  const evolving = document.getElementById("evolvingWork");
  getCurrentWork(data, "evolution").forEach((item) => evolving.append(renderWorkCard(item)));
};

const renderStudies = (data) => {
  const container = document.getElementById("studyTracks");
  data.studyTracks.forEach((track) => {
    const card = createElement("article", "study-card");
    const header = createElement("div", "study-card-heading");
    header.append(createElement("span", "work-project", track.title), createStatus(track.status));
    card.append(
      header,
      createElement("p", "work-category", track.category),
      createElement("p", "study-summary", track.summary),
      createElement("h3", "study-subtitle", { pt: "Tópicos da trilha", en: "Study topics" }),
      createTranslatedList(track.topics, "study-topics"),
      createElement("h3", "study-subtitle", { pt: "Contato prático já realizado", en: "Existing hands-on experience" }),
      createTagList(track.practicalExperience)
    );
    const note = createElement("p", "study-note", {
      pt: "Certificação ainda não obtida · sem prazo público de prova",
      en: "Certification not yet obtained · no public exam deadline"
    });
    card.append(note);
    container.append(card);
  });
};

const renderRecentMilestones = (data) => {
  const container = document.getElementById("recentMilestones");
  data.recentMilestones.forEach((milestone) => {
    const card = createElement("article", "recent-milestone-card");
    const header = createElement("div", "recent-milestone-heading");
    header.append(createElement("span", "work-project", milestone.project), createStatus(milestone.status));
    card.append(
      header,
      createElement("h3", "", milestone.title),
      createElement("p", "", milestone.description),
      createElement("small", "undated-note", milestone.date
        ? { pt: "Data pública registrada", en: "Public date recorded" }
        : { pt: "Marco confirmado · data pública não registrada", en: "Confirmed milestone · public date not recorded" })
    );
    container.append(card);
  });
};

const renderRoadmap = (data) => {
  const container = document.getElementById("publicRoadmap");
  getRoadmap(data).forEach(({ horizon, items }) => {
    const column = createElement("article", `roadmap-column roadmap-${horizon}`);
    const header = createElement("header", "roadmap-heading");
    header.append(
      createElement("span", "roadmap-marker", ""),
      createElement("h3", "", ROADMAP_LABELS[horizon].title),
      createElement("p", "", ROADMAP_LABELS[horizon].description)
    );
    const list = createElement("ol", "roadmap-list");
    items.forEach((item, index) => {
      const row = createElement("li", "");
      row.append(createElement("span", "", String(index + 1).padStart(2, "0")), createElement("p", "", item));
      list.append(row);
    });
    column.append(header, list);
    container.append(column);
  });
};

const renderRecentUpdates = (data) => {
  const container = document.getElementById("recentUpdates");
  getRecentUpdates(data).forEach((update) => {
    const item = createElement("article", "update-item");
    const marker = createElement("span", "update-marker", "");
    marker.setAttribute("aria-hidden", "true");
    const content = createElement("div", "update-content");
    const meta = createElement("div", "update-meta");
    if (update.date) meta.append(createDate(update.date));
    meta.append(createElement("span", "", update.project));
    content.append(meta, createElement("h3", "", update.title), createElement("p", "", update.description));
    if (update.url) {
      const link = createElement("a", "work-link", { pt: "Ver atualização", en: "View update" });
      link.href = update.url;
      content.append(link);
    }
    item.append(marker, content);
    container.append(item);
  });
};

const validatePublicData = (data) => {
  if (!data.snapshotDate || !Array.isArray(data.workItems) || !data.roadmap || !Array.isArray(data.recentUpdates)) {
    throw new Error("Invalid public snapshot structure.");
  }

  const knownStatuses = new Set(Object.keys(PUBLIC_STATUS_LABELS));
  const invalidItem = data.workItems.find((item) => !knownStatuses.has(item.status) || !item.id || !item.lastUpdated);
  if (invalidItem) throw new Error(`Invalid work item: ${invalidItem.id || "unknown"}`);
};

const renderNowPage = (data) => {
  validatePublicData(data);
  renderSnapshotDate(data);
  renderActivitySummary(data);
  renderWork(data);
  renderStudies(data);
  renderRecentMilestones(data);
  renderRoadmap(data);
  renderRecentUpdates(data);
  document.getElementById("contentState").hidden = true;
};

const loadNowData = async () => {
  const response = await fetch(NOW_DATA_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to load public snapshot: ${response.status}`);
  return response.json();
};

loadNowData()
  .then(renderNowPage)
  .catch((error) => {
    console.error("Agora page content could not be loaded.", error);
    const state = document.getElementById("contentState");
    state.hidden = false;
    setTranslatedText(state, {
      pt: "Não foi possível carregar o snapshot público. Tente atualizar a página.",
      en: "The public snapshot could not be loaded. Please refresh the page."
    });
  });
