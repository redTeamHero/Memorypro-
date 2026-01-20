var myFlashcards = [
  {
    question: ".slice()",
    answer: "Example:\nconst fruits = ['apple', 'banana', 'cherry', 'date'];\nconst sliced = fruits.slice(1, 3);\nconsole.log(sliced); // ['banana', 'cherry']\n\nExplanation:\nslice(start, end)\n- Returns a portion of the array without changing the original.\n- Takes items from 'start' up to (but not including) 'end'."
  },
  {
    question: ".splice()",
    answer: "Example:\nconst fruits = ['apple', 'banana', 'cherry'];\nfruits.splice(1, 1, 'mango');\nconsole.log(fruits); // ['apple', 'mango', 'cherry']\n\nExplanation:\nsplice(start, deleteCount, item1, item2...)\n- Removes or replaces existing elements and/or adds new ones.\n- Mutates the original array."
  },
  {
    question: ".map()",
    answer: "Example:\nconst numbers = [1, 2, 3];\nconst doubled = numbers.map(n => n * 2);\nconsole.log(doubled); // [2, 4, 6]\n\nExplanation:\nmap(callback)\n- Returns a new array with transformed values.\n- Does not modify the original array."
  },
  {
    question: ".filter()",
    answer: "Example:\nconst nums = [1, 2, 3, 4, 5];\nconst evens = nums.filter(n => n % 2 === 0);\nconsole.log(evens); // [2, 4]\n\nExplanation:\nfilter(callback)\n- Returns elements that pass a test.\n- Does not modify the original array."
  },
  {
    question: ".reduce()",
    answer: "Example:\nconst nums = [1, 2, 3, 4];\nconst total = nums.reduce((a, b) => a + b, 0);\nconsole.log(total); // 10\n\nExplanation:\nreduce(callback, initialValue)\n- Combines all elements into one value."
  },
  {
    question: ".forEach()",
    answer: "Example:\n['a', 'b', 'c'].forEach(l => console.log(l));\n\nExplanation:\nforEach(callback)\n- Executes a function for each array element.\n- Does not return a new array."
  },
  {
    question: ".find()",
    answer: "Example:\nconst users = [{id:1}, {id:2}];\nconsole.log(users.find(u => u.id === 2)); // {id:2}\n\nExplanation:\nfind(callback)\n- Returns the first matching element."
  },
  {
    question: ".findIndex()",
    answer: "Example:\nconst arr = [10, 20, 30];\nconsole.log(arr.findIndex(x => x === 20)); // 1\n\nExplanation:\nfindIndex(callback)\n- Returns the index of the first matching element."
  },
  {
    question: ".includes()",
    answer: "Example:\nconsole.log(['a','b','c'].includes('b')); // true\n\nExplanation:\nincludes(value)\n- Checks if an array or string contains a specific element."
  },
  {
    question: ".indexOf()",
    answer: "Example:\nconst arr = ['x','y','z'];\nconsole.log(arr.indexOf('y')); // 1\n\nExplanation:\nindexOf(value)\n- Returns the first index found, or -1 if not present."
  },
  {
    question: ".push()",
    answer: "Example:\nconst arr = [1,2];\narr.push(3);\nconsole.log(arr); // [1,2,3]\n\nExplanation:\npush(item)\n- Adds an element to the end."
  },
  {
    question: ".pop()",
    answer: "Example:\nconst arr = [1,2,3];\narr.pop();\nconsole.log(arr); // [1,2]\n\nExplanation:\npop()\n- Removes the last element and returns it."
  },
  {
    question: ".shift()",
    answer: "Example:\nconst arr = [1,2,3];\narr.shift();\nconsole.log(arr); // [2,3]\n\nExplanation:\nshift()\n- Removes the first element."
  },
  {
    question: ".unshift()",
    answer: "Example:\nconst arr = [2,3];\narr.unshift(1);\nconsole.log(arr); // [1,2,3]\n\nExplanation:\nunshift(value)\n- Adds an element to the beginning."
  },
  {
    question: ".sort()",
    answer: "Example:\nconst arr = [3,1,2];\narr.sort();\nconsole.log(arr); // [1,2,3]\n\nExplanation:\nsort(compareFn)\n- Sorts elements (lexicographically by default)."
  },
  {
    question: ".reverse()",
    answer: "Example:\nconst arr = [1,2,3];\narr.reverse();\nconsole.log(arr); // [3,2,1]\n\nExplanation:\nreverse()\n- Reverses an array in place."
  },
  {
    question: ".concat()",
    answer: "Example:\nconst a = [1,2];\nconst b = [3,4];\nconsole.log(a.concat(b)); // [1,2,3,4]\n\nExplanation:\nconcat()\n- Combines arrays or strings."
  },
  {
    question: ".join()",
    answer: "Example:\nconsole.log(['a','b','c'].join('-')); // a-b-c\n\nExplanation:\njoin(separator)\n- Converts array to string."
  },
  {
    question: ".flat()",
    answer: "Example:\nconsole.log([1,[2,[3]]].flat(2)); // [1,2,3]\n\nExplanation:\nflat(depth)\n- Flattens nested arrays."
  },
  {
    question: ".toUpperCase()",
    answer: "Example:\nconsole.log('hello'.toUpperCase()); // HELLO\n\nExplanation:\nConverts string to uppercase."
  },
  {
    question: ".toLowerCase()",
    answer: "Example:\nconsole.log('HELLO'.toLowerCase()); // hello\n\nExplanation:\nConverts string to lowercase."
  },
  {
    question: ".trim()",
    answer: "Example:\nconsole.log('  hi  '.trim()); // 'hi'\n\nExplanation:\nRemoves whitespace at both ends."
  },
  {
    question: ".replace()",
    answer: "Example:\nconsole.log('I love cats'.replace('cats','dogs'));\n// I love dogs\n\nExplanation:\nReplaces part of a string."
  },
  {
    question: ".split()",
    answer: "Example:\nconsole.log('a,b,c'.split(',')); // ['a','b','c']\n\nExplanation:\nSplits string into an array."
  },
  {
    question: "Object.keys()",
    answer: "Example:\nconst obj = {a:1,b:2};\nconsole.log(Object.keys(obj)); // ['a','b']\n\nExplanation:\nReturns object's property names."
  },
  {
    question: "Object.values()",
    answer: "Example:\nconst obj = {a:1,b:2};\nconsole.log(Object.values(obj)); // [1,2]\n\nExplanation:\nReturns object's property values."
  },
  {
    question: "Object.entries()",
    answer: "Example:\nconst obj = {a:1,b:2};\nconsole.log(Object.entries(obj)); // [['a',1],['b',2]]\n\nExplanation:\nReturns key-value pairs."
  },
  {
    question: "JSON.stringify()",
    answer: "Example:\nconsole.log(JSON.stringify({x:10})); // '{\"x\":10}'\n\nExplanation:\nConverts object to JSON string."
  },
  {
    question: "JSON.parse()",
    answer: "Example:\nconsole.log(JSON.parse('{\"x\":10}')); // {x:10}\n\nExplanation:\nParses JSON string to object."
  },
  {
    question: "Math.floor()",
    answer: "Example:\nconsole.log(Math.floor(4.9)); // 4\n\nExplanation:\nRounds down to nearest integer."
  },
  {
    question: "Math.ceil()",
    answer: "Example:\nconsole.log(Math.ceil(4.1)); // 5\n\nExplanation:\nRounds up to nearest integer."
  },
  {
    question: "Math.round()",
    answer: "Example:\nconsole.log(Math.round(4.5)); // 5\n\nExplanation:\nRounds to nearest integer."
  },
  {
    question: "Math.random()",
    answer: "Example:\nconsole.log(Math.random()); // 0–1\n\nExplanation:\nGenerates random decimal."
  },
  {
    question: "Array.isArray()",
    answer: "Example:\nconsole.log(Array.isArray([1,2,3])); // true\n\nExplanation:\nChecks if value is an array."
  },
  {
    question: "parseInt()",
    answer: "Example:\nconsole.log(parseInt('42px')); // 42\n\nExplanation:\nParses string as integer."
  },
  {
    question: "parseFloat()",
    answer: "Example:\nconsole.log(parseFloat('3.14xyz')); // 3.14\n\nExplanation:\nParses string as float."
  },
  {
    question: "isNaN()",
    answer: "Example:\nconsole.log(isNaN('hi')); // true\n\nExplanation:\nChecks if value is NaN."
  },
  {
    question: "setTimeout()",
    answer: "Example:\nsetTimeout(() => console.log('Done!'), 1000);\n\nExplanation:\nExecutes function once after delay."
  },
  {
    question: "setInterval()",
    answer: "Example:\nconst id = setInterval(() => console.log('Tick'), 1000);\n\nExplanation:\nRepeats function on interval."
  },
  {
    question: "clearInterval()",
    answer: "Example:\nconst id = setInterval(()=>{},1000);\nclearInterval(id);\n\nExplanation:\nStops an active interval."
  },
  {
    question: "Promise.all()",
    answer: "Example:\nPromise.all([Promise.resolve(1), Promise.resolve(2)])\n.then(console.log); // [1,2]\n\nExplanation:\nWaits for all promises to finish."
  },
  {
    question: "Promise.race()",
    answer: "Example:\nPromise.race([\n  new Promise(r=>setTimeout(()=>r('A'),100)),\n  new Promise(r=>setTimeout(()=>r('B'),50))\n]).then(console.log); // 'B'\n\nExplanation:\nReturns the first settled promise."
  },
  {
    question: "document.getElementById()",
    answer: "Example:\nconst el = document.getElementById('demo');\nconsole.log(el.textContent);\n\nExplanation:\nSelects element by ID."
  },
  {
    question: "document.querySelector()",
    answer: "Example:\nconst btn = document.querySelector('.btn');\nbtn.textContent = 'Clicked!';\n\nExplanation:\nSelects the first element matching a CSS selector."
  },
  {
    question: "document.querySelectorAll()",
    answer: "Example:\nconst items = document.querySelectorAll('li');\nitems.forEach(i=>console.log(i.textContent));\n\nExplanation:\nSelects all matching elements."
  },
  {
    question: "element.addEventListener()",
    answer: "Example:\nbutton.addEventListener('click', ()=>alert('Hi'));\n\nExplanation:\nAttaches an event listener to an element."
  },
  {
    question: "console.log()",
    answer: "Example:\nconsole.log('Debug message');\n\nExplanation:\nLogs output to console."
  },
  {
    question: "alert()",
    answer: "Example:\nalert('Hello!');\n\nExplanation:\nShows alert dialog (browser only)."
  },
  {
    question: "confirm()",
    answer: "Example:\nconst ok = confirm('Proceed?');\nconsole.log(ok);\n\nExplanation:\nAsks user to confirm, returns true/false."
  },
  {
    question: "prompt()",
    answer: "Example:\nconst name = prompt('Enter name:');\nconsole.log(name);\n\nExplanation:\nPrompts user for input."
  },
  {
    question: "Which array helper returns the first element that matches a condition?",
    answer: ".find()",
    choices: [
      { text: ".find()", correct: true },
      { text: ".filter()" },
      { text: ".map()" },
      { text: ".reduce()" }
    ]
  }
];
