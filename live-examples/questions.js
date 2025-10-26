var  myFlashcards = [
  {
    question: ".slice()",
    answer: `Example:
const fruits = ["apple", "banana", "cherry", "date"];
const sliced = fruits.slice(1, 3);
console.log(sliced); // ["banana", "cherry"]

Explanation:
slice(start, end)
- Returns a portion of the array without changing the original.
- Takes items from 'start' up to (but not including) 'end'.`
  },
  {
    question: ".splice()",
    answer: `Example:
const fruits = ["apple", "banana", "cherry"];
fruits.splice(1, 1, "mango");
console.log(fruits); // ["apple", "mango", "cherry"]

Explanation:
splice(start, deleteCount, item1, item2...)
- Removes or replaces existing elements and/or adds new elements.
- Changes (mutates) the original array.`
  },
  {
    question: ".map()",
    answer: `Example:
const numbers = [1, 2, 3];
const doubled = numbers.map(num => num * 2);
console.log(doubled); // [2, 4, 6]

Explanation:
map(callback)
- Creates a new array by applying a function to each element.
- Does not change the original array.`
  },
  {
    question: ".filter()",
    answer: `Example:
const numbers = [1, 2, 3, 4, 5];
const evens = numbers.filter(num => num % 2 === 0);
console.log(evens); // [2, 4]

Explanation:
filter(callback)
- Returns a new array with elements that pass the test.
- Does not modify the original.`
  },
  {
    question: ".reduce()",
    answer: `Example:
const numbers = [1, 2, 3, 4];
const sum = numbers.reduce((acc, curr) => acc + curr, 0);
console.log(sum); // 10

Explanation:
reduce(callback, initialValue)
- Combines all array elements into a single value.
- Useful for sums, averages, or aggregations.`
  },
  {
    question: ".forEach()",
    answer: `Example:
const fruits = ["apple", "banana", "cherry"];
fruits.forEach(fruit => console.log(fruit));

Explanation:
forEach(callback)
- Runs a function for each element.
- Does not return anything.`
  },
  {
    question: ".find()",
    answer: `Example:
const users = [{id:1,name:"John"}, {id:2,name:"Jane"}];
const user = users.find(u => u.id === 2);
console.log(user); // {id:2,name:"Jane"}

Explanation:
find(callback)
- Returns the first element that satisfies the condition.`
  },
  {
    question: ".findIndex()",
    answer: `Example:
const numbers = [10, 20, 30];
const index = numbers.findIndex(n => n === 20);
console.log(index); // 1

Explanation:
findIndex(callback)
- Returns the index of the first matching element.`
  },
  {
    question: ".includes()",
    answer: `Example:
const fruits = ["apple", "banana", "cherry"];
console.log(fruits.includes("banana")); // true

Explanation:
includes(value)
- Checks if an array or string contains a specific element.`
  },
  {
    question: ".indexOf()",
    answer: `Example:
const fruits = ["apple", "banana", "cherry"];
console.log(fruits.indexOf("banana")); // 1

Explanation:
indexOf(value)
- Returns the index of the first occurrence or -1 if not found.`
  },
  {
    question: ".push()",
    answer: `Example:
const fruits = ["apple", "banana"];
fruits.push("cherry");
console.log(fruits); // ["apple", "banana", "cherry"]

Explanation:
push(item)
- Adds an element to the end of an array.
- Returns the new length.`
  },
  {
    question: ".pop()",
    answer: `Example:
const fruits = ["apple", "banana", "cherry"];
fruits.pop();
console.log(fruits); // ["apple", "banana"]

Explanation:
pop()
- Removes the last element from an array and returns it.`
  },
  {
    question: ".shift()",
    answer: `Example:
const fruits = ["apple", "banana", "cherry"];
fruits.shift();
console.log(fruits); // ["banana", "cherry"]

Explanation:
shift()
- Removes the first element from an array.`
  },
  {
    question: ".unshift()",
    answer: `Example:
const fruits = ["banana", "cherry"];
fruits.unshift("apple");
console.log(fruits); // ["apple", "banana", "cherry"]

Explanation:
unshift(item)
- Adds one or more elements to the beginning of an array.`
  },
  {
    question: ".sort()",
    answer: `Example:
const numbers = [3, 1, 2];
numbers.sort();
console.log(numbers); // [1, 2, 3]

Explanation:
sort(compareFn)
- Sorts elements as strings by default.
- Use a compare function for numeric sort.`
  },
  {
    question: ".reverse()",
    answer: `Example:
const numbers = [1, 2, 3];
numbers.reverse();
console.log(numbers); // [3, 2, 1]

Explanation:
reverse()
- Reverses the order of elements in an array (mutates original).`
  },
  {
    question: ".concat()",
    answer: `Example:
const a = [1, 2];
const b = [3, 4];
const combined = a.concat(b);
console.log(combined); // [1, 2, 3, 4]

Explanation:
concat(array)
- Combines two or more arrays.
- Returns a new array.`
  },
  {
    question: ".join()",
    answer: `Example:
const fruits = ["apple", "banana", "cherry"];
console.log(fruits.join(", ")); // "apple, banana, cherry"

Explanation:
join(separator)
- Joins array elements into a string.`
  },
  {
    question: ".flat()",
    answer: `Example:
const arr = [1, [2, [3]]];
console.log(arr.flat(2)); // [1, 2, 3]

Explanation:
flat(depth)
- Flattens nested arrays up to the given depth.`
  },
  {
    question: ".toUpperCase()",
    answer: `Example:
const text = "hello";
console.log(text.toUpperCase()); // "HELLO"

Explanation:
toUpperCase()
- Converts all letters to uppercase.`
  },
  {
    question: ".toLowerCase()",
    answer: `Example:
const text = "HELLO";
console.log(text.toLowerCase()); // "hello"

Explanation:
toLowerCase()
- Converts all letters to lowercase.`
  },
  {
    question: ".trim()",
    answer: `Example:
const text = "   hello world   ";
console.log(text.trim()); // "hello world"

Explanation:
trim()
- Removes whitespace from both ends of a string.`
  },
  {
    question: ".replace()",
    answer: `Example:
const str = "I love cats";
const newStr = str.replace("cats", "dogs");
console.log(newStr); // "I love dogs"

Explanation:
replace(old, new)
- Replaces a substring with another value.`
  },
  {
    question: ".split()",
    answer: `Example:
const text = "apple,banana,cherry";
const arr = text.split(",");
console.log(arr); // ["apple", "banana", "cherry"]

Explanation:
split(separator)
- Splits a string into an array of substrings.`
  },
  {
    question: ".repeat()",
    answer: `Example:
const word = "Hi ";
console.log(word.repeat(3)); // "Hi Hi Hi "

Explanation:
repeat(count)
- Returns a new string repeated count times.`
  },
  {
    question: "Object.keys()",
    answer: `Example:
const user = { name: "John", age: 30 };
console.log(Object.keys(user)); // ["name", "age"]

Explanation:
Object.keys(obj)
- Returns an array of all the object's property names.`
  },
  {
    question: "Object.values()",
    answer: `Example:
const user = { name: "John", age: 30 };
console.log(Object.values(user)); // ["John", 30]

Explanation:
Object.values(obj)
- Returns an array of the object's property values.`
  },
  {
    question: "Object.entries()",
    answer: `Example:
const user = { name: "John", age: 30 };
console.log(Object.entries(user)); // [["name", "John"], ["age", 30]]

Explanation:
Object.entries(obj)
- Returns an array of key/value pairs.`
  },
  {
    question: "Object.assign()",
    answer: `Example:
const target = { a: 1 };
const source = { b: 2 };
Object.assign(target, source);
console.log(target); // { a: 1, b: 2 }

Explanation:
Object.assign(target, ...sources)
- Copies properties from one or more source objects into a target object.`
  },
  {
    question: "Object.freeze()",
    answer: `Example:
const person = { name: "John" };
Object.freeze(person);
person.name = "Jane";
console.log(person.name); // "John"

Explanation:
Object.freeze(obj)
- Prevents changes to an object (no edits, no additions, no deletions).`
  },
  {
    question: "Object.hasOwn()",
    answer: `Example:
const user = { name: "Alice" };
console.log(Object.hasOwn(user, "name")); // true

Explanation:
Object.hasOwn(obj, prop)
- Checks if the object has a property as its own (not inherited).`
  },
  {
    question: "JSON.stringify()",
    answer: `Example:
const user = { name: "John", age: 30 };
console.log(JSON.stringify(user)); // '{"name":"John","age":30}'

Explanation:
JSON.stringify(obj)
- Converts a JavaScript object into a JSON string.`
  },
  {
    question: "JSON.parse()",
    answer: `Example:
const json = '{"name":"John","age":30}';
console.log(JSON.parse(json)); // { name: "John", age: 30 }

Explanation:
JSON.parse(jsonString)
- Parses a JSON string into a JavaScript object.`
  },
  {
    question: "Math.floor()",
    answer: `Example:
console.log(Math.floor(4.9)); // 4

Explanation:
Math.floor(number)
- Rounds a number down to the nearest integer.`
  },
  {
    question: "Math.ceil()",
    answer: `Example:
console.log(Math.ceil(4.1)); // 5

Explanation:
Math.ceil(number)
- Rounds a number up to the nearest integer.`
  },
  {
    question: "Math.round()",
    answer: `Example:
console.log(Math.round(4.5)); // 5

Explanation:
Math.round(number)
- Rounds a number to the nearest integer.`
  },
  {
    question: "Math.random()",
    answer: `Example:
console.log(Math.random()); // Random number between 0 and 1

Explanation:
Math.random()
- Returns a random decimal between 0 (inclusive) and 1 (exclusive).`
  },
  {
    question: "Math.max()",
    answer: `Example:
console.log(Math.max(3, 7, 2)); // 7

Explanation:
Math.max(a, b, ...)
- Returns the largest number of the provided values.`
  },
  {
    question: "Math.min()",
    answer: `Example:
console.log(Math.min(3, 7, 2)); // 2

Explanation:
Math.min(a, b, ...)
- Returns the smallest number of the provided values.`
  },
  {
    question: "Math.pow()",
    answer: `Example:
console.log(Math.pow(2, 3)); // 8

Explanation:
Math.pow(base, exponent)
- Returns the base raised to the exponent power.`
  },
  {
    question: "Math.sqrt()",
    answer: `Example:
console.log(Math.sqrt(16)); // 4

Explanation:
Math.sqrt(number)
- Returns the square root of a number.`
  },
  {
    question: "Date.now()",
    answer: `Example:
console.log(Date.now()); // e.g., 1690000000000

Explanation:
Date.now()
- Returns the number of milliseconds since January 1, 1970.`
  },
  {
    question: "Date.toLocaleString()",
    answer: `Example:
const date = new Date();
console.log(date.toLocaleString()); // e.g., "10/26/2025, 8:30:00 AM"

Explanation:
toLocaleString()
- Returns a human-readable date and time string based on locale.`
  },
  {
    question: "Promise.all()",
    answer: `Example:
const p1 = Promise.resolve(1);
const p2 = Promise.resolve(2);
Promise.all([p1, p2]).then(values => console.log(values)); // [1, 2]

Explanation:
Promise.all(iterable)
- Waits for all promises to resolve and returns an array of results.`
  },
  {
    question: "Promise.race()",
    answer: `Example:
const p1 = new Promise(res => setTimeout(res, 100, "slow"));
const p2 = new Promise(res => setTimeout(res, 50, "fast"));
Promise.race([p1, p2]).then(console.log); // "fast"

Explanation:
Promise.race(iterable)
- Returns the result of the first resolved or rejected promise.`
  },
  {
    question: "Array.isArray()",
    answer: `Example:
console.log(Array.isArray([1,2,3])); // true

Explanation:
Array.isArray(value)
- Checks if the given value is an array.`
  },
  {
    question: "parseInt()",
    answer: `Example:
console.log(parseInt("42px")); // 42

Explanation:
parseInt(string)
- Parses a string and returns an integer.`
  },
  {
    question: "parseFloat()",
    answer: `Example:
console.log(parseFloat("3.14abc")); // 3.14

Explanation:
parseFloat(string)
- Parses a string and returns a floating-point number.`
  },
  {
    question: "isNaN()",
    answer: `Example:
console.log(isNaN("hello")); // true
console.log(isNaN(123)); // false

Explanation:
isNaN(value)
- Checks whether a value is NaN (Not a Number).`
  },
  {
    question: "document.getElementById()",
    answer: `Example:
const el = document.getElementById("title");
console.log(el.textContent);

Explanation:
getElementById(id)
- Selects the first element with the matching ID.`
  },
  {
    question: "document.querySelector()",
    answer: `Example:
const el = document.querySelector(".button");
console.log(el.textContent);

Explanation:
querySelector(selector)
- Selects the first element that matches the CSS selector.`
  },
  {
    question: "document.querySelectorAll()",
    answer: `Example:
const items = document.querySelectorAll("li");
items.forEach(i => console.log(i.textContent));

Explanation:
querySelectorAll(selector)
- Selects all elements that match the CSS selector.`
  },
  {
    question: "element.addEventListener()",
    answer: `Example:
button.addEventListener("click", () => console.log("Clicked!"));

Explanation:
addEventListener(event, callback)
- Attaches an event handler to an element.`
  },
  {
    question: "setTimeout()",
    answer: `Example:
setTimeout(() => console.log("Hello after 1s"), 1000);

Explanation:
setTimeout(callback, delay)
- Runs a function once after the specified delay in milliseconds.`
  },
  {
    question: "setInterval()",
    answer: `Example:
setInterval(() => console.log("Tick"), 1000);

Explanation:
setInterval(callback, delay)
- Repeatedly runs a function every given number of milliseconds.`
  },
  {
    question: "clearInterval()",
    answer: `Example:
const timer = setInterval(() => console.log("Running..."), 1000);
setTimeout(() => clearInterval(timer), 3000);

Explanation:
clearInterval(timer)
- Stops a timer that was started with setInterval().`
  },
  {
    question: "console.log()",
    answer: `Example:
console.log("Debug message");

Explanation:
console.log(value)
- Prints output to the browser console.`
  },
  {
    question: "alert()",
    answer: `Example:
alert("Hello World!");

Explanation:
alert(message)
- Displays a popup alert with a message (browser only).`
  },
  {
    question: "confirm()",
    answer: `Example:
const result = confirm("Are you sure?");
console.log(result); // true or false

Explanation:
confirm(message)
- Shows a confirmation dialog and returns true/false.`
  },
  {
    question: "prompt()",
    answer: `Example:
const name = prompt("Enter your name:");
console.log(name);

Explanation:
prompt(message)
- Displays a dialog asking for user input and returns it as a string.`
  }
];
