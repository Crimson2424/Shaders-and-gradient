import "./style.css"
import { gsap } from "gsap"

import { Rendering } from "./rendering"

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

import { palettes, sinPalettes } from "./palettes";

let paletteKey = "black"
let palette = palettes[paletteKey]
let sinPalette = sinPalettes[paletteKey]

// setting up
let rendering = new Rendering(document.querySelector("#canvas"), palette)
rendering.camera.position.x = 80;

let controls = new OrbitControls(rendering.camera, rendering.canvas)

let uTime = { value: 0 };

// Init

let radius = 2/3
let grid = 20
let cellSize = 1.66
let totalGridSize = grid * cellSize

let geometry = new THREE.CylinderGeometry(radius, radius, 1, 8, 2)
let instancedGeometry = (new THREE.InstancedBufferGeometry()).copy(geometry)
let instanceCount = grid * grid
instancedGeometry.instanceCount = instanceCount

let pos = new Float32Array(instanceCount * 2)

let i = 0
for(let y = 0; y < grid; y++)
for(let x = 0; x < grid; x++){
    pos[i] = x * cellSize - totalGridSize/2 + cellSize/2
    pos[i + 1] = y * cellSize - totalGridSize/2 + cellSize/2
    //Explanation:- here we are multiplying cellSize with our indexes because we are taking cellSize in account as well and to properly center our structure we subtracted half of the total grid size and then added the offset of the cellsize that was half of the cellsize
    i +=2
}

instancedGeometry.setAttribute('aPos', new THREE.InstancedBufferAttribute(pos, 2, false))

//shaders
let vertexShader = glsl`
uniform float uTime;
attribute vec2 aPos;

varying vec2 vUv;
varying float vSquish;

void main(){
  vec3 transformed = position;
  float len = length(aPos);
  float activation = sin(len * 0.3 - uTime * 2.0);  //-1 to 1
  float squish = smoothstep(-1.0, 1.0, activation); //0 to 1

  transformed.y = transformed.y * 0.2 + transformed.y * 0.8 * squish;

  transformed.xz += aPos;

  vUv = uv;
  vSquish = squish;

  if(position.y > 0.49999){
    vUv.y = 1.0;
  }

  if(position.y < -0.49999){
    vUv.y = 0.0;
  }

  gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
}

`

let fragmentShader = glsl`
#define PI 3.141592653589793

//Background color
uniform vec3 uBackground;

//Cosine palette
uniform vec3  uPallete0;
uniform vec3 uPallete1;
uniform vec3 uPallete2;
uniform vec3 uPallete3;
uniform float uPalleteOffset;

varying vec2 vUv;
varying float vSquish;

// cosine based palette, 4 vec3 params
vec3 palette( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d )
{
    return a + b*cos( 6.283185*(c*t+d) );
}

void main(){
  vec3 color = vec3(0.0);

  vec3 paletteColor = palette(vSquish + uPalleteOffset, uPallete0, uPallete1, uPallete2, uPallete3);

  color = mix(paletteColor, uBackground, cos(vSquish * PI * 2.0));

  color = mix(uBackground, color, vUv.y);

  gl_FragColor = vec4(color, 1.0);
}

`

let material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms:{
    uTime: uTime,
    uBackground: {value: palette.BG},
    uPallete0: {value: sinPalette.c0},
    uPallete1: {value: sinPalette.c1},
    uPallete2: {value: sinPalette.c2},
    uPallete3: {value: sinPalette.c3},
    uPalleteOffset: {value: sinPalette.offset},
  }
})

let mesh = new THREE.Mesh(instancedGeometry, material)
mesh.scale.y = 10
mesh.rotation.z = -Math.PI/2
mesh.position.x = -totalGridSize /2 - 5
rendering.scene.add(mesh)

let meshBottom = new THREE.Mesh(instancedGeometry, material)
meshBottom.scale.y = 10
meshBottom.position.y = -totalGridSize /2 - 5
rendering.scene.add(meshBottom)

let meshTop = new THREE.Mesh(instancedGeometry, material)
meshTop.scale.y = 10
meshTop.rotation.z = Math.PI
meshTop.position.y = totalGridSize /2 + 5
rendering.scene.add(meshTop)

let meshLeft = new THREE.Mesh(instancedGeometry, material)
meshLeft.scale.y = 10
meshLeft.rotation.x = Math.PI /2
meshLeft.position.z = -totalGridSize /2 - 5
rendering.scene.add(meshLeft)

let meshright = new THREE.Mesh(instancedGeometry, material)
meshright.scale.y = 10
meshright.rotation.x = -Math.PI /2
meshright.position.z = totalGridSize /2 + 5
rendering.scene.add(meshright)


// Events

const tick = (t)=>{
  uTime.value = t 
  rendering.render()
}

gsap.ticker.add(tick)
