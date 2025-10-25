var sessionStarted = false;

$(document).ready(function() {
  if (!localStorage.flashcards || localStorage.flashcards === '[]') {
    ouicards.loadFromArray(myFlashcards);
  }

  bindHandlers();
  ouicards.getFromLS();
  updateFooter();
  presentCurrentCard();
});

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
