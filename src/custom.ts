import * as THREE from "three";
import { MSDFTextGeometry, uniforms } from "three-msdf-text-utils";
import vertexShader from "./shaders/vertex.glsl";
import fragmentShader from "./shaders/fragment.glsl";
import fnt from "./fonts/Syne-ExtraBold-msdf.json";
import atlasURL from "./fonts/Syne-ExtraBold.png";

export class MarqueeCircle extends HTMLElement {
  src = "";
  textContent = "";

  private config = {
    textScaleMultiplier: window.innerWidth < 440 ? 0.035 : 0.025,
    imgScaleMultiplier: 0.003,
  };

  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private textMesh: THREE.Mesh | null = null;
  private plane: THREE.Mesh | null = null;
  private textMaterial: THREE.ShaderMaterial | null = null;
  private sizes = { width: 0, height: 0 };

  connectedCallback() {
    this.src = this.getAttribute("img-src") || "./yo.jpg";
    this.textContent =
      this.getAttribute("textContent")?.toUpperCase() || "DEFAULT TEXT";

    this.init();
  }

  disconnectedCallback() {
    this.cleanup();
  }

  //INIT THREE.JS SCENE
  private initScene() {
    const canvas = document.createElement("canvas");
    canvas.classList.add("webgl1");
    this.appendChild(canvas);

    this.sizes = {
      width: this.clientWidth,
      height: this.clientHeight,
    };

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.sizes.width / this.sizes.height,
      0.1,
      1000
    );
    this.camera.position.z = 5;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    this.renderer.setSize(this.sizes.width, this.sizes.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private loadTexture(src: string): Promise<THREE.Mesh> {
    return new Promise((resolve) => {
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(src, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        const planeGeometry = new THREE.PlaneGeometry(2, 2);
        const planeMaterial = new THREE.MeshBasicMaterial({ map: texture });
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        const scale = this.sizes.width * this.config.imgScaleMultiplier;
        plane.scale.set(scale, scale, scale);
        this.scene?.add(plane);

        resolve(plane);
      });
    });
  }

  private loadFontAtlas(path: string): Promise<THREE.Texture> {
    return new Promise((resolve) => {
      const loader = new THREE.TextureLoader();
      loader.load(path, resolve);
    });
  }

  private createTextMesh(
    font: any,
    atlas: THREE.Texture,
    textContent: string
  ): { textMesh: THREE.Mesh; textMaterial: THREE.ShaderMaterial } {
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

    const { scale, textWidth } = this.calculateScale(textMesh);
    textMesh.scale.set(scale, -scale, scale);

    const radius = textWidth / (2 * Math.PI);
    textMaterial.uniforms.uRadius.value = radius;

    textMesh.rotation.x = 0.15;
    textMesh.rotation.z = 0.15;

    return { textMesh, textMaterial };
  }

  //SCALE CALCULATION
  private calculateScale(textMesh: THREE.Mesh) {
    textMesh.geometry.computeBoundingBox();

    if (!textMesh.geometry.boundingBox) return { scale: 1, textWidth: 1 };

    const textWidth =
      textMesh.geometry.boundingBox.max.x -
      textMesh.geometry.boundingBox.min.x +
      20.5;

    const targetWidth = this.sizes.width * this.config.textScaleMultiplier;

    return {
      scale: targetWidth / textWidth,
      textWidth,
    };
  }

  //SCALE UPDATE
  private updateTextScale() {
    if (!this.textMesh || !this.plane) return;

    const planeScale = this.sizes.width * this.config.imgScaleMultiplier;
    const { scale } = this.calculateScale(this.textMesh);

    this.textMesh.scale.set(scale, -scale, scale);
    this.plane.scale.set(planeScale, planeScale, planeScale);
  }

  //TICK ANIMATION
  private startAnimation() {
    const clock = new THREE.Clock();

    const tick = () => {
      const elapsedTime = clock.getElapsedTime();
      if (this.textMaterial) {
        this.textMaterial.uniforms.uTime.value = elapsedTime;
      }
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
      requestAnimationFrame(tick);
    };
    tick();
  }

  //RESIZE LISTENER
  private setupResizeListener() {
    const onWindowResize = () => {
      this.sizes.width = this.clientWidth;
      this.sizes.height = this.clientHeight;

      this.config.textScaleMultiplier = this.sizes.width < 440 ? 0.035 : 0.025;

      if (this.camera) {
        this.camera.aspect = this.sizes.width / this.sizes.height;
        this.camera.updateProjectionMatrix();
      }

      if (this.renderer) {
        this.renderer.setSize(this.sizes.width, this.sizes.height);
      }

      this.updateTextScale();
    };

    window.addEventListener("resize", onWindowResize);
  }

  // Initialisation de l'application
  private async init() {
    this.initScene();

    this.plane = await this.loadTexture(this.src);

    const atlas = await this.loadFontAtlas(atlasURL);

    const { textMesh, textMaterial } = this.createTextMesh(
      fnt,
      atlas,
      this.textContent
    );
    this.textMesh = textMesh;
    this.textMaterial = textMaterial;
    this.scene?.add(textMesh);

    this.startAnimation();
    this.setupResizeListener();
  }

  // Nettoyage
  private cleanup() {
    if (this.renderer) {
      this.renderer.dispose();
    }
    window.removeEventListener("resize", this.setupResizeListener);
  }
}

export function registerMarqueeCircle() {
  if (!customElements.get("marquee-circle")) {
    customElements.define("marquee-circle", MarqueeCircle);
  }
}
