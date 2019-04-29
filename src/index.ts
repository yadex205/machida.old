import { promisify } from 'util';
import { resolve, dirname, relative } from 'path';
import glob from 'glob';
import globParent from 'glob-parent';
import { mkdirp } from 'fs-extra';
import { getLogger, configure as configureLog4js } from 'log4js';
import FFmpegInformation from './ffmpeg-information';
import runTranscodeWorker from './transcode-worker';
import getConfig from './config';

configureLog4js({
  appenders: {
    stdout: { type: 'stdout' }
  },
  categories: {
    default: { appenders: ['stdout'], level: 'info' }
  }
});

const logger = getLogger('main');

(async function() {
  logger.info('Loading config');
  const config = await getConfig();
  if (!config) {
    return;
  }

  logger.info('Gathering FFmpeg information');
  const info = FFmpegInformation.getInstance();
  await info.gather();

  logger.info('Gathering files to be transcoded');
  const tasks = [];
  for (let recipe of config.recipes) {
    const sourceBase = globParent(recipe.src);
    const sources = await promisify(glob)(recipe.src, { nodir: true });

    for (let input of sources) {
      const output = resolve(recipe.dest, relative(sourceBase, input));
      await mkdirp(dirname(output));
      tasks.push({ input, output, type: recipe.type });
    }
  }

  logger.info('Start transcoding');
  await runTranscodeWorker({ tasks, concurrency: config.transcode.concurrency });

  logger.info('Finished!');
})();
