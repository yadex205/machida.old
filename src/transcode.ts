import ffprobe, { FFprobeVideoStream, FFprobeAudioStream } from 'ffprobe';
import ffmpeg from 'ffmpeg';
import FFmpegInformation from 'ffmpeg-information';

interface FFmpegCategorizedArgs {
  inputVideo?: string[];
  input?: string;
  outputFormat?: string[];
  outputVideo?: string[];
  outputAudio?: string[];
  output?: string;
}

export interface Props {
  input: string;
  output: string;
  type: 'hap' | 'h264';
  onStarting?: (outputPath: string) => void;
  onProgress?: (progress: number) => void;
}

export default async function transcode(props: Props) {
  const probe = await ffprobe(props.input);
  const ffmpegInfo = FFmpegInformation.getInstance();
  const args: FFmpegCategorizedArgs = {};

  let inputVideoStream: FFprobeVideoStream | null = null;
  let inputAudioStream: FFprobeAudioStream | null = null;
  for (let stream of probe.streams) {
    if (stream.codec_type === 'video') {
      inputVideoStream = stream as FFprobeVideoStream;
    } else if (stream.codec_type === 'audio') {
      inputAudioStream = stream as FFprobeAudioStream;
    }
  }

  if (! inputVideoStream) {
    throw new Error('Cannot find video stream');
  }

  args.input = props.input;
  args.output = props.output;

  switch (inputVideoStream.codec_name) {
    case 'h264':
      if (ffmpegInfo.getDecoders().some(dec => dec.name === 'h264_cuvid')) {
        args.inputVideo = ['-c:v', 'h264_cuvid'];
      } else if (ffmpegInfo.getHwaccels().includes('videotoolbox')) {
        args.inputVideo = ['-hwaccel', 'videotoolbox'];
      }
      break;
    case 'mjpeg':
      if (ffmpegInfo.getDecoders().some(dec => dec.name === 'mjpeg_cuvid')) {
        args.inputVideo = ['-c:v', 'mjpeg_cuvid'];
      }
      break;
  }

  switch (props.type) {
    case 'h264':
      if (ffmpegInfo.getEncoders().some(dec => dec.name === 'h264_nvenc')) {
        args.outputVideo = ['-c:v', 'h264_nvenc', '-qp', '30', '-filter:v', 'format=nv12,hwupload_cuda,scale_cuda=1280:720'];
      } else if (ffmpegInfo.getEncoders().some(dec => dec.name === 'h264_videotoolbox')) {
        args.outputVideo = ['-c:v', 'h264_videotoolbox', '-qmin', '30', '-qmax', '30', '-s', '1280x720']
      }
      args.outputFormat = ['-f', 'mp4', '-movflags', '+faststart'];
      break;
    case 'hap':
      args.outputVideo = ['-c:v', 'hap', '-s', '1280x720'];
      args.outputFormat = ['-f', 'mov', '-movflags', '+faststart'];
      break;
  }

  if (! inputAudioStream) {
    args.outputAudio = ['-an'];
  } else {
    args.outputAudio = ['-c:a', 'aac', '-b:a', '128k'];
  }

  const validArgs = [
    ...args.inputVideo || [],
    '-i',
    args.input,
    ...args.outputFormat || [],
    ...args.outputVideo || [],
    ...args.outputAudio || [],
    args.output
  ];

  const duration = parseFloat(probe.format.duration);

  await ffmpeg(validArgs, (progress) => {
    (props.onProgress || (() => {}))(progress.position / duration)
  });
}
