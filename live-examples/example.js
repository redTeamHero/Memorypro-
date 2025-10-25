var sessionStarted = false;
var progressTotals = { correct: 0, wrong: 0 };

$(document).ready(function() {
  bindHandlers();
  initializeDeck();
});

function initializeDeck() {
  if (localStorage.flashcards && localStorage.flashcards !== '[]') {
    ouicards.getFromLS();
    updateFooter();
    presentCurrentCard();
    recordProgress('session_resume');
    return;
  }

  setLoadingState(true, 'Loading starter deck from Memorypro...');

  fetch('/api/decks/default')
    .then(function(response) {
      if (!response.ok) {
        throw new Error('Unable to load starter deck');
      }
      return response.json();
    })
    .then(function(deck) {
      if (!deck || !Array.isArray(deck.flashcards) || deck.flashcards.length === 0) {
        showEmptyState();
        return;
      }

      ouicards.loadFromArray(deck.flashcards);
      ouicards.getFromLS();
      updateFooter();
      presentCurrentCard();
      recordProgress('session_start');
    })
    .catch(function() {
      showEmptyState();
    })
    .finally(function() {
      setLoadingState(false);
    });
}

function setLoadingState(isLoading, message) {
  var $questionContent = $('.question .card-content');
  var $answerContent = $('.answer .card-content');

  if (isLoading) {
    $questionContent.html('<p>' + (message || 'Preparing your flashcards...') + '</p>');
    $answerContent.html('<p>Please wait while we connect to the Memorypro API.</p>');
  }
}

function showEmptyState() {
  var $questionContent = $('.question .card-content');
  var $answerContent = $('.answer .card-content');

  $questionContent.html('<p>Add flashcards to get started.</p>');
  $answerContent.html('<p>We could not load the starter deck. Paste your own CSV or try again.</p>');
  sessionStarted = false;
}

function bindHandlers() {
  attachActivate($('.upload-questions-label'), function() {
    $('.upload-questions-label').hide();
    $('#questions-input-area').slideDown(120, function() {
      $('#load-questions').fadeIn(160);
    });
  });

  attachActivate($('#load-questions'), function() {
    var data = ouicards.loadFromBrowser('#questions-input-area', ',');

    if (!data) {
      return;
    }

    ouicards.getFromLS();
    updateFooter();
    presentCurrentCard();
    recordProgress('deck_uploaded');

    $('#questions-input-area').slideUp(120);
    $('#load-questions').fadeOut(80);
    $('#questions-input-area').val('');
    $('.upload-questions-label')
      .text('Load another deck')
      .fadeIn(160);
  });

  attachActivate($('.control-button.correct'), function() {
    if (!sessionStarted) {
      presentCurrentCard();
      return;
    }

    ouicards.correct();
    progressTotals.correct += 1;
    updateFooter();
    presentCurrentCard();
    recordProgress('correct');
  });

  attachActivate($('.control-button.wrong'), function() {
    if (!sessionStarted) {
      presentCurrentCard();
      return;
    }

    ouicards.wrong();
    progressTotals.wrong += 1;
    updateFooter();
    presentCurrentCard();
    recordProgress('wrong');
  });

  attachActivate($('.question'), revealAnswer);
  attachActivate($('.answer'), revealAnswer);
}

function attachActivate($element, handler) {
  $element.on('click', function(event) {
    if ($(event.target).closest('a').length) {
      return;
    }

    event.preventDefault();
    handler(event);
  });

  $element.on('keydown', function(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handler(event);
    }
  });
}

function presentCurrentCard() {
  var newQuestion = ouicards.next();

  if (!newQuestion) {
    showEmptyState();
    return;
  }

  var $questionContent = $('.question .card-content');
  var $answerContent = $('.answer .card-content');

  $questionContent.empty().append(newQuestion.question);
  $answerContent.empty().append(newQuestion.answer);

  $answerContent.children().hide();
  $('.answer').removeClass('revealed');
  sessionStarted = true;
}

function revealAnswer() {
  if (!sessionStarted) {
    return;
  }

  $('.answer').addClass('revealed');
  $('.answer .card-content').children().fadeIn(140);
}

function updateFooter() {
  var total = ouicards.flashcards.length || 0;
  var totalLabel = total === 1 ? 'card ready' : 'cards ready';
  $('.questions-count').html(total + ' ' + totalLabel);

  var bucketSummary = 'A:' + ouicards.bucketA.length + ' · ' +
                      'B:' + ouicards.bucketB.length + ' · ' +
                      'C:' + ouicards.bucketC.length;
  $('#stat-details').text(bucketSummary);
}

function recordProgress(eventName) {
  var payload = {
    event: eventName,
    totals: {
      correct: progressTotals.correct,
      wrong: progressTotals.wrong,
      deckSize: ouicards.flashcards.length
    },
    bucketSnapshot: {
      A: ouicards.bucketA.length,
      B: ouicards.bucketB.length,
      C: ouicards.bucketC.length
    }
  };

  var body = JSON.stringify(payload);

  if (navigator.sendBeacon) {
    try {
      var blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/progress', blob);
      return;
    } catch (error) {
      // Fallback to fetch below
    }
  }

  fetch('/api/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body
  }).catch(function() {
    // Swallow network errors; the UI should not break when offline.
  });
}
