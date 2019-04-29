import { promisify } from 'util';
import { open as fopen, close as fclose, fstat } from 'fs';
import { resolve, dirname, relative } from 'path';
import { queue } from 'async';
import glob from 'glob';
import globParent from 'glob-parent';
import { mkdirp } from 'fs-extra';
import FFmpegInformation from './ffmpeg-information';
import transcode, { Props as TranscodeProps } from './transcode';

interface Config {
  transcode: {
    concurrency: number;
  };
  recipes: {
    src: string;
    dest: string;
    type: string;
  }[];
}

(async function(config: Config) {
  const info = FFmpegInformation.getInstance();
  await info.gather();

  const q = queue<TranscodeProps>(async (props) => {
    let eligibleToTranscode = false;

    const inputFd = await promisify(fopen)(props.input, 'r');
    const inputStat = await promisify(fstat)(inputFd);
    await promisify(fclose)(inputFd);

    try {
      const outputFd = await promisify(fopen)(props.output, 'r');
      const outputStat = await promisify(fstat)(outputFd);
      await promisify(fclose)(outputFd);
      eligibleToTranscode = outputStat.mtime < inputStat.mtime;
    } catch (error) {
      eligibleToTranscode = true;
    }

    try {
      if (eligibleToTranscode) {
        await transcode(props);
      }
    } catch (error) {
      console.log(error.toString())
      console.error(`ERROR: ${props.input} ==> ${props.output}`);
    }
  }, config.transcode.concurrency);

  for (let recipe of config.recipes) {
    const sourceBase = globParent(recipe.src);

    if (relative(recipe.dest, sourceBase) === '') {
      console.warn(`Destination directory should be different from source: ${sourceBase}`);
    }

    if (recipe.type !== 'h264' && recipe.type !== 'hap') {
      console.warn(`Type ${recipe.type} not supported`);
    }

    const sources = await promisify(glob)(recipe.src, { nodir: true });

    for (let src of sources) {
      const output = resolve(recipe.dest, relative(sourceBase, src));
      await mkdirp(dirname(output));

      q.push({
        input: src,
        output,
        type: recipe.type as 'h264' | 'hap'
      });
    }
  }
})(require(resolve('./machida.config.js')));
