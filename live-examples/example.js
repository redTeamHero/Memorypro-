var sessionStarted = false;
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

function presentCurrentCard() {
  if (!domRefs.questionContent || !domRefs.answerContent) {
    return;
  }

  var newQuestion = ouicards.next();

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
  domRefs.questionContent.appendChild(newQuestion.question);

  domRefs.answerContent.innerHTML = '';
  domRefs.answerContent.appendChild(newQuestion.answer);

  Array.from(domRefs.answerContent.children).forEach(function(child) {
    child.style.display = 'none';
  });

  if (domRefs.answerSection) {
    domRefs.answerSection.classList.remove('revealed');
  }

  sessionStarted = true;
}

function revealAnswer() {
  if (!sessionStarted || !domRefs.answerSection || !domRefs.answerContent) {
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

  var total = ouicards.flashcards.length;
  var totalLabel = total === 1 ? 'card · tarjeta lista' : 'cards · tarjetas listas';
  domRefs.questionsCount.textContent = total + ' ' + totalLabel;

  var bucketSummary = 'A:' + ouicards.bucketA.length + ' · ' +
                      'B:' + ouicards.bucketB.length + ' · ' +
                      'C:' + ouicards.bucketC.length;
  domRefs.statDetails.textContent = bucketSummary;
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
