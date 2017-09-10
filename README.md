<p align="center">
  <a href="//maierfelix.github.io/Iroh/">
    <img alt="Iroh" src="http://i.imgur.com/q7DYXfF.png" height="175">
  </a>
</p>

<p align="center">
  <a href="//maierfelix.github.io/Iroh/">Website</a> |
  <a href="//maierfelix.github.io/Iroh/examples/index.html">Examples</a> |
  <a href="//github.com/maierfelix/Iroh/blob/master/API.md">API</a>
</p>

<p align="center">
<a href="//www.npmjs.com/package/iroh"><img src="https://img.shields.io/npm/v/iroh.svg?style=flat-square" alt="NPM Version" /></a> <a href="//www.npmjs.com/package/iroh"><img src="https://img.shields.io/npm/dm/iroh.svg?style=flat-square" alt="NPM Downloads" /></a>
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
or alternatively the browser distribution from [here](//cdn.rawgit.com/maierfelix/Iroh/b84dde46/dist/iroh-browser.js).

### Example:

You can play with some live examples [here](//maierfelix.github.io/Iroh/examples/) and you can clone them from [here](//github.com/maierfelix/Iroh/tree/gh-pages/examples).

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
