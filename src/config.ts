import { readFile } from 'fs';
import { resolve } from 'path';
import { promisify } from 'util';
import { getLogger } from 'log4js';

const logger = getLogger('config');

interface Recipe {
  src: string;
  dest: string;
  type: 'h264' | 'hap';
}

export interface MachidaConfig {
  transcode: {
    concurrency: number;
  };
  recipes: Recipe[];
}

export default async function getConfig(): Promise<MachidaConfig | null> {
  let configJson;
  let config;

  try {
    configJson = (await promisify(readFile)(resolve('./machida.config.json'))).toString();
  } catch (error) {
    logger.error('Cannot load config');
    logger.error(error);
    return null;
  }

  try {
    config = JSON.parse(configJson);
  } catch (error) {
    logger.error('Invalid config file');
    logger.error(error);
    return null;
  }

  if (!Array.isArray(config.recipes) || config.recipes.length <= 0) {
    logger.error('No recipe given');
    return null;
  }

  for (const recipe of config.recipes) {
    if (typeof recipe !== 'object' ||
        typeof recipe.src !== 'string' ||
        typeof recipe.dest !== 'string' ||
        typeof recipe.type !== 'string') {
      logger.error(`Invalid recipe format: ${JSON.stringify(recipe)}`)
      return null;
    }

    if (recipe.type !== 'h264' && recipe.type !== 'hap') {
      logger.error(`Type ${recipe.type} is not supported`);
      return null;
    }
  }

  return {
    transcode: {
      concurrency: 1,
      ...(config.transcode || {})
    },
    recipes: config.recipes
  };
}
