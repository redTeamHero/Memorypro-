var sessionStarted = false;

$(document).ready(function() {
  initializeApp();
});

async function initializeApp() {
  await ensureDeckLoaded();

  bindHandlers();
  ouicards.getFromLS();
  updateFooter();
  presentCurrentCard();
}

async function ensureDeckLoaded() {
  if (localStorage.flashcards && localStorage.flashcards !== '[]') {
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

    $('#questions-input-area').slideUp(120);
    $('#load-questions').fadeOut(80);
    $('#questions-input-area').val('');
    $('.upload-questions-label')
      .text('Load another deck · Cargar otro mazo')
      .fadeIn(160);
  });

  attachActivate($('.control-button.correct'), function() {
    if (!sessionStarted) {
      presentCurrentCard();
      return;
    }

    ouicards.correct();
    updateFooter();
    presentCurrentCard();
  });

  attachActivate($('.control-button.wrong'), function() {
    if (!sessionStarted) {
      presentCurrentCard();
      return;
    }

    ouicards.wrong();
    updateFooter();
    presentCurrentCard();
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
    $('.question .card-content').html('<p>Add flashcards to get started. Agrega tarjetas para comenzar.</p>');
    $('.answer .card-content').empty();
    sessionStarted = false;
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
  var total = ouicards.flashcards.length;
  var totalLabel = total === 1 ? 'card · tarjeta lista' : 'cards · tarjetas listas';
  $('.questions-count').html(total + ' ' + totalLabel);

  var bucketSummary = 'A:' + ouicards.bucketA.length + ' · ' +
                      'B:' + ouicards.bucketB.length + ' · ' +
                      'C:' + ouicards.bucketC.length;
  $('#stat-details').text(bucketSummary);
}
