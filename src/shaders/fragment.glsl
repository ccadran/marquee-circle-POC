varying vec2 vUv;
        varying vec3 vPosition;
        uniform float uThreshold;
        uniform float uAlphaTest;
        uniform sampler2D uMap;
        float median(float r, float g, float b) {
            return max(min(r, g), min(max(r, g), b));
        }
        void main() {
          vec3 s = texture2D(uMap, vUv).rgb;
          float sigDist = median(s.r, s.g, s.b) - 0.5;
          float afwidth = 1.4142135623730951 / 2.0;
          #ifdef IS_SMALL
              float alpha = smoothstep(uThreshold - afwidth, uThreshold + afwidth, sigDist);
          #else
              float alpha = clamp(sigDist / fwidth(sigDist) + 0.5, 0.0, 1.0);
          #endif
          if (alpha < uAlphaTest) discard;

          gl_FragColor = vec4(0.585, 0.148, 0.673, 1.0);
        }