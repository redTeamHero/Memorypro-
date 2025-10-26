var jsFlashcards = [
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
  }
];
