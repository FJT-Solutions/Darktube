import { Config } from '@remotion/cli/config';

// Concorrência ajustada para a VPS de 18 vCPUs (usa 14 threads paralelas)
Config.setConcurrency(14);

// Otimização de armazenamento em disco temporário para JPEG 80%
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(80);

// Configuração padrão de codec de vídeo MP4
Config.setPixelFormat('yuv420p');
Config.setCodec('h264');
