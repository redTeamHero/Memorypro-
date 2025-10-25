;(function(exports) {
  var cachedStorage = null;
  var storageEvaluated = false;

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

  function loadFromArray(array) {
    ouicards.flashcards = array;
    resetBuckets();
  }

  function loadFromBrowser(selector, delimiter) {
    var rawValue = getInputValue(selector);

    if (typeof rawValue !== 'string') {
      return;
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

    storage.flashcards = JSON.stringify(ouicards.flashcards);
    storage.bucketA    = JSON.stringify(ouicards.bucketA);
    storage.bucketB    = JSON.stringify(ouicards.bucketB);
    storage.bucketC    = JSON.stringify(ouicards.bucketC);
  }

  function getFromLS() {
    var storage = safeLocalStorage();

    if (!storage) {
      ouicards.flashcards    = [];
      ouicards.bucketA       = [];
      ouicards.bucketB       = [];
      ouicards.bucketC       = [];
      ouicards.currentBucket = [];
      ouicards.counter       = 1;
      return { flashcards: [], bucketA: [], bucketB: [], bucketC: [] };
    }

    ouicards.flashcards    = JSON.parse(storage.flashcards || '[]');
    ouicards.bucketA       = JSON.parse(storage.bucketA    || '[]');
    ouicards.bucketB       = JSON.parse(storage.bucketB    || '[]');
    ouicards.bucketC       = JSON.parse(storage.bucketC    || '[]');
    ouicards.currentBucket = ouicards.bucketA.length ? ouicards.bucketA :
                         ouicards.bucketB.length ? ouicards.bucketB :
                         ouicards.bucketC.length ? ouicards.bucketC : [];

    ouicards.counter = 1;
    return {flashcards: ouicards.flashcards, bucketA: ouicards.bucketA, bucketB: ouicards.bucketB, bucketC: ouicards.bucketC};
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
    resetBuckets:       resetBuckets
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
