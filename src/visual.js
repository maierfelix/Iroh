/*
let PIXEL_RATIO = window.devicePixelRatio;
let ctx = canvas.getContext("2d");

let width = 0;
let height = 0;

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  // update view
  canvas.width = width * PIXEL_RATIO;
  canvas.height = height * PIXEL_RATIO;
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  ctx.setTransform(PIXEL_RATIO, 0, 0, PIXEL_RATIO, 0, 0);
};

function draw() {
  requestAnimationFrame(draw);
};

(function init() {
  resize();
  draw();
})();
*/

editor.style.width = "640px";
editor.style.height = "480px";

function setEditorPosition(editor, x, y, z) {
  editor.domElement.style.transform = `
    scale3d(${z}, ${z}, ${z})
    translate3d(${x*z}px,${y*z}px,0px)
  `;
};

function setEditorSize(editor, w, h) {
  editor.domElement.style.width = w + "px";
  editor.domElement.style.height = h + "px";
  editor.layout();
};

// function to run the patched code in 
// global scope as if it's real code
function run(code) {
  let out = Iroh.patch(code);
  //console.log(out);
  //Iroh.editor.setValue(out);
  (() => {
    let script = document.createElement("script");
    script.innerHTML = out;
    document.body.appendChild(script);
  })();
  //console.log(Iroh.toJSON(Iroh.frame));
};

fetch("code.js").then((resp) => {
  return resp.text();
}).then((txt) => {
  run(txt);
});
