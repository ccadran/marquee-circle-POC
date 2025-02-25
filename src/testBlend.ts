import * as THREE from "three";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TTFLoader } from "three/examples/jsm/loaders/TTFLoader.js";

// Types pour les shaders
interface ShaderMaterialUniforms {
  uTime: { value: number };
  uRadius: { value: number };
  uOvalFactor: { value: number };
  [uniform: string]: THREE.IUniform<any>;
}

// Initialisation de la scène, caméra et rendu
const canvas = document.querySelector("canvas.webgl1") as HTMLCanvasElement;
const container = document.querySelector(".container") as HTMLDivElement;
const sizes = {
  width: container.clientWidth,
  height: container.clientHeight,
};
console.log(sizes);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  1000
);
camera.position.z = 5;
camera.position.y = -0.5;

const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const fontLoader = new FontLoader();
let textMesh: THREE.Mesh | undefined;
let material: THREE.ShaderMaterial;

const createTextMaterial = (radius: number): THREE.ShaderMaterial => {
  return new THREE.ShaderMaterial({
    vertexShader: `
      uniform float uTime;
      uniform float uRadius;
      uniform float uOvalFactor;
      varying vec3 vPosition;
      void main() {
        float angle = (position.x / uRadius) - uTime * 0.3;
        vec3 newPosition = vec3(
          uRadius * sin(angle),
          position.y,
          uRadius * cos(angle) * uOvalFactor
        );
        vPosition = newPosition;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vPosition;
      void main() {
          gl_FragColor = vec4(0.585, 0.148, 0.672, 1.0);
          
      }
    `,
    uniforms: {
      uTime: { value: 0.0 },
      uRadius: { value: radius },
      uOvalFactor: { value: 0.5 },
    } as ShaderMaterialUniforms,
    transparent: true,
    blending: THREE.AdditiveBlending,
    alphaToCoverage: true,
  });
};
const textureLoader = new THREE.TextureLoader();
textureLoader.load("/test.jpg", (texture) => {
  texture.colorSpace = THREE.SRGBColorSpace;

  const planeGeometry = new THREE.PlaneGeometry(2, 2);
  const planeMaterial = new THREE.MeshBasicMaterial({
    map: texture,

    // transparent: true,
  });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.position.set(0, 0, 0);
  scene.add(plane);
});

const ttfLoader = new TTFLoader();

ttfLoader.load("/fonts/Syne-ExtraBold.ttf", (fontData) => {
  const font = fontLoader.parse(fontData);
  const geometry = new TextGeometry(
    "LE ZINE QUI RÉVEILLE VOTRE ÂME DE PIRATE",
    {
      font,
      size: 0.5,
      depth: 2,
    }
  );

  geometry.computeBoundingBox();
  if (!geometry.boundingBox) return;

  const targetWidth = sizes.width * 0.03;

  let textWidth = geometry.boundingBox.max.x - geometry.boundingBox.min.x + 0.5;
  const scale = targetWidth / textWidth;
  geometry.scale(scale, scale, scale);

  textWidth *= scale;

  const radius = textWidth / (2 * Math.PI);

  material = createTextMaterial(radius);

  textMesh = new THREE.Mesh(geometry, material);
  textMesh.geometry.center();
  textMesh.rotation.set(0.25, 0.25, 0.25);
  textMesh.position.x = 0.05;

  scene.add(textMesh);
});

const updateTextScale = () => {
  if (!textMesh) return;

  const targetWidth = sizes.width * 0.03;

  const textWidth =
    textMesh.geometry.boundingBox!.max.x -
    textMesh.geometry.boundingBox!.min.x +
    0.5;
  const scale = targetWidth / textWidth;

  console.log("targetWidth", targetWidth);
  console.log("textWidth", textWidth);
  console.log("scale", scale);

  textMesh.scale.set(scale, scale, scale);
};

// Animation
const clock = new THREE.Clock();
const tick = (): void => {
  const elapsedTime = clock.getElapsedTime();
  if (textMesh) {
    material.uniforms.uTime.value = elapsedTime;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
};
tick();

const onWindowResize = (): void => {
  sizes.width = container.clientWidth;
  sizes.height = container.clientHeight;

  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);

  updateTextScale();
};

window.addEventListener("resize", onWindowResize);

onWindowResize();
