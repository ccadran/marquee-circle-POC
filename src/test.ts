import * as THREE from "three";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 5;

// Renderer
const canvas = document.querySelector("canvas.webgl2") as HTMLCanvasElement;
if (!canvas) {
  throw new Error("Canvas element not found");
}
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  alpha: true,
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
// Lights
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 1, 100);
pointLight.position.set(10, 10, 10);
scene.add(pointLight);

// FontLoader
const loader = new FontLoader();
let geometry: TextGeometry | undefined;
let textMesh1: THREE.Mesh | undefined;

let material1: THREE.ShaderMaterial;

// Fonction pour charger la police et créer le texte
const loadText = () => {
  loader.load("/fonts/helvetiker_bold.typeface.json", function (font) {
    geometry = new TextGeometry("le zine qui reveille votre ame de pirate", {
      font: font,
      size: 0.5,
      depth: 0.1,
      bevelEnabled: false,
    });

    // Calculer la largeur du texte
    geometry.computeBoundingBox();
    const textWidth = geometry.boundingBox!.max.x - geometry.boundingBox!.min.x;

    // Calculer le rayon en fonction de la largeur du texte
    const radius = textWidth / (2 * Math.PI); // Circonférence = 2 * π * r

    // Création du premier matériau (cos sur z, sin sur x)
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
          if (vPosition.z > 0.0) {
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
      transparent: true, // Activer la transparence
    });

    // Création des meshes avec la géométrie et les matériaux
    textMesh1 = new THREE.Mesh(geometry, material1);
    textMesh1.geometry.center();

    textMesh1.rotation.x = 0.25;

    // Ajouter les textes à la scène
    scene.add(textMesh1);
  });
};

// Appeler cette fonction pour charger la police et créer le texte
loadText();

// Contrôles de la caméra
const controls = new OrbitControls(camera, canvas);

// Animation
const clock = new THREE.Clock();

const tick = () => {
  const elapsedTime = clock.getElapsedTime();

  // Mettre à jour les matériaux uniquement si les textes sont chargés
  if (textMesh1) {
    material1.uniforms.uTime.value = elapsedTime;
  }

  // Mettre à jour les contrôles
  controls.update();

  // Rendu
  renderer.render(scene, camera);

  // Appeler tick à nouveau au prochain frame
  window.requestAnimationFrame(tick);
};

// Ajustement à la taille de la fenêtre
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

tick();
