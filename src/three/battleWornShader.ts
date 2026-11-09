import * as THREE from "three";

/**
 * 1. POST-PROCESSING SHADER PASS: BATTLE-WORN CRITICAL DUEL SHADER (< 30% HP)
 * Renders procedural Voronoi fracture cracks, flickering molten-amber & crimson emissive scars,
 * heat-haze distortion, and a scorched critical-intensity vignette across the viewport when
 * a fighter's HP drops below 30%.
 */
export const BattleWornShader = {
	uniforms: {
		tDiffuse: { value: null as THREE.Texture | null },
		uTime: { value: 0.0 },
		uIntensity: { value: 0.0 }, // 0.0 = pristine, > 0.0 = active (< 30% HP)
		uCriticalPulse: { value: 0.0 }, // spikes on hits during < 30% HP
		uAspect: { value: 1.777 },
	},
	vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
	fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uIntensity;
    uniform float uCriticalPulse;
    uniform float uAspect;
    varying vec2 vUv;

    // 2D deterministic hash for Voronoi fracture cells
    vec2 hash2(vec2 p) {
      p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
      return fract(sin(p) * 43758.5453);
    }

    // Computes Voronoi cell edge distance (f2 - f1) for sharp procedural tectonic cracks
    vec2 voronoiCrack(vec2 x) {
      vec2 n = floor(x);
      vec2 f = fract(x);

      vec2 mg = vec2(0.0);
      vec2 mr = vec2(0.0);
      float md = 8.0;
      float cellId = 0.0;

      for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
          vec2 g = vec2(float(i), float(j));
          vec2 o = hash2(n + g);
          vec2 r = g + o - f;
          float d = dot(r, r);
          if (d < md) {
            md = d;
            mr = r;
            mg = g;
            cellId = o.x + o.y * 13.0;
          }
        }
      }

      md = 8.0;
      for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
          vec2 g = mg + vec2(float(i), float(j));
          vec2 o = hash2(n + g);
          vec2 r = g + o - f;
          vec2 diff = r - mr;
          float diffLenSq = dot(diff, diff);
          if (diffLenSq > 0.001) {
            md = min(md, dot(0.5 * (mr + r), diff * inversesqrt(diffLenSq)));
          }
        }
      }
      return vec2(md, cellId);
    }

    void main() {
      if (uIntensity <= 0.001) {
        vec4 cleanSample = texture2D(tDiffuse, vUv);
        gl_FragColor = vec4(clamp(cleanSample.rgb, vec3(0.0), vec3(10.0)), 1.0);
        return;
      }

      float safeIntensity = clamp(uIntensity, 0.001, 1.0);
      vec2 centered = (vUv - 0.5) * vec2(max(0.1, uAspect), 1.0);
      float radialDist = length(centered);

      // Subtle rising heat-haze & fracture refraction when critically battle-worn
      float heatWave = sin(vUv.y * 28.0 - uTime * 7.5) * cos(vUv.x * 22.0 + uTime * 5.0);
      vec2 distortedUv = clamp(vUv + centered * (heatWave * 0.0022 * safeIntensity), 0.001, 0.999);

      // Slight radial chromatic stress near fractured perimeter
      float chromaOffset = 0.0028 * safeIntensity * smoothstep(0.25, 0.85, radialDist);
      float rChan = texture2D(tDiffuse, clamp(distortedUv + centered * chromaOffset, 0.001, 0.999)).r;
      float gChan = texture2D(tDiffuse, distortedUv).g;
      float bChan = texture2D(tDiffuse, clamp(distortedUv - centered * chromaOffset, 0.001, 0.999)).b;
      vec3 baseColor = clamp(vec3(rChan, gChan, bChan), vec3(0.0), vec3(10.0));

      // Multi-scale procedural Voronoi fracture network concentrated around the visor/arena frame
      // so center combat readability stays 100% razor-sharp!
      float edgeMask = smoothstep(0.28, 0.82, radialDist + uCriticalPulse * 0.12);

      vec2 crackCoordA = centered * 6.5 + vec2(0.15 * sin(vUv.y * 9.0), 0.15 * cos(vUv.x * 9.0));
      vec2 crackCoordB = centered * 13.5 - vec2(0.08 * cos(vUv.y * 14.0), 0.08 * sin(vUv.x * 14.0));

      vec2 vA = voronoiCrack(crackCoordA);
      vec2 vB = voronoiCrack(crackCoordB);

      // Primary deep tectonic cracks + secondary hairline fractures
      float primaryCrack = 1.0 - smoothstep(0.0, max(0.002, 0.026 * (0.65 + 0.55 * safeIntensity)), vA.x);
      float secondaryCrack = (1.0 - smoothstep(0.0, max(0.002, 0.018 * safeIntensity), vB.x)) * 0.65;
      float crackGlowAura = 1.0 - smoothstep(0.0, max(0.002, 0.075 * safeIntensity), vA.x);

      float totalCrack = clamp((primaryCrack + secondaryCrack) * edgeMask * safeIntensity, 0.0, 1.0);

      // High-frequency flickering emissive scar pulse per Voronoi cell
      float flickerA = 0.55 + 0.45 * sin(uTime * 29.0 + vA.y * 17.0) * cos(uTime * 19.0 - vA.y * 11.0);
      float flickerB = 0.5 + 0.5 * sin(uTime * 43.0 + vB.y * 23.0);
      float scarFlicker = mix(flickerA, flickerB, 0.4) + uCriticalPulse * 0.45;

      // Molten amber core (#fbbf24) to searing crimson scar edge (#f43f5e)
      vec3 moltenCore = vec3(1.0, 0.78, 0.22);
      vec3 crimsonScar = vec3(0.96, 0.20, 0.35);
      vec3 scarEmission = mix(crimsonScar, moltenCore, primaryCrack * flickerA) * scarFlicker;

      // Darken stone/visor fracture crevices, then add flickering emissive molten scars
      vec3 color = baseColor * (1.0 - totalCrack * 0.62);
      color += scarEmission * (totalCrack * 1.45 + crackGlowAura * edgeMask * safeIntensity * 0.32);

      // Scorched battle-worn vignette around outer corners
      float scorchVignette = smoothstep(0.42, 1.05, radialDist) * safeIntensity * 0.34;
      color = mix(color, vec3(0.12, 0.03, 0.04), scorchVignette);

      gl_FragColor = vec4(clamp(color, vec3(0.0), vec3(10.0)), 1.0);
    }
  `,
};

/**
 * 2. 3D ARENA FLOOR BATTLE-SCAR SHADER MESH
 * Placed directly on the Duel Stage Floor so when either fighter drops below 30% HP,
 * procedural tectonic cracks & flickering molten scars split open across the 3D arena stone beneath their feet!
 */
export function createArenaBattleScarDisc(): {
	mesh: THREE.Mesh;
	uniforms: {
		uTime: { value: number };
		uIntensity: { value: number };
	};
} {
	const uniforms = {
		uTime: { value: 0 },
		uIntensity: { value: 0 },
	};

	const mat = new THREE.ShaderMaterial({
		uniforms,
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
		polygonOffset: true,
		polygonOffsetFactor: -4,
		polygonOffsetUnits: -4,
		vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv * 2.0 - 1.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
		fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uIntensity;
      varying vec2 vUv;

      vec2 hash2(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return fract(sin(p) * 43758.5453);
      }

      vec2 voronoi(vec2 x) {
        vec2 n = floor(x);
        vec2 f = fract(x);
        vec2 mg = vec2(0.0);
        vec2 mr = vec2(0.0);
        float md = 8.0;
        float id = 0.0;
        for (int j = -1; j <= 1; j++) {
          for (int i = -1; i <= 1; i++) {
            vec2 g = vec2(float(i), float(j));
            vec2 o = hash2(n + g);
            vec2 r = g + o - f;
            float d = dot(r, r);
            if (d < md) {
              md = d;
              mr = r;
              mg = g;
              id = o.x * 17.0 + o.y * 31.0;
            }
          }
        }
        md = 8.0;
        for (int j = -1; j <= 1; j++) {
          for (int i = -1; i <= 1; i++) {
            vec2 g = mg + vec2(float(i), float(j));
            vec2 o = hash2(n + g);
            vec2 r = g + o - f;
            vec2 diff = r - mr;
            float diffLenSq = dot(diff, diff);
            if (diffLenSq > 0.001) {
              md = min(md, dot(0.5 * (mr + r), diff * inversesqrt(diffLenSq)));
            }
          }
        }
        return vec2(md, id);
      }

      void main() {
        float r = length(vUv);
        if (r > 1.0 || uIntensity <= 0.01) {
          gl_FragColor = vec4(0.0);
          return;
        }

        float safeInt = clamp(uIntensity, 0.01, 1.0);
        vec2 warped = vUv * 4.2 + 0.12 * vec2(sin(vUv.y * 7.0), cos(vUv.x * 7.0));
        vec2 v1 = voronoi(warped);
        vec2 v2 = voronoi(warped * 2.3);

        float crackLine = 1.0 - smoothstep(0.0, max(0.002, 0.042 * safeInt), v1.x);
        float fineCrack = (1.0 - smoothstep(0.0, max(0.002, 0.028 * safeInt), v2.x)) * 0.55;
        float emberHalo = 1.0 - smoothstep(0.0, max(0.002, 0.14 * safeInt), v1.x);

        float flicker = 0.55 + 0.45 * sin(uTime * 26.0 + v1.y) * cos(uTime * 15.0 - v2.y);
        float radialFade = (1.0 - smoothstep(0.68, 0.98, r));

        vec3 lavaCore = vec3(1.0, 0.72, 0.18);
        vec3 crimsonVein = vec3(0.95, 0.18, 0.32);
        vec3 col = mix(crimsonVein, lavaCore, crackLine * flicker);

        float alpha = clamp((crackLine * 1.1 + fineCrack + emberHalo * 0.35) * radialFade * safeInt * flicker, 0.0, 0.92);
        gl_FragColor = vec4(clamp(col, vec3(0.0), vec3(1.5)), alpha);
      }
    `,
	});

	const mesh = new THREE.Mesh(new THREE.CircleGeometry(4.25, 64), mat);
	mesh.rotation.x = -Math.PI / 2;
	mesh.position.y = 0.028;
	mesh.visible = false;

	return { mesh, uniforms };
}

/**
 * 3. SHARED PROCEDURAL ARMOR BATTLE-SCAR TEXTURE FOR 3D CHESS PIECES
 * Used as an emissiveMap & bumpMap on warrior armor so pieces below 30% HP exhibit
 * glowing, flickering battle cracks across their 3D sculpt!
 */
let _sharedArmorScarTex: THREE.CanvasTexture | null = null;
export function getSharedArmorScarTexture(): THREE.CanvasTexture {
	if (_sharedArmorScarTex) return _sharedArmorScarTex;

	const size = 256;
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d")!;

	ctx.fillStyle = "#000000";
	ctx.fillRect(0, 0, size, size);

	// Draw jagged branching lightning/fracture scars across the UV space
	const drawCrackBranch = (
		x0: number,
		y0: number,
		angle: number,
		length: number,
		depth: number,
	) => {
		if (depth <= 0 || length < 6) return;
		let cx = x0;
		let cy = y0;
		const steps = 8;
		const stepLen = length / steps;

		// Outer crimson/amber glow
		ctx.strokeStyle =
			depth > 1 ? "rgba(244, 63, 94, 0.55)" : "rgba(245, 158, 11, 0.38)";
		ctx.lineWidth = depth * 3.2;
		ctx.lineCap = "round";
		ctx.beginPath();
		ctx.moveTo(cx, cy);

		const pts: [number, number][] = [[cx, cy]];
		let curAngle = angle;
		for (let i = 0; i < steps; i++) {
			curAngle += (Math.sin(i * 4.7 + depth * 2.3) - 0.5) * 0.85;
			cx += Math.cos(curAngle) * stepLen;
			cy += Math.sin(curAngle) * stepLen;
			pts.push([cx, cy]);
			ctx.lineTo(cx, cy);
		}
		ctx.stroke();

		// Inner white-hot core
		ctx.strokeStyle = "#fde047";
		ctx.lineWidth = depth * 1.1;
		ctx.beginPath();
		ctx.moveTo(pts[0][0], pts[0][1]);
		for (let i = 1; i < pts.length; i++) {
			ctx.lineTo(pts[i][0], pts[i][1]);
		}
		ctx.stroke();

		// Fork sub-cracks
		const mid = pts[Math.floor(pts.length * 0.55)];
		drawCrackBranch(mid[0], mid[1], angle + 0.65, length * 0.62, depth - 1);
		drawCrackBranch(cx, cy, angle - 0.52, length * 0.55, depth - 1);
	};

	drawCrackBranch(32, 48, 0.45, 120, 3);
	drawCrackBranch(210, 60, 2.4, 115, 3);
	drawCrackBranch(64, 195, -0.55, 125, 3);
	drawCrackBranch(185, 210, -2.2, 110, 3);
	drawCrackBranch(128, 25, 1.5, 140, 3);

	const tex = new THREE.CanvasTexture(canvas);
	tex.wrapS = THREE.RepeatWrapping;
	tex.wrapT = THREE.RepeatWrapping;
	tex.needsUpdate = true;
	_sharedArmorScarTex = tex;
	return tex;
}
