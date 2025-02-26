 uniform float uTime;
 uniform float uRadius;
 uniform float uOvalFactor;
 varying vec2 vUv;
 varying vec3 vViewPosition;
 varying vec3 vNormal;      
 varying vec3 vPosition;
 
 void main() {
   vec4 mvPosition = vec4(position, 1.0);
   mvPosition = modelViewMatrix * mvPosition;
   gl_Position = projectionMatrix * mvPosition;
   float angle = (position.x / uRadius) - uTime * 0.3;
   vec3 newPosition = vec3(
     uRadius * sin(angle),
     position.y,
     uRadius * cos(angle) * uOvalFactor
   );
   vPosition = newPosition;
   gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
   vUv = uv;
   vViewPosition = -mvPosition.xyz;
   vNormal = normal;
 }