/**
 * Raymarched liquid: a signed-distance blob that morphs between shapes,
 * reaches for the cursor, grows ferrofluid spikes and splits into droplets.
 * Shaded as wet obsidian in day mode and dark chrome with a red rim at night.
 */
export const ENTITY_VERT = `
attribute vec2 a;
void main(){ gl_Position = vec4(a, 0.0, 1.0); }
`;

export const ENTITY_FRAG = `
precision highp float;

uniform vec2  uRes;      // drawing buffer px
uniform float uK;        // buffer px per css px
uniform float uTime;
uniform vec2  uPos;      // entity centre, css px (y down)
uniform float uScale;    // entity radius, css px
uniform vec2  uMouse;    // css px (y down)
uniform float uShape;
uniform float uSpikes;
uniform float uChaos;
uniform float uReach;
uniform float uDark;
uniform float uPulse;

mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float smin(float a, float b, float k){ float h = clamp(0.5 + 0.5*(b - a)/k, 0.0, 1.0); return mix(b, a, h) - k*h*(1.0 - h); }
float sdEll(vec3 p, vec3 r){ float k0 = length(p/r); float k1 = length(p/(r*r)); return k0*(k0 - 1.0)/k1; }
float sdTorus(vec3 p, vec2 t){ vec2 q = vec2(length(p.xz) - t.x, p.y); return length(q) - t.y; }
float sdRBox(vec3 p, vec3 b, float r){ vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r; }
float sdCyl(vec3 p, float r, float h, float rr){
  vec2 d = vec2(length(p.xz) - r + rr, abs(p.y) - h + rr);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - rr;
}
float sdCapsule(vec3 p, vec3 a, vec3 b, float r){
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba)/dot(ba, ba), 0.0, 1.0);
  return length(pa - ba*h) - r*(1.0 - 0.75*h);
}

float sdNeedle(vec3 p, vec3 a, vec3 b, float r){
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba)/dot(ba, ba), 0.0, 1.0);
  return length(pa - ba*h) - r*(1.0 - h)*(1.0 - h);
}

// ---- the forms the liquid takes ------------------------------------------
float fDrop(vec3 p){ return length(p) - 1.0; }
float fCar(vec3 p){
  float body  = sdEll(p, vec3(1.95, 0.36, 0.82));
  float cabin = sdEll(p - vec3(-0.25, 0.26, 0.0), vec3(0.85, 0.28, 0.58));
  float wheels = min(sdTorus((p - vec3( 1.15, -0.28, 0.0)).xzy, vec2(0.26, 0.1)),
                     sdTorus((p - vec3(-1.15, -0.28, 0.0)).xzy, vec2(0.26, 0.1)));
  return smin(smin(body, cabin, 0.3), wheels, 0.12);
}
float fWatch(vec3 p){
  vec3 q = p.xzy;                          // disc faces the viewer
  float c = sdCyl(q, 1.02, 0.15, 0.1);
  float bezel = sdTorus(q - vec3(0.0, 0.13, 0.0), vec2(0.95, 0.05));
  float crown = sdRBox(p - vec3(1.12, 0.0, 0.0), vec3(0.09, 0.08, 0.06), 0.03);
  float lugs = sdRBox(vec3(p.x, abs(p.y) - 1.12, p.z), vec3(0.42, 0.16, 0.08), 0.05);
  return smin(smin(min(c, bezel), crown, 0.05), lugs, 0.18);
}
float fRing(vec3 p){
  vec3 q = p; q.yz = rot(1.25) * q.yz;
  float band = sdTorus(q, vec2(0.82, 0.13));
  vec3 g = p - vec3(0.0, 0.98, 0.18);
  float gem = max(dot(abs(g), normalize(vec3(1.0))) - 0.24, length(g) - 0.36); // faceted stone
  return smin(band, gem, 0.12);
}
float fJet(vec3 p){
  float fus  = sdEll(p, vec3(2.15, 0.2, 0.24));
  float wing = sdEll(p - vec3(0.05, 0.0, 0.0), vec3(0.42, 0.04, 1.6));
  float tail = sdEll(p - vec3(-1.75, 0.3, 0.0), vec3(0.28, 0.32, 0.04));
  return smin(smin(fus, wing, 0.18), tail, 0.12);
}
float fVault(vec3 p){
  float box = sdRBox(p, vec3(0.78), 0.14);
  float dial = sdTorus((p - vec3(0.0, 0.0, 0.92)).xzy, vec2(0.36, 0.06));
  return smin(box, dial, 0.08);
}

float w(float i){ return clamp(1.0 - abs(uShape - i), 0.0, 1.0); }

vec3 mouseLocal;  // cursor in entity space (z = 0 plane)

float map(vec3 p){
  float t = uTime;
  vec3 q = p;
  // slow, heavy turning; flatter forms turn less so they stay readable
  // vehicles hold a three-quarter pose with a gentle sway; everything else turns slowly
  float vehicle = w(1.0) + w(4.0);
  float posed = vehicle + w(2.0);                 // the watch also faces you
  float pose = -0.62*vehicle + 0.42*w(2.0);
  float spin = mix(t*0.22, pose + 0.22*sin(t*0.35), posed);
  q.xz = rot(spin + mouseLocal.x*0.08) * q.xz;
  q.yz = rot(-0.18 + mouseLocal.y*0.06 + 0.5*vehicle + 0.12*w(2.0)) * q.yz;

  float breathe = 1.0 + 0.035*sin(t*1.4) + 0.12*uPulse;
  q /= breathe;

  float d = 0.0;
  d += w(0.0) * fDrop(q);
  d += w(1.0) * fCar(q);
  d += w(2.0) * fWatch(q);
  d += w(3.0) * fRing(q);
  d += w(4.0) * fJet(q);
  d += w(5.0) * fVault(q);
  d *= breathe;

  // living surface
  float wob = sin(q.x*3.1 + t*1.3) * sin(q.y*3.4 + t*1.05) * sin(q.z*2.9 + t*0.9);
  d += wob * (0.03 + 0.12*uChaos + 0.05*uPulse);

  // ferrofluid spikes: real tapered needles on a golden-spiral of directions,
  // each pulsing on its own clock and melted into the body
  if (uSpikes > 0.02) {
    for (int i = 0; i < 14; i++) {
      float fi = float(i);
      float y = 1.0 - (fi + 0.5) / 14.0 * 2.0;
      float r = sqrt(1.0 - y*y);
      float ph = fi * 2.39996;
      vec3 dir = vec3(cos(ph)*r, y, sin(ph)*r);
      float len = uSpikes * (0.75 + 0.45*sin(t*1.6 + fi*3.1));
      d = smin(d, sdNeedle(q, dir*0.7, dir*(1.0 + len), 0.32*smoothstep(0.0, 0.2, uSpikes)), 0.24);
    }
  }

  // reaching for the cursor: a tapering tendril
  float md = length(mouseLocal.xy);
  float pull = uReach * smoothstep(4.5, 1.15, md);
  if (pull > 0.01) {
    vec3 dir = vec3(mouseLocal.xy / max(md, 1e-3), 0.0);
    vec3 tip = dir * min(md, 0.9 + 1.5*pull);
    d = smin(d, sdCapsule(p, dir*0.4, tip, 0.12 + 0.12*pull), 0.38);
    d = smin(d, length(p - tip) - 0.1*pull, 0.2);
  }

  // chaos: droplets break off and orbit
  if (uChaos > 0.001) {
    for (int i = 0; i < 7; i++) {
      float fi = float(i);
      float a = t*(0.55 + fi*0.11) + fi*1.9;
      float rr = (1.35 + 0.35*sin(t*0.8 + fi)) * (1.0 + 0.9*uChaos);
      vec3 c = vec3(cos(a)*rr, sin(a*1.3 + fi)*0.85*(1.0 + uChaos), sin(a)*rr*0.5);
      d = smin(d, length(p - c) - (0.1 + 0.16*fract(fi*0.37 + 0.2))*uChaos, 0.45);
    }
  }
  return d;
}

vec3 calcNormal(vec3 p){
  const vec2 e = vec2(1.0, -1.0) * 0.0015;
  return normalize(e.xyy*map(p + e.xyy) + e.yyx*map(p + e.yyx) + e.yxy*map(p + e.yxy) + e.xxx*map(p + e.xxx));
}

// studio environment: softboxes and strip lights; a red rim only after dark
vec3 env(vec3 r){
  vec3 base = mix(vec3(0.93, 0.925, 0.915), vec3(0.018, 0.018, 0.022), uDark);
  vec3 floorC = mix(vec3(0.55), vec3(0.0), uDark);
  vec3 col = mix(floorC, base, smoothstep(-0.35, 0.25, r.y));
  float top = smoothstep(0.72, 0.95, r.y);
  col += vec3(1.0) * top * mix(0.4, 1.6, uDark);
  float key = smoothstep(0.955, 0.995, dot(r, normalize(vec3(-0.85, 0.35, 0.55))));
  col += vec3(1.0, 0.98, 0.95) * key * mix(1.0, 2.4, uDark);
  float fill = smoothstep(0.975, 0.998, dot(r, normalize(vec3(0.9, 0.05, 0.45))));
  col += vec3(0.9) * fill * mix(0.6, 1.4, uDark);
  float rim = smoothstep(0.7, 1.0, dot(r, normalize(vec3(0.55, -0.35, -0.75))));
  col += vec3(0.75, 0.04, 0.07) * rim * 0.6 * uDark;
  // a long horizon strip, the classic car-paint reflection band
  col += vec3(0.75, 0.77, 0.82) * exp(-pow((r.y - 0.08) * 7.0, 2.0)) * 0.9 * uDark;
  // cool silver back light: grazing angles catch it, so every form gets a chrome outline
  float back = smoothstep(0.35, 1.0, dot(r, normalize(vec3(0.0, 0.25, -1.0))));
  col += vec3(0.82, 0.85, 0.92) * back * 1.1 * uDark;
  return col;
}

void main(){
  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uK;  // css px, y down
  vec2 uv = (frag - uPos) / uScale; uv.y = -uv.y;
  mouseLocal = vec3((uMouse - uPos) / uScale, 0.0); mouseLocal.y = -mouseLocal.y;

  vec3 ro = vec3(0.0, 0.0, 6.0);
  vec3 rd = normalize(vec3(uv, -6.0));

  // bounding sphere: skip almost every pixel cheaply
  float B = 2.6 + 2.0*uChaos + 1.6*uReach + 1.8*uSpikes;
  float bb = dot(ro, rd);
  float cc = dot(ro, ro) - B*B;
  float disc = bb*bb - cc;
  if (disc < 0.0) { gl_FragColor = vec4(0.0); return; }
  float t = max(-bb - sqrt(disc), 0.0);
  float tMax = -bb + sqrt(disc);

  float px = 1.0 / uScale;       // one css pixel in entity units
  float minD = 1e9; float tMin = t;
  bool hit = false;
  for (int i = 0; i < 96; i++) {
    vec3 p = ro + rd*t;
    float d = map(p);
    if (d < minD) { minD = d; tMin = t; }
    if (d < 0.0007) { hit = true; break; }
    t += d * 0.8;
    if (t > tMax) break;
  }

  float alpha = hit ? 1.0 : 1.0 - smoothstep(0.0, px*1.6, minD);
  if (alpha <= 0.001) { gl_FragColor = vec4(0.0); return; }

  vec3 p = ro + rd*(hit ? t : tMin);
  vec3 n = calcNormal(p);
  float fres = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
  float F0 = mix(0.035, 0.42, uDark);
  vec3 refl = env(reflect(rd, n));
  vec3 col = refl * (F0 + (1.0 - F0)*fres);
  // a sliver of wet gloss right where the key light hits
  vec3 L = normalize(vec3(-0.6, 0.7, 0.6));
  col += pow(max(dot(reflect(rd, n), L), 0.0), 90.0) * mix(0.9, 1.6, uDark);
  // obsidian body colour underneath
  col += vec3(0.008, 0.008, 0.01);
  gl_FragColor = vec4(col * alpha, alpha);
}
`;
