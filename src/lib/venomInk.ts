/**
 * Venom ink transition — field generator.
 *
 * We render (once per splash, on the GPU) an "arrival time" field: for every
 * pixel, a 0..1 value saying WHEN the ink reaches it. It is distance from the
 * toggle, pushed around by domain-warped noise sampled in polar space, so the
 * front breaks into feathery, outward-streaked fingers with marbled veins and
 * stray blobs ahead of it — like ink poured into milk.
 *
 * During the transition an SVG mask thresholds that field at time t
 * (visible where field < t), revealing the new theme through the ink.
 */

export type InkSettings = {
  /** total duration in ms */
  duration: number;
  /** how far the noise pushes the front around (0..0.8) */
  turbulence: number;
  /** domain-warp strength: how swirly / marbled the ink looks (0..2) */
  swirl: number;
  /** strength of the thin light veins left inside the ink (0..0.4) */
  veins: number;
  /** angular detail of the streaks (2..12) */
  detail: number;
};

export const DEFAULT_INK: InkSettings = {
  duration: 2400,
  turbulence: 0.32,
  swirl: 1.5,
  veins: 0.2,
  detail: 3.2,
};

/** Field values span 0..1; edge sharpness of the threshold in field units. */
export const EDGE_SHARPNESS = 55;

const VERT = `
attribute vec2 a;
void main(){ gl_Position = vec4(a, 0.0, 1.0); }
`;

// 3D simplex noise: Ian McEwan / Ashima Arts (MIT)
const FRAG = `
precision highp float;
uniform vec2 uRes;     // field size in device px
uniform vec2 uView;    // viewport size in css px
uniform vec2 uOrigin;  // css px, y down
uniform float uMaxD;
uniform float uSeed;
uniform float uAmp;
uniform float uSwirl;
uniform float uVeins;
uniform float uDetail;

vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){
  float a=0.5, s=0.0;
  for(int i=0;i<5;i++){ s+=a*snoise(p); p=p*2.03+vec3(1.7,9.2,3.4); a*=0.42; }
  return s;
}

void main(){
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) * (uView.x / uRes.x);
  vec2 rel = px - uOrigin;
  float dist = length(rel);
  float d = dist / uMaxD;
  vec2 dir = rel / max(dist, 0.001);
  float sd = uSeed;

  // polar sample point: high angular frequency, low radial -> outward streaks
  vec3 pp = vec3(dir * uDetail, d * 3.6 + sd);

  // domain warp for the marbled swirl
  vec3 w = vec3(
    fbm(pp * 0.9 + vec3(sd * 1.3, 4.1, 2.7)),
    fbm(pp * 0.9 + vec3(7.3, sd * 0.7, 1.9)),
    fbm(pp * 0.9 + vec3(3.3, 5.5, sd))
  ) * uSwirl;

  float n = fbm(pp + w);                                   // streaky front
  vec2 c = px / min(uView.x, uView.y);
  float b = fbm(vec3(c * 1.4, sd * 0.37) + w * 0.9);       // blobby lumps / islands

  // thin ridged veins that arrive late -> light marble lines inside the ink
  float r = 1.0 - abs(snoise(vec3(dir * uDetail * 1.3, d * 6.0 + sd * 2.0) + w * 1.8));
  r = pow(r, 7.0);
  float r2 = 1.0 - abs(snoise(vec3(c * 3.4, sd * 1.9) + w * 1.6));
  r2 = pow(r2, 10.0);

  float grow = smoothstep(0.0, 0.18, d);
  float T = d
          + uAmp * (0.38 * n + 0.62 * b) * grow
          + uVeins * (r + 0.7 * r2) * smoothstep(0.04, 0.3, d);

  // arrival of the farthest corner ~= 1; late veins clamp to 1 and linger till the end
  float hi = 1.0 + uAmp * 0.3 + uVeins * 0.3;
  float v = clamp(T / hi, 0.0, 1.0);
  gl_FragColor = vec4(v, v, v, 1.0);
}
`;

let gl: WebGLRenderingContext | null = null;
let prog: WebGLProgram | null = null;
let canvas: HTMLCanvasElement | null = null;

function setup() {
  if (gl) return gl;
  canvas = document.createElement("canvas");
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, antialias: false });
  if (!gl) return null;
  const sh = (type: number, src: string) => {
    const s = gl!.createShader(type)!;
    gl!.shaderSource(s, src);
    gl!.compileShader(s);
    if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) throw new Error(gl!.getShaderInfoLog(s) ?? "shader");
    return s;
  };
  prog = gl.createProgram()!;
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "a");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  return gl;
}

export type InkField = { url: string; width: number; height: number };

/** Render the arrival-time field for a splash from (ox, oy). Returns a blob URL. */
export async function renderInkField(
  ox: number,
  oy: number,
  width: number,
  height: number,
  s: InkSettings,
  seed = Math.random() * 100,
): Promise<InkField | null> {
  const g = setup();
  if (!g || !canvas || !prog) return null;

  // render at ~0.6x css size (thresholding the upscaled field keeps edges crisp)
  const scale = Math.min(0.6, 1100 / Math.max(width, height));
  canvas.width = Math.max(64, Math.round(width * scale));
  canvas.height = Math.max(64, Math.round(height * scale));
  g.viewport(0, 0, canvas.width, canvas.height);

  const maxD = Math.max(
    Math.hypot(ox, oy),
    Math.hypot(width - ox, oy),
    Math.hypot(ox, height - oy),
    Math.hypot(width - ox, height - oy),
  );
  const u = (n: string) => g.getUniformLocation(prog!, n);
  g.uniform2f(u("uRes"), canvas.width, canvas.height);
  g.uniform2f(u("uView"), width, height);
  g.uniform2f(u("uOrigin"), ox, oy);
  g.uniform1f(u("uMaxD"), maxD);
  g.uniform1f(u("uSeed"), seed);
  g.uniform1f(u("uAmp"), s.turbulence);
  g.uniform1f(u("uSwirl"), s.swirl);
  g.uniform1f(u("uVeins"), s.veins);
  g.uniform1f(u("uDetail"), s.detail);
  g.drawArrays(g.TRIANGLE_STRIP, 0, 4);

  const blob = await new Promise<Blob | null>((res) => canvas!.toBlob(res, "image/png"));
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  // make sure it is decoded before anyone masks with it
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch {}
  return { url, width, height };
}

/** feColorMatrix values that show the ink where field < t (soft edge). */
export function thresholdMatrix(t: number) {
  const S = EDGE_SHARPNESS;
  const o = (S * t).toFixed(4);
  return `${-S} 0 0 0 ${o}  ${-S} 0 0 0 ${o}  ${-S} 0 0 0 ${o}  0 0 0 1 0`;
}

/** slow start, quick middle, lingering tail — like ink finding its way */
export function inkEase(p: number) {
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2.2) / 2;
}
