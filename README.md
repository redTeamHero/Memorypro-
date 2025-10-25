<p align="center">
  <svg width="800" height="220" viewBox="0 0 800 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="brainPlusTitle brainPlusDesc">
    <title id="brainPlusTitle">OuiCards Brainstorm Banner</title>
    <desc id="brainPlusDesc">A colorful brain icon with a radiant plus sign to represent smarter studying.</desc>
    <defs>
      <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#5B21B6" />
        <stop offset="50%" stop-color="#0EA5E9" />
        <stop offset="100%" stop-color="#22C55E" />
      </linearGradient>
      <linearGradient id="brainGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#FDE68A" />
        <stop offset="50%" stop-color="#F97316" />
        <stop offset="100%" stop-color="#EF4444" />
      </linearGradient>
      <linearGradient id="plusGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ECFEFF" />
        <stop offset="100%" stop-color="#67E8F9" />
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="rgba(15,23,42,0.35)" />
      </filter>
    </defs>
    <rect x="20" y="20" width="760" height="180" rx="28" fill="url(#bgGradient)" filter="url(#shadow)" />
    <g transform="translate(160,40)">
      <path d="M120 40c0-28 24-52 68-52s68 24 68 52c0 18-8 34-22 44 12 8 20 22 20 38 0 30-26 52-66 52-18 0-34-6-46-16-12 10-28 16-46 16-40 0-66-22-66-52 0-16 8-30 20-38-14-10-22-26-22-44 0-28 24-52 68-52s68 24 68 52z" fill="url(#brainGradient)" stroke="#FDE68A" stroke-width="6" />
      <path d="M120 40c0 28-22 52-52 52-14 0-26-4-36-12" fill="none" stroke="#F9A8D4" stroke-width="6" stroke-linecap="round" />
      <path d="M256 40c0 28-22 52-52 52-14 0-26-4-36-12" fill="none" stroke="#F9A8D4" stroke-width="6" stroke-linecap="round" />
      <path d="M134 62c10 12 14 26 14 42 0 30-12 56-34 72" fill="none" stroke="#FDF2F8" stroke-width="6" stroke-linecap="round" />
      <path d="M222 62c-10 12-14 26-14 42 0 30 12 56 34 72" fill="none" stroke="#FDF2F8" stroke-width="6" stroke-linecap="round" />
    </g>
    <g transform="translate(520,70)">
      <rect x="66" y="0" width="24" height="120" rx="12" fill="url(#plusGradient)" />
      <rect x="0" y="48" width="156" height="24" rx="12" fill="url(#plusGradient)" />
      <rect x="70" y="4" width="16" height="112" rx="8" fill="#0EA5E9" opacity="0.5" />
      <rect x="4" y="52" width="148" height="16" rx="8" fill="#0EA5E9" opacity="0.5" />
    </g>
    <text x="400" y="150" font-family="'Segoe UI', 'Helvetica Neue', sans-serif" font-size="46" text-anchor="middle" fill="#F8FAFC" font-weight="600">OuiCards: Boost Your Memory</text>
    <text x="400" y="182" font-family="'Segoe UI', 'Helvetica Neue', sans-serif" font-size="22" text-anchor="middle" fill="#E0F2FE">Study smarter. Remember longer.</text>
  </svg>
</p>

# Ouicards - Fancy Schmancy Flashcards
Ouicards allows you to easily build flashcards to study for... everything!

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

2. Launch a lightweight static web server (any option works; below uses Python 3, which ships with most systems):

   ```bash
   python3 -m http.server 8000
   ```

   This serves the project from `http://localhost:8000/`.

3. In your browser, open `http://localhost:8000/live-examples/index.html` to interact with the Memorypro flashcards UI.

## Getting Started Locally

1. Clone the repository and move into the project directory:

   ```bash
   git clone https://github.com/<your-username>/Memorypro-.git
   cd Memorypro-
   ```

2. Launch a lightweight static web server (any option works; below uses Python 3, which ships with most systems):

   ```bash
   python3 -m http.server 8000
   ```

   This serves the project from `http://localhost:8000/`.

3. In your browser, open `http://localhost:8000/live-examples/index.html` to interact with the demo flashcards UI.

   - Use `ouicards.js` directly in your own HTML pages or explore the example jQuery integration at `live-examples/ouicards-jquery-example.html`.
   - Stop the local server anytime with `Ctrl+C`.

These steps are sufficient for experimenting with the library and modifying the example flashcards locally.

4. Visit `http://localhost:5000/` in your browser to interact with the live flashcard experience.

These steps are sufficient for experimenting with the library and modifying the example flashcards locally.

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

## Contact
Have feedback or suggestions? We'd love to hear from you. File an issue here or reach out to the original creator, [Carl Sednaoui](https://twitter.com/carlsednaoui), whose work powers this Memorypro fork.

## License
[MIT](http://opensource.org/licenses/MIT)

## Completed while attending [Hacker School](https://www.hackerschool.com/)
