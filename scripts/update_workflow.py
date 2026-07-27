import json

wf = {
  "name": "Darktube — Dual Engine Video Production v2",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "darktube_producao",
        "responseMode": "onReceived",
        "options": {}
      },
      "name": "Webhook Darktube",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [240, 360]
    },
    {
      "parameters": {
        "jsCode": """// ── Normaliza payload e DECIDE o motor automaticamente ──
const body = $input.item.json.body || $input.item.json;
const tpl  = body.template || {};

const sessionId    = `dt_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
const captionStyle = tpl.caption_style || 'pop';
const animationMix = tpl.animation_mix || 'varied';
const language     = tpl.language     || 'pt';
const voice        = tpl.voice        || 'pt-BR-FranciscaNeural';
const format       = tpl.format       || 'vertical';

// Decisão automática do motor
const renderEngine = (captionStyle === 'pop' || captionStyle === 'karaoke')
  ? 'remotion'
  : 'hyperframes';

return [{
  json: {
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
    script_segments: tpl.script_segments || [],
    tpl
  }
}];""",
        "options": {}
      },
      "name": "Normalize + Auto Engine",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [480, 360]
    },
    {
      "parameters": {
        "batchSize": 1,
        "options": {}
      },
      "name": "Split Segments",
      "type": "n8n-nodes-base.splitInBatches",
      "typeVersion": 1,
      "position": [720, 360]
    },
    {
      "parameters": {
        "jsCode": """// ── Geração / Resolução de Imagem da Cena ──
const norm    = $('Normalize + Auto Engine').item.json;
const segment = $('Split Segments').item.json;
const tpl     = norm.tpl || {};

// 1. Se o segmento possui imagem própria enviada pelo usuário (Upload Manual)
const visual = segment.visual_content || {};
const providedUrl = segment.image_url || segment.media_url || segment.custom_image || visual.image_url;
if (providedUrl) {
  return [{ json: { image_url: providedUrl, source: 'user_uploaded' } }];
}

// 2. Se for modo manual ou modelo manual
if (tpl.engine_mode === 'manual' || tpl.image_model === 'manual-image') {
  const fallbackUrl = tpl.video_thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080';
  return [{ json: { image_url: fallbackUrl, source: 'manual_fallback' } }];
}

// 3. Fallback de segurança para imagem
const defaultImg = tpl.video_thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080';
return [{ json: { image_url: defaultImg, source: 'ai_fallback' } }];""",
        "options": {}
      },
      "name": "Generate Scene Image",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [960, 260]
    },
    {
      "parameters": {
        "url": "https://edge-tts.fjt-solutions.com/v1/audio/speech",
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": """={
  "model": "tts-1",
  "input": "{{ $json.voiceover?.text || $json.voiceover_text || $json.voiceoverText || $json.text }}",
  "voice": "{{ $('Normalize + Auto Engine').item.json.voice }}",
  "language": "{{ $('Normalize + Auto Engine').item.json.language }}",
  "speed": 1.0,
  "response_format": "mp3"
}""",
        "options": {}
      },
      "name": "Generate TTS",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [1200, 260]
    },
    {
      "parameters": {
        "url": "https://whisper.fjt-solutions.com/v1/audio/transcriptions",
        "sendBody": True,
        "contentType": "multipart-form-data",
        "bodyParameters": {
          "parameter": [
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
              "value": "={{ $('Normalize + Auto Engine').item.json.language }}"
            }
          ]
        },
        "options": {}
      },
      "name": "Whisper Word Timestamps",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [1440, 260]
    },
    {
      "parameters": {
        "jsCode": """// ── Monta SceneSegment completo ──
const norm    = $('Normalize + Auto Engine').item.json;
const segment = $('Split Segments').item.json;
const imgRes  = $('Generate Scene Image').item.json;
const ttsRes  = $('Generate TTS').item.json;
const wRes    = $('Whisper Word Timestamps').item.json;

const voiceover = segment.voiceover || {};
const visual    = segment.visual_content || {};

const imageUrl = segment.image_url
  || segment.media_url
  || visual.image_url
  || imgRes.image_url
  || imgRes.url
  || norm.tpl.video_thumbnail
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
const idx = parseInt(segment.index || segment.id || 0);
let animationStyle;
if (norm.animation_mix === 'kenburns')    animationStyle = idx % 2 === 0 ? 'kenburns-right' : 'kenburns-left';
else if (norm.animation_mix === 'zoom-punch') animationStyle = 'zoom-punch';
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
      "position": [1680, 260]
    },
    {
      "parameters": {
        "jsCode": """// ── Agrega todas as cenas geradas pelo loop ──
const norm = $('Normalize + Auto Engine').first().json;
const tpl  = norm.tpl;

const scenes = $input.all()
  .map(item => item.json)
  .sort((a, b) => a.index - b.index);

const baseCallback = `https://darktube.fjt-solutions.com/api/webhooks/render-complete`;

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
      "position": [960, 520]
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
      "position": [1200, 520]
    },
    {
      "parameters": {
        "url": "https://remotion.fjt-solutions.com/render",
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": """={
  "historyId":   "{{ $json.session_id }}",
  "templateId":  "{{ $json.template_id }}",
  "callbackUrl": "{{ $json.callback_url }}",
  "composition": {{ JSON.stringify($json.composition) }}
}""",
        "options": {}
      },
      "name": "Remotion Render",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [1440, 440]
    },
    {
      "parameters": {
        "url": "https://hyperframes.fjt-solutions.com/render",
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": """={
  "historyId":   "{{ $json.session_id }}",
  "templateId":  "{{ $json.template_id }}",
  "callbackUrl": "{{ $json.callback_url }}",
  "payload":     {{ JSON.stringify($json.composition) }}
}""",
        "options": {}
      },
      "name": "Hyperframes Render",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [1440, 620]
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
      "position": [1440, 800]
    },
    {
      "parameters": {
        "resume": "webhook",
        "options": {
          "webhookSuffix": "darktube-render-complete"
        }
      },
      "name": "Wait Render",
      "type": "n8n-nodes-base.wait",
      "typeVersion": 1,
      "position": [1680, 520],
      "webhookId": "darktube-render-complete"
    },
    {
      "parameters": {
        "jsCode": """// ── Auto-Post Blotato (Publicação Social) ──
const norm = $('Normalize + Auto Engine').first().json;
const tpl  = norm.tpl || {};
const waitRes = $('Wait Render').first().json;

const accounts = tpl.target_accounts || [];
if (accounts.length === 0) {
  return [{ json: { status: 'skipped_no_accounts', video_url: waitRes.video_url || '' } }];
}

return [{ json: { status: 'ready_to_post', accounts, video_url: waitRes.video_url || '' } }];""",
        "options": {}
      },
      "name": "Auto-Post Blotato",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1920, 520]
    },
    {
      "parameters": {
        "url": "https://darktube.fjt-solutions.com/api/webhooks/production-complete",
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": """={
  "template_id":   "{{ $('Normalize + Auto Engine').item.json.tpl.id }}",
  "session_id":    "{{ $('Normalize + Auto Engine').item.json.session_id }}",
  "render_engine": "{{ $('Normalize + Auto Engine').item.json.render_engine }}",
  "video_url":     "{{ $('Wait Render').item.json.video_url }}",
  "thumbnail_url": "{{ $('Generate Thumbnail').item.json.image_url || '' }}",
  "status":        "completed"
}""",
        "options": {}
      },
      "name": "Callback DarkTube",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [2160, 520]
    }
  ],
  "connections": {
    "Webhook Darktube": {
      "main": [[{"node": "Normalize + Auto Engine", "type": "main", "index": 0}]]
    },
    "Normalize + Auto Engine": {
      "main": [[{"node": "Split Segments", "type": "main", "index": 0}]]
    },
    "Split Segments": {
      "main": [
        [{"node": "Generate Scene Image", "type": "main", "index": 0}],
        [{"node": "Aggregate Scenes", "type": "main", "index": 0}]
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
      "main": [[{"node": "Split Segments", "type": "main", "index": 0}]]
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

print('Updated public/n8n-darktube-workflow.json successfully!')
