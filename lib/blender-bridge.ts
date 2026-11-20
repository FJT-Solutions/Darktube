import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { ffmpegBin } from '@/lib/flow-assemble';
import { inspectRenderedVideo, type MotionCheckResult } from '@/lib/motion-checks';
import { formatDeliveryDuration } from '@/lib/render-timing';
import type { MouthCue } from '@/lib/puppet-studio';
import { renderThreeJsToMp4 } from '@/lib/threejs-render';
import type { ThreeJsStoryboard } from '@/lib/threejs-scene-compiler';
import type { VoiceWord } from '@/lib/voice-resolver';

const runExec = promisify(execFile);

export interface BlenderRuntimeStatus {
  available: boolean;
  blenderPath: string | null;
  note: string;
}

/** Detecta executável do Blender (CLI headless) no host Windows ou Linux. */
export function detectBlenderRuntime(): BlenderRuntimeStatus {
  const candidates: string[] = [];
  if (process.env.BLENDER_PATH) candidates.push(process.env.BLENDER_PATH);

  const pathEnv = process.env.PATH || '';
  const exeNames = process.platform === 'win32' ? ['blender.exe', 'blender'] : ['blender'];
  for (const dir of pathEnv.split(path.delimiter).filter(Boolean)) {
    for (const exe of exeNames) candidates.push(path.join(dir, exe));
  }

  if (process.platform === 'win32') {
    const pf = process.env.ProgramFiles || 'C:\\Program Files';
    const bfDir = path.join(pf, 'Blender Foundation');
    if (fs.existsSync(bfDir)) {
      try {
        for (const sub of fs.readdirSync(bfDir).sort().reverse()) {
          candidates.push(path.join(bfDir, sub, 'blender.exe'));
        }
      } catch {}
    }
  } else {
    candidates.push('/usr/bin/blender', '/usr/local/bin/blender', '/snap/bin/blender', '/app/blender/blender');
  }

  const found = candidates.find((p) => {
    try {
      return fs.existsSync(p) && fs.statSync(p).isFile();
    } catch {
      return false;
    }
  });

  return found
    ? {
        available: true,
        blenderPath: found,
        note: 'Blender Headless ativo (EEVEE + Motion Blur PBR pronto para renderização 3D).',
      }
    : {
        available: false,
        blenderPath: null,
        note: 'Blender CLI não detectado nesta máquina; alternando automaticamente para o motor Three.js Articulated ($0).',
      };
}

export interface CompileBlenderPythonOptions {
  mp4OutPath: string;
  contactSheetOutPath?: string;
  useCycles?: boolean;
  samples?: number;
  modelsRootDir?: string;
  publicRootDir?: string;
}

/**
 * Compila um storyboard 3D DarkTube em um script Python headless do Blender (`bpy`).
 * Suporta PBR EEVEE Next/EEVEE, Motion Blur real, importação `.glb` local e Sticker Swap UV.
 */
export function compileStoryboardToBlenderPython(
  storyboard: ThreeJsStoryboard,
  opts: CompileBlenderPythonOptions
): string {
  const width = storyboard.formato?.largura || 1080;
  const height = storyboard.formato?.altura || 1920;
  const fps = storyboard.formato?.fps || 24;
  const duration = Math.max(2, Number(storyboard.duracao) || 10);
  const modelsRoot = (opts.modelsRootDir || path.join(process.cwd(), 'public', 'threejs-engine', 'models')).replace(/\\/g, '/');
  const publicRoot = (opts.publicRootDir || path.join(process.cwd(), 'public')).replace(/\\/g, '/');
  const payloadJson = JSON.stringify(storyboard).replace(/\\/g, '\\\\').replace(/"""/g, '\\"\\"\\"');

  return `# -*- coding: utf-8 -*-
import json, math, os, sys
import bpy
from mathutils import Vector

STORYBOARD = json.loads(r"""${payloadJson}""")
MP4_OUT = r"${opts.mp4OutPath.replace(/\\/g, '/')}"
CONTACT_OUT = r"${(opts.contactSheetOutPath || '').replace(/\\/g, '/')}"
MODELS_ROOT = r"${modelsRoot}"
PUBLIC_ROOT = r"${publicRoot}"
USE_CYCLES = ${opts.useCycles ? 'True' : 'False'}
SAMPLES = ${Math.max(8, Math.min(128, Number(opts.samples) || 16))}

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.resolution_x = ${width}
scene.render.resolution_y = ${height}
scene.render.resolution_percentage = 100
scene.render.fps = ${fps}
scene.frame_start = 1
scene.frame_end = max(2, int(round(${duration} * ${fps})))

# Motor EEVEE Next (Blender 4.2+) com fallback automático para Blender 3.x / Cycles
available_engines = {e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items}
if USE_CYCLES and 'CYCLES' in available_engines:
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = SAMPLES
elif 'BLENDER_EEVEE_NEXT' in available_engines:
    scene.render.engine = 'BLENDER_EEVEE_NEXT'
    scene.eevee.taa_render_samples = SAMPLES
elif 'BLENDER_EEVEE' in available_engines:
    scene.render.engine = 'BLENDER_EEVEE'
    scene.eevee.taa_render_samples = SAMPLES

scene.render.use_motion_blur = True
if hasattr(scene.render, 'motion_blur_shutter'):
    scene.render.motion_blur_shutter = 0.5

scene.render.image_settings.file_format = 'FFMPEG'
scene.render.ffmpeg.format = 'MPEG4'
scene.render.ffmpeg.codec = 'H264'
scene.render.ffmpeg.constant_rate_factor = 'MEDIUM'
scene.render.filepath = MP4_OUT

# Mundo e iluminação base de 3 pontos
world = bpy.data.worlds.new("DarkTubeWorld")
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes.get("Background")
horario = (STORYBOARD.get("ambiente") or {}).get("horario", "dia")
if bg:
    bg.inputs[0].default_value = (0.04, 0.06, 0.14, 1.0) if horario == "noite" else (0.48, 0.68, 0.92, 1.0)
    bg.inputs[1].default_value = 0.7 if horario == "noite" else 1.1

def add_light(name, ltype, loc, energy, size=3.0):
    ld = bpy.data.lights.new(name=name, type=ltype)
    ld.energy = energy
    if ltype == 'AREA' and hasattr(ld, 'size'):
        ld.size = size
    obj = bpy.data.objects.new(name, ld)
    obj.location = loc
    scene.collection.objects.link(obj)
    return obj

add_light("KeyLight", 'SUN', (8, -8, 14), 3.6 if horario != "noite" else 1.4)
add_light("FillLight", 'AREA', (-10, 6, 7), 180.0, size=6.0)
add_light("RimLight", 'AREA', (0, 12, 8), 240.0, size=5.0)

def hex_to_rgba(hex_str, default=(0.55, 0.62, 0.72, 1.0)):
    if not isinstance(hex_str, str) or not hex_str.startswith("#") or len(hex_str) < 7:
        return default
    r = int(hex_str[1:3], 16) / 255.0
    g = int(hex_str[3:5], 16) / 255.0
    b = int(hex_str[5:7], 16) / 255.0
    return (r, g, b, 1.0)

def make_mat(name, rgba, roughness=0.45):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = rgba
        bsdf.inputs["Roughness"].default_value = roughness
    return mat

# Chão de base
bpy.ops.mesh.primitive_plane_add(size=120, location=(0, 0, 0))
ground = bpy.context.active_object
ground.name = "DarkTubeGround"
ground.data.materials.append(make_mat("GroundMat", (0.14, 0.16, 0.2, 1.0), 0.85))

# Câmera principal com alvo suave
cam_data = bpy.data.cameras.new("MainCamera")
cam_data.lens = 34
cam_obj = bpy.data.objects.new("MainCamera", cam_data)
scene.collection.objects.link(cam_obj)
scene.camera = cam_obj

target_empty = bpy.data.objects.new("CameraTarget", None)
scene.collection.objects.link(target_empty)
track = cam_obj.constraints.new(type='TRACK_TO')
track.target = target_empty
track.track_axis = 'TRACK_NEGATIVE_Z'
track.up_axis = 'UP_Y'

def dt_to_blender_coords(pos):
    # Three.js (x, y, z) -> Blender Z-up (x, -z, y)
    x = float(pos[0]) if len(pos) > 0 else 0.0
    y = float(pos[1]) if len(pos) > 1 else 0.0
    z = float(pos[2]) if len(pos) > 2 else 0.0
    return (x, -z, y)

def resolve_local_asset(url):
    if not url or not isinstance(url, str):
        return None
    clean = url.split("?")[0]
    if clean.startswith("/"):
        p = os.path.join(PUBLIC_ROOT, clean.lstrip("/"))
        if os.path.exists(p):
            return p
    base = os.path.basename(clean)
    cand = os.path.join(MODELS_ROOT, base)
    return cand if os.path.exists(cand) else None

built_objects = {}
cenas = STORYBOARD.get("cenas") or []
fps = float(scene.render.fps)

for idx, cena in enumerate(cenas):
    t_ini = max(0.0, float(cena.get("inicio", 0.0)))
    t_fim = max(t_ini + 0.5, float(cena.get("fim", t_ini + 4.0)))
    f_ini = max(1, int(round(t_ini * fps)) + 1)
    f_fim = max(f_ini + 1, int(round(t_fim * fps)))

    # Keyframes de câmera
    cam_spec = cena.get("camera") or {}
    c_de = cam_spec.get("de") or cam_spec.get("pos") or [0, 3.2, 9.5]
    c_para = cam_spec.get("para") or c_de
    c_alvo = cam_spec.get("alvo") or [0, 1.2, 0]
    cam_obj.location = dt_to_blender_coords(c_de)
    target_empty.location = dt_to_blender_coords(c_alvo)
    cam_obj.keyframe_insert(data_path="location", frame=f_ini)
    target_empty.keyframe_insert(data_path="location", frame=f_ini)
    cam_obj.location = dt_to_blender_coords(c_para)
    cam_obj.keyframe_insert(data_path="location", frame=f_fim)

    # Objetos 3D / GLBs
    for obj_spec in (cena.get("objetos") or []):
        oid = str(obj_spec.get("id") or f"obj_{idx}_{len(built_objects)}")
        pos = obj_spec.get("pos") or [0, 0, 0]
        local_glb = resolve_local_asset(obj_spec.get("glbUrl"))
        obj_ref = built_objects.get(oid)
        if obj_ref is None:
            if local_glb:
                try:
                    bpy.ops.import_scene.gltf(filepath=local_glb)
                    obj_ref = bpy.context.selected_objects[0] if bpy.context.selected_objects else None
                except Exception:
                    obj_ref = None
            if obj_ref is None:
                asset_kind = str(obj_spec.get("asset") or "forma")
                if asset_kind in ("esfera", "arvore_redonda"):
                    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.8, location=dt_to_blender_coords(pos))
                elif asset_kind in ("cilindro", "poste_luz", "tambor"):
                    bpy.ops.mesh.primitive_cylinder_add(radius=0.5, depth=1.8, location=dt_to_blender_coords(pos))
                else:
                    bpy.ops.mesh.primitive_cube_add(size=1.4, location=dt_to_blender_coords(pos))
                obj_ref = bpy.context.active_object
                obj_ref.name = oid
                col_hex = (obj_spec.get("params") or {}).get("cor") or obj_spec.get("cor")
                obj_ref.data.materials.append(make_mat(f"Mat_{oid}", hex_to_rgba(col_hex)))
            built_objects[oid] = obj_ref

        if obj_ref:
            obj_ref.location = dt_to_blender_coords(pos)
            obj_ref.keyframe_insert(data_path="location", frame=f_ini)
            for mv in (obj_spec.get("movimentos") or []):
                mf_de = max(1, int(round(float(mv.get("de", t_ini)) * fps)) + 1)
                mf_ate = max(mf_de + 1, int(round(float(mv.get("ate", t_fim)) * fps)))
                obj_ref.keyframe_insert(data_path="location", frame=mf_de)
                dest = mv.get("para") or pos
                if len(dest) == 2:
                    dest = [dest[0], pos[1], dest[1]]
                obj_ref.location = dt_to_blender_coords(dest)
                obj_ref.keyframe_insert(data_path="location", frame=mf_ate)

    # Personagens & Puppets UV / Sticker Plane
    for p_spec in (cena.get("personagens") or []):
        pid = str(p_spec.get("id") or f"char_{idx}_{len(built_objects)}")
        pos = p_spec.get("pos") or [0, 0, 0]
        p_ref = built_objects.get(pid)
        if p_ref is None:
            puppet = p_spec.get("puppet") or {}
            cutout = resolve_local_asset(puppet.get("baseCutoutUrl"))
            if cutout:
                bpy.ops.mesh.primitive_plane_add(size=2.0, location=dt_to_blender_coords([pos[0], (pos[1] if len(pos)>1 else 0) + 1.0, pos[2] if len(pos)>2 else 0]))
                p_ref = bpy.context.active_object
                p_ref.rotation_euler = (math.radians(90), 0, 0)
                mat = bpy.data.materials.new(f"PuppetMat_{pid}")
                mat.use_nodes = True
                nt = mat.node_tree
                bsdf = nt.nodes.get("Principled BSDF")
                tex = nt.nodes.new("ShaderNodeTexImage")
                tex.image = bpy.data.images.load(cutout)
                nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
                nt.links.new(tex.outputs["Alpha"], bsdf.inputs["Alpha"])
                mat.blend_method = 'CLIP'
                p_ref.data.materials.append(mat)
            else:
                bpy.ops.mesh.primitive_cylinder_add(radius=0.38, depth=1.65, location=dt_to_blender_coords([pos[0], (pos[1] if len(pos)>1 else 0) + 0.85, pos[2] if len(pos)>2 else 0]))
                p_ref = bpy.context.active_object
                p_ref.data.materials.append(make_mat(f"CharMat_{pid}", (0.22, 0.72, 0.94, 1.0), 0.4))
            p_ref.name = pid
            built_objects[pid] = p_ref
        p_ref.location = dt_to_blender_coords([pos[0], (pos[1] if len(pos)>1 else 0) + 0.9, pos[2] if len(pos)>2 else 0])
        p_ref.keyframe_insert(data_path="location", frame=f_ini)

bpy.ops.render.render(animation=True)
print("[DarkTube Blender] Render finalizado:", MP4_OUT)
`;
}

export interface RenderBlenderOptions {
  storyboard: ThreeJsStoryboard;
  words: VoiceWord[];
  mouthCues?: MouthCue[];
  audioPath?: string;
  outputPath: string;
  isDraft?: boolean;
  useCycles?: boolean;
  fallbackToThreeJs?: boolean;
  contactSheetPath?: string;
  onProgress?: (pct: number) => Promise<void> | void;
}

export interface RenderBlenderResult {
  backendUsed: 'blender' | 'threejs_fallback';
  outputPath: string;
  contactSheetPath?: string;
  width: number;
  height: number;
  fps: number;
  durationSec: number;
  totalFrames: number;
  motionCheck: MotionCheckResult;
  qaChecks: {
    scenesSampled: number;
    blankFramesDetected: number;
    passed: boolean;
  };
  renderDurationMs: number;
  renderDurationLabel: string;
  note: string;
}

/**
 * Executa render 3D via Blender CLI Headless (EEVEE PBR + Motion Blur) e anexa áudio + Contact Sheet QA.
 * Caso Blender não esteja instalado na VPS/host e fallbackToThreeJs seja true, delega transparentemente ao Three.js Engine.
 */
export async function renderBlenderStoryboard(opts: RenderBlenderOptions): Promise<RenderBlenderResult> {
  const startMs = Date.now();
  const runtime = detectBlenderRuntime();
  const wantFallback = opts.fallbackToThreeJs !== false;

  if (!runtime.available || !runtime.blenderPath) {
    if (!wantFallback) {
      throw new Error(runtime.note);
    }
    const res = await renderThreeJsToMp4({
      storyboard: opts.storyboard,
      words: opts.words,
      mouthCues: opts.mouthCues,
      audioPath: opts.audioPath,
      outputPath: opts.outputPath,
      isDraft: Boolean(opts.isDraft),
      generateContactSheet: true,
      contactSheetPath: opts.contactSheetPath,
      onProgress: opts.onProgress,
    });
    return {
      backendUsed: 'threejs_fallback',
      outputPath: res.outputPath,
      contactSheetPath: res.contactSheetPath,
      width: res.width,
      height: res.height,
      fps: res.fps,
      durationSec: res.durationSec,
      totalFrames: res.totalFrames,
      motionCheck: res.motionCheck,
      qaChecks: res.qaChecks,
      renderDurationMs: res.renderDurationMs,
      renderDurationLabel: res.renderDurationLabel,
      note: runtime.note,
    };
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dt_blender_'));
  try {
    const rawVideo = path.join(tmpDir, 'blender_silent.mp4');
    const scriptPath = path.join(tmpDir, 'scene.py');
    const sheetOut = opts.contactSheetPath || path.join(path.dirname(opts.outputPath), `qa_blender_${Date.now()}.png`);

    const pySource = compileStoryboardToBlenderPython(opts.storyboard, {
      mp4OutPath: rawVideo,
      contactSheetOutPath: sheetOut,
      useCycles: Boolean(opts.useCycles),
      samples: opts.isDraft ? 8 : 20,
    });
    fs.writeFileSync(scriptPath, pySource, 'utf8');
    if (opts.onProgress) await opts.onProgress(22);

    await runExec(runtime.blenderPath, ['--background', '--python', scriptPath], {
      timeout: 600_000,
      windowsHide: true,
      maxBuffer: 8 * 1024 * 1024,
    });

    if (!fs.existsSync(rawVideo) || fs.statSync(rawVideo).size < 1024) {
      throw new Error('Blender finalizou sem gerar o arquivo MP4 esperado.');
    }
    if (opts.onProgress) await opts.onProgress(78);

    const outDir = path.dirname(opts.outputPath);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    if (opts.audioPath && fs.existsSync(opts.audioPath)) {
      await runExec(
        ffmpegBin(),
        [
          '-y',
          '-loglevel', 'error',
          '-i', rawVideo,
          '-i', opts.audioPath,
          '-c:v', 'copy',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-shortest',
          '-movflags', '+faststart',
          opts.outputPath,
        ],
        { timeout: 120_000, windowsHide: true }
      );
    } else {
      fs.copyFileSync(rawVideo, opts.outputPath);
    }

    // Gera Contact Sheet QA via FFmpeg a partir dos midpoints de cena
    const scenes = opts.storyboard.cenas || [];
    const sampleTimes = (scenes.length > 0 ? scenes : [{ inicio: 0, fim: opts.storyboard.duracao || 5 }])
      .slice(0, 12)
      .map((s) => ((Number(s.inicio) || 0) + (Number(s.fim) || 4)) / 2);
    const framePaths: string[] = [];
    for (let i = 0; i < sampleTimes.length; i++) {
      const fp = path.join(tmpDir, `qa_${i}.png`);
      await runExec(
        ffmpegBin(),
        ['-y', '-loglevel', 'error', '-ss', sampleTimes[i].toFixed(2), '-i', opts.outputPath, '-frames:v', '1', '-vf', 'scale=320:-1', fp],
        { timeout: 30_000, windowsHide: true }
      ).catch(() => {});
      if (fs.existsSync(fp)) framePaths.push(fp);
    }
    let finalSheetPath: string | undefined;
    if (framePaths.length > 0) {
      const cols = Math.min(4, framePaths.length);
      const rows = Math.ceil(framePaths.length / cols);
      await runExec(
        ffmpegBin(),
        ['-y', '-loglevel', 'error', '-i', path.join(tmpDir, 'qa_%d.png'), '-filter_complex', `tile=${cols}x${rows}`, sheetOut],
        { timeout: 30_000, windowsHide: true }
      ).catch(() => {});
      if (fs.existsSync(sheetOut)) finalSheetPath = sheetOut;
    }

    if (opts.onProgress) await opts.onProgress(94);
    const motionCheck = await inspectRenderedVideo(opts.outputPath, { ffmpegPath: ffmpegBin() });
    const elapsedMs = Math.max(0, Date.now() - startMs);
    const renderDurationLabel = formatDeliveryDuration(elapsedMs);
    const width = opts.storyboard.formato?.largura || 1080;
    const height = opts.storyboard.formato?.altura || 1920;
    const fps = opts.storyboard.formato?.fps || 24;
    const durationSec = Number(opts.storyboard.duracao) || 10;

    return {
      backendUsed: 'blender',
      outputPath: opts.outputPath,
      contactSheetPath: finalSheetPath,
      width,
      height,
      fps,
      durationSec,
      totalFrames: Math.round(durationSec * fps),
      motionCheck,
      qaChecks: {
        scenesSampled: framePaths.length,
        blankFramesDetected: motionCheck.ok ? 0 : 1,
        passed: motionCheck.ok,
      },
      renderDurationMs: elapsedMs,
      renderDurationLabel,
      note: 'Renderizado em Blender Headless EEVEE com Motion Blur PBR.',
    };
  } catch (err: any) {
    if (!wantFallback) throw err;
    console.warn('[BlenderBridge] Falha no Blender CLI, ativando fallback Three.js:', err?.message || err);
    const res = await renderThreeJsToMp4({
      storyboard: opts.storyboard,
      words: opts.words,
      mouthCues: opts.mouthCues,
      audioPath: opts.audioPath,
      outputPath: opts.outputPath,
      isDraft: Boolean(opts.isDraft),
      generateContactSheet: true,
      contactSheetPath: opts.contactSheetPath,
      onProgress: opts.onProgress,
    });
    return {
      backendUsed: 'threejs_fallback',
      outputPath: res.outputPath,
      contactSheetPath: res.contactSheetPath,
      width: res.width,
      height: res.height,
      fps: res.fps,
      durationSec: res.durationSec,
      totalFrames: res.totalFrames,
      motionCheck: res.motionCheck,
      qaChecks: res.qaChecks,
      renderDurationMs: res.renderDurationMs,
      renderDurationLabel: res.renderDurationLabel,
      note: `Fallback automático Three.js após falha do Blender (${err?.message || 'erro desconhecido'}).`,
    };
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}
