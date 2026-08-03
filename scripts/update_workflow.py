import json

wf = {
  "name": "Darktube",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "darktube_producao",
        "options": {}
      },
      "name": "Webhook Darktube",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [208, 1968],
      "id": "8ccccbd5-e9b1-4e54-b0f3-f20e291ab6b5",
      "webhookId": "7b04b8bf-2535-478f-b156-f3bd7209d180"
    },
    {
      "parameters": {
        "jsCode": """// ── Normaliza payload e RETORNA CADA SEGMENTO COMO UM ITEM SEPARADO NO N8N ──
const body = $input.item.json.body || $input.item.json;
const tpl  = body.template || {};

const sessionId    = `dt_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
const captionStyle = tpl.caption_style || 'pop';
const animationMix = tpl.animation_mix || 'varied';
const language     = tpl.language     || 'pt';
const voice        = tpl.voice        || 'pt-BR-FranciscaNeural';
const format       = tpl.format       || 'vertical';

const renderEngine = (captionStyle === 'pop' || captionStyle === 'karaoke')
  ? 'remotion'
  : 'hyperframes';

const rawSegments = tpl.script_segments || body.script_segments || [];
const segments = rawSegments.length > 0 ? rawSegments : [{
  index: 0,
  voiceover: { text: tpl.video_title || 'Vídeo sem narração' },
  visual_content: { image_prompt: tpl.video_title || 'Cena principal' }
}];

return segments.map((seg, idx) => ({
  json: {
    ...seg,
    index: seg.index !== undefined ? seg.index : idx,
    session_id:     sessionId,
    render_engine:  renderEngine,
    caption_style:  captionStyle,
    animation_mix:  animationMix,
    language,
    voice,
    format,
    has_music:      tpl.has_music      || false,
    primary_color:  tpl.primary_color  || '#EAB308',
    accent_color:   tpl.accent_color   || '#FFFFFF',
    watermark_text: tpl.watermark_text || 'DarkTube AI',
    tpl
  }
}));""",
        "options": {}
      },
      "name": "Normalize + Auto Engine",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [432, 1968],
      "id": "2d97433c-075d-4dda-a781-392be0202aa6"
    },
    {
      "parameters": {
        "batchSize": 1,
        "options": {}
      },
      "name": "Loop Over Items",
      "type": "n8n-nodes-base.splitInBatches",
      "typeVersion": 3,
      "position": [656, 1968],
      "id": "2d8fbf12-aa7c-48b2-aa62-0358dbb50c1d"
    },
    {
      "parameters": {
        "jsCode": """// Seleciona Imagem da Cena com Fallbacks Inteligentes
const norm        = $json;
const idx         = parseInt(norm.index !== undefined ? norm.index : 0);
const tpl         = norm.tpl || {};
const visual      = norm.visual_content || {};
const userMedia   = norm.user_media || [];

let providedUrl = norm.image_url || norm.media_url || visual.image_url || '';

if (!providedUrl && Array.isArray(userMedia) && userMedia.length > 0) {
  providedUrl = userMedia[idx % userMedia.length]?.file_url || '';
}

const engineMode = norm.selected_engine_mode || tpl.engine_mode || 'local';
const imageModel = norm.selected_image_model || tpl.image_model || 'gemini-2.5-flash-image';

let imageUrl = '';
let source = '';

if (providedUrl) {
  imageUrl = providedUrl;
  source = 'user_uploaded';
} else {
  const dynamicStock = [
    'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1080&q=80',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1080&q=80',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1080&q=80',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1080&q=80',
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1080&q=80'
  ];
  imageUrl = dynamicStock[idx % dynamicStock.length];
  source = `cinematic_dynamic_scene_${idx}`;
}

return [{
  json: {
    ...norm,
    image_url: imageUrl,
    selected_image_model: imageModel,
    selected_engine_mode: engineMode,
    source: source
  }
}];""",
        "options": {}
      },
      "name": "Generate Scene Image",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [880, 1968],
      "id": "8e123f64-6335-4b57-bdc5-8986e8308ae9"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://edge-tts.fjt-solutions.com/v1/audio/speech",
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": """={
  "model": "tts-1",
  "input": "{{ $json.voiceover?.text || $json.voiceover_text || $json.voiceoverText || $json.text }}",
  "voice": "{{ $json.voice }}",
  "language": "{{ $json.language }}",
  "speed": 1.0,
  "response_format": "mp3"
}""",
        "options": {
          "allowUnauthorizedCerts": True
        }
      },
      "name": "Generate TTS",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [1104, 1968],
      "id": "e8e1106b-ba75-46b9-83f3-dc52709218c9"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://whisper.fjt-solutions.com/v1/audio/transcriptions",
        "sendBody": True,
        "contentType": "multipart-form-data",
        "bodyParameters": {
          "parameters": [
            {
              "name": "file",
              "value": "={{ $json.data }}",
              "parameterType": "formBinaryData",
              "inputDataFieldName": "data"
            },
            {
              "name": "model",
              "value": "Systran/faster-whisper-small"
            },
            {
              "name": "response_format",
              "value": "verbose_json"
            },
            {
              "name": "timestamp_granularities[]",
              "value": "word"
            },
            {
              "name": "language",
              "value": "={{ $('Normalize + Auto Engine').first().json.language }}"
            }
          ]
        },
        "options": {
          "allowUnauthorizedCerts": True
        }
      },
      "name": "Whisper Word Timestamps",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [1328, 1968],
      "id": "b1d7578e-7a54-4cb8-8d82-87897fe321ef"
    },
    {
      "parameters": {
        "jsCode": """// ── Monta SceneSegment completo ──
const segment = $('Generate Scene Image').item.json;
const idx     = parseInt(segment.index !== undefined ? segment.index : 0);
const ttsNode = $('Generate TTS');
const ttsItem = ttsNode.item || ttsNode.all()[idx] || {};
const wRes    = $('Whisper Word Timestamps').item.json;

const voiceover = segment.voiceover || {};
const visual    = segment.visual_content || {};

const imageUrl = segment.image_url
  || segment.media_url
  || visual.image_url
  || segment.tpl?.video_thumbnail
  || '';

let audioUrl = segment.audio_url || '';
if (!audioUrl) {
  let base64Data = '';
  try {
    const getHelper = (typeof this !== 'undefined' && this.helpers && this.helpers.getBinaryDataBuffer) || (typeof $helpers !== 'undefined' && $helpers.getBinaryDataBuffer);
    if (getHelper) {
      const buf = await getHelper.call(this, idx, 'data', 'Generate TTS');
      if (buf && buf.length > 0) {
        base64Data = buf.toString('base64');
      }
    }
  } catch (err) {
    console.error('Error fetching TTS binary buffer:', err.message);
  }

  if (!base64Data && ttsItem && ttsItem.binary) {
    const binaryKey = Object.keys(ttsItem.binary)[0] || 'data';
    const binaryObj = ttsItem.binary[binaryKey];
    if (binaryObj && binaryObj.data && binaryObj.data !== 'database') {
      base64Data = binaryObj.data;
    }
  }

  if (base64Data) {
    audioUrl = `data:audio/mp3;base64,${base64Data}`;
  }
}
const captionText = voiceover.text || segment.voiceover_text || segment.voiceoverText || segment.text || '';

const words = (wRes.words || wRes.segments?.[0]?.words || []).map(w => ({
  word: w.word,
  startInSeconds: parseFloat(w.start),
  endInSeconds:   parseFloat(w.end)
}));

const duration = wRes.duration
  || (() => {
    const ts = segment.timestamp || '';
    const parts = ts.split('-');
    const toSec = t => { const p = t.trim().split(':'); return p.length===2 ? parseInt(p[0])*60+parseInt(p[1]) : parseInt(p[0]); };
    return parts.length === 2 ? toSec(parts[1]) - toSec(parts[0]) : 5;
  })();

const ALL_STYLES = ['kenburns-right','kenburns-left','zoom-punch','parallax-up','zoom-out'];
let animationStyle;
if (segment.animation_mix === 'kenburns')    animationStyle = idx % 2 === 0 ? 'kenburns-right' : 'kenburns-left';
else if (segment.animation_mix === 'zoom-punch') animationStyle = 'zoom-punch';
else animationStyle = ALL_STYLES[idx % ALL_STYLES.length];

return [{
  json: {
    index:          idx,
    imageUrl,
    audioUrl,
    captionText,
    words,
    durationSeconds: duration,
    animationStyle,
    transitionIn:   'fade'
  }
}];""",
        "options": {}
      },
      "name": "Build Scene",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1552, 2048],
      "id": "b7fa4bb7-8ade-4420-a197-917d2a377895"
    },
    {
      "parameters": {
        "jsCode": """// ── Agrega todas as cenas geradas pelo loop ──
const norm = $('Normalize + Auto Engine').first().json;
const tpl  = norm.tpl || {};

const scenes = $input.all()
  .map(item => item.json)
  .sort((a, b) => a.index - b.index);

const execId = $execution?.id || '';
const resumeUrl = $execution?.resumeUrl || '';
const baseCallback = resumeUrl || (execId ? `https://n8n.fjt-solutions.com/webhook-waiting/${execId}/darktube-render-complete` : `https://n8n.fjt-solutions.com/webhook-waiting/darktube-render-complete`);

const composition = {
  scenes,
  format:            norm.format,
  captionStyle:      norm.caption_style,
  primaryColor:      norm.primary_color,
  accentColor:       norm.accent_color,
  showWatermark:     true,
  watermarkText:     norm.watermark_text,
  backgroundMusicUrl: norm.has_music ? (tpl.music_url || '') : ''
};

return [{
  json: {
    session_id:    norm.session_id,
    render_engine: norm.render_engine,
    template_id:   tpl.id,
    callback_url:  baseCallback,
    composition
  }
}];""",
        "options": {}
      },
      "name": "Aggregate Scenes",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [880, 1680],
      "id": "d6c6475c-de83-4484-bf2d-d6b758e35fab"
    },

    {
      "parameters": {
        "rules": {
          "values": [
            {
              "conditions": {
                "options": {
                  "caseSensitive": True,
                  "leftValue": "",
                  "typeValidation": "strict"
                },
                "combinator": "and",
                "conditions": [
                  {
                    "leftValue": "={{ $json.render_engine }}",
                    "rightValue": "remotion",
                    "operator": {
                      "type": "string",
                      "operation": "equals"
                    }
                  }
                ]
              },
              "renameOutput": True,
              "outputKey": "Remotion"
            },
            {
              "conditions": {
                "options": {
                  "caseSensitive": True,
                  "leftValue": "",
                  "typeValidation": "strict"
                },
                "combinator": "and",
                "conditions": [
                  {
                    "leftValue": "={{ $json.render_engine }}",
                    "rightValue": "hyperframes",
                    "operator": {
                      "type": "string",
                      "operation": "equals"
                    }
                  }
                ]
              },
              "renameOutput": True,
              "outputKey": "Hyperframes"
            }
          ]
        },
        "options": {}
      },
      "name": "Route to Engine",
      "type": "n8n-nodes-base.switch",
      "typeVersion": 3,
      "position": [1104, 1584],
      "id": "25195eee-1ac3-49df-b913-1b371cf620e9"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "http://n8n-remotionservice-ry6eh9:3001/render",
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": """={
  "historyId":   {{ JSON.stringify($json.session_id) }},
  "templateId":  {{ JSON.stringify($json.template_id) }},
  "callbackUrl": {{ JSON.stringify($execution.resumeUrl) }},
  "composition": {{ JSON.stringify($json.composition) }}
}""",
        "options": {
          "allowUnauthorizedCerts": True
        }
      },
      "name": "Remotion Render",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [1328, 1488],
      "id": "4304c962-a6d1-430d-a579-acfbfb7c2fb8"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "http://n8n-hyperframesservice-sruzdk:3002/render",
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": """={
  "historyId":   {{ JSON.stringify($json.session_id) }},
  "templateId":  {{ JSON.stringify($json.template_id) }},
  "callbackUrl": {{ JSON.stringify($execution.resumeUrl) }},
  "payload":     {{ JSON.stringify($json.composition) }}
}""",
        "options": {
          "allowUnauthorizedCerts": True
        }
      },
      "name": "Hyperframes Render",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [1328, 1680],
      "id": "f5927597-f655-4104-8f40-861b39295e9f"
    },
    {
      "parameters": {
        "resume": "webhook",
        "httpMethod": "POST",
        "options": {}
      },
      "name": "Wait Render",
      "type": "n8n-nodes-base.wait",
      "typeVersion": 1,
      "position": [1552, 1584],
      "id": "b1623c45-eb57-4940-9a85-bcd8fc731a94"
    },
    {
      "parameters": {
        "jsCode": """// ── Auto-Post Blotato (Publicação Social) ──
const norm = $('Normalize + Auto Engine').first().json;
const tpl  = norm.tpl || {};
const waitRes = $('Wait Render').first().json;

const accounts = tpl.target_accounts || [];
if (accounts.length === 0) {
  return [{ json: { status: 'skipped_no_accounts', video_url: waitRes.video_url || waitRes.videoUrl || '' } }];
}

return [{ json: { status: 'ready_to_post', accounts, video_url: waitRes.video_url || waitRes.videoUrl || '' } }];""",
        "options": {}
      },
      "name": "Auto-Post Blotato",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1776, 1584],
      "id": "db564ca1-8553-468f-bfe5-7f18068aac4e"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://darktube.fjt-solutions.com/api/webhooks/production-complete",
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": """={
  "historyId":     "{{ $('Normalize + Auto Engine').first().json.session_id }}",
  "session_id":    "{{ $('Normalize + Auto Engine').first().json.session_id }}",
  "template_id":   "{{ $('Normalize + Auto Engine').first().json.tpl.id }}",
  "render_engine": "{{ $('Normalize + Auto Engine').first().json.render_engine }}",
  "videoUrl":      "{{ $('Wait Render').first().json.body?.videoUrl || $('Wait Render').first().json.body?.video_url || $('Wait Render').first().json.videoUrl || $('Wait Render').first().json.video_url || '' }}",
  "video_url":     "{{ $('Wait Render').first().json.body?.videoUrl || $('Wait Render').first().json.body?.video_url || $('Wait Render').first().json.videoUrl || $('Wait Render').first().json.video_url || '' }}",
  "thumbnailUrl":  "{{ $('Wait Render').first().json.body?.thumbnailUrl || $('Wait Render').first().json.body?.thumbnail_url || $('Wait Render').first().json.thumbnailUrl || $('Wait Render').first().json.thumbnail_url || '' }}",
  "thumbnail_url": "{{ $('Wait Render').first().json.body?.thumbnailUrl || $('Wait Render').first().json.body?.thumbnail_url || $('Wait Render').first().json.thumbnailUrl || $('Wait Render').first().json.thumbnail_url || '' }}",
  "status":        "{{ $('Wait Render').first().json.body?.status || $('Wait Render').first().json.status || 'completed' }}",
  "error":         "{{ $('Wait Render').first().json.body?.error || $('Wait Render').first().json.error || '' }}"
}""",
        "options": {
          "allowUnauthorizedCerts": True
        }
      },
      "name": "Callback DarkTube",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [2000, 1584],
      "id": "a1b6073b-5541-47dd-a0a6-26773d95773a"
    },
    {
      "parameters": {},
      "name": "Error Trigger",
      "type": "n8n-nodes-base.errorTrigger",
      "typeVersion": 1,
      "position": [656, 2240],
      "id": "e8e1106b-error-trigger-001"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://darktube.fjt-solutions.com/api/webhooks/production-complete",
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": """={
  "historyId":     "{{ $('Normalize + Auto Engine').isExecuted ? $('Normalize + Auto Engine').first().json.session_id : ($json.execution?.error?.node?.session_id || 'dt_error_session') }}",
  "session_id":    "{{ $('Normalize + Auto Engine').isExecuted ? $('Normalize + Auto Engine').first().json.session_id : ($json.execution?.error?.node?.session_id || 'dt_error_session') }}",
  "status":        "failed",
  "error":         "{{ $json.execution?.error?.message || 'Erro durante execução no n8n' }}"
}""",
        "options": {
          "allowUnauthorizedCerts": True
        }
      },
      "name": "Callback Error DarkTube",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [900, 2240],
      "id": "a1b6073b-error-callback-002"
    }
  ],
  "connections": {
    "Webhook Darktube": {
      "main": [[{"node": "Normalize + Auto Engine", "type": "main", "index": 0}]]
    },
    "Normalize + Auto Engine": {
      "main": [[{"node": "Loop Over Items", "type": "main", "index": 0}]]
    },
    "Loop Over Items": {
      "main": [
        [{"node": "Aggregate Scenes", "type": "main", "index": 0}],
        [{"node": "Generate Scene Image", "type": "main", "index": 0}]
      ]
    },
    "Generate Scene Image": {
      "main": [[{"node": "Generate TTS", "type": "main", "index": 0}]]
    },
    "Generate TTS": {
      "main": [[{"node": "Whisper Word Timestamps", "type": "main", "index": 0}]]
    },
    "Whisper Word Timestamps": {
      "main": [[{"node": "Build Scene", "type": "main", "index": 0}]]
    },
    "Build Scene": {
      "main": [[{"node": "Loop Over Items", "type": "main", "index": 0}]]
    },
    "Aggregate Scenes": {
      "main": [
        [
          {"node": "Route to Engine", "type": "main", "index": 0}
        ]
      ]
    },
    "Route to Engine": {
      "main": [
        [{"node": "Remotion Render", "type": "main", "index": 0}],
        [{"node": "Hyperframes Render", "type": "main", "index": 0}]
      ]
    },
    "Remotion Render": {
      "main": [[{"node": "Wait Render", "type": "main", "index": 0}]]
    },
    "Hyperframes Render": {
      "main": [[{"node": "Wait Render", "type": "main", "index": 0}]]
    },
    "Wait Render": {
      "main": [[{"node": "Auto-Post Blotato", "type": "main", "index": 0}]]
    },
    "Auto-Post Blotato": {
      "main": [[{"node": "Callback DarkTube", "type": "main", "index": 0}]]
    },
    "Error Trigger": {
      "main": [[{"node": "Callback Error DarkTube", "type": "main", "index": 0}]]
    }
  },
  "settings": {
    "executionOrder": "v1"
  }
}

with open('public/n8n-darktube-workflow.json', 'w') as f:
    json.dump(wf, f, indent=2)

print('Updated: Render nodes now use $execution.resumeUrl as callbackUrl!')
