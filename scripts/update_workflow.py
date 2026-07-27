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
        "jsCode": """// ── Geração / Resolução de Imagem da Cena ──
const norm = $json;
const tpl  = norm.tpl || {};

const visual = norm.visual_content || {};
const providedUrl = norm.image_url || norm.media_url || norm.custom_image || visual.image_url;

let imageUrl;
let source;

if (providedUrl) {
  imageUrl = providedUrl;
  source = 'user_uploaded';
} else if (tpl.engine_mode === 'manual' || tpl.image_model === 'manual-image') {
  imageUrl = tpl.video_thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080';
  source = 'manual_fallback';
} else {
  imageUrl = tpl.video_thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080';
  source = 'ai_fallback';
}

return [{
  json: {
    ...norm,
    image_url: imageUrl,
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
const ttsRes  = $('Generate TTS').item.json;
const wRes    = $('Whisper Word Timestamps').item.json;

const voiceover = segment.voiceover || {};
const visual    = segment.visual_content || {};

const imageUrl = segment.image_url
  || segment.media_url
  || visual.image_url
  || segment.tpl?.video_thumbnail
  || '';

const audioUrl = segment.audio_url || ttsRes.audio_url || ttsRes.url || '';
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
const idx = parseInt(segment.index || 0);
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
        "jsCode": """// ── Geração da Capa / Thumbnail HD ──
const norm = $('Normalize + Auto Engine').first().json;
const tpl  = norm.tpl || {};

const thumbUrl = tpl.thumbnail_url || tpl.video_thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080';

return [{ json: { image_url: thumbUrl, url: thumbUrl } }];""",
        "options": {}
      },
      "name": "Generate Thumbnail",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1104, 1776],
      "id": "74cbe82e-5654-477e-b903-e04e6bf844a2"
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
  "historyId":   "{{ $json.session_id }}",
  "templateId":  "{{ $json.template_id }}",
  "callbackUrl": "{{ $json.callback_url }}",
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
  "historyId":   "{{ $json.session_id }}",
  "templateId":  "{{ $json.template_id }}",
  "callbackUrl": "{{ $json.callback_url }}",
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
        "options": {
          "webhookSuffix": "darktube-render-complete"
        }
      },
      "name": "Wait Render",
      "type": "n8n-nodes-base.wait",
      "typeVersion": 1,
      "position": [1552, 1584],
      "webhookId": "darktube-render-complete",
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
  "template_id":   "{{ $('Normalize + Auto Engine').first().json.tpl.id }}",
  "session_id":    "{{ $('Normalize + Auto Engine').first().json.session_id }}",
  "render_engine": "{{ $('Normalize + Auto Engine').first().json.render_engine }}",
  "video_url":     "{{ $('Wait Render').first().json.videoUrl || $('Wait Render').first().json.video_url }}",
  "thumbnail_url": "{{ $('Generate Thumbnail').first().json.image_url || '' }}",
  "status":        "completed"
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
          {"node": "Route to Engine", "type": "main", "index": 0},
          {"node": "Generate Thumbnail", "type": "main", "index": 0}
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
    }
  },
  "settings": {
    "executionOrder": "v1"
  }
}

with open('public/n8n-darktube-workflow.json', 'w') as f:
    json.dump(wf, f, indent=2)

print('Updated public/n8n-darktube-workflow.json with executionId dynamic resume URL!')
