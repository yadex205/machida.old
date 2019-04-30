import { spawn } from 'child_process';

interface FFmpegProgress {
  position: number;
  speed: number;
  status?: string;
}

interface ProgressCallback {
  (progress: FFmpegProgress): void;
}

export default function ffmpeg(args: string[], progressCallback: ProgressCallback = (() => {})): Promise<FFmpegProgress> {
  args = [
    '-hide_banner',
    '-progress', '-',
    '-y',
    ...args
  ];

  return new Promise((resolve, reject) => {
    let isFailed = false;
    let progress: FFmpegProgress = {
      position: 0,
      speed: 0,
      status: 'standby'
    };

    const proc = spawn('ffmpeg', args, {
      stdio: ['ignore', null, 'ignore']
    });

    if (proc.stdout) {
      proc.stdout.on('data', (chunk: string | Buffer) => {
        const rawProgress = new Map(
          chunk.toString().split(/\n|\r|\r\n/).map<[string, string]>(pair => {
            const [k, v] = pair.split('=', 2);
            return [k, v];
          })
        );
        progress = {
          speed: parseFloat(rawProgress.get('speed') || '0' ),
          position: parseInt(rawProgress.get('out_time_ms') || '0') / 1000000,
          status: rawProgress.get('progress')
        };
        progressCallback(progress);
      });
    }

    proc.on('error', error => {
      isFailed = true;
      reject(error);
    });

    proc.on('exit', code => {
      if (code !== 0) {
        isFailed = true;
        reject('FFmpeg exit with non-zero status');
      }

      if (!isFailed) {
        resolve(progress);
      }
    });
  });
}
