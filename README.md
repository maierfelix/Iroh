<p align="center">
  <a href="http://maierfelix.github.io/Iroh/">
    <img alt="Iroh" src="http://i.imgur.com/q7DYXfF.png" height="175">
  </a>
</p>

<p align="center">
  <a href="http://maierfelix.github.io/Iroh/">Website</a> |
  <a href="http://maierfelix.github.io/Iroh/playground/index.html">Playground</a> |
  <a href="https://github.com/maierfelix/Iroh/blob/master/API.md">API</a> |
</p>

<p align="center">
  ☕ Dynamic code analysis for JavaScript
</p>

<br/>

Iroh is a dynamic code analysis tool for JavaScript.
Iroh allows to record your code flow in realtime, intercept runtime values and manipulate program behaviour on the fly. 

### Installation:

````
npm install iroh
````
or alternativelly the browser distribution from [here](https://github.com/maierfelix/Iroh/blob/master/dist/iroh-browser.js).

### Example:
*(A simple textual model is used here)*
#### Input
````js
function factorial(n) {
  if (n === 0) return 1;
  return n * factorial(n - 1);
};
factorial(3);
````
#### Output
````js
call factorial ( [3] )
  call factorial ( [2] )
    call factorial ( [1] )
      call factorial ( [0] )
        if
        if end
      call factorial end -> [1]
    call factorial end -> [1]
  call factorial end -> [2]
call factorial end -> [6]
````

### Usage:
 * Runtime call tree graphs
 * Runtime type checking
 * Runtime code quality
 * Runtime test cases
 * Realtime code visualizations
 * Intercept eval, setTimeout etc.
 * Intercept and manipulate code/data on the fly
 * Visual learning
