var sessionStarted = false;
var sessionActive = false;
var studyMode = 'flashcard';
var currentCardRecord = null;
var pendingAdvanceHandle = null;

var aiSearchState = {
  results: [],
  selectedBook: null,
  chapters: [],
  selectedChapter: null,
  generated: null,
  lastQuery: '',
};

var domRefs = {
  uploadLabel: null,
  questionsInput: null,
  loadButton: null,
  questionSection: null,
  answerSection: null,
  questionContent: null,
  answerContent: null,
  questionsCount: null,
  statDetails: null,
  controlsSection: null,
  correctButtons: null,
  wrongButtons: null,
  setSelect: null,
  createSetButton: null,
  renameSetButton: null,
  deleteSetButton: null,
  newSetNameInput: null,
  multipleChoiceSection: null,
  choiceOptions: null,
  choiceFeedback: null,
  modeButtons: null,
  jsonOutput: null,
  jsonStatus: null,
  copyJsonButton: null,
  saveSetButton: null,
  startSessionButton: null,
  stopSessionButton: null,
  manualCardSelect: null,
  manualQuestionInput: null,
  manualAnswerInput: null,
  addFlashcardButton: null,
  updateFlashcardButton: null,
  textbookQueryInput: null,
  textbookSearchButton: null,
  textbookSearchResults: null,
  textbookChapterList: null,
  textbookFlashcardPreview: null,
  textbookStatus: null,
};

document.addEventListener('DOMContentLoaded', function() {
  initializeApp().catch(function(error) {
    console.error('Failed to initialize Memorypro UI.', error);
  });
});

async function initializeApp() {
  cacheDom();
  initializeSets();
  await ensureDeckLoaded();
  initializeManualEditor();
  bindHandlers();
  handleTextbookQueryInput();
  updateModeUI();
  ouicards.getFromLS();
  refreshManualEditorOptions();
  updateFooter();
  presentCurrentCard();
  updateSessionControls();
}

function cacheDom() {
  domRefs.uploadLabel = document.querySelector('.upload-questions-label');
  domRefs.questionsInput = document.getElementById('questions-input-area');
  domRefs.loadButton = document.getElementById('load-questions');
  domRefs.questionSection = document.querySelector('.card-section.question');
  domRefs.answerSection = document.querySelector('.card-section.answer');
  domRefs.questionContent = domRefs.questionSection ? domRefs.questionSection.querySelector('.card-content') : null;
  domRefs.answerContent = domRefs.answerSection ? domRefs.answerSection.querySelector('.card-content') : null;
  domRefs.questionsCount = document.querySelector('.questions-count');
  domRefs.statDetails = document.getElementById('stat-details');
  domRefs.controlsSection = document.querySelector('.controls');
  domRefs.correctButtons = document.querySelectorAll('.control-button.correct');
  domRefs.wrongButtons = document.querySelectorAll('.control-button.wrong');
  domRefs.setSelect = document.getElementById('flashcard-set-select');
  domRefs.createSetButton = document.getElementById('create-set-button');
  domRefs.renameSetButton = document.getElementById('rename-set-button');
  domRefs.deleteSetButton = document.getElementById('delete-set-button');
  domRefs.newSetNameInput = document.getElementById('new-set-name-input');
  domRefs.multipleChoiceSection = document.querySelector('.multiple-choice-section');
  domRefs.choiceOptions = document.getElementById('choice-options');
  domRefs.choiceFeedback = document.getElementById('choice-feedback');
  domRefs.modeButtons = document.querySelectorAll('.mode-button');
  domRefs.jsonOutput = document.getElementById('json-output');
  domRefs.jsonStatus = document.getElementById('json-status');
  domRefs.copyJsonButton = document.getElementById('copy-json');
  domRefs.saveSetButton = document.getElementById('save-set-button');
  domRefs.startSessionButton = document.getElementById('start-session-button');
  domRefs.stopSessionButton = document.getElementById('stop-session-button');
  domRefs.manualCardSelect = document.getElementById('manual-card-select');
  domRefs.manualQuestionInput = document.getElementById('manual-question-input');
  domRefs.manualAnswerInput = document.getElementById('manual-answer-input');
  domRefs.addFlashcardButton = document.getElementById('add-flashcard-button');
  domRefs.updateFlashcardButton = document.getElementById('update-flashcard-button');
  domRefs.textbookQueryInput = document.getElementById('textbook-query-input');
  domRefs.textbookSearchButton = document.getElementById('search-textbook-button');
  domRefs.textbookSearchResults = document.getElementById('textbook-search-results');
  domRefs.textbookChapterList = document.getElementById('textbook-chapter-list');
  domRefs.textbookFlashcardPreview = document.getElementById('textbook-flashcard-preview');
  domRefs.textbookStatus = document.getElementById('textbook-search-status');
}

function initializeSets() {
  var snapshot = ouicards.getFromLS();
  var activeSetName = snapshot && typeof snapshot.activeSet === 'string' ? snapshot.activeSet : (ouicards.getActiveSet ? ouicards.getActiveSet() : '');
  populateSetOptions(snapshot && Array.isArray(snapshot.sets) ? snapshot.sets : null, activeSetName);

  if (domRefs.setSelect) {
    domRefs.setSelect.addEventListener('change', function(event) {
      switchToSet(event.target.value);
    });
  }

  if (domRefs.createSetButton) {
    attachActivate(domRefs.createSetButton, createNewSet);
  }

  if (domRefs.renameSetButton) {
    attachActivate(domRefs.renameSetButton, renameActiveSet);
  }

  if (domRefs.deleteSetButton) {
    attachActivate(domRefs.deleteSetButton, deleteActiveSet);
  }

  if (domRefs.newSetNameInput) {
    domRefs.newSetNameInput.addEventListener('keydown', function(event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        createNewSet();
      }
    });
  }
}

function initializeManualEditor() {
  if (domRefs.manualCardSelect) {
    domRefs.manualCardSelect.addEventListener('change', handleManualCardSelectionChange);
  }

  [domRefs.manualQuestionInput, domRefs.manualAnswerInput].forEach(function(input) {
    if (!input) {
      return;
    }

    input.addEventListener('input', updateManualEditorButtonState);
  });

  updateManualEditorButtonState();
}

function populateSetOptions(setList, activeSetName) {
  if (!domRefs.setSelect) {
    return;
  }

  var availableSets = Array.isArray(setList) ? setList.slice() : ouicards.listSets();

  if (!availableSets.length) {
    availableSets = [ouicards.getActiveSet ? ouicards.getActiveSet() : 'Default'];
  }

  availableSets = availableSets
    .filter(function(name) {
      return typeof name === 'string' && name.trim() !== '';
    })
    .map(function(name) {
      return name.trim();
    });

  availableSets.sort(function(a, b) {
    return a.localeCompare(b, undefined, { sensitivity: 'base' });
  });

  var resolvedActiveSet = typeof activeSetName === 'string' && activeSetName.trim() !== ''
    ? activeSetName.trim()
    : (ouicards.getActiveSet ? ouicards.getActiveSet() : availableSets[0]);

  if (availableSets.indexOf(resolvedActiveSet) === -1) {
    availableSets.push(resolvedActiveSet);
    availableSets.sort(function(a, b) {
      return a.localeCompare(b, undefined, { sensitivity: 'base' });
    });
  }

  domRefs.setSelect.innerHTML = '';

  availableSets.forEach(function(name) {
    var option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    domRefs.setSelect.appendChild(option);
  });

  domRefs.setSelect.value = resolvedActiveSet;

  if (domRefs.renameSetButton) {
    domRefs.renameSetButton.disabled = availableSets.length === 0;
  }

  if (domRefs.deleteSetButton) {
    domRefs.deleteSetButton.disabled = availableSets.length <= 1;
  }
}

function refreshManualEditorOptions(options) {
  if (!domRefs.manualCardSelect) {
    return;
  }

  var cards = Array.isArray(ouicards.flashcards) ? ouicards.flashcards : [];
  var previousSelection = domRefs.manualCardSelect.value || '';
  var selectIndex = options && typeof options.selectIndex !== 'undefined'
    ? String(options.selectIndex)
    : null;
  var preserveSelection = options && options.preserveSelection;
  var preserveFields = options && options.preserveFields;

  domRefs.manualCardSelect.innerHTML = '';

  var placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Select a card to edit · Selecciona una tarjeta';
  domRefs.manualCardSelect.appendChild(placeholder);

  cards.forEach(function(card, index) {
    var option = document.createElement('option');
    option.value = String(index);
    option.textContent = buildCardOptionLabel(card, index);
    domRefs.manualCardSelect.appendChild(option);
  });

  var targetValue = selectIndex !== null
    ? selectIndex
    : (preserveSelection ? previousSelection : '');

  if (targetValue && cards[Number(targetValue)]) {
    domRefs.manualCardSelect.value = String(targetValue);
    populateManualEditorFields(Number(targetValue));
  } else {
    domRefs.manualCardSelect.value = '';

    if (!preserveFields) {
      clearManualEditorFields();
    }
  }

  updateManualEditorButtonState();
}

function handleManualCardSelectionChange(event) {
  var value = event && event.target ? event.target.value : '';

  if (value === '') {
    clearManualEditorFields();
  } else {
    var index = parseInt(value, 10);

    if (!isNaN(index)) {
      populateManualEditorFields(index);
    }
  }

  updateManualEditorButtonState();
}

function populateManualEditorFields(index) {
  if (!domRefs.manualQuestionInput || !domRefs.manualAnswerInput) {
    return;
  }

  var cards = Array.isArray(ouicards.flashcards) ? ouicards.flashcards : [];
  var card = cards[index];

  if (!card) {
    clearManualEditorFields();
    return;
  }

  domRefs.manualQuestionInput.value = normalizeString(card.question).trim();
  domRefs.manualAnswerInput.value = normalizeString(card.answer).trim();
}

function clearManualEditorFields() {
  if (domRefs.manualQuestionInput) {
    domRefs.manualQuestionInput.value = '';
  }

  if (domRefs.manualAnswerInput) {
    domRefs.manualAnswerInput.value = '';
  }
}

function buildCardOptionLabel(card, index) {
  var question = normalizeString(card && card.question ? card.question : '').trim();

  if (!question) {
    question = 'Untitled card';
  }

  if (question.length > 60) {
    question = question.slice(0, 57) + '…';
  }

  return (index + 1) + '. ' + question;
}

function getTrimmedManualValue(element) {
  if (!element) {
    return '';
  }

  return normalizeString(element.value).trim();
}

function setButtonDisabled(button, disabled) {
  if (!button) {
    return;
  }

  var state = !!disabled;
  button.disabled = state;

  if (button.setAttribute) {
    button.setAttribute('aria-disabled', state ? 'true' : 'false');
  }
}

function updateManualEditorButtonState() {
  var question = getTrimmedManualValue(domRefs.manualQuestionInput);
  var answer = getTrimmedManualValue(domRefs.manualAnswerInput);
  var hasSelection = domRefs.manualCardSelect && domRefs.manualCardSelect.value !== '';

  setButtonDisabled(domRefs.addFlashcardButton, !(question && answer));
  setButtonDisabled(domRefs.updateFlashcardButton, !(hasSelection && question && answer));
}

function switchToSet(rawName) {
  var targetName = typeof rawName === 'string' ? rawName.trim() : '';

  if (!targetName) {
    return;
  }

  stopSession({ skipRender: true });
  var result = ouicards.useSet(targetName);
  populateSetOptions(result && Array.isArray(result.sets) ? result.sets : null, result && result.activeSet ? result.activeSet : targetName);
  sessionStarted = false;
  updateFooter();
  presentCurrentCard();
  updateSessionControls();
  refreshManualEditorOptions();
}

function getSelectedSetName() {
  if (domRefs.setSelect && typeof domRefs.setSelect.value === 'string' && domRefs.setSelect.value.trim() !== '') {
    return domRefs.setSelect.value.trim();
  }

  if (typeof ouicards.getActiveSet === 'function') {
    return normalizeString(ouicards.getActiveSet()).trim();
  }

  return '';
}

function createNewSet() {
  clearStatusMessage();

  var proposedName = domRefs.newSetNameInput && typeof domRefs.newSetNameInput.value === 'string'
    ? domRefs.newSetNameInput.value
    : '';

  if (!proposedName && typeof window !== 'undefined' && typeof window.prompt === 'function') {
    proposedName = window.prompt('Name your new flashcard set · Nombra tu nuevo conjunto de tarjetas') || '';
  }

  var trimmed = typeof proposedName === 'string' ? proposedName.trim() : '';

  if (trimmed === '') {
    if (domRefs.newSetNameInput) {
      domRefs.newSetNameInput.focus();
    }

    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert('Enter a name before creating a set. Ingresa un nombre antes de crear el conjunto.');
    }

    setStatusMessage('Enter a name before creating a set. Ingresa un nombre antes de crear el conjunto.', true);
    return;
  }

  var existingSets = ouicards.listSets();
  var duplicate = existingSets.find(function(name) {
    return typeof name === 'string' && name.toLowerCase() === trimmed.toLowerCase();
  });

  if (duplicate) {
    if (typeof window.alert === 'function') {
      window.alert('That set already exists. Switching to "' + duplicate + '". Ese conjunto ya existe. Cambiando a "' + duplicate + '".');
    }

    switchToSet(duplicate);
    if (domRefs.newSetNameInput) {
      domRefs.newSetNameInput.value = '';
    }
    setStatusMessage('Switched to existing set "' + duplicate + '". Conjunto existente seleccionado.', false);
    return;
  }

  stopSession({ skipRender: true });
  var result = ouicards.useSet(trimmed);
  populateSetOptions(result && Array.isArray(result.sets) ? result.sets : null, result && result.activeSet ? result.activeSet : trimmed);
  sessionStarted = false;
  updateFooter();
  presentCurrentCard();
  updateSessionControls();
  refreshManualEditorOptions();
  updateJsonPreview();

  if (domRefs.newSetNameInput) {
    domRefs.newSetNameInput.value = '';
    domRefs.newSetNameInput.focus();
  }

  setStatusMessage('Added set "' + trimmed + '". Conjunto agregado.', false);
}

function renameActiveSet() {
  clearStatusMessage();

  var currentName = getSelectedSetName();

  if (!currentName) {
    setStatusMessage('Select a set to rename. Selecciona un conjunto para renombrar.', true);
    return;
  }

  var promptMessage = 'Rename set "' + currentName + '" · Renombrar conjunto';
  var proposedName = '';

  if (typeof window !== 'undefined' && typeof window.prompt === 'function') {
    var promptResult = window.prompt(promptMessage, currentName);

    if (promptResult === null) {
      return;
    }

    proposedName = promptResult;
  } else if (domRefs.newSetNameInput && domRefs.newSetNameInput.value) {
    proposedName = domRefs.newSetNameInput.value;
  }

  var trimmed = normalizeString(proposedName).trim();

  if (!trimmed) {
    setStatusMessage('Enter a new name to rename the set. Ingresa un nuevo nombre.', true);

    if (domRefs.newSetNameInput) {
      domRefs.newSetNameInput.focus();
    }

    return;
  }

  if (trimmed === currentName) {
    setStatusMessage('Set name unchanged. Nombre sin cambios.', false);
    return;
  }

  if (typeof ouicards.renameSet !== 'function') {
    setStatusMessage('Renaming is unavailable right now. No se puede renombrar en este momento.', true);
    return;
  }

  var result = ouicards.renameSet(currentName, trimmed);

  if (!result || result.error) {
    var message = 'Unable to rename the set. No se pudo renombrar el conjunto.';

    if (result && result.error) {
      if (result.error === 'duplicate') {
        message = 'A set named "' + trimmed + '" already exists. Ese conjunto ya existe.';
      } else if (result.error === 'invalidName') {
        message = 'Enter a valid name to rename the set. Ingresa un nombre válido.';
      } else if (result.error === 'missing') {
        message = 'Unable to find the selected set. No se encontró el conjunto.';
      } else if (result.error === 'storageUnavailable') {
        message = 'Renaming requires local storage support. Se necesita almacenamiento local para renombrar.';
      }
    }

    setStatusMessage(message, true);
    return;
  }

  populateSetOptions(result && Array.isArray(result.sets) ? result.sets : null, result && result.activeSet ? result.activeSet : trimmed);
  refreshManualEditorOptions({ preserveSelection: true, preserveFields: true });
  updateFooter();
  presentCurrentCard();
  updateSessionControls();
  updateJsonPreview();

  setStatusMessage('Renamed set to "' + (result.activeSet || trimmed) + '". Conjunto renombrado.', false);
}

function deleteActiveSet() {
  clearStatusMessage();

  var currentName = getSelectedSetName();

  if (!currentName) {
    setStatusMessage('Select a set to remove. Selecciona un conjunto para eliminar.', true);
    return;
  }

  if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
    var confirmed = window.confirm('Remove set "' + currentName + '"? · ¿Eliminar el conjunto?');

    if (!confirmed) {
      return;
    }
  }

  if (typeof ouicards.deleteSet !== 'function') {
    setStatusMessage('Removing sets is unavailable right now. No se puede eliminar en este momento.', true);
    return;
  }

  var result = ouicards.deleteSet(currentName);

  if (!result || result.error) {
    var message = 'Unable to remove the set. No se pudo eliminar el conjunto.';

    if (result && result.error) {
      if (result.error === 'lastSet') {
        message = 'Keep at least one set. Mantén al menos un conjunto.';
      } else if (result.error === 'missing') {
        message = 'Unable to find the selected set. No se encontró el conjunto.';
      } else if (result.error === 'storageUnavailable') {
        message = 'Removing sets requires local storage support. Se necesita almacenamiento local para eliminar.';
      }
    }

    setStatusMessage(message, true);
    return;
  }

  stopSession({ skipRender: true });
  populateSetOptions(result && Array.isArray(result.sets) ? result.sets : null, result && result.activeSet ? result.activeSet : null);
  refreshManualEditorOptions();
  updateFooter();
  presentCurrentCard();
  updateSessionControls();
  updateJsonPreview();

  var removedName = result.removed || currentName;
  setStatusMessage('Removed set "' + removedName + '". Conjunto eliminado.', false);
}

async function ensureDeckLoaded() {
  if (hasStoredFlashcards()) {
    return;
  }

  if (typeof fetch !== 'function') {
    console.warn('Fetch API is unavailable in this browser. Using bundled sample deck.');
    ouicards.loadFromArray(myFlashcards);
    return;
  }

  try {
    var response = await fetch('/api/decks/default', { headers: { Accept: 'application/json' } });

    if (!response.ok) {
      throw new Error('Request failed with status ' + response.status);
    }

    var deck = await response.json();

    if (deck && Array.isArray(deck.flashcards) && deck.flashcards.length > 0) {
      var normalizedCards = deck.flashcards.map(function(card) {
        var normalized = {
          question: typeof card.question === 'string' ? card.question : String(card.question || ''),
          answer: typeof card.answer === 'string' ? card.answer : String(card.answer || ''),
        };

        if (Array.isArray(card.choices)) {
          normalized.choices = card.choices.slice();
        }

        return normalized;
      });

      ouicards.loadFromArray(normalizedCards);
      return;
    }

    console.warn('Default deck payload did not contain flashcards. Falling back to bundled sample.');
  } catch (error) {
    console.warn('Unable to load default deck from API. Using bundled sample deck instead.', error);
  }

  ouicards.loadFromArray(myFlashcards);
}

function hasStoredFlashcards() {
  try {
    return typeof ouicards.hasStoredFlashcards === 'function' && ouicards.hasStoredFlashcards();
  } catch (error) {
    console.warn('Unable to determine whether flashcards exist.', error);
    return false;
  }
}

function bindHandlers() {
  attachActivate(domRefs.uploadLabel, function() {
    hideElement(domRefs.uploadLabel);
    showElement(domRefs.questionsInput, 'block');
    showElement(domRefs.loadButton, 'inline-flex');

    if (domRefs.questionsInput) {
      domRefs.questionsInput.focus();
    }
  });

  attachActivate(domRefs.loadButton, function() {
    var data = ouicards.loadFromBrowser(domRefs.questionsInput, ',');

    if (!data) {
      setStatusMessage('Add at least one card before loading. Agrega al menos una tarjeta.', true);
      return;
    }

    stopSession({ skipRender: true });
    ouicards.getFromLS();
    updateFooter();
    presentCurrentCard();
    updateSessionControls();

    hideElement(domRefs.questionsInput);
    hideElement(domRefs.loadButton);

    if (domRefs.questionsInput) {
      domRefs.questionsInput.value = '';
    }

    if (domRefs.uploadLabel) {
      domRefs.uploadLabel.textContent = 'Load another deck · Cargar otro mazo';
      showElement(domRefs.uploadLabel, 'inline-flex');
    }

    var activeSet = typeof ouicards.getActiveSet === 'function' ? ouicards.getActiveSet() : 'Default';
    setStatusMessage('Loaded cards into "' + (activeSet || 'Default') + '". Tarjetas cargadas.', false);
    refreshManualEditorOptions();
    updateManualEditorButtonState();
  });

  attachActivate(domRefs.correctButtons, function() {
    if (!sessionStarted) {
      presentCurrentCard();
      return;
    }

    ouicards.correct();
    updateFooter();
    presentCurrentCard();
  });

  attachActivate(domRefs.wrongButtons, function() {
    if (!sessionStarted) {
      presentCurrentCard();
      return;
    }

    ouicards.wrong();
    updateFooter();
    presentCurrentCard();
  });

  attachActivate([domRefs.questionSection, domRefs.answerSection], revealAnswer);

  attachActivate(domRefs.modeButtons, function(event) {
    var button = event && event.currentTarget ? event.currentTarget : null;
    var requestedMode = button && button.getAttribute('data-mode') === 'multiple-choice'
      ? 'multiple-choice'
      : 'flashcard';
    setStudyMode(requestedMode);
  });

  attachActivate(domRefs.copyJsonButton, function() {
    clearStatusMessage();
    copyJsonToClipboard();
  });

  attachActivate(domRefs.saveSetButton, handleSaveSet);
  attachActivate(domRefs.startSessionButton, function() {
    startSession();
  });
  attachActivate(domRefs.stopSessionButton, function() {
    stopSession();
  });
  attachActivate(domRefs.addFlashcardButton, handleAddFlashcard);
  attachActivate(domRefs.updateFlashcardButton, handleUpdateFlashcard);

  attachActivate(domRefs.textbookSearchButton, safelyPerformTextbookSearch);

  if (domRefs.textbookQueryInput) {
    domRefs.textbookQueryInput.addEventListener('keydown', function(event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        safelyPerformTextbookSearch();
      }
    });
  }

  if (domRefs.textbookSearchResults) {
    domRefs.textbookSearchResults.addEventListener('click', handleTextbookResultClick);
  }

  if (domRefs.textbookChapterList) {
    domRefs.textbookChapterList.addEventListener('click', handleChapterSelection);
  }

  if (domRefs.textbookFlashcardPreview) {
    domRefs.textbookFlashcardPreview.addEventListener('click', handleGeneratedFlashcardActions);
  }
}

function handleTextbookQueryInput() {
  if (!domRefs.textbookQueryInput) {
    return;
  }

  domRefs.textbookQueryInput.addEventListener('input', function() {
    var query = normalizeString(domRefs.textbookQueryInput.value || '').trim();

    if (query) {
      return;
    }

    aiSearchState.lastQuery = '';
    aiSearchState.results = [];
    aiSearchState.selectedBook = null;
    aiSearchState.chapters = [];
    aiSearchState.selectedChapter = null;
    aiSearchState.generated = null;

    setTextbookStatus('', null);
    renderTextbookResults([]);
    renderChapterList([]);
    renderGeneratedFlashcards(null);
  });
}

function safelyPerformTextbookSearch() {
  performTextbookSearch().catch(function(error) {
    console.error('Failed to search textbooks.', error);
    var message = 'Unable to search for textbooks right now. Try again shortly.';

    if (error && error.message) {
      message += ' ' + error.message;
    }

    setTextbookStatus(message, 'error');
  });
}

async function performTextbookSearch() {
  if (!domRefs.textbookQueryInput) {
    return;
  }

  var query = normalizeString(domRefs.textbookQueryInput.value || '').trim();

  if (!query) {
    setTextbookStatus('Enter a textbook title, author, or topic to search.', 'error');
    return;
  }

  aiSearchState.lastQuery = query;
  aiSearchState.results = [];
  aiSearchState.selectedBook = null;
  aiSearchState.chapters = [];
  aiSearchState.selectedChapter = null;
  aiSearchState.generated = null;

  setTextbookStatus('Searching for textbooks…', null);
  renderTextbookResults([]);
  renderChapterList([]);
  renderGeneratedFlashcards(null);

  var response = await fetch('/api/textbooks/search?' + new URLSearchParams({ q: query }));

  if (!response.ok) {
    throw new Error('Search request failed (' + response.status + ').');
  }

  var payload = await response.json();
  var results = Array.isArray(payload.results) ? payload.results : [];

  aiSearchState.results = results;
  renderTextbookResults(results);

  if (results.length) {
    setTextbookStatus('Select a book to explore its chapter outline.', 'success');
  } else {
    setTextbookStatus('No results found. Try another textbook title or subject.', 'error');
  }
}

function handleTextbookResultClick(event) {
  var trigger = event && event.target ? event.target.closest('[data-volume-id]') : null;

  if (!trigger) {
    return;
  }

  event.preventDefault();

  var volumeId = trigger.getAttribute('data-volume-id');

  if (!volumeId) {
    setTextbookStatus('Unable to read that selection. Please try again.', 'error');
    return;
  }

  var selected = aiSearchState.results.find(function(entry) {
    return entry && entry.id === volumeId;
  });

  if (!selected) {
    setTextbookStatus('Unable to load that textbook. Please search again.', 'error');
    return;
  }

  aiSearchState.selectedBook = selected;
  aiSearchState.chapters = [];
  aiSearchState.selectedChapter = null;
  aiSearchState.generated = null;

  renderTextbookResults(aiSearchState.results);
  renderChapterList([]);
  renderGeneratedFlashcards(null);

  setTextbookStatus('Building a chapter outline for “' + selected.title + '”…', null);

  requestTextbookChapters(selected).catch(function(error) {
    console.error('Failed to load chapters.', error);
    setTextbookStatus('Unable to build a chapter outline for this book.', 'error');
  });
}

async function requestTextbookChapters(book) {
  if (!book || !book.id) {
    return;
  }

  var bookId = String(book.id || '');

  if (bookId.charAt(0) === '/') {
    bookId = bookId.slice(1);
  }

  var response = await fetch('/api/textbooks/' + encodeURIComponent(bookId) + '/chapters');

  if (!response.ok) {
    throw new Error('Chapter request failed (' + response.status + ').');
  }

  var payload = await response.json();
  var chapters = Array.isArray(payload.chapters) ? payload.chapters : [];
  var bookDetails = payload.book && typeof payload.book === 'object' ? payload.book : {};

  aiSearchState.selectedBook = Object.assign({}, book, bookDetails, { id: book.id });
  aiSearchState.chapters = chapters;
  aiSearchState.selectedChapter = null;
  aiSearchState.generated = null;

  renderTextbookResults(aiSearchState.results);
  renderChapterList(chapters);
  renderGeneratedFlashcards(null);

  if (chapters.length) {
    setTextbookStatus('Choose a chapter to auto-generate flashcards.', 'success');
  } else {
    setTextbookStatus('No chapter outline was available. Try another textbook.', 'error');
  }
}

function handleChapterSelection(event) {
  var trigger = event && event.target ? event.target.closest('[data-chapter-index]') : null;

  if (!trigger) {
    return;
  }

  event.preventDefault();

  var chapterCard = trigger.closest('.ai-chapter-card');
  var chapterIndex = chapterCard ? chapterCard.getAttribute('data-chapter-index') : trigger.getAttribute('data-chapter-index');
  var chapterTitle = chapterCard ? chapterCard.getAttribute('data-chapter-title') : trigger.getAttribute('data-chapter-title');

  var chapter = aiSearchState.chapters.find(function(entry) {
    if (!entry) {
      return false;
    }

    var entryIndex = entry.index != null ? String(entry.index) : '';

    if (chapterIndex) {
      return entryIndex === chapterIndex;
    }

    if (chapterTitle) {
      return normalizeString(entry.title || '').trim() === normalizeString(chapterTitle || '').trim();
    }

    return false;
  });

  if (!chapter) {
    return;
  }

  aiSearchState.selectedChapter = chapter;
  aiSearchState.generated = null;

  renderChapterList(aiSearchState.chapters);
  renderGeneratedFlashcards(null);

  setTextbookStatus('Generating flashcards for “' + chapter.title + '”…', null);

  requestChapterFlashcards(chapter).catch(function(error) {
    console.error('Failed to generate flashcards.', error);
    setTextbookStatus('Unable to generate flashcards for that chapter.', 'error');
  });
}

async function requestChapterFlashcards(chapter) {
  if (!chapter || !aiSearchState.selectedBook) {
    return;
  }

  var payload = {
    bookTitle: aiSearchState.selectedBook.title,
    chapterTitle: chapter.title,
    chapterSummary: chapter.summary,
    chapterIndex: chapter.index,
  };

  var response = await fetch('/api/textbooks/flashcards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Flashcard request failed (' + response.status + ').');
  }

  var data = await response.json();
  var flashcards = Array.isArray(data.flashcards) ? data.flashcards : [];

  aiSearchState.generated = {
    book: aiSearchState.selectedBook,
    chapter: chapter,
    flashcards: flashcards,
  };

  renderGeneratedFlashcards({
    flashcards: flashcards,
    book: aiSearchState.selectedBook,
    chapter: chapter,
  });

  if (flashcards.length) {
    setTextbookStatus('Generated ' + flashcards.length + ' flashcards. Import them into your active set.', 'success');
  } else {
    setTextbookStatus('No flashcards were generated. Try another chapter.', 'error');
  }
}

function handleGeneratedFlashcardActions(event) {
  var trigger = event && event.target ? event.target.closest('[data-action]') : null;

  if (!trigger) {
    return;
  }

  event.preventDefault();

  var action = trigger.getAttribute('data-action');

  if (action === 'import-generated-flashcards') {
    importGeneratedFlashcards();
  }
}

function importGeneratedFlashcards() {
  if (!aiSearchState.generated || !Array.isArray(aiSearchState.generated.flashcards)) {
    setTextbookStatus('Generate flashcards from a chapter before importing.', 'error');
    return;
  }

  var flashcards = aiSearchState.generated.flashcards;
  var addedCount = 0;

  flashcards.forEach(function(card) {
    var added = addCardToDeck(card);

    if (added) {
      addedCount += 1;
    }
  });

  if (!addedCount) {
    setTextbookStatus('No new flashcards were added to the set.', 'error');
    return;
  }

  refreshManualEditorOptions({ preserveSelection: false });
  updateManualEditorButtonState();
  updateFooter();
  updateJsonPreview();
  updateSessionControls();
  presentCurrentCard(false);

  var activeSet = getActiveSetLabel();
  var chapterTitle = aiSearchState.generated.chapter ? aiSearchState.generated.chapter.title : 'the chapter';

  setTextbookStatus(
    'Added ' + addedCount + ' flashcards from “' + chapterTitle + '” into “' + activeSet + '”.',
    'success'
  );
}

function renderTextbookResults(results) {
  if (!domRefs.textbookSearchResults) {
    return;
  }

  domRefs.textbookSearchResults.innerHTML = '';

  if (!Array.isArray(results) || !results.length) {
    return;
  }

  results.forEach(function(result) {
    if (!result || !result.id) {
      return;
    }

    var card = document.createElement('div');
    card.className = 'ai-result-card';
    card.setAttribute('data-volume-id', result.id);

    if (aiSearchState.selectedBook && aiSearchState.selectedBook.id === result.id) {
      card.classList.add('selected');
    }

    var header = document.createElement('div');
    header.className = 'ai-result-header';

    var info = document.createElement('div');
    var title = document.createElement('p');
    title.className = 'ai-result-title';
    title.textContent = result.title;
    info.appendChild(title);

    var metaText = buildTextbookMeta(result);

    if (metaText) {
      var meta = document.createElement('p');
      meta.className = 'ai-result-meta';
      meta.textContent = metaText;
      info.appendChild(meta);
    }

    header.appendChild(info);

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary-button ai-select-button';
    button.setAttribute('data-volume-id', result.id);

    if (aiSearchState.selectedBook && aiSearchState.selectedBook.id === result.id) {
      button.textContent = 'Selected';
      button.setAttribute('aria-pressed', 'true');
    } else {
      button.textContent = 'Choose book';
      button.removeAttribute('aria-pressed');
    }

    header.appendChild(button);
    card.appendChild(header);

    var description = limitText(result.description || '', 220);

    if (description) {
      var paragraph = document.createElement('p');
      paragraph.className = 'ai-result-description';
      paragraph.textContent = description;
      card.appendChild(paragraph);
    }

    domRefs.textbookSearchResults.appendChild(card);
  });
}

function renderChapterList(chapters) {
  if (!domRefs.textbookChapterList) {
    return;
  }

  domRefs.textbookChapterList.innerHTML = '';

  if (!Array.isArray(chapters) || !chapters.length) {
    return;
  }

  chapters.forEach(function(chapter) {
    if (!chapter) {
      return;
    }

    var chapterIndex = chapter.index != null ? String(chapter.index) : '';
    var titleText = chapter.title || 'Untitled';

    var card = document.createElement('div');
    card.className = 'ai-chapter-card';
    card.setAttribute('data-chapter-index', chapterIndex);
    card.setAttribute('data-chapter-title', titleText);
    card.setAttribute('data-chapter-summary', chapter.summary || '');

    var isSelected = false;

    if (aiSearchState.selectedChapter) {
      var selectedIndex = aiSearchState.selectedChapter.index != null ? String(aiSearchState.selectedChapter.index) : '';
      var selectedTitle = normalizeString(aiSearchState.selectedChapter.title || '').trim();

      if (chapterIndex && selectedIndex === chapterIndex) {
        isSelected = true;
      } else if (!chapterIndex && !selectedIndex && selectedTitle) {
        isSelected = selectedTitle === normalizeString(titleText).trim();
      }
    }

    if (isSelected) {
      card.classList.add('active');
    }

    var header = document.createElement('div');
    header.className = 'ai-result-header';

    var info = document.createElement('div');
    var title = document.createElement('p');
    title.className = 'ai-result-title';
    var labelPrefix = chapter.index ? 'Chapter ' + chapter.index : 'Chapter';
    title.textContent = labelPrefix + ': ' + titleText;
    info.appendChild(title);
    header.appendChild(info);

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary-button ai-select-button';
    button.setAttribute('data-chapter-index', chapterIndex);
    button.setAttribute('data-chapter-title', titleText);

    if (isSelected) {
      button.textContent = 'Selected';
      button.setAttribute('aria-pressed', 'true');
    } else {
      button.textContent = 'Use chapter';
      button.removeAttribute('aria-pressed');
    }

    header.appendChild(button);
    card.appendChild(header);

    var summaryText = limitText(chapter.summary || '', 260);

    if (summaryText) {
      var summary = document.createElement('p');
      summary.className = 'ai-chapter-summary';
      summary.textContent = summaryText;
      card.appendChild(summary);
    }

    domRefs.textbookChapterList.appendChild(card);
  });
}

function renderGeneratedFlashcards(payload) {
  if (!domRefs.textbookFlashcardPreview) {
    return;
  }

  domRefs.textbookFlashcardPreview.innerHTML = '';

  var data = payload && typeof payload === 'object' ? payload : null;
  var flashcards = data && Array.isArray(data.flashcards) ? data.flashcards : [];

  if (!flashcards.length) {
    return;
  }

  var title = data && data.chapter ? data.chapter.title : 'Selected chapter';

  var header = document.createElement('div');
  header.className = 'ai-result-header';

  var label = document.createElement('p');
  label.className = 'ai-result-title';
  label.textContent = 'Flashcards for “' + title + '”';
  header.appendChild(label);
  domRefs.textbookFlashcardPreview.appendChild(header);

  var list = document.createElement('ol');
  list.className = 'ai-flashcards-list';

  flashcards.forEach(function(card) {
    if (!card) {
      return;
    }

    var item = document.createElement('li');
    var question = document.createElement('strong');
    question.textContent = card.question;
    item.appendChild(question);

    if (card.answer) {
      var answer = document.createElement('span');
      answer.textContent = ' — ' + card.answer;
      item.appendChild(answer);
    }

    list.appendChild(item);
  });

  domRefs.textbookFlashcardPreview.appendChild(list);

  var actions = document.createElement('div');
  actions.className = 'ai-flashcards-actions';

  var importButton = document.createElement('button');
  importButton.type = 'button';
  importButton.className = 'primary-button';
  importButton.setAttribute('data-action', 'import-generated-flashcards');
  importButton.textContent = 'Add ' + flashcards.length + ' cards to active set';
  actions.appendChild(importButton);

  domRefs.textbookFlashcardPreview.appendChild(actions);
}

function setTextbookStatus(message, variant) {
  if (!domRefs.textbookStatus) {
    return;
  }

  domRefs.textbookStatus.textContent = message || '';
  domRefs.textbookStatus.classList.remove('status-error', 'status-success');

  if (variant === 'error') {
    domRefs.textbookStatus.classList.add('status-error');
  } else if (variant === 'success') {
    domRefs.textbookStatus.classList.add('status-success');
  }
}

function buildTextbookMeta(result) {
  if (!result) {
    return '';
  }

  var parts = [];

  if (Array.isArray(result.authors) && result.authors.length) {
    parts.push(result.authors.join(', '));
  }

  if (result.publishedDate) {
    parts.push(result.publishedDate);
  }

  return parts.join(' · ');
}

function limitText(value, maxLength) {
  var text = normalizeString(value || '').trim();

  if (!text) {
    return '';
  }

  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, Math.max(0, maxLength - 1)).trim() + '…';
}

function handleAddFlashcard() {
  clearStatusMessage();

  var question = getTrimmedManualValue(domRefs.manualQuestionInput);
  var answer = getTrimmedManualValue(domRefs.manualAnswerInput);

  if (!question || !answer) {
    setStatusMessage('Enter both a question and an answer. Ingresa la pregunta y la respuesta.', true);
    updateManualEditorButtonState();
    return;
  }

  if (domRefs.manualQuestionInput) {
    domRefs.manualQuestionInput.value = question;
  }

  if (domRefs.manualAnswerInput) {
    domRefs.manualAnswerInput.value = answer;
  }

  var result = addCardToDeck({ question: question, answer: answer });

  if (!result) {
    setStatusMessage('Unable to add the flashcard. Check your inputs. No se pudo agregar la tarjeta.', true);
    updateManualEditorButtonState();
    return;
  }

  refreshManualEditorOptions({ preserveSelection: false });
  clearManualEditorFields();
  updateManualEditorButtonState();
  updateFooter();
  updateJsonPreview();
  updateSessionControls();
  presentCurrentCard(false);

  var activeSet = getActiveSetLabel();
  setStatusMessage('Added a flashcard to "' + activeSet + '". Tarjeta agregada.', false);
}

function handleUpdateFlashcard() {
  clearStatusMessage();

  if (!domRefs.manualCardSelect) {
    return;
  }

  var selectedValue = domRefs.manualCardSelect.value;

  if (!selectedValue) {
    setStatusMessage('Choose a flashcard to update. Elige una tarjeta para actualizar.', true);
    updateManualEditorButtonState();
    return;
  }

  var index = parseInt(selectedValue, 10);

  if (isNaN(index)) {
    setStatusMessage('Unable to identify the selected flashcard. No se pudo identificar la tarjeta.', true);
    updateManualEditorButtonState();
    return;
  }

  var question = getTrimmedManualValue(domRefs.manualQuestionInput);
  var answer = getTrimmedManualValue(domRefs.manualAnswerInput);

  if (!question || !answer) {
    setStatusMessage('Enter both a question and an answer. Ingresa la pregunta y la respuesta.', true);
    updateManualEditorButtonState();
    return;
  }

  if (domRefs.manualQuestionInput) {
    domRefs.manualQuestionInput.value = question;
  }

  if (domRefs.manualAnswerInput) {
    domRefs.manualAnswerInput.value = answer;
  }

  var updated = updateCardInDeck(index, { question: question, answer: answer });

  if (!updated) {
    setStatusMessage('Unable to update the flashcard. No se pudo actualizar la tarjeta.', true);
    updateManualEditorButtonState();
    return;
  }

  refreshManualEditorOptions({ selectIndex: index, preserveFields: true });
  updateManualEditorButtonState();
  updateFooter();
  updateJsonPreview();
  updateSessionControls();

  if (currentCardRecord && currentCardRecord.card === updated) {
    currentCardRecord.fragments = ouicards.buildQuestionHTML(updated);
  }

  presentCurrentCard(false);

  var activeSet = getActiveSetLabel();
  setStatusMessage('Updated ' + summarizeCardText(updated.question, 48) + ' in "' + activeSet + '". Tarjeta actualizada.', false);
}

function addCardToDeck(card) {
  if (typeof ouicards.addFlashcard === 'function') {
    return ouicards.addFlashcard(card);
  }

  var normalizedQuestion = normalizeString(card && card.question ? card.question : '').trim();
  var normalizedAnswer = normalizeString(card && card.answer ? card.answer : '').trim();

  if (!normalizedQuestion || !normalizedAnswer) {
    return null;
  }

  if (!Array.isArray(ouicards.flashcards)) {
    ouicards.flashcards = [];
  }

  if (!Array.isArray(ouicards.bucketA)) {
    ouicards.bucketA = [];
  }

  if (!Array.isArray(ouicards.bucketB)) {
    ouicards.bucketB = [];
  }

  if (!Array.isArray(ouicards.bucketC)) {
    ouicards.bucketC = [];
  }

  var newCard = {
    question: normalizedQuestion,
    answer: normalizedAnswer,
  };

  ouicards.flashcards.push(newCard);
  ouicards.bucketA.push(newCard);
  ouicards.currentBucket = ouicards.bucketA;

  if (typeof ouicards.counter !== 'number' || ouicards.counter < 1) {
    ouicards.counter = 1;
  }

  if (typeof ouicards.saveToLS === 'function') {
    ouicards.saveToLS();
  }

  return newCard;
}

function updateCardInDeck(index, updates) {
  if (typeof ouicards.updateFlashcard === 'function') {
    return ouicards.updateFlashcard(index, updates);
  }

  if (!Array.isArray(ouicards.flashcards) || index < 0 || index >= ouicards.flashcards.length) {
    return null;
  }

  var normalizedQuestion = normalizeString(updates && updates.question ? updates.question : '').trim();
  var normalizedAnswer = normalizeString(updates && updates.answer ? updates.answer : '').trim();

  if (!normalizedQuestion || !normalizedAnswer) {
    return null;
  }

  var target = ouicards.flashcards[index];

  if (!target || typeof target !== 'object') {
    return null;
  }

  target.question = normalizedQuestion;
  target.answer = normalizedAnswer;

  if (typeof ouicards.saveToLS === 'function') {
    ouicards.saveToLS();
  }

  return target;
}

function summarizeCardText(value, limit) {
  var text = normalizeString(value).trim();

  if (!text) {
    return '""';
  }

  var max = typeof limit === 'number' && limit > 3 ? limit : 48;

  if (text.length > max) {
    text = text.slice(0, max - 1) + '…';
  }

  return '"' + text + '"';
}

function getActiveSetLabel() {
  if (typeof ouicards.getActiveSet === 'function') {
    var name = ouicards.getActiveSet();
    return name || 'Default';
  }

  return 'Default';
}

function isInteractionDisabled(element) {
  if (!element) {
    return true;
  }

  if (typeof element.disabled !== 'undefined' && element.disabled) {
    return true;
  }

  if (element.getAttribute) {
    var ariaDisabled = element.getAttribute('aria-disabled');
    var dataDisabled = element.getAttribute('data-disabled');

    if (ariaDisabled === 'true' || dataDisabled === 'true') {
      return true;
    }
  }

  if (element.classList && element.classList.contains('is-disabled')) {
    return true;
  }

  return false;
}

function attachActivate(targets, handler) {
  if (!targets) {
    return;
  }

  var elements;

  if (Array.isArray(targets)) {
    elements = targets;
  } else if (typeof NodeList !== 'undefined' && targets instanceof NodeList) {
    elements = Array.from(targets);
  } else {
    elements = [targets];
  }

  elements.forEach(function(element) {
    if (!element) {
      return;
    }

    element.addEventListener('click', function(event) {
      if (event.target && event.target.closest && event.target.closest('a')) {
        return;
      }

      if (isInteractionDisabled(element)) {
        return;
      }

      event.preventDefault();
      handler(event);
    });

    element.addEventListener('keydown', function(event) {
      if (event.key === 'Enter' || event.key === ' ') {
        if (isInteractionDisabled(element)) {
          return;
        }

        event.preventDefault();
        handler(event);
      }
    });
  });
}

function hasActiveDeck() {
  return Array.isArray(ouicards.flashcards) && ouicards.flashcards.length > 0;
}

function updateSessionControls() {
  var deckReady = hasActiveDeck();

  if (domRefs.startSessionButton) {
    var startDisabled = !deckReady || sessionActive;
    domRefs.startSessionButton.disabled = startDisabled;
    domRefs.startSessionButton.setAttribute('aria-disabled', startDisabled ? 'true' : 'false');
  }

  if (domRefs.stopSessionButton) {
    var stopDisabled = !sessionActive;
    domRefs.stopSessionButton.disabled = stopDisabled;
    domRefs.stopSessionButton.setAttribute('aria-disabled', stopDisabled ? 'true' : 'false');
  }
}

function startSession() {
  if (sessionActive) {
    return;
  }

  if (!hasActiveDeck()) {
    setStatusMessage('Load cards before starting a session. Carga tarjetas antes de iniciar.', true);
    return;
  }

  clearStatusMessage();

  if (pendingAdvanceHandle && typeof window !== 'undefined' && typeof window.clearTimeout === 'function') {
    window.clearTimeout(pendingAdvanceHandle);
    pendingAdvanceHandle = null;
  }

  sessionActive = true;
  sessionStarted = false;
  updateSessionControls();
  presentCurrentCard(true);
}

function stopSession(options) {
  var config = {};

  if (options && typeof options === 'object' && !Array.isArray(options)) {
    if (!(typeof options.type === 'string' && typeof options.preventDefault === 'function')) {
      config = options;
    }
  }

  if (pendingAdvanceHandle && typeof window !== 'undefined' && typeof window.clearTimeout === 'function') {
    window.clearTimeout(pendingAdvanceHandle);
    pendingAdvanceHandle = null;
  }
  
  sessionActive = false;
  sessionStarted = false;
  currentCardRecord = null;

  setControlsDisabled(true);
  updateSessionControls();

  if (!config.skipRender) {
    presentCurrentCard(false);
  }
}

function setControlsDisabled(disabled) {
  if (domRefs.controlsSection) {
    domRefs.controlsSection.setAttribute('aria-disabled', disabled ? 'true' : 'false');
  }

  function toggle(element) {
    if (!element) {
      return;
    }

    if (typeof element.disabled !== 'undefined') {
      element.disabled = !!disabled;
    }

    if (element.classList) {
      element.classList.toggle('is-disabled', !!disabled);
    }

    if (element.setAttribute) {
      element.setAttribute('data-disabled', disabled ? 'true' : 'false');
      element.setAttribute('aria-disabled', disabled ? 'true' : 'false');

      if (element.tagName && element.tagName.toLowerCase() !== 'button') {
        element.setAttribute('tabindex', disabled ? '-1' : '0');
      }
    }
  }

  if (domRefs.correctButtons) {
    Array.from(domRefs.correctButtons).forEach(toggle);
  }

  if (domRefs.wrongButtons) {
    Array.from(domRefs.wrongButtons).forEach(toggle);
  }
}

function renderSessionInactiveState() {
  if (!domRefs.questionContent || !domRefs.answerContent) {
    return;
  }

  domRefs.questionContent.innerHTML = '';

  var primaryMessage = document.createElement('p');
  primaryMessage.textContent = 'Press "Start session" to begin studying this set.';

  var secondaryMessage = document.createElement('p');
  secondaryMessage.textContent = 'Presiona "Iniciar sesión" para comenzar con este conjunto.';

  domRefs.questionContent.appendChild(primaryMessage);
  domRefs.questionContent.appendChild(secondaryMessage);

  domRefs.answerContent.innerHTML = '';

  var answerMessage = document.createElement('p');
  answerMessage.textContent = 'Answers stay hidden until your session is running. Las respuestas permanecen ocultas hasta que la sesión esté activa.';
  domRefs.answerContent.appendChild(answerMessage);

  if (domRefs.answerSection) {
    domRefs.answerSection.classList.remove('revealed');
  }

  if (domRefs.choiceFeedback) {
    domRefs.choiceFeedback.textContent = '';
  }

  if (studyMode === 'multiple-choice') {
    if (domRefs.choiceOptions) {
      domRefs.choiceOptions.innerHTML = '';
      var waitingMessage = document.createElement('p');
      waitingMessage.textContent = 'Start the session to generate answer choices. Inicia la sesión para ver las opciones.';
      domRefs.choiceOptions.appendChild(waitingMessage);
    }

    if (domRefs.multipleChoiceSection) {
      showElement(domRefs.multipleChoiceSection, 'grid');
    }
  } else if (domRefs.multipleChoiceSection) {
    hideElement(domRefs.multipleChoiceSection);
  }

  setControlsDisabled(true);
}

function presentCurrentCard(advance) {
  if (!domRefs.questionContent || !domRefs.answerContent) {
    return;
  }

  if (pendingAdvanceHandle && typeof window !== 'undefined' && typeof window.clearTimeout === 'function') {
    window.clearTimeout(pendingAdvanceHandle);
    pendingAdvanceHandle = null;
  }

  if (typeof advance === 'undefined') {
    advance = true;
  }

  var deckAvailable = hasActiveDeck();

  if (!deckAvailable) {
    sessionStarted = false;
    sessionActive = false;
    currentCardRecord = null;
    renderEmptyState();
    updateFooter();
    updateJsonPreview();
    updateSessionControls();
    return;
  }

  if (!sessionActive) {
    sessionStarted = false;
    currentCardRecord = null;
    renderSessionInactiveState();
    updateFooter();
    updateJsonPreview();
    updateSessionControls();
    return;
  }

  var shouldAdvance = advance !== false || !currentCardRecord;

  if (shouldAdvance) {
    var fragments = ouicards.next();

    if (!fragments) {
      sessionStarted = false;
      currentCardRecord = null;
      renderEmptyState();
      updateFooter();
      updateJsonPreview();
      updateSessionControls();
      return;
    }

    var activeCard = ouicards.currentBucket && ouicards.currentBucket[0]
      ? ouicards.currentBucket[0]
      : null;

    currentCardRecord = {
      fragments: fragments,
      card: activeCard,
    };
  }

  var questionFragments = currentCardRecord && currentCardRecord.fragments;
  var activeRecord = currentCardRecord && currentCardRecord.card;

  if (!questionFragments) {
    sessionStarted = false;
    renderEmptyState();
    updateFooter();
    updateJsonPreview();
    updateSessionControls();
    return;
  }

  sessionStarted = true;

  if (studyMode === 'multiple-choice') {
    renderMultipleChoiceView(questionFragments, activeRecord);
  } else {
    renderFlashcardView(questionFragments);
  }

  updateFooter();
  updateJsonPreview();
  updateSessionControls();
}

function renderFlashcardView(questionFragments) {
  domRefs.questionContent.innerHTML = '';
  domRefs.questionContent.appendChild(questionFragments.question);

  domRefs.answerContent.innerHTML = '';
  domRefs.answerContent.appendChild(questionFragments.answer);

  Array.from(domRefs.answerContent.children).forEach(function(child) {
    child.style.display = 'none';
  });

  if (domRefs.answerSection) {
    domRefs.answerSection.classList.remove('revealed');
  }

  if (domRefs.choiceOptions) {
    domRefs.choiceOptions.innerHTML = '';
  }

  if (domRefs.choiceFeedback) {
    domRefs.choiceFeedback.textContent = '';
  }

  if (domRefs.multipleChoiceSection) {
    hideElement(domRefs.multipleChoiceSection);
  }

  setControlsDisabled(false);
}

function renderMultipleChoiceView(questionFragments, card) {
  if (!domRefs.questionContent || !domRefs.choiceOptions) {
    return;
  }

  domRefs.questionContent.innerHTML = '';

  if (questionFragments && questionFragments.question) {
    domRefs.questionContent.appendChild(questionFragments.question);
  }

  if (domRefs.answerContent) {
    domRefs.answerContent.innerHTML = '';
  }

  if (domRefs.answerSection) {
    domRefs.answerSection.classList.remove('revealed');
  }

  domRefs.choiceOptions.innerHTML = '';

  if (domRefs.choiceFeedback) {
    domRefs.choiceFeedback.textContent = '';
  }

  var options = buildMultipleChoiceOptions(card);

  if (!options.length) {
    var fallback = document.createElement('p');
    fallback.textContent = 'Add more cards to unlock multiple choice practice. Agrega más tarjetas para usar opción múltiple.';
    domRefs.choiceOptions.appendChild(fallback);
    if (domRefs.multipleChoiceSection) {
      showElement(domRefs.multipleChoiceSection, 'grid');
    }
    setControlsDisabled(true);
    return;
  }

  options.forEach(function(option) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'choice-button';
    button.textContent = option.text;
    button.setAttribute('data-correct', option.correct ? 'true' : 'false');
    button.addEventListener('click', handleChoiceSelection);
    domRefs.choiceOptions.appendChild(button);
  });

  if (domRefs.multipleChoiceSection) {
    showElement(domRefs.multipleChoiceSection, 'grid');
  }

  setControlsDisabled(false);
}

function renderEmptyState() {
  if (!domRefs.questionContent || !domRefs.answerContent) {
    return;
  }

  var activeSetName = typeof ouicards.getActiveSet === 'function' ? ouicards.getActiveSet() : '';

  domRefs.questionContent.innerHTML = '';

  var englishPrompt = document.createElement('p');
  englishPrompt.textContent = activeSetName
    ? 'Add flashcards to "' + activeSetName + '" to get started.'
    : 'Add flashcards to get started.';

  var spanishPrompt = document.createElement('p');
  spanishPrompt.textContent = activeSetName
    ? 'Agrega tarjetas a "' + activeSetName + '" para comenzar.'
    : 'Agrega tarjetas para comenzar.';

  domRefs.questionContent.appendChild(englishPrompt);
  domRefs.questionContent.appendChild(spanishPrompt);

  domRefs.answerContent.innerHTML = '';

  if (domRefs.answerSection) {
    domRefs.answerSection.classList.remove('revealed');
  }

  if (domRefs.choiceOptions) {
    domRefs.choiceOptions.innerHTML = '';
  }

  if (domRefs.choiceFeedback) {
    domRefs.choiceFeedback.textContent = '';
  }

  if (domRefs.multipleChoiceSection) {
    hideElement(domRefs.multipleChoiceSection);
  }

  sessionStarted = false;
  currentCardRecord = null;
  setControlsDisabled(true);
}

function buildMultipleChoiceOptions(card) {
  if (!card) {
    return [];
  }

  var explicitChoices = normalizeChoiceList(card.choices, card.answer);

  if (explicitChoices.length) {
    return shuffleArray(explicitChoices);
  }

  var allCards = Array.isArray(ouicards.flashcards) ? ouicards.flashcards : [];
  var correctAnswer = normalizeString(card.answer);
  var correctLower = correctAnswer.toLowerCase();

  var uniqueAnswers = [];

  allCards.forEach(function(item) {
    var answerText = normalizeString(item && item.answer);

    if (!answerText) {
      return;
    }

    var alreadyIncluded = uniqueAnswers.some(function(existing) {
      return existing.toLowerCase() === answerText.toLowerCase();
    });

    if (!alreadyIncluded) {
      uniqueAnswers.push(answerText);
    }
  });

  var distractors = uniqueAnswers.filter(function(answer) {
    return answer.toLowerCase() !== correctLower;
  });

  var fallbackPool = [
    'I am still learning this · Aún estoy aprendiendo esto',
    'Need another review · Necesito otro repaso',
    'Not sure yet · Aún no estoy seguro/a'
  ];

  var index = 0;
  while (distractors.length < 3 && index < fallbackPool.length) {
    var fallback = fallbackPool[index];

    if (!distractors.some(function(existing) {
      return existing.toLowerCase() === fallback.toLowerCase();
    })) {
      distractors.push(fallback);
    }

    index += 1;
  }

  distractors = shuffleArray(distractors).slice(0, Math.min(3, distractors.length));

  var options = distractors.map(function(text) {
    return { text: text, correct: false };
  });

  options.push({ text: correctAnswer, correct: true });

  return shuffleArray(options);
}

function normalizeString(value) {
  if (typeof value === 'string') {
    return value;
  }

  if (value === null || typeof value === 'undefined') {
    return '';
  }

  return String(value);
}

function normalizeChoiceOption(option) {
  if (typeof option === 'string') {
    var trimmed = option.trim();
    return trimmed ? { text: trimmed, correct: false } : null;
  }

  if (!option || typeof option !== 'object') {
    if (option === null || typeof option === 'undefined') {
      return null;
    }

    var coerced = String(option).trim();
    return coerced ? { text: coerced, correct: false } : null;
  }

  var text = '';

  if (typeof option.text === 'string') {
    text = option.text;
  } else if (typeof option.value === 'string') {
    text = option.value;
  } else if (typeof option.label === 'string') {
    text = option.label;
  } else if (option.text !== null && typeof option.text !== 'undefined') {
    text = String(option.text);
  }

  var trimmedText = typeof text === 'string' ? text.trim() : '';

  if (!trimmedText) {
    return null;
  }

  var correct = false;

  if (typeof option.correct === 'boolean') {
    correct = option.correct;
  } else if (typeof option.correct === 'string') {
    correct = option.correct.toLowerCase() === 'true';
  }

  return { text: trimmedText, correct: correct };
}

function normalizeChoiceList(choices, fallbackAnswer) {
  if (!Array.isArray(choices)) {
    return [];
  }

  var normalized = choices
    .map(function(choice) {
      return normalizeChoiceOption(choice);
    })
    .filter(function(choice) {
      return choice !== null;
    });

  if (!normalized.length) {
    return [];
  }

  var hasCorrect = normalized.some(function(choice) {
    return choice.correct;
  });

  if (!hasCorrect && fallbackAnswer) {
    var target = normalizeString(fallbackAnswer).toLowerCase();

    normalized.some(function(choice) {
      if (choice.text.toLowerCase() === target) {
        choice.correct = true;
        hasCorrect = true;
        return true;
      }

      return false;
    });
  }

  return hasCorrect ? normalized : [];
}

function shuffleArray(items) {
  var array = items.slice();

  for (var i = array.length - 1; i > 0; i -= 1) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }

  return array;
}

function handleChoiceSelection(event) {
  if (!domRefs.choiceOptions) {
    return;
  }

  if (!sessionActive) {
    return;
  }

  var button = event.currentTarget;

  if (!button || button.disabled) {
    return;
  }

  var isCorrect = button.getAttribute('data-correct') === 'true';
  var buttons = domRefs.choiceOptions.querySelectorAll('.choice-button');

  Array.from(buttons).forEach(function(choice) {
    choice.disabled = true;

    if (choice.getAttribute('data-correct') === 'true') {
      choice.classList.add('correct');
    } else if (choice === button) {
      choice.classList.add('incorrect');
    }
  });

  if (domRefs.choiceFeedback) {
    domRefs.choiceFeedback.textContent = isCorrect
      ? 'Correct! Keep going. ¡Correcto! Sigue adelante.'
      : 'Not quite. We will revisit this card. No exactamente. Volveremos a esta tarjeta.';
  }

  if (isCorrect) {
    ouicards.correct();
  } else {
    ouicards.wrong();
  }

  updateFooter();
  updateJsonPreview();

  if (typeof window !== 'undefined' && typeof window.setTimeout === 'function') {
    pendingAdvanceHandle = window.setTimeout(function() {
      sessionStarted = false;
      presentCurrentCard();
    }, isCorrect ? 800 : 1000);
  } else {
    sessionStarted = false;
    presentCurrentCard();
  }
}

function revealAnswer() {
  if (!sessionActive || !sessionStarted || studyMode !== 'flashcard' || !domRefs.answerSection || !domRefs.answerContent) {
    return;
  }

  domRefs.answerSection.classList.add('revealed');
  Array.from(domRefs.answerContent.children).forEach(function(child) {
    child.style.removeProperty('display');
    child.style.display = 'block';
  });
}

function updateFooter() {
  if (!domRefs.questionsCount || !domRefs.statDetails) {
    return;
  }

  var total = Array.isArray(ouicards.flashcards) ? ouicards.flashcards.length : 0;
  var totalLabel = total === 1 ? 'card · tarjeta lista' : 'cards · tarjetas listas';
  var activeSetName = typeof ouicards.getActiveSet === 'function' ? ouicards.getActiveSet() : 'Default';

  domRefs.questionsCount.textContent = (activeSetName ? '"' + activeSetName + '" · ' : '') + total + ' ' + totalLabel;

  var bucketSummary = 'Set: ' + (activeSetName || 'Default') + ' · ' +
                      'A:' + ouicards.bucketA.length + ' · ' +
                      'B:' + ouicards.bucketB.length + ' · ' +
                      'C:' + ouicards.bucketC.length;
  domRefs.statDetails.textContent = bucketSummary;
}

function updateJsonPreview() {
  if (!domRefs.jsonOutput) {
    return;
  }

  try {
    var snapshot = typeof ouicards.getActiveSetData === 'function'
      ? ouicards.getActiveSetData()
      : {
          name: typeof ouicards.getActiveSet === 'function' ? ouicards.getActiveSet() : 'Default',
          flashcards: Array.isArray(ouicards.flashcards) ? ouicards.flashcards : [],
        };

    if (!snapshot.flashcards || !snapshot.flashcards.length) {
      domRefs.jsonOutput.textContent = '// Add flashcards to see a JSON preview.\n// Agrega tarjetas para ver el JSON.';
      return;
    }

    var exportPayload = {
      set: snapshot.name,
      flashcards: snapshot.flashcards.map(function(card) {
        var entry = {
          question: normalizeString(card.question),
          answer: normalizeString(card.answer),
        };

        var normalizedChoices = normalizeChoiceList(card && card.choices, card && card.answer);

        if (normalizedChoices.length) {
          entry.choices = normalizedChoices.map(function(choice) {
            return {
              text: choice.text,
              correct: !!choice.correct,
            };
          });
        }

        return entry;
      }),
    };

    domRefs.jsonOutput.textContent = JSON.stringify(exportPayload, null, 2);
  } catch (error) {
    console.error('Failed to render JSON preview.', error);
    domRefs.jsonOutput.textContent = '// Unable to render flashcards as JSON. No se pudo mostrar el JSON.';
    setStatusMessage('Unable to render JSON preview. Check the console for details.', true);
  }
}

function setStatusMessage(message, isError) {
  if (!domRefs.jsonStatus) {
    return;
  }

  domRefs.jsonStatus.textContent = message || '';

  if (isError) {
    domRefs.jsonStatus.classList.add('json-status-error');
  } else {
    domRefs.jsonStatus.classList.remove('json-status-error');
  }
}

function clearStatusMessage() {
  setStatusMessage('', false);
}

function copyJsonToClipboard() {
  if (!domRefs.jsonOutput) {
    return;
  }

  var text = domRefs.jsonOutput.textContent || '';

  if (!text.trim()) {
    setStatusMessage('Nothing to copy yet. Add flashcards first. No hay nada que copiar.', true);
    return;
  }

  function handleSuccess() {
    var activeSet = typeof ouicards.getActiveSet === 'function' ? ouicards.getActiveSet() : 'Default';
    setStatusMessage('Copied JSON for "' + (activeSet || 'Default') + '". JSON copiado.', false);
  }

  function handleFailure(error) {
    console.warn('Unable to copy JSON automatically.', error);
    setStatusMessage('Unable to copy automatically. Select the JSON and copy manually. No se pudo copiar automáticamente.', true);
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    navigator.clipboard.writeText(text).then(handleSuccess).catch(handleFailure);
    return;
  }

  try {
    var selection = window.getSelection();
    var range = document.createRange();
    range.selectNodeContents(domRefs.jsonOutput);
    selection.removeAllRanges();
    selection.addRange(range);
    var succeeded = document.execCommand('copy');
    selection.removeAllRanges();

    if (succeeded) {
      handleSuccess();
    } else {
      handleFailure(new Error('execCommand returned false'));
    }
  } catch (error) {
    handleFailure(error);
  }
}

function handleSaveSet() {
  if (!ouicards || typeof ouicards.saveToLS !== 'function') {
    return;
  }

  ouicards.saveToLS();
  updateJsonPreview();

  var activeSet = typeof ouicards.getActiveSet === 'function' ? ouicards.getActiveSet() : 'Default';
  setStatusMessage('Saved progress to "' + (activeSet || 'Default') + '". Progreso guardado.', false);
}

function setStudyMode(mode, options) {
  var normalized = mode === 'multiple-choice' ? 'multiple-choice' : 'flashcard';

  if (studyMode === normalized && (!options || !options.force)) {
    if (!options || !options.skipRender) {
      updateModeUI();
    }
    return;
  }

  studyMode = normalized;
  updateModeUI();

  if (!options || !options.skipRender) {
    presentCurrentCard(false);
  }
}

function updateModeUI() {
  if (domRefs.modeButtons) {
    Array.from(domRefs.modeButtons).forEach(function(button) {
      var buttonMode = button.getAttribute('data-mode') === 'multiple-choice' ? 'multiple-choice' : 'flashcard';
      var isActive = buttonMode === studyMode;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  if (studyMode === 'flashcard') {
    if (domRefs.answerSection) {
      showElement(domRefs.answerSection, 'grid');
    }

    if (domRefs.controlsSection) {
      showElement(domRefs.controlsSection, 'flex');
    }

    if (domRefs.multipleChoiceSection) {
      hideElement(domRefs.multipleChoiceSection);
    }
  } else {
    if (domRefs.answerSection) {
      hideElement(domRefs.answerSection);
    }

    if (domRefs.controlsSection) {
      hideElement(domRefs.controlsSection);
    }

    if (domRefs.multipleChoiceSection) {
      if (Array.isArray(ouicards.flashcards) && ouicards.flashcards.length) {
        showElement(domRefs.multipleChoiceSection, 'grid');
      } else {
        hideElement(domRefs.multipleChoiceSection);
      }
    }
  }
}

function showElement(element, displayValue) {
  if (!element) {
    return;
  }

  element.style.display = displayValue || 'block';
}

function hideElement(element) {
  if (!element) {
    return;
  }

  element.style.display = 'none';
}

function focustimeout() {
  const btn = document.querySelector("#focus-button");
  const tone = document.querySelector("#focus-tone");

  if (!btn || !tone) return; // safety check

  btn.addEventListener("click", async () => {
    try {
      await tone.play();             // plays the focus tone
      console.log("Focus tone started!");
      
      // optional: add a 25-minute productivity timer sound after tone
      setTimeout(() => {
        alert("Session complete!");  // or play another tone here
      }, 25 * 60 * 1000);

    } catch (err) {
      console.error("Playback failed:", err);
    }
    

    
  });
}


// wait until DOM is ready
window.addEventListener("DOMContentLoaded", focustimeout);
