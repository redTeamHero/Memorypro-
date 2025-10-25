var sessionStarted = false;
var studyMode = 'flashcard';
var currentCardRecord = null;
var pendingAdvanceHandle = null;

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
  bindHandlers();
  ouicards.getFromLS();
  updateFooter();
  presentCurrentCard();
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
}

function switchToSet(rawName) {
  var targetName = typeof rawName === 'string' ? rawName.trim() : '';

  if (!targetName) {
    return;
  }

  var result = ouicards.useSet(targetName);
  populateSetOptions(result && Array.isArray(result.sets) ? result.sets : null, result && result.activeSet ? result.activeSet : targetName);
  sessionStarted = false;
  updateFooter();
  presentCurrentCard();
}

function createNewSet() {
  if (typeof window === 'undefined' || typeof window.prompt !== 'function') {
    return;
  }

  var proposedName = window.prompt('Name your new flashcard set · Nombra tu nuevo conjunto de tarjetas');

  if (typeof proposedName !== 'string') {
    return;
  }

  var trimmed = proposedName.trim();

  if (trimmed === '') {
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
    return;
  }

  var result = ouicards.useSet(trimmed);
  populateSetOptions(result && Array.isArray(result.sets) ? result.sets : null, result && result.activeSet ? result.activeSet : trimmed);
  sessionStarted = false;
  updateFooter();
  presentCurrentCard();
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
        return {
          question: typeof card.question === 'string' ? card.question : String(card.question || ''),
          answer: typeof card.answer === 'string' ? card.answer : String(card.answer || ''),
        };
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

    ouicards.getFromLS();
    updateFooter();
    presentCurrentCard();

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

      event.preventDefault();
      handler(event);
    });

    element.addEventListener('keydown', function(event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handler(event);
      }
    });
  });
}

function presentCurrentCard(advance) {
  if (!domRefs.questionContent || !domRefs.answerContent) {
    return;
  }

  if (typeof advance === 'undefined') {
    advance = true;
  }

  if (!newQuestion) {
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
    sessionStarted = false;
    return;
  }

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
}

function buildMultipleChoiceOptions(card) {
  if (!card) {
    return [];
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
  if (!sessionStarted || studyMode !== 'flashcard' || !domRefs.answerSection || !domRefs.answerContent) {
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
        return {
          question: normalizeString(card.question),
          answer: normalizeString(card.answer),
        };
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
