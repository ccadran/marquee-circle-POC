import * as THREE from "three";
import { MSDFTextGeometry, uniforms } from "three-msdf-text-utils";
import vertexShader from "./shaders/vertex.glsl";
import fragmentShader from "./shaders/fragment.glsl";
import fnt from "./fonts/Syne-ExtraBold-msdf.json";
import atlasURL from "./fonts/Syne-ExtraBold.png";

// Définition des types
interface Config {
  textScaleMultiplier: number;
  imgScaleMultiplier: number;
}

// Configuration globale
const config: Config = {
  textScaleMultiplier: window.innerWidth < 440 ? 0.035 : 0.025,
  imgScaleMultiplier: 0.003,
};

// INIT SCENE / CAMERA / RENDERER
const initScene = (container: HTMLElement) => {
  const canvas = document.querySelector("canvas.webgl1") as HTMLCanvasElement;
  if (!canvas) throw new Error("Canvas not found");

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

  return { scene, camera, renderer, sizes };
};

// LOAD PLANE TEXTURE
const loadTexture = (
  src: string,
  scene: THREE.Scene,
  sizes: { width: number; height: number }
): Promise<THREE.Mesh> => {
  const textureLoader = new THREE.TextureLoader();
  return new Promise((resolve) => {
    textureLoader.load(src, (texture) => {
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

// LOAD FONT ATLAS
const loadFontAtlas = (path: string): Promise<THREE.Texture> => {
  return new Promise((resolve) => {
    const loader = new THREE.TextureLoader();
    loader.load(path, resolve);
  });
};

// CALCULATE SCALE
const calculateScale = (
  textMesh: THREE.Mesh,
  sizes: { width: number; height: number }
) => {
  textMesh.geometry.computeBoundingBox();

  if (!textMesh.geometry.boundingBox) return { scale: 1, textWidth: 1 };

  const textWidth =
    textMesh.geometry.boundingBox.max.x -
    textMesh.geometry.boundingBox.min.x +
    20.5;

  const targetWidth = sizes.width * config.textScaleMultiplier;

  return {
    scale: targetWidth / textWidth,
    textWidth,
  };
};

// MSDF TEXT MESH
const createTextMesh = (
  font: any,
  atlas: THREE.Texture,
  sizes: { width: number; height: number },
  textContent: string
) => {
  const geometry = new MSDFTextGeometry({
    text: textContent,
    font: font,
  });

  const textMaterial = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    blending: THREE.AdditiveBlending,
    defines: { IS_SMALL: false },
    uniforms: {
      ...uniforms.common,
      ...uniforms.rendering,
      ...uniforms.strokes,
      uTime: { value: 0.0 },
      uRadius: { value: 0 },
      uOvalFactor: { value: 1.0 },
      uMap: { value: atlas },
    },
    vertexShader,
    fragmentShader,
  });

  const textMesh = new THREE.Mesh(geometry, textMaterial);

  const { scale, textWidth } = calculateScale(textMesh, sizes);
  textMesh.scale.set(scale, -scale, scale);

  const radius = textWidth / (2 * Math.PI);
  textMaterial.uniforms.uRadius.value = radius;

  textMesh.rotation.x = 0.15;
  textMesh.rotation.z = 0.15;

  return { textMesh, textMaterial };
};

// UPDATE SCALE OF TEXT AND PLANE
const updateTextScale = (
  textMesh: THREE.Mesh,
  plane: THREE.Mesh,
  sizes: { width: number; height: number }
) => {
  if (!textMesh || !plane) return;

  const planeScale = sizes.width * config.imgScaleMultiplier;
  const { scale } = calculateScale(textMesh, sizes);

  textMesh.scale.set(scale, -scale, scale);
  plane.scale.set(planeScale, planeScale, planeScale);
};

// TICK ANIM
const startAnimation = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  textMaterial: THREE.ShaderMaterial
) => {
  const clock = new THREE.Clock();

  const tick = () => {
    const elapsedTime = clock.getElapsedTime();
    textMaterial.uniforms.uTime.value = elapsedTime;

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  };
  tick();
};

// RESIZE LISTENER
const setupResizeListener = (
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  sizes: { width: number; height: number },
  textMesh: THREE.Mesh,
  plane: THREE.Mesh,
  container: HTMLElement
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

// INIT ANIM
const initMarquee = async () => {
  const container = document.querySelector(".container") as HTMLElement;
  if (!container) throw new Error("Container not found");

  const { scene, camera, renderer, sizes } = initScene(container);

  const imgElement = document.querySelector("img") as HTMLImageElement;
  if (!imgElement) throw new Error("Image not found");

  const plane = await loadTexture(imgElement.src, scene, sizes);
  const atlas = await loadFontAtlas(atlasURL);

  const textElement = document.querySelector(".text") as HTMLElement;
  if (!textElement) throw new Error("Text element not found");

  const textContent = textElement.textContent?.toUpperCase() || "DEFAULT TEXT";

  const { textMesh, textMaterial } = createTextMesh(
    fnt,
    atlas,
    sizes,
    textContent
  );
  scene.add(textMesh);

  startAnimation(renderer, scene, camera, textMaterial);
  setupResizeListener(camera, renderer, sizes, textMesh, plane, container);
};

initMarquee();
