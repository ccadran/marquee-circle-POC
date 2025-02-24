import * as THREE from "three";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TTFLoader } from "three/examples/jsm/loaders/TTFLoader.js";

// Types pour les shaders
interface ShaderMaterialUniforms {
  uTime: { value: number };
  uRadius: { value: number };
  [uniform: string]: THREE.IUniform<any>;
}

// Initialisation de la scène, caméra et rendu

const scene1 = new THREE.Scene();
const scene2 = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 5;

const createRenderer = (canvasSelector: string): THREE.WebGLRenderer => {
  const canvas = document.querySelector(canvasSelector) as HTMLCanvasElement;
  if (!canvas) throw new Error(`Canvas ${canvasSelector} non trouvé`);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  return renderer;
};

const renderer1 = createRenderer("canvas.webgl1");
const renderer2 = createRenderer("canvas.webgl2");

// Chargement de la police et création du texte
const fontLoader = new FontLoader();
let textMesh1: THREE.Mesh | undefined;
let textMesh2: THREE.Mesh | undefined;
let material1: THREE.ShaderMaterial;
let material2: THREE.ShaderMaterial;

const createTextMaterials = (
  radius: number
): [THREE.ShaderMaterial, THREE.ShaderMaterial] => {
  const createMaterial = (isFront: boolean): THREE.ShaderMaterial =>
    new THREE.ShaderMaterial({
      vertexShader: `
        uniform float uTime;
        uniform float uRadius;
        varying vec3 vPosition;
        void main() {
          float angle = (position.x / uRadius) - uTime * 0.5;
          vec3 newPosition = vec3(
            uRadius * sin(angle),
            position.y,
            uRadius * cos(angle)
          );
          vPosition = newPosition;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vPosition;
        void main() {
          if (${isFront ? "vPosition.z < 0.0" : "vPosition.z > 0.0"}) {
            discard;
          } else {
            gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
          }
        }
      `,
      uniforms: {
        uTime: { value: 0.0 },
        uRadius: { value: radius },
      } as ShaderMaterialUniforms,
      transparent: true,
    });

  return [createMaterial(true), createMaterial(false)];
};
const ttfLoader = new TTFLoader();

ttfLoader.load("/fonts/Syne-ExtraBold.ttf", (fontData) => {
  const font = fontLoader.parse(fontData);
  const geometry = new TextGeometry(
    "LE ZINE QUI RÉVEILLE VOTRE ÂME DE PIRATE",
    {
      font,
      size: 0.3,
      depth: 0.1,
    }
  );

  geometry.computeBoundingBox();
  if (!geometry.boundingBox) return;
  const textWidth =
    geometry.boundingBox.max.x - geometry.boundingBox.min.x + 0.5;
  const radius = textWidth / (2 * Math.PI);

  [material1, material2] = createTextMaterials(radius);

  textMesh1 = new THREE.Mesh(geometry, material1);
  textMesh2 = new THREE.Mesh(geometry.clone(), material2);

  [textMesh1, textMesh2].forEach((mesh) => {
    mesh.geometry.center();
    mesh.rotation.set(0.25, 0, 0.25);
  });

  scene1.add(textMesh1);
  scene2.add(textMesh2);
});

// Animation
const clock = new THREE.Clock();
const tick = (): void => {
  const elapsedTime = clock.getElapsedTime();
  if (textMesh1 && textMesh2) {
    material1.uniforms.uTime.value = elapsedTime;
    material2.uniforms.uTime.value = elapsedTime;
  }

  renderer1.render(scene1, camera);
  renderer2.render(scene2, camera);
  requestAnimationFrame(tick);
};
tick();

// Resize handler
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  [renderer1, renderer2].forEach((renderer) =>
    renderer.setSize(window.innerWidth, window.innerHeight)
  );
});
