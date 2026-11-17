import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import {
  normalizeHex,
  validateBrandPalette,
  validateTimelineStates,
  recommendBpmRange,
  isBpmInEnergyRange,
  parseBlackframeStderr,
  inspectRenderedVideo,
} from '../lib/motion-checks.ts'

const run = promisify(execFile)

test('normalizeHex and validateBrandPalette enforce hex and 3-color limit', () => {
  assert.equal(normalizeHex('#abc'), '#AABBCC')
  assert.equal(normalizeHex('#eab308'), '#EAB308')
  assert.equal(normalizeHex('red'), null)

  const ok = validateBrandPalette(['#111', '#eab308', '#ffffff'], {
    allowedPalette: ['#111111', '#EAB308', '#FFFFFF'],
  })
  assert.equal(ok.valid, true)
  assert.deepEqual(ok.normalized, ['#111111', '#EAB308', '#FFFFFF'])
  assert.equal(ok.warnings.length, 0)

  const offBrand = validateBrandPalette(['#ff0000'], { allowedPalette: ['#EAB308'] })
  assert.equal(offBrand.valid, false)
  assert.match(offBrand.errors[0], /fora da paleta/)

  const tooMany = validateBrandPalette(['#111111', '#222222', '#333333', '#444444'])
  assert.equal(tooMany.valid, true)
  assert.equal(tooMany.warnings.length, 1)
})

test('validateTimelineStates enforces monotonic timestamps and visible frame 0', () => {
  const good = validateTimelineStates([
    { id: 'bg', atSec: 0, durationSec: 5, opacityAtStart: 1 },
    { id: 'headline', atSec: 0.4, durationSec: 2.5 },
  ], 6)
  assert.equal(good.valid, true)
  assert.equal(good.frame0Visible, true)

  const blackOpen = validateTimelineStates([
    { id: 'late-title', atSec: 0.8, durationSec: 2 },
  ])
  assert.equal(blackOpen.valid, false)
  assert.equal(blackOpen.frame0Visible, false)

  const unordered = validateTimelineStates([
    { id: 'a', atSec: 0, durationSec: 2 },
    { id: 'b', atSec: 3, durationSec: 2 },
    { id: 'c', atSec: 1, durationSec: 2 },
  ])
  assert.equal(unordered.valid, false)
  assert.match(unordered.errors[0], /fora de ordem/)
})

test('BPM range helper covers @leomeethewoo energy bands', () => {
  assert.deepEqual(recommendBpmRange('cinematografico'), {
    min: 60,
    max: 80,
    label: '60-80 BPM (Cinematográfico / Premium)',
  })
  assert.equal(isBpmInEnergyRange(72, 'cinematografico'), true)
  assert.equal(isBpmInEnergyRange(100, 'fluido'), true)
  assert.equal(isBpmInEnergyRange(120, 'cinetico'), true)
  assert.equal(isBpmInEnergyRange(140, 'cinetico'), false)
})

test('parseBlackframeStderr and inspectRenderedVideo distinguish black vs visible Frame 0', async () => {
  assert.deepEqual(parseBlackframeStderr('[Parsed_blackframe_0 @ 0x0] frame:0 pblack:100 pts:0'), {
    isBlack: true,
    pblack: 100,
  })
  assert.deepEqual(parseBlackframeStderr('frame= 1 fps=0.0'), { isBlack: false, pblack: null })

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-motion-'))
  try {
    const blackMp4 = path.join(dir, 'black.mp4')
    const colorMp4 = path.join(dir, 'color.mp4')
    await run('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'color=c=black:s=320x240:d=1', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-shortest', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', blackMp4])
    await run('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'testsrc=s=320x240:d=1', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-shortest', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', colorMp4])

    const blackRes = await inspectRenderedVideo(blackMp4)
    assert.equal(blackRes.ok, true)
    assert.equal(blackRes.frame0Black, true)
    assert.equal(blackRes.hasAudio, true)
    assert.ok(blackRes.durationSec > 0.5)

    const colorRes = await inspectRenderedVideo(colorMp4, {
      expectedColors: ['#EAB308'],
      allowedPalette: ['#EAB308', '#111111'],
    })
    assert.equal(colorRes.ok, true)
    assert.equal(colorRes.frame0Black, false)
    assert.equal(colorRes.hasAudio, true)
    assert.equal(colorRes.warnings.length, 0)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
