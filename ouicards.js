;(function(exports) {
  var cachedStorage = null;
  var storageEvaluated = false;
  var STORAGE_KEY = 'ouicardsSets';
  var DEFAULT_SET_NAME = 'Default';

  function safeLocalStorage() {
    if (storageEvaluated) {
      return cachedStorage;
    }

    storageEvaluated = true;

    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }

    try {
      // Accessing localStorage can throw in some environments (privacy mode, etc.).
      var testKey = '__ouicards__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      cachedStorage = window.localStorage;
      return cachedStorage;
    } catch (error) {
      console.warn('LocalStorage is unavailable.', error);
      cachedStorage = null;
      return null;
    }
  }

  function getInputValue(selector) {
    if (typeof window !== 'undefined' && window.jQuery) {
      return window.jQuery(selector).val();
    }

    if (typeof document === 'undefined') {
      return '';
    }

    var element = typeof selector === 'string' ? document.querySelector(selector) : selector;

    if (!element) {
      console.warn('Could not find an input matching selector:', selector);
      return '';
    }

    return element.value || '';
  }

  function safeParseJSON(value, fallback) {
    if (typeof value !== 'string') {
      return fallback;
    }

    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn('Failed to parse stored JSON value.', error);
      return fallback;
    }
  }

  function emptySetState() {
    return { flashcards: [], bucketA: [], bucketB: [], bucketC: [] };
  }

  function sanitizeSetName(name) {
    if (typeof name !== 'string') {
      return DEFAULT_SET_NAME;
    }

    var trimmed = name.trim();
    return trimmed === '' ? DEFAULT_SET_NAME : trimmed;
  }

  function readStoragePayload(storage) {
    var payload = { activeSet: DEFAULT_SET_NAME, sets: {} };

    if (!storage) {
      return payload;
    }

    if (typeof storage[STORAGE_KEY] === 'string') {
      var parsed = safeParseJSON(storage[STORAGE_KEY], null);

      if (parsed && typeof parsed === 'object') {
        if (typeof parsed.activeSet === 'string' && parsed.activeSet.trim() !== '') {
          payload.activeSet = parsed.activeSet;
        }

        if (parsed.sets && typeof parsed.sets === 'object') {
          payload.sets = parsed.sets;
        }
      }
    }

    if (Object.keys(payload.sets).length === 0) {
      var legacyFlashcards = safeParseJSON(storage ? storage.flashcards : null, []);
      var legacyBucketA = safeParseJSON(storage ? storage.bucketA : null, []);
      var legacyBucketB = safeParseJSON(storage ? storage.bucketB : null, []);
      var legacyBucketC = safeParseJSON(storage ? storage.bucketC : null, []);

      if (legacyFlashcards.length || legacyBucketA.length || legacyBucketB.length || legacyBucketC.length) {
        payload.sets[DEFAULT_SET_NAME] = {
          flashcards: legacyFlashcards,
          bucketA: legacyBucketA,
          bucketB: legacyBucketB,
          bucketC: legacyBucketC,
        };

        payload.activeSet = DEFAULT_SET_NAME;
        storage[STORAGE_KEY] = JSON.stringify(payload);
        storage.flashcards = '[]';
        storage.bucketA = '[]';
        storage.bucketB = '[]';
        storage.bucketC = '[]';
      }
    }

    return payload;
  }

  function writeStoragePayload(storage, payload) {
    if (!storage) {
      return;
    }

    storage[STORAGE_KEY] = JSON.stringify(payload);
  }

  function ensureSet(payload, setName) {
    var sanitized = sanitizeSetName(setName);

    if (!payload.sets[sanitized]) {
      payload.sets[sanitized] = emptySetState();
    }

    return sanitized;
  }

  function loadSetIntoState(setState) {
    ouicards.flashcards = Array.isArray(setState.flashcards) ? setState.flashcards : [];
    ouicards.bucketA = Array.isArray(setState.bucketA) ? setState.bucketA : [];
    ouicards.bucketB = Array.isArray(setState.bucketB) ? setState.bucketB : [];
    ouicards.bucketC = Array.isArray(setState.bucketC) ? setState.bucketC : [];

    ouicards.currentBucket = ouicards.bucketA.length ? ouicards.bucketA :
                         ouicards.bucketB.length ? ouicards.bucketB :
                         ouicards.bucketC.length ? ouicards.bucketC : [];
    ouicards.counter = 1;
  }

  function getActiveSetName(payload) {
    if (ouicards.activeSet && ouicards.activeSet !== DEFAULT_SET_NAME) {
      return sanitizeSetName(ouicards.activeSet);
    }

    if (payload && typeof payload.activeSet === 'string' && payload.activeSet.trim() !== '') {
      return sanitizeSetName(payload.activeSet);
    }

    if (ouicards.activeSet) {
      return sanitizeSetName(ouicards.activeSet);
    }

    return DEFAULT_SET_NAME;
  }

  function normalizeCard(card) {
    if (!card || typeof card !== 'object') {
      return { question: '', answer: '', choices: [] };
    }

    var question = '';
    var answer = '';

    if (typeof card.question === 'string') {
      question = card.question;
    } else if (card.question !== null && typeof card.question !== 'undefined') {
      question = String(card.question);
    }

    if (typeof card.answer === 'string') {
      answer = card.answer;
    } else if (card.answer !== null && typeof card.answer !== 'undefined') {
      answer = String(card.answer);
    }

    var trimmedAnswer = answer.trim();
    var normalizedChoices = [];

    if (Array.isArray(card.choices)) {
      normalizedChoices = card.choices
        .map(function(option) {
          var text = '';
          var correct = false;

          if (option && typeof option === 'object') {
            if (typeof option.text === 'string') {
              text = option.text;
            } else if (typeof option.value === 'string') {
              text = option.value;
            } else if (typeof option.label === 'string') {
              text = option.label;
            } else if (option.text !== null && typeof option.text !== 'undefined') {
              text = String(option.text);
            }

            if (typeof option.correct === 'boolean') {
              correct = option.correct;
            } else if (typeof option.correct === 'string') {
              correct = option.correct.toLowerCase() === 'true';
            }
          } else if (typeof option === 'string') {
            text = option;
          } else if (option !== null && typeof option !== 'undefined') {
            text = String(option);
          }

          text = typeof text === 'string' ? text.trim() : '';

          if (!text) {
            return null;
          }

          return { text: text, correct: !!correct };
        })
        .filter(function(option) {
          return option !== null;
        });

      var hasCorrect = normalizedChoices.some(function(option) {
        return option.correct;
      });

      if (!hasCorrect && trimmedAnswer) {
        var answerLower = trimmedAnswer.toLowerCase();

        normalizedChoices.some(function(option) {
          if (option.text.toLowerCase() === answerLower) {
            option.correct = true;
            hasCorrect = true;
            return true;
          }

          return false;
        });
      }

      if (!hasCorrect) {
        normalizedChoices = [];
      }
    }

    return {
      question: question.trim(),
      answer: trimmedAnswer,
      choices: normalizedChoices,
    };
  }

  function loadFromArray(array) {
    if (!Array.isArray(array)) {
      ouicards.flashcards = [];
    } else {
      ouicards.flashcards = array.map(normalizeCard);
    }
    resetBuckets();
  }

  function addFlashcard(card) {
    var normalized = normalizeCard(card);

    if (!normalized.question || !normalized.answer) {
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

    ouicards.flashcards.push(normalized);
    ouicards.bucketA.push(normalized);

    if (!Array.isArray(ouicards.currentBucket) || !ouicards.currentBucket.length) {
      ouicards.currentBucket = ouicards.bucketA;
    }

    if (typeof ouicards.counter !== 'number' || ouicards.counter < 1) {
      ouicards.counter = 1;
    }

    saveToLS();
    return normalized;
  }

  function updateFlashcard(index, updates) {
    if (!Array.isArray(ouicards.flashcards)) {
      return null;
    }

    var numericIndex = typeof index === 'number' ? index : parseInt(index, 10);

    if (isNaN(numericIndex) || numericIndex < 0 || numericIndex >= ouicards.flashcards.length) {
      return null;
    }

    var normalized = normalizeCard(updates);

    if (!normalized.question || !normalized.answer) {
      return null;
    }

    var target = ouicards.flashcards[numericIndex];

    if (!target || typeof target !== 'object') {
      return null;
    }

    target.question = normalized.question;
    target.answer = normalized.answer;

    if (Object.prototype.hasOwnProperty.call(updates || {}, 'choices')) {
      target.choices = normalized.choices;
    }

    saveToLS();
    return target;
  }

  function loadFromBrowser(selector, delimiter) {
    var rawValue = getInputValue(selector);

    if (typeof rawValue !== 'string') {
      return;
    }

    var trimmedInput = rawValue.trim();

    if (trimmedInput === '') {
      console.log('There are no flashcards to upload.');
      return;
    }

    var parsedCards = null;

    if (trimmedInput.charAt(0) === '{' || trimmedInput.charAt(0) === '[') {
      var parsed = safeParseJSON(trimmedInput, null);

      if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed)) {
          parsedCards = parsed;
        } else if (Array.isArray(parsed.flashcards)) {
          parsedCards = parsed.flashcards;
        } else if (parsed && (Object.prototype.hasOwnProperty.call(parsed, 'question') || Object.prototype.hasOwnProperty.call(parsed, 'answer'))) {
          parsedCards = [parsed];
        }
      }

      if (parsedCards) {
        var normalizedCards = parsedCards
          .filter(function(card) {
            return card && typeof card === 'object';
          })
          .map(normalizeCard)
          .filter(function(card) {
            return card.question || card.answer;
          });

        if (normalizedCards.length) {
          ouicards.loadFromArray(normalizedCards);
          return getFromLS();
        }
      }
    }

    var userInput = rawValue
      .split(/\r?\n/)
      .map(function(card) {
        return card.trim();
      })
      .filter(function(card) {
        return card !== '';
      });

    if (userInput.length === 0) {
      console.log('There are no flashcards to upload.');
      return;
    }

    var flashcards = [];

    userInput.forEach(function(card) {
      var parsedCard = card.split(delimiter);

      if (parsedCard.length < 2) {
        return;
      }

      var question = parsedCard.shift();
      var answer = parsedCard.join(delimiter);

      flashcards.push({
        question: (question || '').trim(),
        answer: (answer || '').trim(),
      });
    });

    if (flashcards.length === 0) {
      console.log('There are no flashcards to upload.');
      return;
    }

    ouicards.flashcards = flashcards;
    resetBuckets();
    return getFromLS();
  }

  function next() {
    var newQuestion,
        bigInterval   = Math.ceil(ouicards.flashcards.length / 3) + 1,
        smallInterval = Math.ceil(ouicards.flashcards.length / 6) + 1;

    // Show an answer from bucket C once every bigInterval 
    // So long as Bucket C it's not empty
    if (ouicards.counter % bigInterval === 0 && ouicards.bucketC.length !== 0) {
      newQuestion = getQuestion(ouicards.bucketC);
      ouicards.currentBucket = ouicards.bucketC;

    // Show an answer from bucket B once every smallInterval
    // So long as Bucket B it's not empty
    } else if (ouicards.counter % smallInterval === 0 && ouicards.bucketB.length !== 0) {
      newQuestion = getQuestion(ouicards.bucketB);
      ouicards.currentBucket = ouicards.bucketB;

    // Show an answer from Bucket A, so long as it's not empty
    } else if (ouicards.bucketA.length !== 0) {
      newQuestion = getQuestion(ouicards.bucketA);
      ouicards.currentBucket = ouicards.bucketA;

    // Show an answer from Bucket B, so long as it's not empty
    } else if (ouicards.bucketB.length !== 0) {
      newQuestion = getQuestion(ouicards.bucketB);
      ouicards.currentBucket = ouicards.bucketB;

    // Show a question from Bucket C, so long as it's not empty
    } else if (ouicards.bucketC.length !== 0) {
      newQuestion = getQuestion(ouicards.bucketC);
      ouicards.currentBucket = ouicards.bucketC;
    } else {
      console.log('There was a serious problem with ouicards. You should never see ');
    }

    // Reset ouicards.counter if it's greater than flashcard count, otherwise ++ it
    ouicards.counter >= ouicards.flashcards.length ? ouicards.counter = 1 : ouicards.counter++;
    return newQuestion;
  }

  function correct() {
    if (ouicards.currentBucket === ouicards.bucketA) {
      moveQuestion(ouicards.bucketA, ouicards.bucketB);
    } else if (ouicards.currentBucket === ouicards.bucketB) {
      moveQuestion(ouicards.bucketB, ouicards.bucketC);
    } else if (ouicards.currentBucket === ouicards.bucketC) {
      moveQuestion(ouicards.bucketC, ouicards.bucketC);
    } else
      console.log('Hmm, you should not be here.');
    saveToLS();
  }

  function wrong() {
    moveQuestion(ouicards.currentBucket, ouicards.bucketA);
    saveToLS();
  }

  function moveQuestion(fromBucket, toBucket) {
    toBucket.push(fromBucket.shift());
  }

  function getQuestion(bucket) {
    // Prevent from looping thru an empty bucket
    if (!bucket || bucket.length === 0) {
      console.log("You can't load an empty set of questions.");
      return;
    }

    return buildQuestionHTML(bucket[0]);
  }

  function buildQuestionHTML(rawQuestion) {
    var questionEl, answerEl;

    questionEl = document.createElement('p');
    questionEl.innerHTML = rawQuestion.question;

    answerEl = document.createElement('p');
    answerEl.innerHTML = rawQuestion.answer.replace(/\n/g, '<br>');

    return {question: questionEl, answer: answerEl};
  }

  function saveToLS() {
    var storage = safeLocalStorage();

    if (!storage) {
      return;
    }

    var payload = readStoragePayload(storage);
    var activeSetName = ensureSet(payload, getActiveSetName(payload));

    payload.activeSet = activeSetName;
    ouicards.activeSet = activeSetName;
    payload.sets[activeSetName] = {
      flashcards: ouicards.flashcards,
      bucketA: ouicards.bucketA,
      bucketB: ouicards.bucketB,
      bucketC: ouicards.bucketC,
    };

    writeStoragePayload(storage, payload);
  }

  function getFromLS() {
    var storage = safeLocalStorage();

    if (!storage) {
      ouicards.activeSet = DEFAULT_SET_NAME;
      ouicards.flashcards    = [];
      ouicards.bucketA       = [];
      ouicards.bucketB       = [];
      ouicards.bucketC       = [];
      ouicards.currentBucket = [];
      ouicards.counter       = 1;
      return { flashcards: [], bucketA: [], bucketB: [], bucketC: [], activeSet: DEFAULT_SET_NAME, sets: [] };
    }

    var payload = readStoragePayload(storage);
    var activeSetName = ensureSet(payload, getActiveSetName(payload));
    payload.activeSet = activeSetName;
    ouicards.activeSet = activeSetName;

    writeStoragePayload(storage, payload);

    loadSetIntoState(payload.sets[activeSetName]);

    return {
      flashcards: ouicards.flashcards,
      bucketA: ouicards.bucketA,
      bucketB: ouicards.bucketB,
      bucketC: ouicards.bucketC,
      activeSet: activeSetName,
      sets: Object.keys(payload.sets),
    };
  }

  function useSet(name) {
    var storage = safeLocalStorage();
    var targetName = sanitizeSetName(name);

    if (!storage) {
      ouicards.activeSet = targetName;
      ouicards.flashcards = [];
      ouicards.bucketA = [];
      ouicards.bucketB = [];
      ouicards.bucketC = [];
      ouicards.currentBucket = [];
      ouicards.counter = 1;
      return {
        flashcards: [],
        bucketA: [],
        bucketB: [],
        bucketC: [],
        activeSet: targetName,
        sets: [targetName],
      };
    }

    var payload = readStoragePayload(storage);
    var activeSetName = ensureSet(payload, targetName);

    payload.activeSet = activeSetName;
    ouicards.activeSet = activeSetName;

    writeStoragePayload(storage, payload);

    loadSetIntoState(payload.sets[activeSetName]);

    return {
      flashcards: ouicards.flashcards,
      bucketA: ouicards.bucketA,
      bucketB: ouicards.bucketB,
      bucketC: ouicards.bucketC,
      activeSet: activeSetName,
      sets: Object.keys(payload.sets),
    };
  }

  function listSets() {
    var storage = safeLocalStorage();

    if (!storage) {
      return [getActiveSetName({ activeSet: ouicards.activeSet })];
    }

    var payload = readStoragePayload(storage);
    var setNames = Object.keys(payload.sets);

    if (setNames.length === 0) {
      setNames.push(getActiveSetName(payload));
    }

    return setNames;
  }

  function getActiveSet() {
    var storage = safeLocalStorage();
    var payload = readStoragePayload(storage);
    var active = getActiveSetName(payload);
    ouicards.activeSet = active;
    return active;
  }

  function getActiveSetData() {
    return {
      name: getActiveSet(),
      flashcards: Array.isArray(ouicards.flashcards) ? ouicards.flashcards : [],
    };
  }

  function hasStoredFlashcards(name) {
    var storage = safeLocalStorage();

    if (!storage) {
      return false;
    }

    var payload = readStoragePayload(storage);
    var target = ensureSet(payload, name ? name : getActiveSetName(payload));
    var setState = payload.sets[target];

    return !!(setState && Array.isArray(setState.flashcards) && setState.flashcards.length);
  }

  function resetBuckets() {
    ouicards.bucketA       = ouicards.flashcards.slice(0);
    ouicards.currentBucket = ouicards.bucketA;
    ouicards.bucketB       = [];
    ouicards.bucketC       = [];
    ouicards.counter       = 1;
    saveToLS();
  }

  exports.ouicards = {
    currentBucket:      [],
    flashcards:         [],
    bucketA:            [],
    bucketB:            [],
    bucketC:            [],
    counter:            1,
    activeSet:          DEFAULT_SET_NAME,
    loadFromArray:      loadFromArray,
    loadFromBrowser:    loadFromBrowser,
    next:               next,
    correct:            correct,
    wrong:              wrong,
    moveQuestion:       moveQuestion,
    getQuestion:        getQuestion,
    buildQuestionHTML:  buildQuestionHTML,
    saveToLS:           saveToLS,
    getFromLS:          getFromLS,
    resetBuckets:       resetBuckets,
    useSet:             useSet,
    listSets:           listSets,
    getActiveSet:       getActiveSet,
    hasStoredFlashcards: hasStoredFlashcards,
    addFlashcard:       addFlashcard,
    updateFlashcard:    updateFlashcard,
    getActiveSetData:   getActiveSetData
  };

// jQuery magic
  if (typeof exports.jQuery !== 'undefined') {
    (function($) {
      var showNext = function() {
        var result = next();
        $('#current-question').first().html(result['question']);
        $('#current-answer').first().hide().html(result['answer']);
      };

      $.fn.ouicards = function() {
        var result = [];
        this.find('ul').hide().children().each(function() {
          result.push({
            question: $(this).find('.question').text(),
            answer: $(this).find('.answer').text()
          });
        });

        loadFromArray(result);

        $('a#correct').click(function(event) {
          event.preventDefault();
          correct();
          showNext();
        });

        $('a#wrong').click(function(event) {
          event.preventDefault();
          wrong();
          showNext();
        });

        $('a#show-answer').click(function(event){
          event.preventDefault();
          $('#current-answer').first().show();
        });

        showNext();
      };
    })(exports.jQuery);
  } else {
    console.info('jQuery was not detected; skipping $.fn.ouicards helper.');
  }

})(this);
