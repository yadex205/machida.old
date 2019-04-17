import { exec } from 'child_process';
import { promisify } from 'util';

interface FFprobeStream {
  index: number;
  codec_name: string;
  codec_long_name: string;
  codec_type: string;
}

export interface FFprobeVideoStream extends FFprobeStream {
  codec_type: 'video';
  width: number;
  height: number;
};

export interface FFprobeAudioStream extends FFprobeStream {
  codec_type: 'audio';
}

export interface FFprobeFormat {
  format_name: string;
  format_long_name: string;
  duration: string;
}

export interface FFprobeResult {
  format: FFprobeFormat;
  streams: (FFprobeVideoStream | FFprobeAudioStream | FFprobeStream)[];
}

export default async function ffprobe(path: string): Promise<FFprobeResult> {
  const command = `ffprobe -hide_banner -show_format -show_streams -of json "${path}"`;
  const { stdout } = await promisify(exec)(command);
  return JSON.parse(stdout.toString());
}
