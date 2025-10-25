# Memorypro Flashcards

Memorypro is a modernized flashcard trainer that keeps the original OuiCards spaced-repetition engine while presenting a polished, conversion-ready demo for credit-repair education. The UI showcases how to load CSV decks, walk through cards, and mark progress across Leitner buckets—perfect for onboarding prospects into premium dispute-automation flows.

> **Credit:** Memorypro is built on top of the open-source [OuiCards](http://carlsednaoui.github.io/ouicards/) project created by [Carl Sednaoui](https://github.com/carlsednaoui). This fork refreshes the branding and example experience while honoring the original work and MIT license.

## About the Leitner System
From the [Wikipedia page](http://en.wikipedia.org/wiki/Leitner_system):

> The Leitner system is a widely used method to efficiently use flashcards that was proposed by the German science journalist Sebastian Leitner in the 1970s. It is a simple implementation of the principle of spaced repetition, where cards are reviewed at increasing interval.

In this method flashcards are sorted into groups according to how well you know each one in the Leitner's learning box. You try to recall the solution written on a flashcard—if you succeed, you send the card to the next group. If you fail, you send it back to the first group. Each succeeding group has a longer period of time before you are required to revisit the cards.

## Example

Visit the refreshed Memorypro demo at `live-examples/index.html` once you start a local server (instructions below). If you want to compare with the original inspiration, check out the [OuiCards example](http://carlsednaoui.github.io/ouicards/live-examples/index.html) that seeded this project.

## Getting Started Locally

1. Clone the repository and move into the project directory:

   ```bash
   git clone https://github.com/<your-username>/Memorypro-.git
   cd Memorypro-
   ```

2. Create a virtual environment (optional but recommended) and install the backend dependencies:

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r backend/requirements.txt
   ```

3. Run the Memorypro API + frontend server:

   ```bash
   python backend/app.py
   ```

   The Flask app serves both the REST endpoints and the refreshed Memorypro UI from `http://localhost:5000/`.

4. Visit `http://localhost:5000/` in your browser to interact with the live flashcard experience.

   - The UI automatically bootstraps with the starter deck delivered by `GET /api/decks/default`.
   - You can paste or upload your own cards; any accuracy events post to `POST /api/progress` for analytics.
   - Stop the local server anytime with `Ctrl+C`.

These steps wire the demo frontend to the Flask backend so you can iterate on conversion flows, track KPIs, and extend the API.

## Using Memorypro

### As a jQuery plugin

If you'd like to quickly get running with Memorypro, you can simply create a `<ul>` with the right CSS classes and Memorypro will take care of the rest.

Requirements:

- A div containing a `<ul>` where you'll create your questions and answers. In the example below this is `<div id='flashcards'>`.
- `<li>` elements holding 2 divs. One for the question (with a class of `question`) and one for the answer (with a class of `answer`).
- A div with an id of `current-question`, to show the question.
- A div with an id of `current-answer`, to show the answer.
- A link with an id of `show-answer`, to reveal the answer (by default you'll only see the question at first).
- A link with an id of `correct`, which a user will click if they get the question right.
- A link with an id of `wrong`, which a user will click if they get the question wrong.

Here's some example code ([also available here](http://carlsednaoui.github.io/ouicards/live-examples/ouicards-jquery-example.html)):

```html
<html>
<head>
  <title>Welcome</title>
  <script src="http://ajax.googleapis.org/ajax/libs/jquery/2.0.0/jquery.min.js"></script>
  <script src="../ouicards.js"></script>
  <script>
    $(function() {
      $('#flashcards').ouicards();
    });
  </script>
</head>

<body>
  <h1>Memorypro jQuery!</h1>
  <div id='flashcards'>
    <div id='current-question'></div>
    <div id='current-answer'></div>
    <ul>
      <li>
        <div class='question'>Question 1</div>
        <div class='answer'>Answer 1</div>
      </li>
      <li>
        <div class='question'>Question 2</div>
        <div class='answer'>Answer 2</div>
      </li>
      <li>
        <div class='question'>Question 3</div>
        <div class='answer'>Answer 3</div>
      </li>
    </ul>
    <a id='show-answer' href='#'>Show answer</a>
    <a id="correct" href="#">Correct</a>
    <a id="wrong" href="#">Wrong</a>
  </div>
</body>
</html>
```

### As a JavaScript Library

Welcome to the big leagues! The first thing you'll need is an array of Question/Answer objects.

Example:

```javascript
var flashcards = [
  {question: "Who built this?", answer: "Carl Sednaoui"},
  {question: "Where was Memorypro made?", answer: "In NYC, during Hacker School"}
];
```

You can then use the functions outlined below.

#### Functions Available

```
ouicards.loadFromArray(flashcardArray)
  // [{question: q1, answer: a1}, {question: q2, answer: a2}]
ouicards.loadFromBrowser(jQuerySelector, Delimiter)
  // Your delimiter will most likely be ',' or '\t'
ouicards.getFromLS()
  // Get the questions and buckets from localStorage
ouicards.correct()
  // Call this when the current question was answered correctly
ouicards.wrong()
  // Call this when the current question was answered incorrectly
ouicards.next()
  // Call this to receive a new Question/ Answer object
```

#### Everything You Have Access To

```
ouicards.currentBucket: The bucket from which the current card is being pulled.
ouicards.flashcards: Your array of flashcards.
ouicards.bucketA: All questions available in Bucket A.
ouicards.bucketB: All questions available in Bucket B.
ouicards.bucketC: All questions available in Bucket C.
ouicards.counter: A running counter. Used to know which bucket to get the next question from.

ouicards.loadFromBrowser(selector, delimiter)
  // Uses jQuery to load the value of a given selector.
  // This saves the questions into ouicards, localStorage AND
  // returns an object with Flashcards, Bucket A, B and C.
ouicards.loadFromArray(array)
  // Loads the array of questions provided into ouicards and localStorage.
ouicards.getQuestion(bucket)
  // Gets a question for a given bucket and returns the built question HTML for it.
ouicards.buildQuestionHTML(rawQuestion)
  // Returns a question/ answer HTML object {question: questionEl, answer: answerEl}.
ouicards.moveQuestion(fromBucket, toBucket)
  // Moves a question from a given bucket to another given bucket.

ouicards.next()
  // Returns a new question/ answer object.
ouicards.correct()
  // Moves the current question to the next appropriate bucket.
ouicards.wrong()
  // Moves the current question to Bucket A.
ouicards.saveToLS()
  // Saves your flashcards, Bucket A, Bucket B and Bucket C to localStorage.
ouicards.getFromLS()
  // Gets your flashcards, Bucket A, Bucket B and Bucket C from localStorage.
  // This also sets ouicards.currentBucket and ouicards.counter.
ouicards.resetBuckets()
  // Resets ouicards buckets.
  // Bucket A will equal your flashcards array. Bucket B and C will be empty arrays.
  // Your currentBucket will also be empty and all of this will get saved to localStorage.
```

## Backend API Overview

The Flask service located at `backend/app.py` powers the refreshed Memorypro experience with a minimal REST layer:

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/decks/default` | GET | Delivers the starter deck stored in `backend/data/default_deck.json`. |
| `/api/progress` | POST | Records study events (`event`, `totals`, `bucketSnapshot`) to `backend/data/progress.json` for lightweight analytics. |
| `/api/progress` | GET | Returns the 100 most recent study events—perfect for dashboards or debugging. |

All responses are JSON and avoid storing PII; only aggregate counters and bucket snapshots are persisted so you can layer in dashboards or webhook automations safely.

## Contact
Have feedback or suggestions? We'd love to hear from you. File an issue here or reach out to the original creator, [Carl Sednaoui](https://twitter.com/carlsednaoui), whose work powers this Memorypro fork.

## License
[MIT](http://opensource.org/licenses/MIT)

## Completed while attending [Hacker School](https://www.hackerschool.com/)
