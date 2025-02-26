import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  MSDFTextGeometry,
  MSDFTextMaterial,
  uniforms,
} from "three-msdf-text-utils";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import vertexShader from "./shaders/vertex.glsl";
import fragmentShader from "./shaders/fragment.glsl";
import fnt from "./fonts/Syne-ExtraBold-msdf.json";
import atlasURL from "./fonts/Syne-ExtraBold.png";

// Configuration
const config = {
  textScaleMultiplier: window.innerWidth < 440 ? 0.035 : 0.025,
  imgScaleMultiplier: 0.003,
};

// Initialisation de la scène, caméra et rendu
const initScene = (container) => {
  const canvas = document.querySelector("canvas.webgl1");
  const sizes = {
    width: container.clientWidth,
    height: container.clientHeight,
  };

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75,
    sizes.width / sizes.height,
    0.1,
    1000
  );
  camera.position.z = 5;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = false;
  controls.maxPolarAngle = Math.PI;

  return { scene, camera, renderer, sizes, controls };
};

// Chargement de la texture
const loadTexture = (url, scene, sizes) => {
  const textureLoader = new THREE.TextureLoader();
  return new Promise((resolve) => {
    textureLoader.load(url, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      const planeGeometry = new THREE.PlaneGeometry(2, 2);
      const planeMaterial = new THREE.MeshBasicMaterial({ map: texture });
      const plane = new THREE.Mesh(planeGeometry, planeMaterial);
      const scale = sizes.width * config.imgScaleMultiplier;
      plane.scale.set(scale, scale, scale);
      scene.add(plane);
      resolve(plane);
    });
  });
};

// Chargement de l'atlas de police
const loadFontAtlas = (path) => {
  return new Promise((resolve) => {
    const loader = new THREE.TextureLoader();
    loader.load(path, resolve);
  });
};
const calculateScale = (textMesh, sizes) => {
  textMesh.geometry.computeBoundingBox(); // Assurez-vous que la boundingBox est calculée
  const textWidth =
    textMesh.geometry.boundingBox.max.x -
    textMesh.geometry.boundingBox.min.x +
    0.5;
  const targetWidth = sizes.width * config.textScaleMultiplier;

  return {
    scale: targetWidth / textWidth, // Échelle calculée
    textWidth: textWidth, // Largeur du texte
  };
};

// Création du texte MSDF
const createTextMesh = (font, atlas, sizes) => {
  const geometry = new MSDFTextGeometry({
    text: "LE ZINE QUI RÉVEILLE VOTRE ÂME DE PIRATE LE ZINE QUI RÉVEILLE VOTRE ÂME DE PIRATE",
    font: font,
  });

  const textMaterial = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    blending: THREE.AdditiveBlending,
    defines: { IS_SMALL: false },
    extensions: { derivatives: true },
    uniforms: {
      ...uniforms.common,
      ...uniforms.rendering,
      ...uniforms.strokes,
      uTime: { value: 0.0 },
      uRadius: { value: 0 },
      uOvalFactor: { value: 1.0 },
    },
    vertexShader,
    fragmentShader,
  });

  textMaterial.uniforms.uMap.value = atlas;

  const textMesh = new THREE.Mesh(geometry, textMaterial);

  const { scale, textWidth } = calculateScale(textMesh, sizes);
  console.log(scale, textWidth);

  textMesh.scale.set(scale, -scale, scale);

  const radius = textWidth / (2 * Math.PI);
  textMaterial.uniforms.uRadius.value = radius;

  textMesh.rotation.x = 0.15;
  textMesh.rotation.z = 0.15;

  return { textMesh, textMaterial };
};

// Mise à jour de l'échelle du texte
const updateTextScale = (textMesh, plane, sizes) => {
  if (!textMesh || !plane) return;

  const planeScale = sizes.width * config.imgScaleMultiplier;
  const { scale, textWidth } = calculateScale(textMesh, sizes);

  textMesh.scale.set(scale, -scale, scale);
  plane.scale.set(planeScale, planeScale, planeScale);
};

// Animation
const startAnimation = (renderer, scene, camera, textMaterial) => {
  const clock = new THREE.Clock();
  const tick = () => {
    const elapsedTime = clock.getElapsedTime();
    if (textMaterial) {
      textMaterial.uniforms.uTime.value = elapsedTime;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  };
  tick();
};

// Gestion du redimensionnement
const setupResizeListener = (
  camera,
  renderer,
  sizes,
  textMesh,
  plane,
  container
) => {
  const onWindowResize = () => {
    sizes.width = container.clientWidth;
    sizes.height = container.clientHeight;

    config.textScaleMultiplier = sizes.width < 440 ? 0.035 : 0.025;

    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
    renderer.setSize(sizes.width, sizes.height);
    updateTextScale(textMesh, plane, sizes);
  };

  window.addEventListener("resize", onWindowResize);
};

// Initialisation de l'application
const initApp = async () => {
  const container = document.querySelector(".container");
  const { scene, camera, renderer, sizes, controls } = initScene(container);

  const plane = await loadTexture("/test.jpg", scene, sizes);
  const atlas = await loadFontAtlas(atlasURL);

  const { textMesh, textMaterial } = createTextMesh(fnt, atlas, sizes);
  scene.add(textMesh);

  startAnimation(renderer, scene, camera, textMaterial);
  setupResizeListener(camera, renderer, sizes, textMesh, plane, container);
};

// Lancement de l'application
initApp();
