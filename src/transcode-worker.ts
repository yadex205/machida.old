import { promisify } from 'util';
import { open as fopen, close as fclose, fstat as nodeFstat, Stats } from 'fs';
import Aigle from 'aigle';
import { getLogger } from 'log4js';

import transcode, { Props as TranscodeProps } from './transcode';

const logger = getLogger('transcode-worker');

interface Props {
  tasks: TranscodeProps[];
  concurrency: number;
}

async function fstat(filepath: string): Promise<Stats> {
  let fd;

  try {
    fd = await promisify(fopen)(filepath, 'r');
    const stats = await promisify(nodeFstat)(fd);
    await promisify(fclose)(fd);
    return stats
  } catch (error) {
    if (typeof fd === 'number') {
      await promisify(fclose)(fd);
    }
    throw error;
  }
}

export default async function runWorker(props: Props): Promise<void> {
  const { tasks, concurrency } = props;

  await Aigle.eachLimit(tasks, concurrency, async (props: TranscodeProps) => {
    let inputStats;
    let outputStats;

    try {
      inputStats = await fstat(props.input);
    } catch (error) {
      logger.error(`Cannot obtain stats of input file: ${props.input}`);
      logger.error(error.toString());
      return;
    }

    try {
      outputStats = await fstat(props.output);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.error(`Cannot obtain stats of output file: ${props.output}`);
        logger.error(error.toString());
        return;
      }
    }

    if (outputStats && outputStats.mtime >= inputStats.mtime) {
      logger.info(`Skip transcode ${props.input} ==> ${props.output}`);
    } else {
      try {
        logger.info(`Transcode ${props.input} ==> ${props.output}`);
        await transcode(props);
      } catch (error) {
        logger.error(`Failed transcoding ${props.input} => ${props.output}`);
        logger.error(error.toString());
      }
    }
  });
}
