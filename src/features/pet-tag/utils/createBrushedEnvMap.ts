import * as THREE from "three";

/**
 * Generates a lightbox-style equirectangular envMap tuned for brushed metal.
 * Bright bands at top/bottom + dark middle — when combined with anisotropy={1}
 * and a horizontal brush direction, Three.js stretches those bands into the
 * characteristic horizontal streaks of a brushed metal surface.
 */
export function createBrushedEnvMap(gl: THREE.WebGLRenderer): THREE.Texture {
  const W = 1024;
  const H = 512;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Primary vertical gradient: bright top/bottom lights, dark equatorial band
  const vGrad = ctx.createLinearGradient(0, 0, 0, H);
  vGrad.addColorStop(0.00, "#dcdcdc"); // ceiling softbox
  vGrad.addColorStop(0.10, "#787878");
  vGrad.addColorStop(0.30, "#2a2a2a");
  vGrad.addColorStop(0.50, "#181818"); // dark equator
  vGrad.addColorStop(0.70, "#2a2a2a");
  vGrad.addColorStop(0.90, "#787878");
  vGrad.addColorStop(1.00, "#dcdcdc"); // floor bounce

  ctx.fillStyle = vGrad;
  ctx.fillRect(0, 0, W, H);

  // Subtle side fill so left/right rotation stays lit
  const hGrad = ctx.createLinearGradient(0, 0, W, 0);
  hGrad.addColorStop(0.00, "rgba(200,200,200,0.25)");
  hGrad.addColorStop(0.15, "rgba(200,200,200,0.00)");
  hGrad.addColorStop(0.85, "rgba(200,200,200,0.00)");
  hGrad.addColorStop(1.00, "rgba(200,200,200,0.25)");

  ctx.fillStyle = hGrad;
  ctx.fillRect(0, 0, W, H);

  const equiTex = new THREE.CanvasTexture(canvas);
  equiTex.mapping = THREE.EquirectangularReflectionMapping;
  equiTex.colorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(gl);
  pmrem.compileEquirectangularShader();
  const envMap = pmrem.fromEquirectangular(equiTex).texture;

  pmrem.dispose();
  equiTex.dispose();

  return envMap;
}
