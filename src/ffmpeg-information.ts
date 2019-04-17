import { exec } from 'child_process';
import { promisify } from 'util';

interface Codec {
  type: 'video' | 'audio' | 'subtitle';
  name: string;
}

const TypeFlag: { [key: string]: string } = {
  'V': 'video',
  'A': 'audio',
  'S': 'subtitle'
};

export default class FFmpegInformation {
  private static instance?: FFmpegInformation;

  public static getInstance(): FFmpegInformation {
    return this.instance || (this.instance = new this());
  }

  private informationGathered: boolean = false;
  private decoders: Codec[] = [];
  private encoders: Codec[] = [];
  private hwaccels: string[] = [];

  private constructor() {}

  public getDecoders(): Codec[] {
    return this.decoders;
  }

  public getEncoders(): Codec[] {
    return this.encoders;
  }

  public getHwaccels(): string[] {
    return this.hwaccels;
  }

  public async gather() {
    this.decoders =
      (await promisify(exec)('ffmpeg -decoders')).stdout.split('------')[1].trim().split(/\n|\r|\r\n/).map(line => {
        const [flags, name] = line.trim().split(/\s+/, 2);
        return { type: TypeFlag[flags[0]], name } as Codec;
      });

    this.encoders =
      (await promisify(exec)('ffmpeg -encoders')).stdout.split('------')[1].trim().split(/\n|\r|\r\n/).map(line => {
        const [flags, name] = line.trim().split(/\s+/, 2);
        return { type: TypeFlag[flags[0]], name } as Codec;
      });

    this.hwaccels =
      (await promisify(exec)('ffmpeg -hwaccels')).stdout.trim().split(/\n|\r|\r\n/).slice(1).map(line => line.trim());

    this.informationGathered = true;
  }
}
