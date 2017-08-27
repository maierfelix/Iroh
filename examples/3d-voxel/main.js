var container;
var camera,scene,renderer;
var mat,mat2;
var box;
var ball;
var raycaster;
var threshold = 0.1;
var mouse = new THREE.Vector2();
var boxes = [];

var boxsize = 9.9;
var gridsize = 10;

var dataName = 'voxel';

var colors = ['#333333','#6c2940','#403578','#d93cf0','#404b07','#d9680f','#808080','#eca8bf','#135740','#cccccc','#2697f0','#bfb4f8','#26c30f','#bfca87','#93d6bf','#ffffff'];
var color = colors[0];
var mode = 'draw';

var data = [[0,0,0,0xff0000]];

function init(){
  container = document.getElementById('container');
  
  renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth,window.innerHeight);
  

  
  container.appendChild(renderer.domElement);
  
  scene = new THREE.Scene();
  
  camera = new THREE.PerspectiveCamera( 90, window.innerWidth / window.innerHeight, 1, 1000 );
  camera.position.x = 0;
  camera.position.y = 0;
  camera.position.z = 750;

  controls = new THREE.OrbitControls( camera, renderer.domElement );
  controls.enableDamping = true;
  controls.dampingFactor = 0.15;
  controls.enableZoom = true;
  
  var light;
  
  scene.add(new THREE.AmbientLight(0x404040));
  
  light = new THREE.DirectionalLight(0xffffff);
  light.position.set(-5,15,10);
  scene.add(light);
  
  
  light = new THREE.DirectionalLight(0x999999);
  light.position.set(5,-8,-12);
  scene.add(light);
  
  
  window.addEventListener('resize',windowResize,false);
  
  document.addEventListener( 'mousemove', onDocumentMouseMove, false );
  document.addEventListener( 'mousedown', onDocumentMouseDown, false );
  document.addEventListener( 'mouseup', onDocumentMouseUp, false );
  
  raycaster = new THREE.Raycaster();
  raycaster.params.Points.threshold = threshold;
  
}

var willEdit = false;
function onDocumentMouseMove( event ) {
  willEdit = false;
  event.preventDefault();
  mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
  mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
}

function onDocumentMouseDown( event) {
  willEdit = true;
}

function onDocumentMouseUp( event) {
  event.preventDefault();
  if(!willEdit) return ;
  
  mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
  mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
  raycaster.setFromCamera( mouse, camera );
  var intersections = raycaster.intersectObjects( boxes );
  intersection = ( intersections.length ) > 0 ? intersections[ 0 ] : null;
  if(intersection){
   if(event.button == 0 && mode == 'draw'){
     mat = new THREE.MeshLambertMaterial({color:color,side:THREE.DoubleSide});

      var n = intersection.face.normal;
      var p = intersection.object.position;
      addBox(p.x+n.x*gridsize,p.y+n.y*gridsize,p.z+n.z*gridsize,color);
   }
   else if(event.button==2 || mode == 'erase'){
      if(boxes.length>1){
        var i = boxes.indexOf(intersection.object);
        if(i>=0){
          boxes.splice(i,1);
          TweenMax.to(
            intersection.object.scale,0.3,
            {x:0.1,y:0.1,z:0.1,ease:Back.easeIn})
          .eventCallback("onComplete",                                                   (function(obj){ 
              return function(){
                console.log('complete');
                scene.remove(obj);
              }
            })(intersection.object)
          );
        }
      }
    }
  }

}

function windowResize(event) {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight);
}

function animate(){
  requestAnimationFrame(animate);
  controls.update();  
  //camera.lookAt(scene.position);
  
 
  render();
}

function render(){
  renderer.render(scene,camera);
}

function addBox(x,y,z,c){
  var mat = new THREE.MeshLambertMaterial({color:c});
  var box = new THREE.Mesh( new THREE.BoxGeometry( boxsize,boxsize,boxsize ), mat );
  scene.add(box);
  box.position.x = x;
  box.position.y = y;
  box.position.z = z;
  boxes.push(box);
  TweenMax.from(box.scale,0.3,{x:0.1,y:0.1,z:0.1,ease:Back.easeOut});
}

init();
animate();

//

function setMode(m){
  mode = m;
  switch(mode){
    case 'draw':
        $('#bt-draw').addClass('active');
        $('#bt-erase').removeClass('active');
      break;
    case 'erase':
        $('#bt-draw').removeClass('active');
        $('#bt-erase').addClass('active');
      break;
    }
}

function setPalette(data){
  for(var i = 0; i < data.length; i++){
  var $c = $('<a class="btn color" href="javascript:">&nbsp;</a>').appendTo('#palette-colors');
    $c.css('background',data[i]);
    $c.data('color',data[i]);
    $c.click(function(){
      changeColor($(this).data('color'));
      $('#palette').hide();
    });
  }
}

function changeColor(c){
  console.log(c);
  color = parseInt(c.substring(1,c.length),16);
  $('#bt-color').css('background',c);
}

function makeData(){
  var arr = [];
  for(var i = 0;i < boxes.length;i++){
    arr.push(
      boxes[i].position.x/gridsize,
      boxes[i].position.y/gridsize,
      boxes[i].position.z/gridsize,
      boxes[i].material.color.getHexString()
    );
  }
  return arr;
}

function clear(){
   var box;
  while(box = boxes.pop()){
    scene.remove(box);
  }
  addBox(0,0,0,color);
  controls.center.x = 0;
  controls.center.y = 0;
  controls.center.z = 0;
  camera.position.x = 50;
  camera.position.y = 50;
  camera.position.z = 50;
}

$(function(){
  
  $('#bt-draw').click(function(){
    setMode('draw');
  });
  $('#bt-erase').click(function(){
    setMode('erase');
  });

  setPalette(colors);
  changeColor(colors[0]);

  $('#bt-color').click(function(){
    $('#palette').toggle();
  });
  $('#palette').hide();
});

(function() {
  let scope = null;

  let entities = [];

  let stage = new Iroh.Stage(input.innerText);

  let yidx = 0;

  function pushScope(e) {
    scope = {
      event: e,
      parent: scope
    };
  };

  function popScope() {
    scope = scope.parent;
  };

  let last = "#808080";
  let color = last;

  function updateColor(e) {
    if (e.category === Iroh.PROGRAM) {
      last = color;
      changeColor(color = "#e91e63");
    }
    else if (
      e.category === Iroh.CALL ||
      e.category === Iroh.FUNCTION
    ) {
      last = color;
      changeColor(color = "#4caf50");
    }
    else if (
      e.category === Iroh.IF ||
      e.category === Iroh.ELSE
    ) {
      last = color;
      changeColor(color = "#03a9f4");
    }
    else if (e.category === Iroh.LOOP) {
      last = color;
      changeColor(color = "#ffeb3b");
    }
  };

  // branch helper
  function enter(e) {
    updateColor(e);
    let entity = {
      x: e.indent,
      y: yidx++
    };
    entities.push(entity);
    addBox(entity.x * boxsize, entity.y * boxsize, 0, color);
    pushScope(e);
    changeColor(color = last);
  };
  function leave(e) {
    updateColor(e);
    let entity = {
      x: e.indent,
      y: yidx++
    };
    entities.push(entity);
    addBox(entity.x * boxsize, entity.y * boxsize, 0, color);
    popScope();
    changeColor(color = last);
  };
  function push(e) {

  };

  stage.addListener(Iroh.CALL)
  .on("before", (e) => {
    enter(e);
  })
  .on("after", (e) => {
    leave(e);
  });

  stage.addListener(Iroh.IF)
  .on("enter", (e) => {
    enter(e);
  })
  .on("leave", (e) => {
    leave(e);
  });

  stage.addListener(Iroh.LOOP)
  .on("enter", (e) => {
    enter(e);
  })
  .on("leave", (e) => {
    leave(e);
  });

  stage.addListener(Iroh.PROGRAM)
  .on("enter", (e) => {
    enter(e);
  })
  .on("leave", (e) => {
    leave(e);
  });

  eval.call(window, stage.script);

  console.log(entities);

})();
