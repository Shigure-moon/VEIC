import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'

type RenderMode = 'quality' | 'performance'

interface BayerBackgroundProps {
  mode?: RenderMode
}

const vertexShader = `#version 300 es
in vec2 aPosition;

void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

const fragmentShader = `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uPixelSize;
uniform vec3 uColor;

out vec4 fragColor;

float Bayer2(vec2 a) {
  a = floor(a);
  return fract(a.x / 2.0 + a.y * a.y * 0.75);
}

#define Bayer4(a) (Bayer2(0.5 * (a)) * 0.25 + Bayer2(a))
#define Bayer8(a) (Bayer4(0.5 * (a)) * 0.25 + Bayer2(a))

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; ++i) {
    value += amp * noise(p);
    p *= 1.65;
    amp *= 0.55;
  }
  return value;
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 centered = fragCoord - uResolution * 0.5;
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 uv = centered / uResolution.y;
  uv.x *= aspect;

  float drift = uTime * 0.026;
  float field = fbm(uv * 3.8 + vec2(drift, -drift * 0.7));
  field += 0.16 * sin((uv.x - uv.y) * 4.0 + uTime * 0.18);
  field -= smoothstep(0.12, 0.9, length(uv)) * 0.18;

  float bayer = Bayer8(fragCoord / uPixelSize) - 0.5;
  float coverage = step(0.58, field + bayer * 0.62);
  float alpha = coverage * 0.78;

  fragColor = vec4(uColor, alpha);
}
`

function compileShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }

  return shader
}

function createProgram(gl: WebGL2RenderingContext) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexShader)
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShader)
  if (!vertex || !fragment) return null

  const program = gl.createProgram()
  if (!program) return null

  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
    return null
  }

  return program
}

export function BayerBackground({ mode = 'quality' }: BayerBackgroundProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host || mode === 'performance') return

    const canvas = document.createElement('canvas')
    canvas.className = 'veic-bayer-canvas'
    host.appendChild(canvas)

    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
      powerPreference: 'high-performance',
    })

    if (!gl) {
      host.classList.add('is-webgl-unavailable')
      return () => canvas.remove()
    }

    const program = createProgram(gl)
    const vertexArray = gl.createVertexArray()
    const vertexBuffer = gl.createBuffer()

    if (!program || !vertexArray || !vertexBuffer) {
      host.classList.add('is-webgl-unavailable')
      return () => canvas.remove()
    }

    gl.bindVertexArray(vertexArray)
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)

    const positionLocation = gl.getAttribLocation(program, 'aPosition')
    gl.enableVertexAttribArray(positionLocation)
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

    const resolution = gl.getUniformLocation(program, 'uResolution')
    const time = gl.getUniformLocation(program, 'uTime')
    const pixelSize = gl.getUniformLocation(program, 'uPixelSize')
    const color = gl.getUniformLocation(program, 'uColor')
    const startTime = performance.now()

    const resize = () => {
      const width = host.clientWidth || window.innerWidth
      const height = host.clientHeight || window.innerHeight
      canvas.width = Math.max(1, width)
      canvas.height = Math.max(1, height)
      gl.viewport(0, 0, canvas.width, canvas.height)
    }

    const render = () => {
      const elapsed = (performance.now() - startTime) / 1000
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(program)
      gl.bindVertexArray(vertexArray)
      gl.uniform2f(resolution, canvas.width, canvas.height)
      gl.uniform1f(time, elapsed)
      gl.uniform1f(pixelSize, 4.0)
      gl.uniform3f(color, 0.84, 0.84, 0.84)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      frameId = window.requestAnimationFrame(render)
    }

    let frameId = 0
    resize()
    render()
    window.addEventListener('resize', resize)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', resize)
      gl.deleteBuffer(vertexBuffer)
      gl.deleteVertexArray(vertexArray)
      gl.deleteProgram(program)
      canvas.remove()
    }
  }, [mode])

  const style = {
    '--veic-bayer-ink': '#d8d8d8',
  } as CSSProperties

  return <div className={`veic-bayer-background is-${mode}`} ref={hostRef} style={style} aria-hidden="true" />
}
