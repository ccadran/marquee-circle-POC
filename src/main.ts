import * as THREE from "three";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// Deux scènes séparées
const scene1 = new THREE.Scene(); // Scène pour le texte arrière
const scene2 = new THREE.Scene(); // Scène pour le texte avant

// Une seule caméra partagée
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 5;

// Deux renderers séparés
const canvas1 = document.querySelector("canvas.webgl1") as HTMLCanvasElement;
if (!canvas1) {
  throw new Error("Premier canvas non trouvé");
}
const renderer1 = new THREE.WebGLRenderer({
  canvas: canvas1,
  alpha: true,
  antialias: true,
});
renderer1.setSize(window.innerWidth, window.innerHeight);
renderer1.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const canvas2 = document.querySelector("canvas.webgl2") as HTMLCanvasElement;
if (!canvas2) {
  throw new Error("Deuxième canvas non trouvé");
}
const renderer2 = new THREE.WebGLRenderer({
  canvas: canvas2,
  alpha: true,
  antialias: true,
});
renderer2.setSize(window.innerWidth, window.innerHeight);
renderer2.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Lights pour les deux scènes
const setupLights = (scene: THREE.Scene) => {
  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0xffffff, 1, 100);
  pointLight.position.set(10, 10, 10);
  scene.add(pointLight);
};

setupLights(scene1);
setupLights(scene2);

// FontLoader
const loader = new FontLoader();
let geometry: TextGeometry | undefined;
let textMesh1: THREE.Mesh | undefined;
let textMesh2: THREE.Mesh | undefined;

let material1: THREE.ShaderMaterial;
let material2: THREE.ShaderMaterial;

// Fonction pour charger la police et créer les textes
const loadText = () => {
  loader.load("/fonts/helvetiker_bold.typeface.json", function (font) {
    geometry = new TextGeometry(
      " le zine qui reveille votre ame de pirate\u00A0\u00A0",
      {
        font: font,
        size: 0.5,
        depth: 0.1,
        bevelEnabled: false,
      }
    );

    // Calculer la largeur du texte
    geometry.computeBoundingBox();
    console.log(geometry.boundingBox);

    const textWidth =
      geometry.boundingBox!.max.x + 0.5 - geometry.boundingBox!.min.x;

    const radius = textWidth / (2 * Math.PI);

    material1 = new THREE.ShaderMaterial({
      vertexShader: `
        uniform float uTime;
        uniform float uRadius;
        varying float vAngle;
        varying vec3 vPosition;
        
        void main() {
          float angle = (position.x / uRadius) - uTime * 0.5; // Sens inversé comme demandé
          vec3 newPosition = vec3(
            uRadius * sin(angle),
            position.y,
            uRadius * cos(angle)
          );
          vPosition = newPosition;
          vAngle = angle;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vPosition;
        varying float vAngle;
        
        void main() {
          if (vPosition.z < 0.0) {
            discard; // Rejeter le fragment (rendre transparent)
          } else {
            gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); // Couleur rouge pour les fragments visibles
          }
        }
      `,
      uniforms: {
        uTime: { value: 0.0 },
        uRadius: { value: radius },
      },
      transparent: true,
    });

    material2 = new THREE.ShaderMaterial({
      vertexShader: `
        uniform float uTime;
        uniform float uRadius;
        varying float vAngle;
        varying vec3 vPosition;
        
        void main() {
          float angle = (position.x / uRadius) - uTime * 0.5; // Sens inversé comme demandé
          vec3 newPosition = vec3(
            uRadius * sin(angle),
            position.y,
            uRadius * cos(angle)
          );
          vPosition = newPosition;
          vAngle = angle;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vPosition;
        varying float vAngle;
        
        void main() {
          if (vPosition.z > 0.0) {
            discard; 
          } else {
            gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); // Couleur rouge pour les fragments visibles
          }
        }
      `,
      uniforms: {
        uTime: { value: 0.0 },
        uRadius: { value: radius },
      },
      transparent: true,
    });

    textMesh1 = new THREE.Mesh(geometry, material1);
    textMesh1.geometry.center();
    textMesh1.rotation.x = 0.25;
    textMesh1.rotation.z = 0.25;

    textMesh2 = new THREE.Mesh(geometry.clone(), material2);
    textMesh2.geometry.center();
    textMesh2.rotation.x = 0.25;
    textMesh2.rotation.z = 0.25;

    scene1.add(textMesh1);
    scene2.add(textMesh2);
  });
};

loadText();

// Animation
const clock = new THREE.Clock();

const tick = () => {
  const elapsedTime = clock.getElapsedTime();

  if (textMesh1 && textMesh2) {
    material1.uniforms.uTime.value = elapsedTime;
    material2.uniforms.uTime.value = elapsedTime;
  }

  // Synchroniser le rendu des deux scènes
  renderer1.render(scene1, camera);
  renderer2.render(scene2, camera);

  // Appeler tick à nouveau au prochain frame
  window.requestAnimationFrame(tick);
};

// Ajustement à la taille de la fenêtre
window.addEventListener("resize", () => {
  // Mettre à jour l'aspect de la caméra
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  // Mettre à jour les deux renderers
  renderer1.setSize(window.innerWidth, window.innerHeight);
  renderer2.setSize(window.innerWidth, window.innerHeight);
});

tick();
